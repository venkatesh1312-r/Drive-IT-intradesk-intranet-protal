'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DriveITLogo } from '@/components/DriveITLogo';

import { api } from '@/lib/api';

/* OTP login rule — must mirror the backend DTO */
const EMAIL_RULE = /^[a-z]+\.[a-z]@driveittech\.in$/;

const homeFor = (role: string) =>
  role === 'HR' ? '/hr' : role === 'ADMIN' ? '/admin' : role === 'IT' ? '/it' : '/dashboard';

const Diamond = ({ style }: { style: React.CSSProperties }) => (
  <div style={{ position: 'absolute', width: 10, height: 10, background: '#22d3ee', transform: 'rotate(45deg)', borderRadius: 2, ...style }} />
);

const IEmail = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 7l10 7 10-7" />
  </svg>
);
const ILock = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);
const IMail = () => (
  <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8">
    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 7l10 7 10-7" />
  </svg>
);
const IEye = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const IEyeOff = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-7-11-7a20.3 20.3 0 015.06-5.94M9.9 4.24A10.4 10.4 0 0112 4c7 0 11 7 11 7a20.5 20.5 0 01-3.22 4.36M14.12 14.12a3 3 0 11-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

/* Strong-password rule — must mirror backend STRONG_PASSWORD_RULE:
   8-72 chars, 1+ uppercase, 1+ lowercase, 2+ numbers, 1+ special char. */
function passwordRuleError(pw: string): string {
  if (pw.length < 8 || pw.length > 72) return 'Password must be 8-72 characters long.';
  if (!/[A-Z]/.test(pw)) return 'Password must include at least 1 uppercase letter.';
  if (!/[a-z]/.test(pw)) return 'Password must include at least 1 lowercase letter.';
  if ((pw.match(/\d/g) || []).length < 2) return 'Password must include at least 2 numbers.';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Password must include at least 1 special character.';
  return '';
}

type Tab = 'signin' | 'signup';
type SignUpStep = 'email' | 'otp' | 'details' | 'done';

const SIGNUP_OTP_TTL_S = 5 * 60; // must mirror backend SIGNUP_OTP_TTL_MINUTES

