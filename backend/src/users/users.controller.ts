import { Controller, Get, Patch, Body, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma.service';

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
    const { password, ...user } = req.user;
    return user;
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
      select: { id: true, name: true, email: true, role: true, department: true, designation: true, points: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
