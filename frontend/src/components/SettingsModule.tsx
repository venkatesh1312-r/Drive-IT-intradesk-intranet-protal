'use client';
import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrator', HR: 'HR', IT: 'IT Support', EMPLOYEE: 'Employee',
};

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border)',
  fontSize: 13, color: 'var(--text)', background: 'var(--surface-2)', outline: 'none', boxSizing: 'border-box',
};

/* Small toggle switch */
function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: 40, height: 22, borderRadius: 20, border: 'none', cursor: 'pointer', background: on ? 'var(--accent)' : 'var(--text-faint)', position: 'relative', transition: 'background 0.15s', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: 'var(--surface)', transition: 'left 0.15s' }} />
    </button>
  );
}

export function SettingsModule({ user, onUpdated }: { user: any; onUpdated?: (u: any) => void }) {
  const role = user?.role || 'EMPLOYEE';
  const isHR = role === 'HR' || role === 'ADMIN';
  const isAdmin = role === 'ADMIN';

  // Sub-navigation, role-aware
  const groups: { group: string; items: { key: string; label: string; soon?: boolean; desc?: string }[] }[] = [
    { group: 'Account', items: [{ key: 'profile', label: 'Profile' }] },
    { group: 'Preferences', items: [{ key: 'notifications', label: 'Notifications' }] },
  ];
  if (isHR) {
    groups.push({
      group: 'Organization', items: [
        { key: 'departments', label: 'Departments', soon: true, desc: 'Create and manage departments and their support queues.' },
        { key: 'recognition', label: 'Recognition Rules', soon: true, desc: 'Configure nomination categories, point limits and approval flow.' },
        { key: 'onboarding', label: 'Onboarding', soon: true, desc: 'Set defaults for new employee accounts and welcome flows.' },
      ],
    });
  }
  if (isAdmin) {
    groups.push({
      group: 'System', items: [
        { key: 'roles', label: 'Roles & Access', soon: true, desc: 'Manage user roles, permissions and access levels.' },
        { key: 'integrations', label: 'Integrations', soon: true, desc: 'Connect email, SSO and third-party tools.' },
        { key: 'audit', label: 'Audit Logs', soon: true, desc: 'Review a full history of system and ticket activity.' },
        { key: 'billing', label: 'Billing', soon: true, desc: 'Manage your subscription, seats and invoices.' },
      ],
    });
  }

  const [active, setActive] = useState('profile');
  const allItems = groups.flatMap(g => g.items);
  const activeItem = allItems.find(i => i.key === active);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, maxWidth: 920 }}>
      {/* Sub-nav */}
      <div>
        {groups.map(g => (
          <div key={g.group} style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 10px', marginBottom: 6 }}>{g.group}</p>
            {g.items.map(item => {
              const on = active === item.key;
              return (
                <button key={item.key} onClick={() => setActive(item.key)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                  padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left',
                  background: on ? '#eff6ff' : 'transparent', color: on ? 'var(--accent-hover)' : 'var(--text-soft)',
                  fontSize: 13, fontWeight: on ? 600 : 500, marginBottom: 2,
                }}>
                  {item.label}
                  {item.soon && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-faint)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 20, padding: '1px 6px' }}>SOON</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Content */}
      <div>
        {active === 'profile' && <ProfileSection user={user} onUpdated={onUpdated} />}
        {active === 'notifications' && <NotificationsSection user={user} />}
        {activeItem?.soon && <ComingSoonSection label={activeItem.label} desc={activeItem.desc} />}
      </div>
    </div>
  );
}

/* ── Profile ── (read-only rows with a per-field "Edit" link, matching the reference) */
function ProfileSection({ user, onUpdated }: { user: any; onUpdated?: (u: any) => void }) {
  const [name, setName] = useState(user?.name || '');
  const [designation, setDesignation] = useState(user?.designation || '');
  const [editing, setEditing] = useState<null | 'name' | 'designation'>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  function startEdit(field: 'name' | 'designation', current: string) {
    setEditing(field); setDraft(current); setMsg('');
  }

  async function saveEdit() {
    const field = editing;
    if (!field) return;
    if (field === 'name' && !draft.trim()) { setMsg('Name cannot be empty.'); return; }
    setSaving(true); setMsg('');
    try {
      const body = field === 'name' ? { name: draft } : { designation: draft };
      const updated = await api.updateProfile(body);
      setName(updated.name); setDesignation(updated.designation || '');
      try {
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...stored, name: updated.name }));
      } catch {}
      onUpdated?.(updated);
      setEditing(null);
      setMsg('✓ Saved');
    } catch (e: any) { setMsg(e.message || 'Failed to update profile.'); }
    finally { setSaving(false); }
  }

  const editLink: React.CSSProperties = { background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 };

  function Row({ field, label, sub, value, editable }: { field?: 'name' | 'designation'; label: string; sub?: string; value: string; editable?: boolean }) {
    const isEditing = editable && editing === field;
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isEditing ? 'center' : 'center', gap: 16, padding: '16px 0', borderBottom: '1px solid var(--divider)' }}>
        <div style={{ flexShrink: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{label}</p>
          {sub && <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>{sub}</p>}
        </div>
        {isEditing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 380, justifyContent: 'flex-end' }}>
            <input autoFocus style={{ ...inputStyle, flex: 1 }} value={draft} onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(null); }} />
            <button onClick={saveEdit} disabled={saving} style={{ height: 36, padding: '0 14px', borderRadius: 8, background: 'var(--accent)', border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>{saving ? '…' : 'Save'}</button>
            <button onClick={() => setEditing(null)} style={{ height: 36, padding: '0 10px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>Cancel</button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 14, color: value ? 'var(--text)' : 'var(--text-faint)', textAlign: 'right' }}>{value || 'Not set'}</span>
            {editable
              ? <button style={editLink} onClick={() => startEdit(field!, field === 'name' ? name : designation)}>Edit</button>
              : <span style={{ fontSize: 13, color: 'var(--text-faint)', fontWeight: 500 }}>Locked</span>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Role pill */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--b-blue-bg)', border: '1px solid var(--b-blue-bd)', borderRadius: 20, padding: '4px 12px', marginBottom: 14 }}>
        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#4A78FF" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--b-blue-fg)' }}>{ROLE_LABEL[user?.role] || user?.role}</span>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Profile settings</h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3, marginBottom: 22 }}>Manage your personal information visible to your team.</p>

      {/* Personal info */}
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Personal Info</p>
      <div style={{ ...card, padding: '4px 20px' }}>
        <Row field="name" label="Full name" value={name} editable />
        <Row field="designation" label="Job title" value={designation} editable />
        <Row label="Email" sub="Used for sign-in" value={user?.email} />
      </div>
      {msg && <p style={{ fontSize: 13, fontWeight: 500, marginTop: 10, color: msg.startsWith('✓') ? '#16a34a' : '#dc2626' }}>{msg}</p>}

      {/* Security */}
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '26px 0 8px' }}>Security</p>
      <div style={{ ...card, padding: '4px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '16px 0' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Sign-in method</p>
            <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>A one-time code is emailed to you each time you sign in</p>
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-faint)', fontWeight: 500 }}>Email code (OTP)</span>
        </div>
      </div>
    </div>
  );
}

/* ── Notifications (client-side preferences) ── */
function NotificationsSection({ user }: { user: any }) {
  const prefKey = `notif_prefs_${user?.email || 'me'}`;
  const defaults = { ticketUpdates: true, recognitions: true, weeklySummary: false };
  const [prefs, setPrefs] = useState(defaults);

  useEffect(() => {
    try { const s = localStorage.getItem(prefKey); if (s) setPrefs({ ...defaults, ...JSON.parse(s) }); } catch {}
  }, [prefKey]);

  function toggle(k: keyof typeof defaults) {
    setPrefs(p => { const nextPrefs = { ...p, [k]: !p[k] }; localStorage.setItem(prefKey, JSON.stringify(nextPrefs)); return nextPrefs; });
  }

  const items: { key: keyof typeof defaults; label: string; desc: string }[] = [
    { key: 'ticketUpdates', label: 'Ticket updates', desc: 'Status changes, comments and assignments on your tickets.' },
    { key: 'recognitions', label: 'Recognition & rewards', desc: 'When you receive points or recognition from your team.' },
    { key: 'weeklySummary', label: 'Weekly summary', desc: 'A digest of your activity once a week.' },
  ];

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Notifications</h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3, marginBottom: 18 }}>Choose what you're notified about. Saved on this device.</p>
      <div style={{ ...card, padding: '6px 20px' }}>
        {items.map((it, i) => (
          <div key={it.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: i < items.length - 1 ? '1px solid var(--divider)' : 'none' }}>
            <div><p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{it.label}</p><p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{it.desc}</p></div>
            <Toggle on={prefs[it.key]} onClick={() => toggle(it.key)} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Coming soon (role-specific org/system controls) ── */
function ComingSoonSection({ label, desc }: { label: string; desc?: string }) {
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{label}</h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3, marginBottom: 18 }}>{desc}</p>
      <div style={{ ...card, padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, background: 'var(--surface-2)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="1.6"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
        </div>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-soft)' }}>{label} is coming soon</p>
        <p style={{ fontSize: 13, color: 'var(--text-faint)', marginTop: 6, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
          This control is part of the roadmap and isn't available yet.
        </p>
      </div>
    </div>
  );
}
