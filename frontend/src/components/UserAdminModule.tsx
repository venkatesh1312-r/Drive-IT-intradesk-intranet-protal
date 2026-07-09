'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

/* Admin-only: pending account approvals + role management.
   Frontend gating is UX only — every endpoint is enforced ADMIN on the backend. */

const ROLES = ['EMPLOYEE', 'HR', 'IT', 'ADMIN'] as const;

const ROLE_BADGE: Record<string, { bg: string; color: string; border: string }> = {
  EMPLOYEE: { bg: 'var(--b-blue-bg)',   color: 'var(--b-blue-fg)',   border: 'var(--b-blue-bd)' },
  HR:       { bg: 'var(--b-violet-bg)', color: 'var(--b-violet-fg)', border: 'var(--b-violet-bd)' },
  IT:       { bg: 'var(--b-green-bg)',  color: 'var(--b-green-fg)',  border: 'var(--b-green-bd)' },
  ADMIN:    { bg: 'var(--b-amber-bg)',  color: 'var(--b-amber-fg)',  border: 'var(--b-amber-bd)' },
};
const STATUS_BADGE: Record<string, { bg: string; color: string; border: string; label: string }> = {
  ACTIVE:            { bg: 'var(--b-green-bg)', color: 'var(--b-green-fg)', border: 'var(--b-green-bd)', label: 'Active' },
  AWAITING_APPROVAL: { bg: 'var(--b-amber-bg)', color: 'var(--b-amber-fg)', border: 'var(--b-amber-bd)', label: 'Awaiting approval' },
  REJECTED:          { bg: 'var(--b-red-bg)',   color: 'var(--b-red-fg)',   border: 'var(--b-red-bd)',   label: 'Rejected' },
};

const badge = (c: { bg: string; color: string; border: string }): React.CSSProperties => ({
  fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20,
  background: c.bg, color: c.color, border: `1px solid ${c.border}`, whiteSpace: 'nowrap',
});
const selectStyle: React.CSSProperties = {
  height: 32, borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--surface-2)',
  color: 'var(--text)', fontSize: 12.5, padding: '0 8px', outline: 'none', cursor: 'pointer',
};

function Avatar({ name }: { name: string }) {
  return (
    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--b-blue-bg)', border: '1px solid var(--b-blue-bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{name?.charAt(0)?.toUpperCase() || '?'}</span>
    </div>
  );
}

export function UserAdminModule({ user }: { user: any }) {
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [pending, setPending] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [roleChoice, setRoleChoice] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, all] = await Promise.all([api.getPendingUsers(), api.getAllUsers()]);
      setPending(p);
      setUsers(all);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function approve(id: number) {
    const role = roleChoice[id];
    if (!role) { setError('Choose a role before approving.'); return; }
    setBusy(id); setError('');
    try { await api.approveUser(id, role); await load(); }
    catch (e: any) { setError(e.message || 'Approval failed.'); }
    finally { setBusy(null); }
  }

  async function reject(id: number) {
    setBusy(id); setError('');
    try { await api.rejectUser(id); await load(); }
    catch (e: any) { setError(e.message || 'Rejection failed.'); }
    finally { setBusy(null); }
  }

  async function changeRole(id: number, role: string) {
    setBusy(id); setError('');
    try { await api.changeUserRole(id, role); await load(); }
    catch (e: any) { setError(e.message || 'Role change failed.'); await load(); }
    finally { setBusy(null); }
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div style={{ maxWidth: 900 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>User Management</h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3, marginBottom: 20 }}>
        Approve new sign-ins and manage portal roles.
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', borderRadius: 10, padding: 4, marginBottom: 20, width: 'fit-content' }}>
        {([['pending', `Pending approvals${pending.length ? ` (${pending.length})` : ''}`], ['all', 'All users']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600,
            border: 'none', cursor: 'pointer', transition: 'all 150ms',
            background: tab === key ? 'var(--surface-active)' : 'transparent',
            color: tab === key ? 'var(--text)' : 'var(--text-muted)',
            boxShadow: tab === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}>{label}</button>
        ))}
      </div>

      {error && (
        <div style={{ background: 'var(--b-red-bg)', border: '1px solid var(--b-red-bd)', color: 'var(--b-red-fg)', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading && <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>Loading…</p>}

      {/* ── Pending approvals ── */}
      {!loading && tab === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pending.length === 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
              <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{ margin: '0 auto 12px', display: 'block' }}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>No accounts waiting for approval.</p>
            </div>
          )}
          {pending.map(p => (
            <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '4px solid var(--b-amber-bd)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <Avatar name={p.name} />
              <div style={{ flex: 1, minWidth: 180 }}>
                <p style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text)' }}>{p.name}</p>
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{p.email}</p>
                <p style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 2 }}>Requested {fmtDate(p.createdAt)}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <select value={roleChoice[p.id] || ''} onChange={e => setRoleChoice(prev => ({ ...prev, [p.id]: e.target.value }))} style={selectStyle}>
                  <option value="" disabled>Assign role…</option>
                  {ROLES.map(r => <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>)}
                </select>
                <button disabled={busy === p.id || !roleChoice[p.id]} onClick={() => approve(p.id)}
                  style={{ height: 32, padding: '0 14px', borderRadius: 8, background: '#16a34a', border: '1px solid #15803d', color: 'white', fontSize: 12.5, fontWeight: 600, cursor: roleChoice[p.id] ? 'pointer' : 'not-allowed', opacity: busy === p.id || !roleChoice[p.id] ? 0.6 : 1 }}>
                  Approve
                </button>
                <button disabled={busy === p.id} onClick={() => reject(p.id)}
                  style={{ height: 32, padding: '0 14px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--b-red-bd)', color: 'var(--b-red-fg)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', opacity: busy === p.id ? 0.6 : 1 }}>
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── All users ── */}
      {!loading && tab === 'all' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {users.map((u, i) => {
            const rb = u.role ? ROLE_BADGE[u.role] : null;
            const sb = STATUS_BADGE[u.status] || STATUS_BADGE.ACTIVE;
            const isSelf = u.email === user?.email;
            return (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px', borderTop: i > 0 ? '1px solid var(--divider)' : 'none', flexWrap: 'wrap' }}>
                <Avatar name={u.name} />
                <div style={{ flex: 1, minWidth: 180 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>
                    {u.name}{isSelf && <span style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 500 }}> (you)</span>}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</p>
                </div>
                <span style={badge(sb)}>{sb.label}</span>
                {rb ? <span style={badge(rb)}>{u.role}</span> : <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>No role</span>}
                {u.status === 'ACTIVE' && !isSelf ? (
                  <select value={u.role || ''} disabled={busy === u.id} onChange={e => changeRole(u.id, e.target.value)} style={selectStyle}>
                    {!u.role && <option value="" disabled>Set role…</option>}
                    {ROLES.map(r => <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>)}
                  </select>
                ) : (
                  <div style={{ width: 110 }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
