import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface NotificationPayload {
  userId: number;
  ticketId?: number;
  ticketNumber?: string;
  ticketTitle?: string;
  message: string;
  actionRequired?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(payload: NotificationPayload) {
    return this.prisma.inAppNotification.create({ data: payload });
  }

  async createMany(notifications: NotificationPayload[]) {
    return this.prisma.inAppNotification.createMany({ data: notifications });
  }

  async getUserNotifications(userId: number) {
    return this.prisma.inAppNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  async getUnreadCount(userId: number) {
    return this.prisma.inAppNotification.count({ where: { userId, isRead: false } });
  }

  async markAllRead(userId: number) {
    return this.prisma.inAppNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async markOneRead(id: number, userId: number) {
    return this.prisma.inAppNotification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async clearAll(userId: number) {
    return this.prisma.inAppNotification.deleteMany({ where: { userId } });
  }
}
