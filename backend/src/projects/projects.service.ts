import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateProjectDto, UpdateProjectDto } from './projects.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProjectDto) {
    const exists = await this.prisma.project.findUnique({ where: { name: dto.name } });
    if (exists) throw new ConflictException('A project with this name already exists');
    return this.prisma.project.create({ data: dto });
  }

  async findAll() {
    const projects = await this.prisma.project.findMany({
      include: { _count: { select: { members: true, workLogEntries: true } } },
      orderBy: { name: 'asc' },
    });
    return projects.map(p => ({
      id: p.id, name: p.name, description: p.description, isActive: p.isActive,
      memberCount: p._count.members, entryCount: p._count.workLogEntries,
    }));
  }

  async findMine(userId: number) {
    const memberships = await this.prisma.projectMember.findMany({
      where: { userId, project: { isActive: true } },
      include: { project: true },
      orderBy: { project: { name: 'asc' } },
    });
    return memberships.map(m => m.project);
  }

  async update(id: number, dto: UpdateProjectDto) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    if (dto.name && dto.name !== project.name) {
      const exists = await this.prisma.project.findUnique({ where: { name: dto.name } });
      if (exists) throw new ConflictException('A project with this name already exists');
    }
    return this.prisma.project.update({ where: { id }, data: dto });
  }

  async listMembers(id: number) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    const members = await this.prisma.projectMember.findMany({
      where: { projectId: id },
      include: { user: { select: { id: true, name: true, email: true, department: true } } },
      orderBy: { user: { name: 'asc' } },
    });
    return members.map(m => m.user);
  }

  async addMember(id: number, userId: number) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const exists = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId } },
    });
    if (exists) throw new ConflictException('User is already a member of this project');
    await this.prisma.projectMember.create({ data: { projectId: id, userId } });
    return this.listMembers(id);
  }

  async removeMember(id: number, userId: number) {
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId } },
    });
    if (!membership) throw new NotFoundException('Membership not found');
    await this.prisma.projectMember.delete({ where: { id: membership.id } });
    return this.listMembers(id);
  }
}
