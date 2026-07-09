import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { RequestOtpDto, VerifyOtpDto } from './auth.dto';
import { MailerService } from './mailer.service';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';

// ── OTP policy ──────────────────────────────────────────────────────
const OTP_TTL_MINUTES = 5;
const OTP_RESEND_COOLDOWN_S = 60;
const OTP_MAX_ATTEMPTS = 5;

/** "priya.s@driveittech.in" → "Priya S" — placeholder until admin/user edits it */
function nameFromEmail(email: string) {
  const local = email.split('@')[0];
  return local
    .split('.')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mailer: MailerService,
  ) {}

  // ─── OTP: request ─────────────────────────────────────────────────
  async requestOtp(dto: RequestOtpDto) {
    const email = dto.email; // already trimmed + lowercased by the DTO

    let user = await this.prisma.user.findUnique({ where: { email } });

    if (user?.status === 'REJECTED') {
      throw new ForbiddenException('Your access request was declined. Please contact the administrator.');
    }

    // Resend cooldown
    if (user?.lastOtpSentAt) {
      const elapsed = (Date.now() - user.lastOtpSentAt.getTime()) / 1000;
      if (elapsed < OTP_RESEND_COOLDOWN_S) {
        const wait = Math.ceil(OTP_RESEND_COOLDOWN_S - elapsed);
        throw new HttpException(
          { message: `Please wait ${wait}s before requesting a new code.`, retryAfter: wait },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // First-time email → create account awaiting approval, no role yet.
    if (!user) {
      user = await this.prisma.user.create({
        data: { email, name: nameFromEmail(email), status: 'AWAITING_APPROVAL' },
      });
    }

    const otp = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const otpHash = await bcrypt.hash(otp, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otpHash,
        otpExpiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60_000),
        otpAttempts: 0,
        lastOtpSentAt: new Date(),
      },
    });

    // Fire-and-forget: respond to the user immediately instead of holding
    // the request open while the mail server is contacted. Failures are
    // logged; the user can hit "Resend" after the cooldown.
    this.mailer
      .sendOtp(email, otp, OTP_TTL_MINUTES)
      .catch((err) => console.error(`[OTP mail] delivery to ${email} failed:`, err.message));

    return { success: true, message: 'A login code has been sent to your email.', resendIn: OTP_RESEND_COOLDOWN_S };
  }

  // ─── OTP: verify ──────────────────────────────────────────────────
  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Generic error — no hints about which part failed.
    const invalid = () => new UnauthorizedException('Invalid or expired code.');

    if (!user || !user.otpHash || !user.otpExpiresAt) throw invalid();
    if (user.status === 'REJECTED') {
      throw new ForbiddenException('Your access request was declined. Please contact the administrator.');
    }
    if (user.otpExpiresAt.getTime() < Date.now()) throw invalid();
    if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
      throw new UnauthorizedException('Too many incorrect attempts. Please request a new code.');
    }

    const match = await bcrypt.compare(dto.otp, user.otpHash);
    if (!match) {
      const attempts = user.otpAttempts + 1;
      await this.prisma.user.update({ where: { id: user.id }, data: { otpAttempts: attempts } });
      if (attempts >= OTP_MAX_ATTEMPTS) {
        throw new UnauthorizedException('Too many incorrect attempts. Please request a new code.');
      }
      throw new UnauthorizedException(`Incorrect code. ${OTP_MAX_ATTEMPTS - attempts} attempt(s) left.`);
    }

    // Success — OTP is single-use.
    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpHash: null, otpExpiresAt: null, otpAttempts: 0 },
    });

    // Not yet approved → no session; frontend shows the pending screen.
    if (user.status !== 'ACTIVE' || !user.role) {
      return { pending: true, status: user.status, user: { email: user.email, name: user.name } };
    }

    const token = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
    const { otpHash, otpExpiresAt, otpAttempts, lastOtpSentAt, ...result } = user;
    return { access_token: token, user: result };
  }
}
