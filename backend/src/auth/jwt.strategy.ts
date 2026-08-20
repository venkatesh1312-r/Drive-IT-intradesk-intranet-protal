import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../prisma.service';

// Pulls the JWT out of our httpOnly "token" cookie instead of an
// Authorization header — the frontend never reads or stores the token
// itself, the browser just attaches the cookie automatically.
function fromCookie(req: Request): string | null {
  return (req && req.cookies && req.cookies.token) || null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: fromCookie,
      secretOrKey: process.env.JWT_SECRET || 'secret',
    });
  }

  async validate(payload: { sub: number; email: string; role: string; sid?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException();
    // A token issued earlier must die the moment the account is no longer
    // active (rejected / set back to pending) — enforced on every request.
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Account is not active');
    // Single-active-session: if this user has since logged in elsewhere,
    // their currentSessionId has moved on and this older token's `sid`
    // no longer matches — sign it out here, silently, on this next call.
    if (payload.sid && user.currentSessionId && payload.sid !== user.currentSessionId) {
      throw new UnauthorizedException('Signed in from another device');
    }
    // Never let credential material ride along on req.user (it would leak
    // through endpoints that spread the user object, e.g. GET /users/me).
    const {
      otpHash, otpExpiresAt, otpAttempts, lastOtpSentAt,
      passwordHash, passwordTokenHash, passwordTokenExpires,
      currentSessionId,
      ...safe
    } = user;
    return safe;
  }
}
