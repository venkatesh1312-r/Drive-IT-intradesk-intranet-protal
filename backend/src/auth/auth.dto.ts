import { IsEmail, IsNotEmpty, MinLength, Matches } from 'class-validator';

const DOMAIN_MSG = 'Only @driveit.in email addresses are permitted';

export class RegisterDto {
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @Matches(/@driveit\.in$/i, { message: DOMAIN_MSG })
  email: string;

  @MinLength(6)
  password: string;
}

export class LoginDto {
  @IsEmail()
  @Matches(/@driveit\.in$/i, { message: DOMAIN_MSG })
  email: string;

  @IsNotEmpty()
  password: string;
}
