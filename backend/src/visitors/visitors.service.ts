import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { CheckinVisitDto } from './dto/checkin-visit.dto';
import { WalkinVisitDto } from './dto/walkin-visit.dto';
import { RescheduleVisitDto } from './dto/reschedule-visit.dto';
import { CreateMyVisitDto } from './dto/create-my-visit.dto';

const VISIT_INCLUDE = {
  visitors: true,
  host: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
};

@Injectable()
export class VisitorsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /* ── helpers ──────────────────────────────────────────────────── */

  // Visitor alerts go to every HR user only.
  private async notifyHr(message: string) {
    const hrs = await this.prisma.user.findMany({ where: { role: 'HR' }, select: { id: true } });
    if (hrs.length) await this.notifications.createMany(hrs.map(h => ({ userId: h.id, message })));
  }

  private arrivalMessage(company: string, count: number, notes?: string | null) {
    let message = `${count > 1 ? `${count} visitors` : 'A visitor'} from ${company} ${count > 1 ? 'have' : 'has'} arrived and checked in.`;
    const t = (notes || '').trim();
    if (t) message += `\nNotes: ${t.length > 60 ? t.slice(0, 60) + '...' : t}`;
    return message;
  }

  private assertNotPast(scheduledDate: Date) {
    if (scheduledDate.getTime() < Date.now()) {
      throw new BadRequestException('Visit date and time cannot be in the past.');
    }
  }

  // Times are 24-hour "HH:mm" (zero-padded) so string comparison is chronological.
  private assertCheckoutAfterCheckin(checkIn: string, checkOut: string) {
    if (checkOut <= checkIn) {
      throw new BadRequestException('Check-out time must be after check-in time.');
    }
  }

  private assertVisitorCount(numberOfVisitors: number, visitors: any[]) {
    if (!Array.isArray(visitors) || visitors.length !== numberOfVisitors) {
      throw new BadRequestException('Number of visitor details must match the number of visitors.');
    }
  }

  // No two checked-in visitors on the same calendar day may share a Govt ID.
  private async assertUniqueIdForDay(idNumber: string, dayDate: Date, excludeVisitId?: number) {
    const start = new Date(dayDate); start.setHours(0, 0, 0, 0);
    const end = new Date(dayDate); end.setHours(23, 59, 59, 999);
    const dup = await this.prisma.visitor.findFirst({
      where: {
        govtIdNumber: idNumber,
        visit: {
          is: {
            ...(excludeVisitId ? { id: { not: excludeVisitId } } : {}),
            status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
            scheduledDate: { gte: start, lte: end },
          },
        },
      },
    });
    if (dup) {
      throw new BadRequestException('This ID has already been used for another visitor today. Please use a different ID.');
    }
  }

  /* ── scheduling ───────────────────────────────────────────────── */

  // Shared creation path for HR/Admin scheduling and employee self-service.
  private async createScheduledVisit(
    data: { visitorCompany: string; purpose: string; numberOfVisitors: number; visitors: any[]; hostId?: number | null; hostName: string; scheduledDate: string; expectedCheckInTime: string; expectedCheckOutTime: string; notes?: string },
    userId: number,
  ) {
    const scheduledDate = new Date(data.scheduledDate);
    this.assertNotPast(scheduledDate);
    this.assertCheckoutAfterCheckin(data.expectedCheckInTime, data.expectedCheckOutTime);
    this.assertVisitorCount(data.numberOfVisitors, data.visitors);

    // 1. Create the Visit record first.
    const visit = await this.prisma.visit.create({
      data: {
        visitorCompany: data.visitorCompany,
        purpose: data.purpose,
        numberOfVisitors: data.numberOfVisitors,
        hostId: data.hostId ?? null,
        hostName: data.hostName,
        scheduledDate,
        expectedCheckInTime: data.expectedCheckInTime,
        expectedCheckOutTime: data.expectedCheckOutTime,
        notes: data.notes?.trim() || null,
        createdById: userId,
      },
    });

    // 2. Create all Visitor records linked to that Visit in a single createMany call.
    await this.prisma.visitor.createMany({
      data: data.visitors.map(v => ({
        visitId: visit.id,
        name: v.name.trim(),
        email: v.email?.trim() || null,
        phone: v.phone.trim(),
      })),
    });

    // 3. Return the visit with all visitors included.
    const full = await this.prisma.visit.findUnique({ where: { id: visit.id }, include: VISIT_INCLUDE });
    return full;
  }

  async schedule(dto: CreateVisitDto, userId: number) {
    return this.createScheduledVisit(dto, userId);
  }

  /* Employee self-service: only your own guests (scoped by who created them) */
  async findMine(userId: number) {
    return this.prisma.visit.findMany({
      where: { createdById: userId },
      include: VISIT_INCLUDE,
      orderBy: { scheduledDate: 'desc' },
    });
  }

  async scheduleMine(dto: CreateMyVisitDto, user: any) {
    // Host is implicitly the requesting employee.
    return this.createScheduledVisit({ ...dto, hostId: user.id, hostName: user.name }, user.id);
  }

  async findAll(filters: { status?: string; date?: string }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.date) {
      const start = new Date(filters.date); start.setHours(0, 0, 0, 0);
      const end = new Date(filters.date); end.setHours(23, 59, 59, 999);
      where.scheduledDate = { gte: start, lte: end };
    }
    return this.prisma.visit.findMany({ where, include: VISIT_INCLUDE, orderBy: { scheduledDate: 'desc' } });
  }

  async onSite() {
    return this.prisma.visit.findMany({
      where: { status: 'CHECKED_IN' },
      include: VISIT_INCLUDE,
      orderBy: { actualArrivalTime: 'desc' },
    });
  }

  async calendar(startDate?: string, endDate?: string) {
    const where: any = {};
    if (startDate && endDate) where.scheduledDate = { gte: new Date(startDate), lte: new Date(endDate) };
    return this.prisma.visit.findMany({ where, include: VISIT_INCLUDE, orderBy: { scheduledDate: 'asc' } });
  }

  /* ── lifecycle ────────────────────────────────────────────────── */

  async checkIn(id: number, dto: CheckinVisitDto) {
    const visit = await this.prisma.visit.findUnique({ where: { id }, include: { visitors: true } });
    if (!visit) throw new NotFoundException('Visit not found');
    if (visit.status !== 'SCHEDULED') throw new BadRequestException('Only scheduled visits can be checked in');

    await this.assertUniqueIdForDay(dto.visitorIdNumber, visit.scheduledDate, visit.id);

    // The badge captured at the desk is recorded against the first visitor of the booking.
    const first = visit.visitors[0];
    if (first) {
      await this.prisma.visitor.update({ where: { id: first.id }, data: { govtIdNumber: dto.visitorIdNumber } });
    }
    const updated = await this.prisma.visit.update({
      where: { id },
      data: { status: 'CHECKED_IN', actualArrivalTime: new Date() },
      include: VISIT_INCLUDE,
    });

    await this.notifyHr(this.arrivalMessage(visit.visitorCompany, visit.numberOfVisitors, visit.notes));
    return updated;
  }

  async checkOut(id: number) {
    const visit = await this.prisma.visit.findUnique({ where: { id } });
    if (!visit) throw new NotFoundException('Visit not found');
    if (visit.status !== 'CHECKED_IN') throw new BadRequestException('Only checked-in visits can be checked out');

    const updated = await this.prisma.visit.update({
      where: { id },
      data: { status: 'CHECKED_OUT', checkoutTime: new Date() },
      include: VISIT_INCLUDE,
    });

    await this.notifyHr(`The visit from ${visit.visitorCompany} has checked out.`);
    return updated;
  }

  async cancel(id: number, user: any, cancellationNote?: string) {
    const visit = await this.prisma.visit.findUnique({ where: { id } });
    if (!visit) throw new NotFoundException('Visit not found');
    // Scheduled visits can be cancelled; checked-in WALK-INS can also be cancelled.
    const cancellable = visit.status === 'SCHEDULED' || (visit.status === 'CHECKED_IN' && visit.isWalkIn);
    if (!cancellable) {
      throw new BadRequestException('Only scheduled visits or checked-in walk-ins can be cancelled');
    }
    if (user.role === 'HR' && visit.createdById !== user.id) {
      throw new ForbiddenException('You can only cancel visits you created');
    }
    return this.prisma.visit.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: user.name, cancellationNote: cancellationNote?.trim() || null },
      include: VISIT_INCLUDE,
    });
  }

  async reschedule(id: number, dto: RescheduleVisitDto, user: any) {
    const visit = await this.prisma.visit.findUnique({ where: { id } });
    if (!visit) throw new NotFoundException('Visit not found');
    if (visit.status !== 'SCHEDULED') throw new BadRequestException('Only scheduled visits can be rescheduled');
    // HR may reschedule only their own visits; Admin may reschedule any.
    if (user.role === 'HR' && visit.createdById !== user.id) {
      throw new ForbiddenException('You can only reschedule visits you created');
    }
    const scheduledDate = new Date(dto.scheduledDate);
    this.assertNotPast(scheduledDate);
    this.assertCheckoutAfterCheckin(dto.expectedCheckInTime, dto.expectedCheckOutTime);
    // Only these three fields are ever applied — locked fields cannot be overwritten.
    return this.prisma.visit.update({
      where: { id },
      data: {
        scheduledDate,
        expectedCheckInTime: dto.expectedCheckInTime,
        expectedCheckOutTime: dto.expectedCheckOutTime,
        isRescheduled: true,
      },
      include: VISIT_INCLUDE,
    });
  }

  async walkIn(dto: WalkinVisitDto, userId: number) {
    this.assertVisitorCount(dto.numberOfVisitors, dto.visitors);
    const now = new Date();
    // Each walk-in visitor's Govt ID must be unique for the day.
    for (const v of dto.visitors) {
      await this.assertUniqueIdForDay(v.govtIdNumber.trim(), now);
    }

    const visit = await this.prisma.visit.create({
      data: {
        visitorCompany: dto.visitorCompany,
        purpose: dto.purpose,
        numberOfVisitors: dto.numberOfVisitors,
        hostId: dto.hostId ?? null,
        hostName: dto.hostName,
        scheduledDate: now,
        // Walk-ins have no expected window; non-null columns are stored empty.
        expectedCheckInTime: '',
        expectedCheckOutTime: '',
        status: 'CHECKED_IN',
        actualArrivalTime: now,
        isWalkIn: true,
        notes: dto.notes?.trim() || null,
        createdById: userId,
      },
    });
    await this.prisma.visitor.createMany({
      data: dto.visitors.map(v => ({
        visitId: visit.id,
        name: v.name.trim(),
        email: v.email?.trim() || null,
        phone: v.phone.trim(),
        govtIdNumber: v.govtIdNumber.trim(),
      })),
    });
    const full = await this.prisma.visit.findUnique({ where: { id: visit.id }, include: VISIT_INCLUDE });

    await this.notifyHr(this.arrivalMessage(dto.visitorCompany, dto.numberOfVisitors, dto.notes));
    return full;
  }
}
