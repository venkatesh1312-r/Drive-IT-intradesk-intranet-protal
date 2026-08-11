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
import {
  RequestOtpDto,
  VerifyOtpDto,
  SignupRequestOtpDto,
  SignupVerifyOtpDto,
  SignupCompleteDto,
  ForgotPasswordDto,
  SetPasswordDto,
  LoginDto,
} from './auth.dto';
import { MailerService } from './mailer.service';
import * as bcrypt from 'bcrypt';
import { randomInt, randomBytes } from 'crypto';

// ── OTP policy ──────────────────────────────────────────────────────
const OTP_TTL_MINUTES = 5;
const OTP_RESEND_COOLDOWN_S = 60;
const OTP_MAX_ATTEMPTS = 5;

// ── Sign-up OTP policy (email verification step) ──────────────────
// Each code is valid for 5 minutes. Once it expires, the user must
// click "Resend" to get a new one — the same request-otp endpoint
// generates a fresh code with a fresh 5-minute window.
const SIGNUP_OTP_TTL_MINUTES = 5;
const SIGNUP_OTP_RESEND_COOLDOWN_S = 60;
const SIGNUP_OTP_MAX_ATTEMPTS = 5;

// ── Password-link policy (signup activation + forgot password) ────────
const PW_LINK_TTL_MINUTES = 5;
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

  // ─── Sign up (step 1): domain-email verification ───────────────────
  // Validates that the address is a well-formed, not-yet-registered
  // @driveittech.in mail. No signup data (name/role/password) is stored
  // at this stage — only a bare row (email + placeholder name) so the
  // OTP has somewhere to live. If the account is already fully signed
  // up (has a password), we tell the user to sign in instead.
  async signupRequestOtp(dto: SignupRequestOtpDto) {
    const email = dto.email; // already trimmed + lowercased + pattern-checked by the DTO

    let user = await this.prisma.user.findUnique({ where: { email } });

    if (user?.status === 'REJECTED') {
      throw new ForbiddenException('This email is not eligible to sign up. Please contact the administrator.');
    }
    if (user?.passwordHash) {
      throw new BadRequestException('An account already exists for this email. Please sign in instead.');
    }

    // Resend cooldown
    if (user?.lastOtpSentAt) {
      const elapsed = (Date.now() - user.lastOtpSentAt.getTime()) / 1000;
      if (elapsed < SIGNUP_OTP_RESEND_COOLDOWN_S) {
        const wait = Math.ceil(SIGNUP_OTP_RESEND_COOLDOWN_S - elapsed);
        throw new HttpException(
          { message: `Please wait ${wait}s before requesting a new code.`, retryAfter: wait },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // First time we see this email → create the bare row now. Every other
    // column (role, password, department, ...) stays null/default until
    // step 3 completes.
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
        otpExpiresAt: new Date(Date.now() + SIGNUP_OTP_TTL_MINUTES * 60_000),
        otpAttempts: 0,
        lastOtpSentAt: new Date(),
        otpVerified: false, // any earlier verification is invalidated by a fresh code
      },
    });

    this.mailer
      .sendOtp(email, otp, SIGNUP_OTP_TTL_MINUTES)
      .catch((err) => console.error(`[Signup OTP mail] delivery to ${email} failed:`, err.message));

    return {
      success: true,
      message: 'A verification code has been sent to your email.',
      resendIn: SIGNUP_OTP_RESEND_COOLDOWN_S,
      expiresIn: SIGNUP_OTP_TTL_MINUTES * 60,
    };
  }

  // ─── Sign up (step 2): verify the OTP ───────────────────────────────
  // On success, marks the row otpVerified = true so step 3 is allowed,
  // and clears the OTP itself (single-use). Does NOT issue a session —
  // the account has no password yet.
  async signupVerifyOtp(dto: SignupVerifyOtpDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const invalid = () => new UnauthorizedException('Invalid or expired code.');

    if (!user || !user.otpHash || !user.otpExpiresAt) throw invalid();
    if (user.status === 'REJECTED') {
      throw new ForbiddenException('This email is not eligible to sign up. Please contact the administrator.');
    }
    if (user.passwordHash) {
      throw new BadRequestException('An account already exists for this email. Please sign in instead.');
    }
    if (user.otpExpiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('This code has expired. Please request a new one.');
    }
    if (user.otpAttempts >= SIGNUP_OTP_MAX_ATTEMPTS) {
      throw new UnauthorizedException('Too many incorrect attempts. Please request a new code.');
    }

    const match = await bcrypt.compare(dto.otp, user.otpHash);
    if (!match) {
      const attempts = user.otpAttempts + 1;
      await this.prisma.user.update({ where: { id: user.id }, data: { otpAttempts: attempts } });
      if (attempts >= SIGNUP_OTP_MAX_ATTEMPTS) {
        throw new UnauthorizedException('Too many incorrect attempts. Please request a new code.');
      }
      throw new UnauthorizedException(`Incorrect code. ${SIGNUP_OTP_MAX_ATTEMPTS - attempts} attempt(s) left.`);
    }

    // Success — OTP is single-use; flip the verified gate for step 3.
    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpHash: null, otpExpiresAt: null, otpAttempts: 0, otpVerified: true },
    });

    // Let the frontend show the real role (e.g. a pre-seeded ADMIN slot)
    // instead of assuming EMPLOYEE for everyone.
    return {
      success: true,
      verified: true,
      message: 'Email verified. You can now set up your account.',
      role: user.role || 'EMPLOYEE',
    };
  }

  // ─── Sign up (step 3): collect details + password ───────────────────
  // Only reachable once step 2 set otpVerified = true for this email.
  // Role defaults to EMPLOYEE for brand-new signups. If the row already
  // had a role pre-set (e.g. the seeded ADMIN bootstrap slot), that role
  // is preserved instead of being overwritten — the client can never
  // supply a role either way, since SignupCompleteDto doesn't accept one.
  async signupComplete(dto: SignupCompleteDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user) {
      throw new BadRequestException('Please verify your email before continuing.');
    }
    if (user.status === 'REJECTED') {
      throw new ForbiddenException('This email is not eligible to sign up. Please contact the administrator.');
    }
    if (user.passwordHash) {
      throw new BadRequestException('An account already exists for this email. Please sign in instead.');
    }
    if (!user.otpVerified) {
      throw new UnauthorizedException('Please verify your email with the OTP before continuing.');
    }
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        name: dto.name.trim(),
        role: user.role ?? 'EMPLOYEE', // preserve a pre-set role (e.g. seeded ADMIN); default EMPLOYEE for brand-new rows
        passwordHash,
        status: 'ACTIVE',
        otpVerified: false,
      },
    });

    return { success: true, message: 'Account created successfully. You can now sign in.' };
  }

  // ─── Forgot password: explicitly checks whether the email exists.
  // - Not in DB at all → tell them to sign up.
  // - Exists but no password yet (mid-signup / never completed) → tell them to sign up.
  // - Exists and activated → send the reset link.
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user) {
      throw new BadRequestException('No account found for this email. Please sign up first.');
    }
    if (user.status === 'REJECTED') {
      throw new ForbiddenException('This account is not eligible to reset a password. Please contact the administrator.');
    }
    if (!user.passwordHash) {
      throw new BadRequestException('No account found for this email. Please sign up first.');
    }

    await this.issuePasswordLink(user, 'reset');
    return { success: true, message: 'A password reset link has been sent to your email.' };
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