export default function LoginPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [tab, setTab]           = useState<Tab>('signin');
  const [signUpStep, setSignUpStep] = useState<SignUpStep>('email');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [error, setError]       = useState('');
  const [info, setInfo]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [cooldown, setCooldown] = useState(0);

  /* Sign-up specific state */
  const [otp, setOtp]                 = useState('');
  const [otpExpiresIn, setOtpExpiresIn] = useState(0); // seconds left on the current code's 5-min life
  const [name, setName]               = useState('');
  const [signupRole, setSignupRole]   = useState('Employee'); // real role, from server after OTP verify
  const [signupPassword, setSignupPassword]   = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupConfirm, setSignupConfirm]     = useState('');

  /* Point 3/5: if already logged in (valid httpOnly cookie), skip the
     login form entirely and land straight on the right dashboard — don't
     make an already-authenticated person re-enter email/password just
     because they hit "/". No localStorage/sessionStorage involved: the
     cookie is sent automatically, and GET /me (which also returns role)
     is how we find out whether it's still valid. If the cookie is
     missing/expired/invalidated (e.g. logged in elsewhere), this 401s
     and we just show the login form. */
  useEffect(() => {
    api.getMe()
      .then((me) => router.replace(homeFor(me.role)))
      .catch(() => setCheckingSession(false));
  }, []);

  /* Resend cooldown ticker (60s) */
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(c => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown > 0]);

  /* OTP lifetime ticker (5 min) — once it hits 0 the code is dead and the
     user must tap Resend to get a fresh one. */
  useEffect(() => {
    if (otpExpiresIn <= 0) return;
    const t = setInterval(() => setOtpExpiresIn(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [otpExpiresIn > 0]);

  function formatMMSS(total: number) {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function switchTab(next: Tab) {
    setTab(next); setSignUpStep('email'); setEmail(''); setPassword(''); setError(''); setInfo('');
    setOtp(''); setOtpExpiresIn(0); setName(''); setSignupPassword(''); setSignupConfirm(''); setCooldown(0);
    setSignupRole('Employee');
    setShowLoginPassword(false); setShowSignupPassword(false);
  }

  async function submitSignIn(e?: React.FormEvent) {
    e?.preventDefault();
    const em = email.trim().toLowerCase();
    if (!EMAIL_RULE.test(em)) {
      setError('Use your company email: firstname.initial@driveittech.in');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }
    setLoading(true); setError(''); setInfo('');
    try {
      const res = await api.login(em, password);
      if (res.pending) {
        setError('Your account is not active yet. Please contact the administrator.');
        return;
      }
      // Cookie is already set by the backend on this response — nothing
      // to store client-side. res.user is only used here to pick the
      // right landing page; each page re-fetches identity via /me itself.
      router.push(homeFor(res.user.role));
    } catch (err: any) {
      setError(err.message || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  /* Step 1: submit + validate the company email, request an OTP.
     Nothing beyond email + a placeholder name is stored in the DB yet. */
  async function submitSignUpEmail(e?: React.FormEvent) {
    e?.preventDefault();
    const em = email.trim().toLowerCase();
    if (!EMAIL_RULE.test(em)) {
      setError('Use your company email: firstname.initial@driveittech.in');
      return;
    }
    setLoading(true); setError(''); setInfo('');
    try {
      const res = await api.signupRequestOtp(em);
      setEmail(em);
      setOtp('');
      setCooldown(res.resendIn ?? 60);
      setOtpExpiresIn(res.expiresIn ?? SIGNUP_OTP_TTL_S);
      setSignUpStep('otp');
    } catch (err: any) {
      setError(err.message || 'Could not send the verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  /* Step 2: verify the OTP. On success, move to the details form. */
  async function submitSignUpOtp(e?: React.FormEvent) {
    e?.preventDefault();
    if (otpExpiresIn <= 0) {
      setError('This code has expired. Please request a new one.');
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit code.');
      return;
    }
    setLoading(true); setError('');
    try {
      const res = await api.signupVerifyOtp(email, otp);
      const role = res.role || 'EMPLOYEE';
      setSignupRole(role.charAt(0) + role.slice(1).toLowerCase()); // EMPLOYEE -> Employee
      setSignUpStep('details');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  }

  /* Resend: re-runs step 1 for the same email — issues a fresh code with
     a fresh 5-minute lifetime and resets the 60s resend cooldown. */
  async function resendSignupOtp() {
    if (cooldown > 0 || loading) return;
    setLoading(true); setError('');
    try {
      const res = await api.signupRequestOtp(email);
      setOtp('');
      setCooldown(res.resendIn ?? 60);
      setOtpExpiresIn(res.expiresIn ?? SIGNUP_OTP_TTL_S);
    } catch (err: any) {
      setError(err.message || 'Could not resend the code.');
    } finally {
      setLoading(false);
    }
  }

  /* Step 3: collect name + (fixed) role + password, create the account. */
  async function submitSignUpDetails(e?: React.FormEvent) {
    e?.preventDefault();
    if (!name.trim()) { setError('Enter your name.'); return; }
    const pwErr = passwordRuleError(signupPassword);
    if (pwErr) { setError(pwErr); return; }
    if (signupPassword !== signupConfirm) { setError('Passwords do not match.'); return; }
    setLoading(true); setError('');
    try {
      await api.signupComplete(email, name.trim(), signupPassword, signupConfirm);
      setSignUpStep('done');
      setTimeout(() => switchTab('signin'), 2000);
    } catch (err: any) {
      setError(err.message || 'Could not create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function submitForgotPassword() {
    const em = email.trim().toLowerCase();
    if (!EMAIL_RULE.test(em)) {
      setError('Enter your company email above first, then click "Forgot password?".');
      return;
    }
    setLoading(true); setError(''); setInfo('');
    try {
      const res = await api.forgotPassword(em);
      setInfo(res.message || 'A password reset link has been sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Could not send the reset link.');
    } finally {
      setLoading(false);
    }
  }

  const inputBase: React.CSSProperties = {
    width: '100%', height: 50, border: '1.5px solid #94a3b8', borderRadius: 10,
    fontSize: 14, color: '#1e293b', background: '#f8fafc', transition: 'border-color 150ms',
  };
  const focus = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = '#2563eb'; e.target.style.background = '#ffffff'; };
  const blur  = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = '#94a3b8'; e.target.style.background = '#f8fafc'; };

  // Avoid a flash of the login form for an already-authenticated visitor
  // while we verify their session and redirect them.
  if (checkingSession) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* ── Left panel ── */}
      <div style={{
        width: '38%', minHeight: '100vh', background: '#071428',
        display: 'flex', flexDirection: 'column',
        padding: '40px 44px', position: 'relative', overflow: 'hidden', flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ marginTop: 32 }}>
          <DriveITLogo size={1.77} />
        </div>

        {/* Tagline block */}
        <div style={{ marginTop: 'auto', marginBottom: 'auto', marginLeft: 8 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em', lineHeight: 1.25 }}>
            Optimize. Secure. Operate.
          </h2>
          <div style={{ width: 44, height: 3, background: '#22d3ee', borderRadius: 2, margin: '18px 0 14px' }} />
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, maxWidth: 300 }}>
            Your secure gateway to company resources and collaboration.
          </p>
        </div>

        {/* Diamonds — lower half */}
        <Diamond style={{ bottom: '38%', left: '38%', opacity: 0.25, width: 7,  height: 7  }} />
        <Diamond style={{ bottom: '32%', right: '22%', opacity: 0.35, width: 10, height: 10 }} />
        <Diamond style={{ bottom: '28%', left: '14%', opacity: 0.3,  width: 14, height: 14 }} />
        <Diamond style={{ bottom: '24%', left: '42%', opacity: 0.2,  width: 8,  height: 8  }} />
        <Diamond style={{ bottom: '22%', right: '8%', opacity: 0.45, width: 12, height: 12 }} />
        <Diamond style={{ bottom: '18%', left: '28%', opacity: 0.35, width: 16, height: 16 }} />
        <Diamond style={{ bottom: '16%', right: '30%', opacity: 0.25, width: 9, height: 9  }} />
        <Diamond style={{ bottom: '14%', left: '8%', opacity: 0.3,  width: 7,  height: 7  }} />
        <Diamond style={{ bottom: '12%', left: '52%', opacity: 0.4,  width: 11, height: 11 }} />
        <Diamond style={{ bottom: '10%', right: '14%', opacity: 0.2, width: 6,  height: 6  }} />
        <Diamond style={{ bottom: '8%',  left: '20%', opacity: 0.5,  width: 13, height: 13 }} />
        <Diamond style={{ bottom: '6%',  right: '38%', opacity: 0.3, width: 8,  height: 8  }} />
        <Diamond style={{ bottom: '4%',  left: '4%',  opacity: 0.25, width: 10, height: 10 }} />

        {/* GPTW badge moved to the white right container for the login page — see below */}
      </div>

      {/* ── Right panel ── */}
      <div style={{ flex: 1, minHeight: '100vh', background: '#ffffff', display: 'flex', flexDirection: 'column', position: 'relative' }}>

        {/* Diamonds — top area */}
        <Diamond style={{ top: '6%',  left: '55%',  opacity: 0.18, width: 10, height: 10, background: '#93c5fd' }} />
        <Diamond style={{ top: '4%',  right: '18%', opacity: 0.25, width: 7,  height: 7,  background: '#7dd3fc' }} />
        <Diamond style={{ top: '10%', right: '32%', opacity: 0.15, width: 12, height: 12, background: '#bae6fd' }} />
        <Diamond style={{ top: '8%',  right: '8%',  opacity: 0.2,  width: 8,  height: 8,  background: '#93c5fd' }} />
        <Diamond style={{ top: '3%',  left: '70%',  opacity: 0.12, width: 6,  height: 6,  background: '#60a5fa' }} />
        <Diamond style={{ top: '14%', right: '22%', opacity: 0.18, width: 9,  height: 9,  background: '#7dd3fc' }} />
        <Diamond style={{ top: '2%',  left: '62%',  opacity: 0.1,  width: 5,  height: 5,  background: '#bae6fd' }} />
        <Diamond style={{ top: '16%', right: '10%', opacity: 0.15, width: 11, height: 11, background: '#93c5fd' }} />

        {/* GPTW badge — sign-in only, pinned to the bottom-right corner of the white container */}
        {tab === 'signin' && (
          <img src="/gptw.svg" alt="Great Place to Work Certified" style={{ position: 'absolute', bottom: 20, right: 20, width: 64, height: 'auto' }} />
        )}

        {/* Inner layout */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '60px 8% 60px 10%', gap: 64 }}>

          {/* Welcome text */}
          <div style={{ flex: 1, paddingTop: 8, position: 'relative' }}>
            <div>
              <h1 style={{ fontSize: 44, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 0 }}>
                Welcome to the
              </h1>
              <h1 style={{
                fontSize: 44, fontWeight: 800,
                background: 'linear-gradient(90deg, #2563eb 0%, #7c3aed 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 36,
              }}>
                Intranet Portal
              </h1>
              <div>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                  {tab === 'signin' ? 'Hello Again!' : 'New here?'}
                </p>
                <p style={{ fontSize: 14, color: '#64748b', fontWeight: 400 }}>
                  {tab === 'signin' ? 'Sign in with your email and password' : 'Enter your email to get started'}
                </p>
              </div>

              {/* GPTW badge — sign-up only, small gap below the welcome content.
                  Absolutely positioned so it doesn't shift the text block's vertical centering. */}
              {tab === 'signup' && (
                <img src="/gptw.svg" alt="Great Place to Work Certified" style={{ position: 'absolute', top: '100%', left: 0, marginTop: 16, width: 72, height: 'auto' }} />
              )}
            </div>
          </div>

          {/* Form column */}
          <div style={{ width: 340, flexShrink: 0 }}>

            {/* Sign In / Sign Up toggle */}
            <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: 12, padding: 4, marginBottom: 22 }}>
              <button type="button" onClick={() => switchTab('signin')}
                style={{
                  flex: 1, height: 42, borderRadius: 9, border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: 700, transition: 'background 150ms, color 150ms',
                  background: tab === 'signin' ? '#1e3a8a' : 'transparent',
                  color: tab === 'signin' ? '#ffffff' : '#475569',
                }}>
                Sign In
              </button>
              <button type="button" onClick={() => switchTab('signup')}
                style={{
                  flex: 1, height: 42, borderRadius: 9, border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: 700, transition: 'background 150ms, color 150ms',
                  background: tab === 'signup' ? '#1e3a8a' : 'transparent',
                  color: tab === 'signup' ? '#ffffff' : '#475569',
                }}>
                Sign Up
              </button>
            </div>

            {/* ── Sign In: email + password ── */}
            {tab === 'signin' && (
              <form onSubmit={submitSignIn}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 6 }}>Email</label>
                <div style={{ marginBottom: 14, position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }}>
                    <IEmail />
                  </div>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="firstname.i@driveittech.in" autoComplete="email"
                    style={{ ...inputBase, paddingLeft: 42, paddingRight: 14 }}
                    onFocus={focus} onBlur={blur}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Password</label>
                  <button type="button" onClick={submitForgotPassword} disabled={loading}
                    style={{ background: 'none', border: 'none', fontSize: 13, color: '#2563eb', cursor: 'pointer', padding: 0, fontWeight: 600 }}>
                    Forgot password?
                  </button>
                </div>
                <div style={{ marginBottom: 14, position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }}>
                    <ILock />
                  </div>
                  <input
                    type={showLoginPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password" autoComplete="current-password"
                    style={{ ...inputBase, paddingLeft: 42, paddingRight: 42 }}
                    onFocus={focus} onBlur={blur}
                  />
                  {password.length > 0 && (
                    <button type="button" onClick={() => setShowLoginPassword(v => !v)}
                      aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                      style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, display: 'flex' }}>
                      {showLoginPassword ? <IEyeOff /> : <IEye />}
                    </button>
                  )}
                </div>

                {info && !error && <p style={{ fontSize: 13, color: '#16a34a', marginBottom: 14, textAlign: 'center' }}>{info}</p>}
                {error && (
                  <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 14, textAlign: 'center' }}>
                    {error}
                    {error.toLowerCase().includes('sign up') && (
                      <>
                        {' '}
                        <button type="button" onClick={() => switchTab('signup')}
                          style={{ background: 'none', border: 'none', fontSize: 13, color: '#2563eb', cursor: 'pointer', padding: 0, fontWeight: 700, textDecoration: 'underline' }}>
                          Sign up now
                        </button>
                      </>
                    )}
                  </p>
                )}

                <button type="submit" disabled={loading}
                  style={{ width: '100%', height: 50, borderRadius: 12, background: loading ? '#93c5fd' : '#2563eb', border: 'none', color: '#ffffff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 150ms', letterSpacing: '0.01em' }}
                  onMouseEnter={e => { if (!loading) (e.currentTarget.style.background = '#1d4ed8'); }}
                  onMouseLeave={e => { if (!loading) (e.currentTarget.style.background = '#2563eb'); }}>
                  {loading ? 'Signing in…' : 'Login'}
                </button>
              </form>
            )}

            {/* ── Sign Up · Step 1: company email ── */}
            {tab === 'signup' && signUpStep === 'email' && (
              <form onSubmit={submitSignUpEmail}>
                <div style={{ marginBottom: 14, position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }}>
                    <IEmail />
                  </div>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="firstname.i@driveittech.in" autoComplete="email"
                    style={{ ...inputBase, paddingLeft: 42, paddingRight: 14 }}
                    onFocus={focus} onBlur={blur}
                  />
                </div>
                <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 18, lineHeight: 1.5 }}>
                  We&apos;ll verify this is a valid company email and send you a 6-digit code.
                </p>

                {error && <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 14, textAlign: 'center' }}>{error}</p>}

                <button type="submit" disabled={loading}
                  style={{ width: '100%', height: 50, borderRadius: 12, background: loading ? '#93c5fd' : '#2563eb', border: 'none', color: '#ffffff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 150ms', letterSpacing: '0.01em' }}
                  onMouseEnter={e => { if (!loading) (e.currentTarget.style.background = '#1d4ed8'); }}
                  onMouseLeave={e => { if (!loading) (e.currentTarget.style.background = '#2563eb'); }}>
                  {loading ? 'Sending code…' : 'Send verification code'}
                </button>
              </form>
            )}

            {/* ── Sign Up · Step 2: enter OTP ── */}
            {tab === 'signup' && signUpStep === 'otp' && (
              <form onSubmit={submitSignUpOtp}>
                <div style={{ width: 64, height: 64, borderRadius: 18, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                  <IMail />
                </div>
                <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.6, marginBottom: 16, textAlign: 'center' }}>
                  Enter the 6-digit code sent to <strong style={{ color: '#1e293b' }}>{email}</strong>
                </p>

                <div style={{ marginBottom: 8 }}>
                  <input
                    type="text" inputMode="numeric" value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000" maxLength={6} autoComplete="one-time-code"
                    style={{ ...inputBase, padding: '0 14px', textAlign: 'center', letterSpacing: '6px', fontSize: 20, fontWeight: 700 }}
                    onFocus={focus} onBlur={blur}
                  />
                </div>
                <p style={{ fontSize: 12, color: otpExpiresIn > 0 ? '#94a3b8' : '#ef4444', marginBottom: 18, textAlign: 'center' }}>
                  {otpExpiresIn > 0 ? `Code expires in ${formatMMSS(otpExpiresIn)}` : 'This code has expired — tap Resend below.'}
                </p>

                {error && <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 14, textAlign: 'center' }}>{error}</p>}

                <button type="submit" disabled={loading || otpExpiresIn <= 0}
                  style={{ width: '100%', height: 50, borderRadius: 12, background: (loading || otpExpiresIn <= 0) ? '#93c5fd' : '#2563eb', border: 'none', color: '#ffffff', fontSize: 15, fontWeight: 700, cursor: (loading || otpExpiresIn <= 0) ? 'not-allowed' : 'pointer', transition: 'background 150ms', letterSpacing: '0.01em', marginBottom: 14 }}
                  onMouseEnter={e => { if (!loading && otpExpiresIn > 0) (e.currentTarget.style.background = '#1d4ed8'); }}
                  onMouseLeave={e => { if (!loading && otpExpiresIn > 0) (e.currentTarget.style.background = '#2563eb'); }}>
                  {loading ? 'Verifying…' : 'Verify code'}
                </button>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 18 }}>
                  <button type="button" onClick={() => switchTab('signup')}
                    style={{ background: 'none', border: 'none', fontSize: 13, color: '#64748b', cursor: 'pointer', padding: 0 }}>
                    ← Different email
                  </button>
                  <button type="button" onClick={resendSignupOtp} disabled={cooldown > 0 || loading}
                    style={{ background: 'none', border: 'none', fontSize: 13, color: cooldown > 0 ? '#94a3b8' : '#2563eb', cursor: cooldown > 0 ? 'default' : 'pointer', padding: 0, fontWeight: 600 }}>
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                  </button>
                </div>
              </form>
            )}

            {/* ── Sign Up · Step 3: name, role (fixed), password ── */}
            {tab === 'signup' && signUpStep === 'details' && (
              <form onSubmit={submitSignUpDetails}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 6 }}>Name</label>
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Your full name" autoComplete="name"
                    style={{ ...inputBase, padding: '0 14px' }}
                    onFocus={focus} onBlur={blur}
                  />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 6 }}>Role</label>
                  <input
                    type="text" value={signupRole} disabled readOnly
                    title="This is the role assigned to your account. It cannot be changed here."
                    style={{ ...inputBase, padding: '0 14px', background: '#e2e8f0', color: '#64748b', cursor: 'not-allowed' }}
                  />
                  <p style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 5 }}>
                    {signupRole === 'Employee'
                      ? 'New accounts start as Employee. An admin can change this later.'
                      : 'This role was pre-assigned for this email.'}
                  </p>
                </div>

                <div style={{ marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 6 }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showSignupPassword ? 'text' : 'password'} value={signupPassword} onChange={e => setSignupPassword(e.target.value)}
                      placeholder="At least 8 characters" autoComplete="new-password"
                      style={{ ...inputBase, padding: '0 42px 0 14px' }}
                      onFocus={focus} onBlur={blur}
                    />
                    {signupPassword.length > 0 && (
                      <button type="button" onClick={() => setShowSignupPassword(v => !v)}
                        aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                        style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, display: 'flex' }}>
                        {showSignupPassword ? <IEyeOff /> : <IEye />}
                      </button>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: 11.5, color: '#94a3b8', marginBottom: 14, lineHeight: 1.5 }}>
                  8–72 characters, with 1 uppercase, 1 lowercase, 2 numbers &amp; 1 special character.
                </p>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 6 }}>Confirm password</label>
                  <input
                    type="text" value={signupConfirm} onChange={e => setSignupConfirm(e.target.value)}
                    placeholder="Re-enter password" autoComplete="new-password"
                    style={{ ...inputBase, padding: '0 14px' }}
                    onFocus={focus} onBlur={blur}
                  />
                </div>

                {error && <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 14, textAlign: 'center' }}>{error}</p>}

                <button type="submit" disabled={loading}
                  style={{ width: '100%', height: 50, borderRadius: 12, background: loading ? '#93c5fd' : '#2563eb', border: 'none', color: '#ffffff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 150ms', letterSpacing: '0.01em' }}
                  onMouseEnter={e => { if (!loading) (e.currentTarget.style.background = '#1d4ed8'); }}
                  onMouseLeave={e => { if (!loading) (e.currentTarget.style.background = '#2563eb'); }}>
                  {loading ? 'Creating account…' : 'Create account'}
                </button>
              </form>
            )}

            {/* ── Sign Up · Done ── */}
            {tab === 'signup' && signUpStep === 'done' && (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <p style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Account created</p>
                <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.6 }}>Redirecting you to sign in…</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}