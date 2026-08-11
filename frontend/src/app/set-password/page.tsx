'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DriveITLogo } from '@/components/DriveITLogo';
import { api } from '@/lib/api';

const inputBase: React.CSSProperties = {
  width: '100%', height: 50, border: '1.5px solid #94a3b8', borderRadius: 10,
  fontSize: 14, color: '#1e293b', background: '#f8fafc', transition: 'border-color 150ms',
};
const focus = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = '#2563eb'; e.target.style.background = '#ffffff'; };
const blur  = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = '#94a3b8'; e.target.style.background = '#f8fafc'; };

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

function SetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') || '';
  const token = params.get('token') || '';
  const mode = params.get('mode') === 'reset' ? 'reset' : 'activate';

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);

  const missingLink = !email || !token;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const pwErr = passwordRuleError(password);
    if (pwErr) { setError(pwErr); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true); setError('');
    try {
      await api.setPassword(email, token, password);
      setDone(true);
      setTimeout(() => router.push('/'), 2000);
    } catch (err: any) {
      setError(err.message || 'This link is invalid or has expired. Please request a new one.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#071428', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: 380, background: '#ffffff', borderRadius: 16, padding: '36px 32px', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
        <div style={{ marginBottom: 22, display: 'flex', justifyContent: 'center' }}>
          <DriveITLogo size={1.2} />
        </div>

        {missingLink ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Invalid link</p>
            <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.6, marginBottom: 20 }}>
              This page needs a valid email and token from your setup or reset link. Please use the link from your email, or request a new one.
            </p>
            <a href="/" style={{ fontSize: 13.5, color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>← Back to sign in</a>
          </div>
        ) : done ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
              {mode === 'activate' ? 'Password created' : 'Password updated'}
            </p>
            <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.6 }}>Redirecting you to sign in…</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', marginBottom: 4, textAlign: 'center' }}>
              {mode === 'activate' ? 'Create your password' : 'Reset your password'}
            </p>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 22, textAlign: 'center' }}>
              for <strong style={{ color: '#1e293b' }}>{email}</strong>
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 6 }}>New password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters" autoComplete="new-password"
                style={{ ...inputBase, padding: '0 14px' }}
                onFocus={focus} onBlur={blur}
              />
              <p style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 5, lineHeight: 1.5 }}>
                8-72 characters, with 1 uppercase, 1 lowercase, 2 numbers &amp; 1 special character.
              </p>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 6 }}>Confirm password</label>
              <input
                type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter password" autoComplete="new-password"
                style={{ ...inputBase, padding: '0 14px' }}
                onFocus={focus} onBlur={blur}
              />
            </div>

            {error && <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 14, textAlign: 'center' }}>{error}</p>}

            <button type="submit" disabled={loading}
              style={{ width: '100%', height: 50, borderRadius: 12, background: loading ? '#93c5fd' : '#2563eb', border: 'none', color: '#ffffff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Saving…' : mode === 'activate' ? 'Create password' : 'Reset password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <SetPasswordForm />
    </Suspense>
  );
}
