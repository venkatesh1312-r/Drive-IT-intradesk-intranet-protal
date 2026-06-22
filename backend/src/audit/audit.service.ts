import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: {
    ticketId: number;
    userId: number;
    changeType: string;
    fieldChanged?: string;
    oldValue?: string;
    newValue?: string;
  }) {
    return this.prisma.auditLog.create({ data });
  }

  async getTicketHistory(ticketId: number) {
    return this.prisma.auditLog.findMany({
      where: { ticketId },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }
}
