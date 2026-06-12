'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DriveITLogo } from '@/components/DriveITLogo';

import { api } from '@/lib/api';

/* Dev credentials — only used when backend is unreachable */
const DEV_USERS = [
  { email: 'admin@driveit.in',    password: 'admin123',    role: 'ADMIN',    name: 'HR Admin',   points: 0   },
  { email: 'hr@driveit.in',       password: 'hr123',       role: 'HR',       name: 'HR Officer', points: 0   },
  { email: 'employee@driveit.in', password: 'employee123', role: 'EMPLOYEE', name: 'Riya Sharma',points: 120 },
];

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
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);
const IEye = ({ open }: { open: boolean }) => open ? (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
) : (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError('Please fill all fields.'); return; }
    if (!email.toLowerCase().endsWith('@driveit.in')) {
      setError('Only @driveit.in email addresses are permitted.');
      return;
    }
    setLoading(true); setError('');
    try {
      const res = await api.login({ email: email.toLowerCase().trim(), password });
      localStorage.setItem('token', res.access_token);
      localStorage.setItem('user', JSON.stringify({
        email: res.user.email,
        name: res.user.name,
        role: res.user.role,
        points: res.user.points ?? 0,
      }));
      router.push(res.user.role === 'EMPLOYEE' ? '/dashboard' : '/admin');
    } catch (e: any) {
      const isNetworkError = e.name === 'AbortError' || e.message?.includes('fetch') || e.message?.includes('network') || e.message?.includes('aborted');
      if (isNetworkError) {
        const match = DEV_USERS.find(u => u.email === email.toLowerCase().trim() && u.password === password);
        if (match) {
          localStorage.setItem('token', 'dev-token');
          localStorage.setItem('user', JSON.stringify({ email: match.email, name: match.name, role: match.role, points: match.points }));
          router.push(match.role === 'EMPLOYEE' ? '/dashboard' : '/admin');
          return;
        }
        setError('Invalid email or password.');
      } else {
        setError(e.message || 'Login failed. Please try again.');
      }
      setLoading(false);
    }
  }

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
              <p style={{ fontSize: 14, color: '#64748b', fontWeight: 400 }}>Welcome Back</p>
            </div>
          </div>

          {/* Form */}
          <div style={{ width: 340, flexShrink: 0 }}>
            <form onSubmit={handleLogin}>
              {/* Email */}
              <div style={{ marginBottom: 14, position: 'relative' }}>
                <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }}>
                  <IEmail />
                </div>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address"
                  style={{ width: '100%', height: 50, border: '1.5px solid #94a3b8', borderRadius: 10, paddingLeft: 42, paddingRight: 14, fontSize: 14, color: '#1e293b', background: '#f8fafc', transition: 'border-color 150ms' }}
                  onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.background = '#ffffff'; }}
                  onBlur={e =>  { e.target.style.borderColor = '#94a3b8'; e.target.style.background = '#f8fafc'; }}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: 20, position: 'relative' }}>
                <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }}>
                  <ILock />
                </div>
                <input
                  type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"
                  style={{ width: '100%', height: 50, border: '1.5px solid #94a3b8', borderRadius: 10, paddingLeft: 42, paddingRight: 44, fontSize: 14, color: '#1e293b', background: '#f8fafc', transition: 'border-color 150ms' }}
                  onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.background = '#ffffff'; }}
                  onBlur={e =>  { e.target.style.borderColor = '#94a3b8'; e.target.style.background = '#f8fafc'; }}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                  <IEye open={showPwd} />
                </button>
              </div>

              {error && <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 14, textAlign: 'center' }}>{error}</p>}

              {/* Login button */}
              <button type="submit" disabled={loading}
                style={{ width: '100%', height: 50, borderRadius: 12, background: loading ? '#93c5fd' : '#2563eb', border: 'none', color: '#ffffff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 150ms', letterSpacing: '0.01em' }}
                onMouseEnter={e => { if (!loading) (e.currentTarget.style.background = '#1d4ed8'); }}
                onMouseLeave={e => { if (!loading) (e.currentTarget.style.background = '#2563eb'); }}>
                {loading ? 'Signing in…' : 'Login'}
              </button>

              <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#94a3b8', cursor: 'pointer' }}>
                Forgot Password?
              </p>
            </form>
          </div>
        </div>

        {/* GPTW badge */}
        <img src="/gptw.svg" alt="Great Place to Work Certified" style={{ position: 'absolute', bottom: 24, right: 28, width: 72, height: 'auto' }} />
      </div>
    </div>
  );
}
