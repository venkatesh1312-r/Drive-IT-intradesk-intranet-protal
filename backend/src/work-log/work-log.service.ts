import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateWorkLogEntryDto, UpdateWorkLogEntryDto, WorkLogFilterDto } from './work-log.dto';

const EMPLOYEE_SELECT = { id: true, name: true, email: true, department: true } as const;
const PROJECT_SELECT = { id: true, name: true } as const;
const COMMENT_INCLUDE = { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' as const } };

// Entries are stored at midnight UTC for their calendar day — compare against
// today's UTC midnight so "today" means the same thing for writes and reads.
function todayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
function startOfWeek(): Date {
  const today = todayDateOnly();
  const day = today.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1; // Monday as start of week
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - diff);
  return monday;
}

@Injectable()
export class WorkLogService {
  constructor(private prisma: PrismaService) {}

  private async assertMembership(projectId: number, userId: number) {
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!membership) throw new ForbiddenException('You are not assigned to this project');
  }

  async create(dto: CreateWorkLogEntryDto, userId: number) {
    await this.assertMembership(dto.projectId, userId);
    return this.prisma.workLogEntry.create({
      data: {
        employeeId: userId,
        projectId: dto.projectId,
        entryDate: todayDateOnly(),
        contributionType: dto.contributionType,
        description: dto.description,
        link: dto.link || null,
        tags: dto.tags || [],
      },
      include: { project: { select: PROJECT_SELECT } },
    });
  }

  async findMine(userId: number) {
    return this.prisma.workLogEntry.findMany({
      where: { employeeId: userId },
      include: { project: { select: PROJECT_SELECT }, comments: COMMENT_INCLUDE },
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  private async findOwned(id: number, userId: number) {
    const entry = await this.prisma.workLogEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Entry not found');
    if (entry.employeeId !== userId) throw new ForbiddenException('You can only modify your own entries');
    if (entry.entryDate.getTime() !== todayDateOnly().getTime()) {
      throw new BadRequestException('Past entries are locked and cannot be changed');
    }
    return entry;
  }

  async update(id: number, dto: UpdateWorkLogEntryDto, userId: number) {
    await this.findOwned(id, userId);
    if (dto.projectId) await this.assertMembership(dto.projectId, userId);
    return this.prisma.workLogEntry.update({
      where: { id },
      data: { ...dto, edited: true },
      include: { project: { select: PROJECT_SELECT } },
    });
  }

  async remove(id: number, userId: number) {
    await this.findOwned(id, userId);
    await this.prisma.workLogEntry.delete({ where: { id } });
    return { success: true };
  }

  private buildWhere(filter: WorkLogFilterDto) {
    const where: any = {};
    if (filter.employeeId) where.employeeId = filter.employeeId;
    if (filter.projectId) where.projectId = filter.projectId;
    if (filter.contributionType) where.contributionType = filter.contributionType;
    if (filter.dateFrom || filter.dateTo) {
      where.entryDate = {};
      if (filter.dateFrom) where.entryDate.gte = new Date(filter.dateFrom);
      if (filter.dateTo) where.entryDate.lte = new Date(filter.dateTo);
    }
    return where;
  }

  async findAggregate(filter: WorkLogFilterDto) {
    return this.prisma.workLogEntry.findMany({
      where: this.buildWhere(filter),
      include: { employee: { select: EMPLOYEE_SELECT }, project: { select: PROJECT_SELECT }, comments: COMMENT_INCLUDE },
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getOverview() {
    const today = todayDateOnly();
    const weekStart = startOfWeek();

    const [entriesToday, entriesThisWeek, byProjectRaw, employees, lastEntryRaw] = await Promise.all([
      this.prisma.workLogEntry.count({ where: { entryDate: today } }),
      this.prisma.workLogEntry.count({ where: { entryDate: { gte: weekStart } } }),
      this.prisma.workLogEntry.groupBy({ by: ['projectId'], _count: { _all: true } }),
      this.prisma.user.findMany({ where: { role: 'EMPLOYEE' }, select: EMPLOYEE_SELECT, orderBy: { name: 'asc' } }),
      this.prisma.workLogEntry.groupBy({ by: ['employeeId'], _max: { entryDate: true } }),
    ]);

    const projects = await this.prisma.project.findMany({ where: { id: { in: byProjectRaw.map(p => p.projectId) } }, select: PROJECT_SELECT });
    const projectNameById = new Map(projects.map(p => [p.id, p.name]));
    const byProject = byProjectRaw
      .map(p => ({ projectId: p.projectId, projectName: projectNameById.get(p.projectId) || 'Unknown', count: p._count._all }))
      .sort((a, b) => b.count - a.count);

    const lastEntryByEmployee = new Map(lastEntryRaw.map(e => [e.employeeId, e._max.entryDate]));
    const employeeActivity = employees.map(e => {
      const last = lastEntryByEmployee.get(e.id) || null;
      return {
        ...e,
        lastLoggedDate: last,
        loggedToday: !!last && last.getTime() === today.getTime(),
        loggedThisWeek: !!last && last.getTime() >= weekStart.getTime(),
      };
    });

    return {
      entriesToday,
      entriesThisWeek,
      byProject,
      employeeActivity,
    };
  }

  async exportRows(filter: WorkLogFilterDto) {
    const entries = await this.findAggregate(filter);
    return entries.map(e => ({
      date: e.entryDate.toISOString().slice(0, 10),
      employee: e.employee.name,
      email: e.employee.email,
      project: e.project.name,
      type: e.contributionType,
      description: e.description,
      link: e.link || '',
      tags: e.tags.join('; '),
      edited: e.edited ? 'yes' : 'no',
    }));
  }

  async addComment(entryId: number, authorId: number, message: string) {
    const entry = await this.prisma.workLogEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw new NotFoundException('Entry not found');
    await this.prisma.workLogComment.create({ data: { entryId, authorId, message } });
    return this.prisma.workLogComment.findMany({
      where: { entryId },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }
}
