import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/**
 * OTP email delivery. Uses SMTP when SMTP_HOST is configured; otherwise
 * logs the OTP to the backend console (dev mode) so the flow stays testable
 * without a mail server.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter | null = null;

  // The authenticated mailbox is also the envelope sender by default —
  // Zoho (and most providers) reject/drop mail whose "from" isn't the
  // authenticated mailbox or a verified alias.
  private readonly from =
    process.env.SMTP_FROM || (process.env.SMTP_USER ? `DriveIT Portal <${process.env.SMTP_USER}>` : '');

  constructor() {
    if (process.env.SMTP_HOST) {
      const port = Number(process.env.SMTP_PORT) || 587;
      // Pooled + keep-alive: the TCP/TLS/AUTH handshake happens once and is
      // reused, so each OTP mail goes out in milliseconds instead of paying
      // a full connection setup per send.
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,          // 465 = TLS on connect; 587 = STARTTLS
        requireTLS: port !== 465,      // force STARTTLS on 587 (Zoho requires it)
        pool: true,
        maxConnections: 3,
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      });
      // Warm up the connection at boot and surface config errors early.
      this.transporter.verify().then(
        () => this.logger.log(`SMTP ready (${process.env.SMTP_HOST}:${port}, from ${this.from})`),
        (err) => this.logger.error(`SMTP configuration problem: ${err.message}`),
      );
    } else {
      this.logger.warn('SMTP_HOST not set — OTPs will be logged to this console instead of emailed.');
    }
  }

  async sendOtp(email: string, otp: string, expiresMinutes: number) {
    if (!this.transporter) {
      // Dev fallback — no SMTP configured.
      this.logger.warn(`[DEV OTP] ${email} → ${otp} (valid ${expiresMinutes}m)`);
      return;
    }
    const info = await this.transporter.sendMail({
      from: this.from,
      to: email,
      subject: `${otp} is your DriveIT Portal login code`,
      text: `Your one-time login code is ${otp}. It expires in ${expiresMinutes} minutes.\n\nIf you did not request this, you can ignore this email.`,
      html: `
        <div style="font-family:Segoe UI,Arial,sans-serif;max-width:420px;margin:0 auto;padding:24px;background:#071428;border-radius:12px;color:#e2e8f0">
          <h2 style="margin:0 0 4px;font-size:18px;color:#ffffff">DriveIT Intranet Portal</h2>
          <p style="margin:0 0 20px;font-size:13px;color:#8fadcc">One-time login code</p>
          <div style="background:#0d1f3c;border:1px solid #1e3a5f;border-radius:10px;padding:18px;text-align:center">
            <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#22d3ee">${otp}</span>
          </div>
          <p style="margin:16px 0 0;font-size:12px;color:#8fadcc">This code expires in ${expiresMinutes} minutes. If you did not request it, ignore this email.</p>
        </div>`,
    });
    // Observability: log the server's verdict, not a generic "sent".
    if (info.rejected?.length) {
      this.logger.error(`OTP to ${email} REJECTED by server: ${info.response}`);
    } else {
      this.logger.log(`OTP emailed to ${email} — id ${info.messageId} — ${info.response}`);
    }
  }

  /** Shared by signup activation ("create your password") and forgot-password
   *  ("reset your password") — same link mechanism, different copy. */
  async sendPasswordLink(email: string, link: string, expiresMinutes: number, mode: 'activate' | 'reset') {
    const heading = mode === 'activate' ? 'Set up your account password' : 'Reset your password';
    const buttonLabel = mode === 'activate' ? 'Create Password' : 'Reset Password';
    const bodyLine = mode === 'activate'
      ? 'An account has been created for you on the DriveIT Intranet Portal. Click below to set your password and get started.'
      : 'We received a request to reset your password. Click below to choose a new one.';

    if (!this.transporter) {
      this.logger.warn(`[DEV PASSWORD LINK] ${email} (${mode}) → ${link} (valid ${expiresMinutes}m)`);
      return;
    }
    const info = await this.transporter.sendMail({
      from: this.from,
      to: email,
      subject: mode === 'activate' ? 'Set up your DriveIT Portal password' : 'Reset your DriveIT Portal password',
      text: `${bodyLine}\n\n${link}\n\nThis link expires in ${expiresMinutes} minutes. If you did not request this, you can ignore this email.`,
      html: `
        <div style="font-family:Segoe UI,Arial,sans-serif;max-width:460px;margin:0 auto;padding:24px;background:#071428;border-radius:12px;color:#e2e8f0">
          <h2 style="margin:0 0 4px;font-size:18px;color:#ffffff">DriveIT Intranet Portal</h2>
          <p style="margin:0 0 20px;font-size:13px;color:#8fadcc">${heading}</p>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#cbd5e1">${bodyLine}</p>
          <div style="text-align:center;margin:0 0 20px">
            <a href="${link}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px">${buttonLabel}</a>
          </div>
          <p style="margin:0;font-size:12px;color:#8fadcc;word-break:break-all">${link}</p>
          <p style="margin:16px 0 0;font-size:12px;color:#8fadcc">This link expires in ${expiresMinutes} minutes. If you did not request it, ignore this email.</p>
        </div>`,
    });
    if (info.rejected?.length) {
      this.logger.error(`Password link to ${email} REJECTED by server: ${info.response}`);
    } else {
      this.logger.log(`Password link (${mode}) emailed to ${email} — id ${info.messageId}`);
    }
  }
}
