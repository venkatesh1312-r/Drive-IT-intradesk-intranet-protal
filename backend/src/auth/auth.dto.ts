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
