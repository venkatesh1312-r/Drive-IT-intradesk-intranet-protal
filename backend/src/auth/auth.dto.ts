import { IsNotEmpty, Matches, Length } from 'class-validator';
import { Transform } from 'class-transformer';

// OTP login rule: firstname.initial@driveittech.in (e.g. priya.s@driveittech.in)
export const OTP_EMAIL_RULE = /^[a-z]+\.[a-z]@driveittech\.in$/;
const OTP_EMAIL_MSG =
  'Email must be in the format firstname.initial@driveittech.in';

export class RequestOtpDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @Matches(OTP_EMAIL_RULE, { message: OTP_EMAIL_MSG })
  email: string;
}

export class VerifyOtpDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @Matches(OTP_EMAIL_RULE, { message: OTP_EMAIL_MSG })
  email: string;

  @IsNotEmpty()
  @Length(6, 6, { message: 'The code is 6 digits' })
  @Matches(/^\d{6}$/, { message: 'The code is 6 digits' })
  otp: string;
}

// ── Password-based auth ─────────────────────────────────────────────

/** Sign-up: user only submits their email; the account must already exist
 *  (pre-created by an admin with a role assigned). We email a "set password"
 *  activation link rather than accepting a password directly here. */
export class SignupDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @Matches(OTP_EMAIL_RULE, { message: OTP_EMAIL_MSG })
  email: string;
}

export class ForgotPasswordDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @Matches(OTP_EMAIL_RULE, { message: OTP_EMAIL_MSG })
  email: string;
}

/** Used both for first-time activation (signup) and forgot-password reset —
 *  same token mechanism, same endpoint. */
export class SetPasswordDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @Matches(OTP_EMAIL_RULE, { message: OTP_EMAIL_MSG })
  email: string;

  @IsNotEmpty()
  token: string;

  @IsNotEmpty()
  @Length(8, 72, { message: 'Password must be at least 8 characters' })
  password: string;
}

export class LoginDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @Matches(OTP_EMAIL_RULE, { message: OTP_EMAIL_MSG })
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
