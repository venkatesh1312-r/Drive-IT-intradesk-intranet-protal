import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { RegisterDto, LoginDto } from './auth.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async register(dto: RegisterDto) {
    const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN;
    if (allowedDomain) {
      const emailDomain = dto.email.split('@')[1]?.toLowerCase();
      if (emailDomain !== allowedDomain.toLowerCase()) {
        throw new BadRequestException(
          `Registration is restricted to @${allowedDomain} email addresses.`,
        );
      }
    }
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, password: hashed },
    });
    const { password, ...result } = user;
    return result;
  }

  async login(dto: LoginDto) {
    const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN;
    if (allowedDomain) {
      const emailDomain = dto.email.split('@')[1]?.toLowerCase();
      if (emailDomain !== allowedDomain.toLowerCase()) {
        throw new BadRequestException(`Only @${allowedDomain} email addresses are permitted`);
      }
    }
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    const token = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
    const { password, ...result } = user;
    return { access_token: token, user: result };
  }
}
