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

type Tab = 'signin' | 'signup';
type Step = 'form' | 'sent';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab]           = useState<Tab>('signin');
  const [step, setStep]         = useState<Step>('form');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [info, setInfo]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [cooldown, setCooldown] = useState(0);

  /* Resend cooldown ticker */
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(c => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown > 0]);

  function switchTab(next: Tab) {
    setTab(next); setStep('form'); setEmail(''); setPassword(''); setError(''); setInfo('');
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
      localStorage.setItem('token', res.access_token);
      localStorage.setItem('user', JSON.stringify({
        email: res.user.email,
        name: res.user.name,
        role: res.user.role,
        points: res.user.points ?? 0,
      }));
      router.push(homeFor(res.user.role));
    } catch (err: any) {
      setError(err.message || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function submitSignUp(e?: React.FormEvent) {
    e?.preventDefault();
    const em = email.trim().toLowerCase();
    if (!EMAIL_RULE.test(em)) {
      setError('Use your company email: firstname.initial@driveittech.in');
      return;
    }
    setLoading(true); setError(''); setInfo('');
    try {
      await api.signup(em);
      setEmail(em);
      setCooldown(60);
      setStep('sent');
    } catch (err: any) {
      setError(err.message || 'Could not send the setup link. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function resendSignupLink() {
    if (cooldown > 0 || loading) return;
    setLoading(true); setError('');
    try {
      await api.signup(email);
      setCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Could not resend the link.');
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
      await api.forgotPassword(em);
      setInfo('If an account exists for that email, a reset link has been sent.');
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
              <p style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                {tab === 'signin' ? 'Hello Again!' : 'New here?'}
              </p>
              <p style={{ fontSize: 14, color: '#64748b', fontWeight: 400 }}>
                {tab === 'signin' ? 'Sign in with your email and password' : 'Enter your email to get started'}
              </p>
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
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password" autoComplete="current-password"
                    style={{ ...inputBase, paddingLeft: 42, paddingRight: 14 }}
                    onFocus={focus} onBlur={blur}
                  />
                </div>

                {info && !error && <p style={{ fontSize: 13, color: '#16a34a', marginBottom: 14, textAlign: 'center' }}>{info}</p>}
                {error && <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 14, textAlign: 'center' }}>{error}</p>}

                <button type="submit" disabled={loading}
                  style={{ width: '100%', height: 50, borderRadius: 12, background: loading ? '#93c5fd' : '#2563eb', border: 'none', color: '#ffffff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 150ms', letterSpacing: '0.01em' }}
                  onMouseEnter={e => { if (!loading) (e.currentTarget.style.background = '#1d4ed8'); }}
                  onMouseLeave={e => { if (!loading) (e.currentTarget.style.background = '#2563eb'); }}>
                  {loading ? 'Signing in…' : 'Login'}
                </button>
              </form>
            )}

            {/* ── Sign Up: email only → activation link email ── */}
            {tab === 'signup' && step === 'form' && (
              <form onSubmit={submitSignUp}>
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
                  We&apos;ll email you a link to set up your password.
                </p>

                {error && <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 14, textAlign: 'center' }}>{error}</p>}

                <button type="submit" disabled={loading}
                  style={{ width: '100%', height: 50, borderRadius: 12, background: loading ? '#93c5fd' : '#2563eb', border: 'none', color: '#ffffff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 150ms', letterSpacing: '0.01em' }}
                  onMouseEnter={e => { if (!loading) (e.currentTarget.style.background = '#1d4ed8'); }}
                  onMouseLeave={e => { if (!loading) (e.currentTarget.style.background = '#2563eb'); }}>
                  {loading ? 'Sending link…' : 'Send setup link'}
                </button>
              </form>
            )}

            {/* ── Sign Up: link sent confirmation ── */}
            {tab === 'signup' && step === 'sent' && (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: 18, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                  <IMail />
                </div>
                <p style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Check your email</p>
                <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.6, marginBottom: 18 }}>
                  If an account exists for <strong style={{ color: '#1e293b' }}>{email}</strong>, we&apos;ve sent a link to set up your password. The link expires in 30 minutes.
                </p>

                {error && <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 14, textAlign: 'center' }}>{error}</p>}

                <div style={{ display: 'flex', justifyContent: 'center', gap: 18 }}>
                  <button type="button" onClick={() => switchTab('signup')}
                    style={{ background: 'none', border: 'none', fontSize: 13, color: '#64748b', cursor: 'pointer', padding: 0 }}>
                    ← Different email
                  </button>
                  <button type="button" onClick={resendSignupLink} disabled={cooldown > 0 || loading}
                    style={{ background: 'none', border: 'none', fontSize: 13, color: cooldown > 0 ? '#94a3b8' : '#2563eb', cursor: cooldown > 0 ? 'default' : 'pointer', padding: 0, fontWeight: 600 }}>
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend link'}
                  </button>
                </div>
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