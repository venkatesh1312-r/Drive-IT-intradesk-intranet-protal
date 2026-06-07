import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateNominationDto, ApproveNominationDto } from './nominations.dto';

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

  async findAll() {
    return this.prisma.nomination.findMany({
      include: { submittedBy: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStats() {
    const [total, pending, approved, declined] = await Promise.all([
      this.prisma.nomination.count(),
      this.prisma.nomination.count({ where: { status: 'PENDING' } }),
      this.prisma.nomination.count({ where: { status: 'APPROVED' } }),
      this.prisma.nomination.count({ where: { status: 'DECLINED' } }),
    ]);
    return { total, pending, approved, declined };
  }

  async approve(id: number, dto: ApproveNominationDto) {
    const nom = await this.prisma.nomination.findUnique({ where: { id } });
    if (!nom) throw new NotFoundException('Nomination not found');

    const [updated] = await this.prisma.$transaction([
      this.prisma.nomination.update({
        where: { id },
        data: { status: 'APPROVED', points: dto.points },
      }),
      this.prisma.user.update({
        where: { id: nom.submittedById },
        data: { points: { increment: dto.points } },
      }),
    ]);
    return updated;
  }

  async decline(id: number) {
    const nom = await this.prisma.nomination.findUnique({ where: { id } });
    if (!nom) throw new NotFoundException('Nomination not found');
    return this.prisma.nomination.update({
      where: { id },
      data: { status: 'DECLINED' },
    });
  }
}
