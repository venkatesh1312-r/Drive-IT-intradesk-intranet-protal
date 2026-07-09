'use client';
import { useState, useRef, useEffect } from 'react';
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
const IShield = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IClock = () => (
  <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" />
  </svg>
);

type Step = 'email' | 'otp' | 'pending';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep]         = useState<Step>('email');
  const [email, setEmail]       = useState('');
  const [otp, setOtp]           = useState('');
  const [error, setError]       = useState('');
  const [info, setInfo]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const otpRef = useRef<HTMLInputElement>(null);

  /* Resend cooldown ticker */
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(c => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown > 0]);

  useEffect(() => { if (step === 'otp') otpRef.current?.focus(); }, [step]);

  async function sendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    const em = email.trim().toLowerCase();
    if (!EMAIL_RULE.test(em)) {
      setError('Use your company email: firstname.initial@driveittech.in');
      return;
    }
    setLoading(true); setError(''); setInfo('');
    try {
      const res = await api.requestOtp(em);
      setEmail(em);
      setOtp('');
      setCooldown(res.resendIn ?? 60);
      setInfo('A 6-digit code has been sent to your email.');
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Could not send the code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function verify(e?: React.FormEvent) {
    e?.preventDefault();
    if (otp.length !== 6 || loading) return;
    setLoading(true); setError(''); setInfo('');
    try {
      const res = await api.verifyOtp(email, otp);
      if (res.pending) {
        setStep('pending');
        return;
      }
      localStorage.setItem('token', res.access_token);
      localStorage.setItem('user', JSON.stringify({
        email: res.user.email,
        name: res.user.name,
        role: res.user.role,
        points: res.user.points ?? 0,
      }));
      router.push(homeFor(res.user.role));
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
      setOtp('');
      setLoading(false);
      otpRef.current?.focus();
    }
  }

  function backToEmail() {
    setStep('email'); setOtp(''); setError(''); setInfo('');
  }

  const inputBase: React.CSSProperties = {
    width: '100%', height: 50, border: '1.5px solid #94a3b8', borderRadius: 10,
    fontSize: 14, color: '#1e293b', background: '#f8fafc', transition: 'border-color 150ms',
  };
  const focus = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = '#2563eb'; e.target.style.background = '#ffffff'; };
  const blur  = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = '#94a3b8'; e.target.style.background = '#f8fafc'; };

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

        {/* Inner layout */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '60px 8% 60px 10%', gap: 64 }}>

          {/* Welcome text */}
          <div style={{ flex: 1, paddingTop: 8 }}>
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
              <p style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Hello Again!</p>
              <p style={{ fontSize: 14, color: '#64748b', fontWeight: 400 }}>Sign in with a one-time code</p>
            </div>
          </div>

          {/* Form column */}
          <div style={{ width: 340, flexShrink: 0 }}>

            {/* Step 1 — email */}
            {step === 'email' && (
              <form onSubmit={sendOtp}>
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
                  We&apos;ll email you a 6-digit code — no password needed.
                </p>

                {error && <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 14, textAlign: 'center' }}>{error}</p>}

                <button type="submit" disabled={loading}
                  style={{ width: '100%', height: 50, borderRadius: 12, background: loading ? '#93c5fd' : '#2563eb', border: 'none', color: '#ffffff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 150ms', letterSpacing: '0.01em' }}
                  onMouseEnter={e => { if (!loading) (e.currentTarget.style.background = '#1d4ed8'); }}
                  onMouseLeave={e => { if (!loading) (e.currentTarget.style.background = '#2563eb'); }}>
                  {loading ? 'Sending code…' : 'Send login code'}
                </button>
              </form>
            )}

            {/* Step 2 — OTP */}
            {step === 'otp' && (
              <form onSubmit={verify}>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 14, lineHeight: 1.5 }}>
                  Enter the code sent to <strong style={{ color: '#1e293b' }}>{email}</strong>
                </p>
                <div style={{ marginBottom: 14, position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }}>
                    <IShield />
                  </div>
                  <input
                    ref={otpRef}
                    type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    style={{ ...inputBase, paddingLeft: 42, paddingRight: 14, letterSpacing: 8, fontWeight: 700, fontSize: 18 }}
                    onFocus={focus} onBlur={blur}
                  />
                </div>

                {info && !error && <p style={{ fontSize: 13, color: '#16a34a', marginBottom: 14, textAlign: 'center' }}>{info}</p>}
                {error && <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 14, textAlign: 'center' }}>{error}</p>}

                <button type="submit" disabled={loading || otp.length !== 6}
                  style={{ width: '100%', height: 50, borderRadius: 12, background: loading || otp.length !== 6 ? '#93c5fd' : '#2563eb', border: 'none', color: '#ffffff', fontSize: 15, fontWeight: 700, cursor: loading || otp.length !== 6 ? 'not-allowed' : 'pointer', transition: 'background 150ms', letterSpacing: '0.01em' }}
                  onMouseEnter={e => { if (!loading && otp.length === 6) (e.currentTarget.style.background = '#1d4ed8'); }}
                  onMouseLeave={e => { if (!loading && otp.length === 6) (e.currentTarget.style.background = '#2563eb'); }}>
                  {loading ? 'Verifying…' : 'Verify & sign in'}
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                  <button type="button" onClick={backToEmail}
                    style={{ background: 'none', border: 'none', fontSize: 13, color: '#64748b', cursor: 'pointer', padding: 0 }}>
                    ← Different email
                  </button>
                  <button type="button" onClick={() => sendOtp()} disabled={cooldown > 0 || loading}
                    style={{ background: 'none', border: 'none', fontSize: 13, color: cooldown > 0 ? '#94a3b8' : '#2563eb', cursor: cooldown > 0 ? 'default' : 'pointer', padding: 0, fontWeight: 600 }}>
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3 — pending approval */}
            {step === 'pending' && (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: 18, background: '#fffbeb', border: '1px solid #fcd34d', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                  <IClock />
                </div>
                <p style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Awaiting approval</p>
                <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.6, marginBottom: 22 }}>
                  Your email <strong style={{ color: '#1e293b' }}>{email}</strong> is verified.
                  An administrator needs to approve your account and assign your role before you can enter the portal.
                </p>
                <button onClick={backToEmail}
                  style={{ height: 42, padding: '0 22px', borderRadius: 10, background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#334155', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                  Back to sign in
                </button>
              </div>
            )}
          </div>
        </div>

        {/* GPTW badge */}
        <img src="/gptw.svg" alt="Great Place to Work Certified" style={{ position: 'absolute', bottom: 24, right: 28, width: 72, height: 'auto' }} />
      </div>
    </div>
  );
}
