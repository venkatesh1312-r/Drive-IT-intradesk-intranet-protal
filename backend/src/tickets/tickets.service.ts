import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  OPEN:        ['ASSIGNED', 'IN_PROGRESS'],
  ASSIGNED:    ['IN_PROGRESS', 'REASSIGNED'],
  IN_PROGRESS: ['RESOLVED', 'REASSIGNED'],
  RESOLVED:    ['CLOSED', 'REOPENED'],
  CLOSED:      ['REOPENED'],
  REOPENED:    ['IN_PROGRESS', 'RESOLVED'],
  REASSIGNED:  ['IN_PROGRESS'],
};

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
  ) {}

  /* ── Auto-assign to the least-loaded agent who serves this department ──
     IT department tickets go to IT agents, HR department tickets go to HR agents. */
  private async autoAssign(department: string): Promise<number | null> {
    const agentRole = department === 'IT' ? 'IT' : 'HR';
    const agents = await this.prisma.user.findMany({
      where: {
        role: agentRole as any,
        OR: [
          { department: department as any },
          { department: null },
        ],
      },
      include: {
        assignedTickets: {
          where: { status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } },
        },
      },
    });
    if (!agents.length) return null;
    // Prefer department-matched agents, then sort by current load
    const deptAgents = agents.filter(a => a.department === department);
    const pool = deptAgents.length ? deptAgents : agents;
    pool.sort((a, b) => a.assignedTickets.length - b.assignedTickets.length);
    return pool[0].id;
  }

  async create(dto: CreateTicketDto, userId: number) {
    const count = await this.prisma.ticket.count();
    const ticketNumber = `TKT-${String(count + 1).padStart(4, '0')}`;

    const assignedToId = await this.autoAssign(dto.department);
    const now = new Date();

    const ticket = await this.prisma.ticket.create({
      data: {
        ticketNumber,
        title: dto.title,
        description: dto.description,
        department: dto.department,
        priority: dto.priority || 'MEDIUM',
        raisedById: userId,
        ...(assignedToId ? { assignedToId, assignedAt: now, status: 'ASSIGNED' } : {}),
      },
      include: {
        raisedBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    const notifs: any[] = [];
    const adminIds = await this.getAdminIds();

    if (assignedToId) {
      // Auto-assigned → notify the assigned agent
      notifs.push({
        userId: assignedToId, ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber, ticketTitle: ticket.title,
        message: `You have been auto-assigned ticket #${ticket.ticketNumber} — ${ticket.title}`,
        actionRequired: 'ACTION',
      });
      // Also notify admins about the new ticket
      adminIds.forEach(adminId => notifs.push({
        userId: adminId, ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber, ticketTitle: ticket.title,
        message: `New ${dto.department} ticket #${ticket.ticketNumber} assigned to ${ticket.assignedTo?.name ?? 'an agent'} — ${ticket.title}`,
        actionRequired: 'VIEW',
      }));
    } else {
      // No agent available → alert every dept agent + all admins
      const agentRole = dto.department === 'IT' ? 'IT' : 'HR';
      const deptAgents = await this.prisma.user.findMany({
        where: { role: agentRole as any, OR: [{ department: dto.department as any }, { department: null }] },
        select: { id: true },
      });
      const alertIds = new Map<number, true>();
      deptAgents.forEach(a => alertIds.set(a.id, true));
      adminIds.forEach(id => alertIds.set(id, true));
      alertIds.forEach((_, userId) => notifs.push({
        userId, ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber, ticketTitle: ticket.title,
        message: `New unassigned ${dto.department} ticket #${ticket.ticketNumber} — ${ticket.title}`,
        actionRequired: 'ACTION',
      }));
    }

    if (notifs.length) await this.notifications.createMany(notifs);

    return ticket;
  }

  async findAll(
    user: any,
    filters: { status?: string; priority?: string; department?: string; isBlocked?: boolean; search?: string; scope?: string },
  ) {
    const where: any = {};

    if (filters.scope === 'mine') {
      // Anyone (employee or IT agent) viewing tickets they personally raised
      where.raisedById = user.id;
    } else if (user.role === 'EMPLOYEE') {
      where.raisedById = user.id;
    } else if (user.role === 'IT') {
      // IT agents work the IT department queue
      where.department = 'IT';
    } else if (user.role === 'HR' && user.department) {
      where.department = user.department;
    }
    // ADMIN sees all

    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.department && user.role === 'ADMIN') where.department = filters.department;
    if (filters.isBlocked !== undefined) where.isBlocked = filters.isBlocked;
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { ticketNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.ticket.findMany({
      where,
      include: {
        raisedBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, user: any) {
    const includeAudit = user.role === 'ADMIN';
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        raisedBy: { select: { id: true, name: true, role: true } },
        assignedTo: { select: { id: true, name: true, role: true } },
        closedBy: { select: { id: true, name: true } },
        comments: {
          include: { author: { select: { id: true, name: true, role: true, department: true } } },
          orderBy: { createdAt: 'asc' },
        },
        ...(includeAudit ? {
          auditLogs: {
            include: { user: { select: { id: true, name: true, department: true } } },
            orderBy: { createdAt: 'asc' },
          },
        } : {}),
      },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    if (!this.canAccess(user, ticket)) throw new ForbiddenException('Access denied');
    return ticket;
  }

  private async getAdminIds(): Promise<number[]> {
    const admins = await this.prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    return admins.map(a => a.id);
  }

  /* Single source of truth for who may view/act on a ticket.
     Employees: only their own. IT/HR agents: only their own department (or tickets they raised).
     Admin: everything. */
  private canAccess(user: any, ticket: { department: string; raisedById: number }): boolean {
    if (user.role === 'ADMIN') return true;
    if (ticket.raisedById === user.id) return true;
    if (user.role === 'EMPLOYEE') return false;
    if (user.role === 'IT') return ticket.department === 'IT';
    if (user.role === 'HR') return ticket.department === 'HR';
    return false;
  }

  async update(id: number, dto: UpdateTicketDto, user: any) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (!this.canAccess(user, ticket)) throw new ForbiddenException('Access denied');

    const updateData: any = {};
    const notifs: any[] = [];

    // Fetch admin IDs once — used for oversight events (blocked, reopened, priority escalation)
    const needsAdminAlert = dto.status === 'REOPENED' || dto.blockedReason !== undefined || (dto.priority && dto.priority !== ticket.priority);
    const adminIds = needsAdminAlert ? await this.getAdminIds() : [];

    /* ── Status transition ── */
    if (dto.status) {
      const allowed = ALLOWED_TRANSITIONS[ticket.status] || [];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          `Cannot transition from ${ticket.status} to ${dto.status}. Allowed: ${allowed.join(', ') || 'none'}`,
        );
      }

      const newStatus = dto.status;
      updateData.status = newStatus;

      if (newStatus === 'ASSIGNED') {
        updateData.assignedAt = new Date();
        if (dto.assignedToId) updateData.assignedToId = dto.assignedToId;
        const agentId = dto.assignedToId || ticket.assignedToId;
        if (agentId) {
          notifs.push({
            userId: agentId, ticketId: id,
            ticketNumber: ticket.ticketNumber, ticketTitle: ticket.title,
            message: `You have been assigned ticket #${ticket.ticketNumber} — ${ticket.title}`,
            actionRequired: 'ACTION',
          });
        }
      }

      if (newStatus === 'IN_PROGRESS') {
        if (!ticket.assignedToId && (user.role === 'HR' || user.role === 'IT')) {
          updateData.assignedToId = user.id;
          updateData.claimedAt = new Date();
          updateData.assignedAt = new Date();
        }
        notifs.push({
          userId: ticket.raisedById, ticketId: id,
          ticketNumber: ticket.ticketNumber, ticketTitle: ticket.title,
          message: `Your ticket #${ticket.ticketNumber} is now being worked on.`,
          actionRequired: 'VIEW',
        });
      }

      if (newStatus === 'REASSIGNED') {
        const newAgentId = dto.assignedToId;
        if (newAgentId) {
          updateData.assignedToId = newAgentId;
          updateData.assignedAt = new Date();
          // Notify old agent
          if (ticket.assignedToId) {
            notifs.push({
              userId: ticket.assignedToId, ticketId: id,
              ticketNumber: ticket.ticketNumber, ticketTitle: ticket.title,
              message: `Ticket #${ticket.ticketNumber} has been reassigned away from you.`,
              actionRequired: 'VIEW',
            });
          }
          // Notify new agent
          notifs.push({
            userId: newAgentId, ticketId: id,
            ticketNumber: ticket.ticketNumber, ticketTitle: ticket.title,
            message: `Ticket #${ticket.ticketNumber} has been reassigned to you — ${ticket.title}`,
            actionRequired: 'ACTION',
          });
        }
      }

      if (newStatus === 'RESOLVED') {
        updateData.resolutionNote = dto.resolutionNote || null;
        updateData.resolvedAt = new Date();
        // A resolved ticket can no longer be "blocked" — clear any stale block state
        if (ticket.isBlocked) {
          updateData.isBlocked = false;
          updateData.blockedReason = null;
          updateData.blockedAt = null;
        }
        notifs.push({
          userId: ticket.raisedById, ticketId: id,
          ticketNumber: ticket.ticketNumber, ticketTitle: ticket.title,
          message: `Your ticket #${ticket.ticketNumber} has been resolved. Please review and close or reopen.`,
          actionRequired: 'REVIEW',
        });
      }

      if (newStatus === 'CLOSED') {
        updateData.closedAt = new Date();
        updateData.closedById = user.id;
      }

      if (newStatus === 'REOPENED') {
        // Keep the original assignee — the same agent continues working, no re-claim needed.
        // Clear the prior resolution and any block state so the ticket is "fresh" again.
        updateData.resolutionNote = null;
        updateData.resolvedAt = null;
        if (ticket.isBlocked) {
          updateData.isBlocked = false;
          updateData.blockedReason = null;
          updateData.blockedAt = null;
        }
        if (ticket.assignedToId) {
          notifs.push({
            userId: ticket.assignedToId, ticketId: id,
            ticketNumber: ticket.ticketNumber, ticketTitle: ticket.title,
            message: `Ticket #${ticket.ticketNumber} has been reopened by the requester — please continue.`,
            actionRequired: 'ACTION',
          });
        }
        adminIds.forEach(adminId => notifs.push({
          userId: adminId, ticketId: id,
          ticketNumber: ticket.ticketNumber, ticketTitle: ticket.title,
          message: `Ticket #${ticket.ticketNumber} has been reopened.`,
          actionRequired: 'VIEW',
        }));
      }

      await this.audit.log({
        ticketId: id, userId: user.id, changeType: 'STATUS_CHANGE',
        fieldChanged: 'status', oldValue: ticket.status, newValue: newStatus,
      });
    }

    /* ── Priority change ── */
    if (dto.priority && dto.priority !== ticket.priority) {
      updateData.priority = dto.priority;
      notifs.push({
        userId: ticket.raisedById, ticketId: id,
        ticketNumber: ticket.ticketNumber, ticketTitle: ticket.title,
        message: `Priority of your ticket #${ticket.ticketNumber} changed from ${ticket.priority} to ${dto.priority}.`,
        actionRequired: 'VIEW',
      });
      adminIds.forEach(adminId => notifs.push({
        userId: adminId, ticketId: id,
        ticketNumber: ticket.ticketNumber, ticketTitle: ticket.title,
        message: `Ticket #${ticket.ticketNumber} priority changed: ${ticket.priority} → ${dto.priority}.`,
        actionRequired: 'VIEW',
      }));
      await this.audit.log({
        ticketId: id, userId: user.id, changeType: 'PRIORITY_CHANGE',
        fieldChanged: 'priority', oldValue: ticket.priority, newValue: dto.priority,
      });
    }

    /* ── Block / Unblock ── */
    if (dto.blockedReason !== undefined && !dto.unblock) {
      updateData.isBlocked = true;
      updateData.blockedReason = dto.blockedReason;
      updateData.blockedAt = new Date();

      notifs.push({
        userId: ticket.raisedById, ticketId: id,
        ticketNumber: ticket.ticketNumber, ticketTitle: ticket.title,
        message: `Your ticket #${ticket.ticketNumber} is blocked: ${dto.blockedReason}`,
        actionRequired: 'VIEW',
      });
      adminIds.forEach(adminId => notifs.push({
        userId: adminId, ticketId: id,
        ticketNumber: ticket.ticketNumber, ticketTitle: ticket.title,
        message: `Ticket #${ticket.ticketNumber} is blocked: ${dto.blockedReason}`,
        actionRequired: 'ACTION',
      }));

      await this.audit.log({ ticketId: id, userId: user.id, changeType: 'BLOCKED', fieldChanged: 'isBlocked', oldValue: 'false', newValue: 'true' });
    }

    if (dto.unblock) {
      updateData.isBlocked = false;
      updateData.blockedReason = null;
      updateData.blockedAt = null;
      await this.audit.log({ ticketId: id, userId: user.id, changeType: 'UNBLOCKED', fieldChanged: 'isBlocked', oldValue: 'true', newValue: 'false' });
    }

    /* ── Manual assignment (without status change) ── */
    if (dto.assignedToId && !dto.status) {
      updateData.assignedToId = dto.assignedToId;
      updateData.assignedAt = new Date();
      if (ticket.status === 'OPEN' || ticket.status === 'REOPENED') {
        updateData.status = 'ASSIGNED';
      }
      notifs.push({
        userId: dto.assignedToId, ticketId: id,
        ticketNumber: ticket.ticketNumber, ticketTitle: ticket.title,
        message: `You have been assigned ticket #${ticket.ticketNumber} — ${ticket.title}`,
        actionRequired: 'ACTION',
      });
      await this.audit.log({
        ticketId: id, userId: user.id, changeType: 'ASSIGNMENT',
        fieldChanged: 'assignedToId', oldValue: String(ticket.assignedToId), newValue: String(dto.assignedToId),
      });
    }

    if (notifs.length) await this.notifications.createMany(notifs);

    return this.prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
        raisedBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        closedBy: { select: { id: true, name: true } },
      },
    });
  }

  async getAnalytics() {
    const [open, inProgress, resolved, closed, blocked, total, byDept, byPriority] = await Promise.all([
      this.prisma.ticket.count({ where: { status: 'OPEN' } }),
      this.prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.ticket.count({ where: { status: 'RESOLVED' } }),
      this.prisma.ticket.count({ where: { status: 'CLOSED' } }),
      this.prisma.ticket.count({ where: { isBlocked: true } }),
      this.prisma.ticket.count(),
      this.prisma.ticket.groupBy({ by: ['department'], _count: { id: true } }),
      this.prisma.ticket.groupBy({ by: ['priority'], _count: { id: true } }),
    ]);

    return {
      open, inProgress, resolved, closed, blocked, total,
      byDepartment: Object.fromEntries(byDept.map(r => [r.department, r._count.id])),
      byPriority: Object.fromEntries(byPriority.map(r => [r.priority, r._count.id])),
    };
  }
}
