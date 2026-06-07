import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards';
import { PrismaService } from '../prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('api/users')
export class UsersController {
  constructor(private prisma: PrismaService) {}

  @Get('wallet')
  async getWallet(@Request() req) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, points: true, role: true },
    });
    return user;
  }

  @Get('me')
  getMe(@Request() req) {
    const { password, ...user } = req.user;
    return user;
  }
}
