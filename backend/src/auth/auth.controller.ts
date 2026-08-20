import { Controller, Post, Body, Res, Req, UseGuards, HttpCode } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
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

// Auth is an httpOnly cookie the browser attaches automatically — never a
// token the frontend JS reads or stores. SameSite=Lax is enough CSRF
// protection for this internal LAN app without adding a separate token
// scheme. 24h matches the JWT's own expiry.
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: false, // plain http on the LAN — flip to true if this ever moves behind https
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
};

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Strips access_token out of a service result and sets it as the
  // httpOnly cookie instead, so it's never present in the JSON body the
  // client-side JS can read.
  private respondWithSession(res: Response, result: any) {
    if (result && result.access_token) {
      res.cookie('token', result.access_token, COOKIE_OPTS);
      const { access_token, ...rest } = result;
      return rest;
    }
    return result;
  }

  // Legacy OTP endpoints — retained for backward compatibility, no longer
  // used by the Sign In / Sign Up UI (password-only now).
  @Post('request-otp')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto);
  }

  @Post('verify-otp')
  async verifyOtp(@Body() dto: VerifyOtpDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.verifyOtp(dto);
    return this.respondWithSession(res, result);
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
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    return this.respondWithSession(res, result);
  }

  // Clears the auth cookie and invalidates the session server-side too
  // (so a stolen-but-not-yet-expired cookie can't be replayed after logout).
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout((req as any).user.id);
    res.clearCookie('token', { ...COOKIE_OPTS, maxAge: undefined });
    return { success: true };
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
