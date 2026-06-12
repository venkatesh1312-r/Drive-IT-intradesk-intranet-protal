import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateNominationDto, ApproveNominationDto } from './nominations.dto';

const HR_CATEGORIES = ['TEAM_PLAYER', 'ABOVE_AND_BEYOND'];

@Injectable()
export class NominationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateNominationDto, userId: number) {
    return this.prisma.nomination.create({
      data: { ...dto, submittedById: userId },
    });
  }

  async findMine(userId: number) {
    return this.prisma.nomination.findMany({
      where: { submittedById: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findReceived(userName: string) {
    return this.prisma.nomination.findMany({
      where: { nomineeName: userName, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll() {
    return this.prisma.nomination.findMany({
      include: { submittedBy: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findForHR() {
    return this.prisma.nomination.findMany({
      where: { category: { in: HR_CATEGORIES as any[] } },
      include: { submittedBy: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStats() {
    const [total, pending, escalated, approved, declined] = await Promise.all([
      this.prisma.nomination.count(),
      this.prisma.nomination.count({ where: { status: 'PENDING' } }),
      this.prisma.nomination.count({ where: { status: 'ESCALATED' } }),
      this.prisma.nomination.count({ where: { status: 'APPROVED' } }),
      this.prisma.nomination.count({ where: { status: 'DECLINED' } }),
    ]);
    return { total, pending, escalated, approved, declined };
  }

  async approve(id: number, dto: ApproveNominationDto) {
    const nom = await this.prisma.nomination.findUnique({ where: { id } });
    if (!nom) throw new NotFoundException('Nomination not found');
    if (nom.status !== 'PENDING' && nom.status !== 'ESCALATED')
      throw new BadRequestException('Only PENDING or ESCALATED nominations can be approved');

    // Try to find the nominee by name (case-insensitive) to award points.
    // If no account exists yet, still approve — points will be awarded when account is linked later.
    const nominee = await this.prisma.user.findFirst({
      where: { name: { equals: nom.nomineeName, mode: 'insensitive' } },
    });

    if (nominee) {
      const [updated] = await this.prisma.$transaction([
        this.prisma.nomination.update({
          where: { id },
          data: { status: 'APPROVED', points: dto.points },
        }),
        this.prisma.user.update({
          where: { id: nominee.id },
          data: { points: { increment: dto.points } },
        }),
      ]);
      return updated;
    }

    return this.prisma.nomination.update({
      where: { id },
      data: { status: 'APPROVED', points: dto.points },
    });
  }

  async decline(id: number) {
    const nom = await this.prisma.nomination.findUnique({ where: { id } });
    if (!nom) throw new NotFoundException('Nomination not found');
    if (nom.status !== 'PENDING' && nom.status !== 'ESCALATED')
      throw new BadRequestException('Only PENDING or ESCALATED nominations can be declined');
    return this.prisma.nomination.update({
      where: { id },
      data: { status: 'DECLINED' },
    });
  }

  async escalate(id: number) {
    const nom = await this.prisma.nomination.findUnique({ where: { id } });
    if (!nom) throw new NotFoundException('Nomination not found');
    if (nom.status !== 'PENDING')
      throw new BadRequestException('Only PENDING nominations can be escalated');
    return this.prisma.nomination.update({
      where: { id },
      data: { status: 'ESCALATED' },
    });
  }
}
