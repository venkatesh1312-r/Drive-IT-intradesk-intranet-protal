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

// Strong-password rule: min 8 chars, at least 1 uppercase, 1 lowercase,
// 2 digits, and 1 special character. Must mirror the frontend check.
export const STRONG_PASSWORD_RULE =
  /^(?=(?:.*[A-Z]){1,})(?=(?:.*[a-z]){1,})(?=(?:.*\d.*\d))(?=(?:.*[^A-Za-z0-9]){1,}).{8,72}$/;
const STRONG_PASSWORD_MSG =
  'Password must be 8-72 characters and include at least 1 uppercase letter, 1 lowercase letter, 2 numbers, and 1 special character';

// ── Sign-up (self-service, 3 steps) ─────────────────────────────────
// Step 1: user submits just their company email. If it's a valid,
// not-already-registered @driveittech.in address, we create a bare
// row (email + placeholder name only, everything else null) and email
// an OTP. No other signup data is stored until the OTP is verified.
export class SignupRequestOtpDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @Matches(OTP_EMAIL_RULE, { message: OTP_EMAIL_MSG })
  email: string;
}

// Step 2: user submits the 6-digit code sent to their email.
export class SignupVerifyOtpDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @Matches(OTP_EMAIL_RULE, { message: OTP_EMAIL_MSG })
  email: string;

  @IsNotEmpty()
  @Length(6, 6, { message: 'The code is 6 digits' })
  @Matches(/^\d{6}$/, { message: 'The code is 6 digits' })
  otp: string;
}

// Step 3: only allowed once the email's OTP has been verified (checked
// server-side via the otpVerified flag). Role is intentionally NOT part
// of this DTO — it's always forced to EMPLOYEE by the service, never
// taken from client input.
export class SignupCompleteDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @Matches(OTP_EMAIL_RULE, { message: OTP_EMAIL_MSG })
  email: string;

  @IsNotEmpty({ message: 'Name is required' })
  @Length(2, 100, { message: 'Name must be between 2 and 100 characters' })
  name: string;

  @IsNotEmpty()
  @Length(8, 72, { message: 'Password must be at least 8 characters' })
  @Matches(STRONG_PASSWORD_RULE, { message: STRONG_PASSWORD_MSG })
  password: string;

  @IsNotEmpty({ message: 'Please confirm your password' })
  confirmPassword: string;
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
  @Matches(STRONG_PASSWORD_RULE, { message: STRONG_PASSWORD_MSG })
  password: string;
}

export class LoginDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @Matches(OTP_EMAIL_RULE, { message: OTP_EMAIL_MSG })
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
