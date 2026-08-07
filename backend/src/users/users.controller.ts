import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request,
  BadRequestException, ConflictException, ForbiddenException, NotFoundException, ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma.service';

const ASSIGNABLE_ROLES = ['EMPLOYEE', 'HR', 'IT', 'ADMIN'] as const;
// HR/IT agents need a department for ticket routing; others have none.
const DEPT_FOR_ROLE: Record<string, 'HR' | 'IT' | null> = {
  HR: 'HR', IT: 'IT', EMPLOYEE: null, ADMIN: null,
};

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/users')
export class UsersController {
  constructor(private prisma: PrismaService) {}

  @Get('wallet')
  async getWallet(@Request() req) {
    return this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, points: true, role: true },
    });
  }

  @Get('me')
  getMe(@Request() req) {
    // req.user is already stripped of credential fields by JwtStrategy.
    return req.user;
  }

  // Self-service profile update — only name and job title are editable
  @Patch('me')
  async updateMe(@Request() req, @Body() body: { name?: string; designation?: string }) {
    const data: any = {};
    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
    if (typeof body.designation === 'string') data.designation = body.designation.trim() || null;
    return this.prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, name: true, email: true, role: true, department: true, designation: true, points: true },
    });
  }

  // Company-wide recognition leaderboard — available to every authenticated user
  @Get('leaderboard')
  async leaderboard(@Request() req) {
    const ranked = await this.prisma.user.findMany({
      where: { points: { gt: 0 } },
      select: { id: true, name: true, points: true, department: true },
      orderBy: [{ points: 'desc' }, { name: 'asc' }],
    });
    const idx = ranked.findIndex(u => u.id === req.user.id);
    return {
      top: ranked.slice(0, 5),
      total: ranked.length,
      rank: idx >= 0 ? idx + 1 : null,
      me: idx >= 0 ? ranked[idx] : { id: req.user.id, name: req.user.name, points: req.user.points ?? 0, department: req.user.department },
    };
  }

  // Host search-as-you-type (visitor scheduling). Any authenticated user may search.
  // Matches names containing the query (case-insensitive), excludes ADMIN users.
  @Get('search')
  async search(@Query('query') query?: string) {
    const q = (query || '').trim();
    if (q.length < 3) return [];
    return this.prisma.user.findMany({
      where: { name: { contains: q, mode: 'insensitive' }, role: { not: 'ADMIN' } },
      select: { id: true, name: true, role: true, department: true },
      orderBy: { name: 'asc' },
      take: 10,
    });
  }

  // Minimal user list for host/assignee pickers (visitor scheduling, etc.)
  @Get('list')
  @Roles('HR', 'ADMIN')
  async list() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true, department: true, designation: true },
      orderBy: { name: 'asc' },
    });
  }

  @Get('agents')
  @Roles('HR', 'IT', 'ADMIN')
  async getAgentsByDepartment(@Query('department') department?: string) {
    const agents = await this.prisma.user.findMany({
      where: {
        role: { in: ['HR', 'IT'] },
        ...(department ? { department: department as any } : {}),
      },
      select: {
        id: true, name: true, email: true, department: true,
        assignedTickets: {
          where: { status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } },
          select: { id: true },
        },
      },
    });
    return agents.map(a => ({
      id: a.id, name: a.name, email: a.email, department: a.department,
      activeTickets: a.assignedTickets.length,
    }));
  }

  @Get()
  @Roles('ADMIN')
  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, department: true, designation: true, points: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Pre-create an account with a role already assigned. The person can then
  // use "Sign Up" with this email to receive a password-setup link — there
  // is no separate approval step in the password-auth flow.
  @Post()
  @Roles('ADMIN')
  async createUser(@Body() body: { name?: string; email?: string; role?: string }) {
    const email = (body.email || '').trim().toLowerCase();
    const name = (body.name || '').trim();
    const role = (body.role || '').toUpperCase();

    const EMAIL_RULE = /^[a-z]+\.[a-z]@driveittech\.in$/;
    if (!EMAIL_RULE.test(email)) {
      throw new BadRequestException('Email must be in the format firstname.initial@driveittech.in');
    }
    if (!name) throw new BadRequestException('Name is required');
    if (!ASSIGNABLE_ROLES.includes(role as any)) {
      throw new BadRequestException(`role must be one of: ${ASSIGNABLE_ROLES.join(', ')}`);
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('A user with this email already exists');

    return this.prisma.user.create({
      data: { name, email, role: role as any, department: DEPT_FOR_ROLE[role], status: 'ACTIVE' },
      select: { id: true, name: true, email: true, role: true, department: true, status: true, createdAt: true },
    });
  }

  // ─── Admin: approval & role management (legacy OTP self-signup flow) ─

  @Get('pending')
  @Roles('ADMIN')
  async pendingApprovals() {
    return this.prisma.user.findMany({
      where: { status: 'AWAITING_APPROVAL' },
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  @Patch(':id/approve')
  @Roles('ADMIN')
  async approve(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { role?: string },
  ) {
    const role = (body.role || '').toUpperCase();
    if (!ASSIGNABLE_ROLES.includes(role as any)) {
      throw new BadRequestException(`role must be one of: ${ASSIGNABLE_ROLES.join(', ')}`);
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.status !== 'AWAITING_APPROVAL') {
      throw new BadRequestException('User is not awaiting approval');
    }
    return this.prisma.user.update({
      where: { id },
      data: { role: role as any, department: DEPT_FOR_ROLE[role], status: 'ACTIVE' },
      select: { id: true, name: true, email: true, role: true, department: true, status: true },
    });
  }

  @Patch(':id/reject')
  @Roles('ADMIN')
  async reject(@Request() req, @Param('id', ParseIntPipe) id: number) {
    if (id === req.user.id) throw new ForbiddenException('You cannot reject your own account');
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.status !== 'AWAITING_APPROVAL') {
      throw new BadRequestException('User is not awaiting approval');
    }
    return this.prisma.user.update({
      where: { id },
      data: { status: 'REJECTED' },
      select: { id: true, name: true, email: true, status: true },
    });
  }

  // Change role of an existing active user (Manage users screen).
  @Patch(':id/role')
  @Roles('ADMIN')
  async changeRole(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { role?: string },
  ) {
    if (id === req.user.id) throw new ForbiddenException('You cannot change your own role');
    const role = (body.role || '').toUpperCase();
    if (!ASSIGNABLE_ROLES.includes(role as any)) {
      throw new BadRequestException(`role must be one of: ${ASSIGNABLE_ROLES.join(', ')}`);
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id },
      data: { role: role as any, department: DEPT_FOR_ROLE[role] },
      select: { id: true, name: true, email: true, role: true, department: true, status: true },
    });
  }
}
