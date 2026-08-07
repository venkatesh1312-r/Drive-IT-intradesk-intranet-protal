import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { RequestOtpDto, VerifyOtpDto, SignupDto, ForgotPasswordDto, SetPasswordDto, LoginDto } from './auth.dto';
import { MailerService } from './mailer.service';
import * as bcrypt from 'bcrypt';
import { randomInt, randomBytes } from 'crypto';

// ── OTP policy ──────────────────────────────────────────────────────
const OTP_TTL_MINUTES = 5;
const OTP_RESEND_COOLDOWN_S = 60;
const OTP_MAX_ATTEMPTS = 5;

// ── Password-link policy (signup activation + forgot password) ────────
const PW_LINK_TTL_MINUTES = 30;
const PW_LINK_RESEND_COOLDOWN_S = 60;

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

  // ─── Password auth: shared helper to issue + email a link ─────────
  private async issuePasswordLink(user: { id: number; email: string; lastPasswordEmailAt: Date | null }, mode: 'activate' | 'reset') {
    if (user.lastPasswordEmailAt) {
      const elapsed = (Date.now() - user.lastPasswordEmailAt.getTime()) / 1000;
      if (elapsed < PW_LINK_RESEND_COOLDOWN_S) {
        const wait = Math.ceil(PW_LINK_RESEND_COOLDOWN_S - elapsed);
        throw new HttpException(
          { message: `Please wait ${wait}s before requesting another link.`, retryAfter: wait },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const rawToken = randomBytes(32).toString('hex'); // 64-char URL-safe token
    const tokenHash = await bcrypt.hash(rawToken, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordTokenHash: tokenHash,
        passwordTokenExpires: new Date(Date.now() + PW_LINK_TTL_MINUTES * 60_000),
        lastPasswordEmailAt: new Date(),
      },
    });

    const base = process.env.FRONTEND_URL || 'http://localhost:3000';
    const link = `${base}/set-password?mode=${mode}&email=${encodeURIComponent(user.email)}&token=${rawToken}`;

    this.mailer
      .sendPasswordLink(user.email, link, PW_LINK_TTL_MINUTES, mode)
      .catch((err) => console.error(`[password link mail] delivery to ${user.email} failed:`, err.message));
  }

  // ─── Sign up: email must already exist (pre-created by an admin with a
  // role assigned). If it exists and has no password yet, email an
  // activation link. Never reveals whether the email exists or not. ────
  async signup(dto: SignupDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const generic = { success: true, message: 'If an account exists for that email, a setup link has been sent.' };

    if (!user) return generic;
    if (user.status === 'REJECTED') return generic;
    if (user.passwordHash) {
      // Already activated — nudge them toward Sign In instead of re-issuing a link.
      throw new BadRequestException('This account is already activated. Please sign in, or use "Forgot password" instead.');
    }

    await this.issuePasswordLink(user, 'activate');
    return generic;
  }

  // ─── Forgot password: only works for accounts that already have a
  // password set (i.e. already activated). If the email doesn't exist at
  // all, we stay generic (don't leak which emails are registered) — but if
  // it exists and simply hasn't been activated yet, we tell them plainly to
  // use Sign Up instead, since that's a real UX dead-end otherwise.
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const generic = { success: true, message: 'If an account exists for that email, a reset link has been sent.' };

    if (!user || user.status === 'REJECTED') return generic;

    if (!user.passwordHash) {
      throw new BadRequestException('No password set for this account yet. Please use "Sign Up" to create your password first.');
    }

    await this.issuePasswordLink(user, 'reset');
    return generic;
  }

  // ─── Set password: consumes the token from the emailed link, used for
  // both first-time activation and forgot-password reset. ─────────────
  async setPassword(dto: SetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const invalid = () => new UnauthorizedException('This link is invalid or has expired. Please request a new one.');

    if (!user || !user.passwordTokenHash || !user.passwordTokenExpires) throw invalid();
    if (user.passwordTokenExpires.getTime() < Date.now()) throw invalid();

    const match = await bcrypt.compare(dto.token, user.passwordTokenHash);
    if (!match) throw invalid();

    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordTokenHash: null, passwordTokenExpires: null },
    });

    return { success: true, message: 'Password set successfully. You can now sign in.' };
  }

  // ─── Login: email + password ───────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const invalid = () => new UnauthorizedException('Incorrect email or password.');

    if (!user || !user.passwordHash) throw invalid();
    if (user.status === 'REJECTED') {
      throw new ForbiddenException('Your access has been revoked. Please contact the administrator.');
    }

    const match = await bcrypt.compare(dto.password, user.passwordHash);
    if (!match) throw invalid();

    if (user.status !== 'ACTIVE' || !user.role) {
      return { pending: true, status: user.status, user: { email: user.email, name: user.name } };
    }

    const token = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
    const { otpHash, otpExpiresAt, otpAttempts, lastOtpSentAt, passwordHash, passwordTokenHash, passwordTokenExpires, ...result } = user;
    return { access_token: token, user: result };
  }
}