import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
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

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Legacy OTP endpoints — retained for backward compatibility, no longer
  // used by the Sign In / Sign Up UI (password-only now).
  @Post('request-otp')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto);
  }

  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  // ── Sign up (self-service, 3 steps: email OTP → verify → details+password) ──
  @Post('signup/request-otp')
  signupRequestOtp(@Body() dto: SignupRequestOtpDto) {
    return this.authService.signupRequestOtp(dto);
  }

  @Post('signup/verify-otp')
  signupVerifyOtp(@Body() dto: SignupVerifyOtpDto) {
    return this.authService.signupVerifyOtp(dto);
  }

  @Post('signup/complete')
  signupComplete(@Body() dto: SignupCompleteDto) {
    return this.authService.signupComplete(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('set-password')
  setPassword(@Body() dto: SetPasswordDto) {
    return this.authService.setPassword(dto);
  }
}
