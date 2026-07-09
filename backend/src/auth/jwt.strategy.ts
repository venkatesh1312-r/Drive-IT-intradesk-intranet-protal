import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'secret',
    });
  }

  async validate(payload: { sub: number; email: string; role: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException();
    // A token issued earlier must die the moment the account is no longer
    // active (rejected / set back to pending) — enforced on every request.
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Account is not active');
    // Never let credential material ride along on req.user (it would leak
    // through endpoints that spread the user object, e.g. GET /users/me).
    const { otpHash, otpExpiresAt, otpAttempts, lastOtpSentAt, ...safe } = user;
    return safe;
  }
}
