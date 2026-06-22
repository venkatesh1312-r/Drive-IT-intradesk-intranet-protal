import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

/* Mirror of TicketsService.canAccess — agents are confined to their own department. */
function canAccessTicket(user: any, ticket: { department: string; raisedById: number }): boolean {
  if (user.role === 'ADMIN') return true;
  if (ticket.raisedById === user.id) return true;
  if (user.role === 'EMPLOYEE') return false;
  if (user.role === 'IT') return ticket.department === 'IT';
  if (user.role === 'HR') return ticket.department === 'HR';
  return false;
}

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
  ) {}

  async create(ticketId: number, message: string, user: any) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (!canAccessTicket(user, ticket)) {
      throw new ForbiddenException('You can only comment on tickets in your scope');
    }

    const comment = await this.prisma.comment.create({
      data: { message, ticketId, authorId: user.id },
      include: { author: { select: { id: true, name: true, role: true, department: true } } },
    });

    await this.audit.log({ ticketId, userId: user.id, changeType: 'COMMENT_ADDED', fieldChanged: 'comment', newValue: String(comment.id) });

    const notifyUserId = user.id === ticket.raisedById
      ? (ticket.assignedToId ?? null)
      : ticket.raisedById;

    if (notifyUserId) {
      await this.notifications.create({
        userId: notifyUserId,
        ticketId,
        ticketNumber: ticket.ticketNumber,
        ticketTitle: ticket.title,
        message: `New comment on ticket #${ticket.ticketNumber} by ${user.name}`,
        actionRequired: 'VIEW',
      });
    }

    return comment;
  }

  async findAll(ticketId: number, user: any) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (!canAccessTicket(user, ticket)) throw new ForbiddenException('Access denied');
    return this.prisma.comment.findMany({
      where: { ticketId },
      include: { author: { select: { id: true, name: true, role: true, department: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(id: number, message: string, userId: number) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) throw new ForbiddenException('You can only edit your own comments');
    return this.prisma.comment.update({
      where: { id },
      data: { message, isEdited: true, editedAt: new Date() },
      include: { author: { select: { id: true, name: true, role: true, department: true } } },
    });
  }
}
