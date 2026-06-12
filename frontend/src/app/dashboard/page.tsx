'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { DriveITLogo, DriveITMark } from '@/components/DriveITLogo';

/* ── Nav items ───────────────────────────────────────────────────── */
type Module = 'overview' | 'reward' | 'helpdesk' | 'team' | 'settings';

const NAV: { key: Module; label: string; icon: () => JSX.Element }[] = [
  { key: 'overview', label: 'Overview', icon: () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { key: 'reward',   label: 'Reward System', icon: () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
  { key: 'helpdesk', label: 'Help Desk', icon: () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
  { key: 'team',     label: 'My Team', icon: () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
  { key: 'settings', label: 'Settings', icon: () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> },
];

/* ── CATEGORIES for nomination form ─────────────────────────────── */
const CATEGORIES = ['ABOVE_AND_BEYOND', 'TEAM_PLAYER', 'INNOVATION', 'CLIENT_IMPACT', 'MENTORSHIP'];
const CAT_LABELS: Record<string, string> = {
  ABOVE_AND_BEYOND: 'Above & Beyond', TEAM_PLAYER: 'Team Player',
  INNOVATION: 'Innovation', CLIENT_IMPACT: 'Client Impact', MENTORSHIP: 'Mentorship',
};
const STATUS_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  PENDING:   { bg: '#fffbeb', color: '#b45309', border: '#fcd34d' },
  ESCALATED: { bg: '#eef2ff', color: '#4f46e5', border: '#a5b4fc' },
  APPROVED:  { bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
  DECLINED:  { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
};

/* ── Reward module — Employee ────────────────────────────────────── */
function RewardModule() {
  const [nominations, setNominations] = useState<any[]>([]);
  const [received, setReceived] = useState<any[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ projectName: '', nomineeName: '', nominatedBy: '', category: 'ABOVE_AND_BEYOND', context: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [noms, rec, wallet] = await Promise.all([
        api.getMyNominations(), api.getReceivedNominations(), api.getWallet(),
      ]);
      setNominations(noms); setReceived(rec);
      setTotalPoints(wallet?.points ?? 0);
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMsg('');
    try {
      await api.submitNomination(form);
      setMsg('✓ Nomination submitted!');
      setForm({ projectName: '', nomineeName: '', nominatedBy: '', category: 'ABOVE_AND_BEYOND', context: '' });
      loadData();
      setTimeout(() => { setShowCreate(false); setMsg(''); }, 1200);
    } catch (err: any) { setMsg(err.message); }
    finally { setLoading(false); }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1.5px solid #e2e8f0', fontSize: 13, color: '#1e293b',
    background: '#f8fafc', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>Reward System</h2>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>Recognise teammates and track your nominations.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {totalPoints > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 20, padding: '6px 14px' }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="#16a34a" stroke="none">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>{totalPoints} pts earned</span>
            </div>
          )}
          <button
            onClick={() => { setShowCreate(true); setMsg(''); }}
            style={{ display: 'flex', alignItems: 'center', gap: 7, height: 38, padding: '0 16px', borderRadius: 9, background: '#2563eb', border: '1px solid #1d4ed8', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create Nomination
          </button>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Create Nomination</h3>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Nominee Name *</label>
                  <input style={inputStyle} placeholder="Full name" required value={form.nomineeName} onChange={e => setForm(p => ({ ...p, nomineeName: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Nominated By *</label>
                  <input style={inputStyle} placeholder="Your name" required value={form.nominatedBy} onChange={e => setForm(p => ({ ...p, nominatedBy: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Project / Team</label>
                <input style={inputStyle} placeholder="Project or team name" value={form.projectName} onChange={e => setForm(p => ({ ...p, projectName: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Category</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Context / Reason *</label>
                <textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} required placeholder="Describe the contribution..." value={form.context} onChange={e => setForm(p => ({ ...p, context: e.target.value }))} />
              </div>
              {msg && <p style={{ fontSize: 13, color: msg.startsWith('✓') ? '#16a34a' : '#dc2626', fontWeight: 500 }}>{msg}</p>}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{ height: 38, padding: '0 16px', borderRadius: 8, background: 'white', border: '1px solid #e2e8f0', color: '#64748b', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={loading} style={{ height: 38, padding: '0 20px', borderRadius: 8, background: '#2563eb', border: '1px solid #1d4ed8', color: 'white', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Received points summary */}
      {received.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '1px solid #86efac', borderRadius: 12, padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, maxWidth: 760 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Points Earned</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#15803d', letterSpacing: '-0.02em', marginTop: 2 }}>{totalPoints} pts</p>
            <p style={{ fontSize: 12, color: '#16a34a', marginTop: 2 }}>from {received.length} approved nomination{received.length !== 1 ? 's' : ''}</p>
          </div>
          <svg width={36} height={36} viewBox="0 0 24 24" fill="#16a34a" stroke="none">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </div>
      )}

      {/* Section label */}
      <p style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
        My Nominations ({nominations.length})
      </p>

      {/* Nomination cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 760 }}>
        {nominations.length === 0 && (
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '56px 24px', textAlign: 'center' }}>
            <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{ margin: '0 auto 12px', display: 'block' }}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <p style={{ color: '#64748b', fontSize: 14, fontWeight: 500 }}>No nominations yet.</p>
            <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>Click "Create Nomination" to recognise a teammate.</p>
          </div>
        )}
        {nominations.map((n, idx) => {
          const sc = STATUS_COLOR[n.status] || STATUS_COLOR.PENDING;
          const statusLabel = n.status === 'ESCALATED' ? 'Under Review' : n.status.charAt(0) + n.status.slice(1).toLowerCase();
          return (
            <div key={n.id} style={{
              background: 'white',
              border: `1px solid ${n.status === 'ESCALATED' ? '#a5b4fc' : '#e2e8f0'}`,
              borderLeft: `4px solid ${n.status === 'ESCALATED' ? '#4f46e5' : n.status === 'APPROVED' ? '#16a34a' : n.status === 'DECLINED' ? '#dc2626' : '#f59e0b'}`,
              borderRadius: 12, padding: '18px 22px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>
                    Nomination {idx + 1}
                  </p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{n.projectName || '—'}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{n.nomineeName}</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>
                    Nominated by {n.nominatedBy} · {CAT_LABELS[n.category]}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, whiteSpace: 'nowrap' }}>
                    {statusLabel}
                  </span>
                  {n.status === 'APPROVED' && n.points && (
                    <span style={{ fontSize: 12, fontWeight: 700, background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', padding: '3px 10px', borderRadius: 20 }}>
                      +{n.points} pts
                    </span>
                  )}
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.65, borderLeft: '3px solid #e2e8f0', paddingLeft: 12 }}>
                {n.context}
              </p>
              {(n.status === 'APPROVED' || n.status === 'DECLINED') && (
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>
                    {n.status === 'APPROVED' ? 'Points awarded — nomination closed' : 'Nomination closed'}
                  </span>
                </div>
              )}
              {n.status === 'ESCALATED' && (
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 12, color: '#4f46e5' }}>Escalated for senior review</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, background: '#f1f5f9', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <p style={{ fontSize: 16, fontWeight: 600, color: '#334155', marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 13, color: '#94a3b8' }}>This module is coming soon. Stay tuned!</p>
    </div>
  );
}

function OverviewModule({ user }: { user: any }) {
  const [wallet, setWallet] = useState<any>(null);
  const [mine, setMine] = useState<any[]>([]);
  useEffect(() => {
    api.getWallet().then(setWallet).catch(() => {});
    api.getMyNominations().then(setMine).catch(() => {});
  }, []);

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
        Welcome back, {user?.name?.split(' ')[0] || 'there'} 👋
      </h2>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 28 }}>Here's a snapshot of your rewards activity.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, maxWidth: 800 }}>
        {[
          { label: 'Points Balance', value: wallet?.points ?? 0, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
          { label: 'Nominations Submitted', value: mine.length, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
          { label: 'Approved', value: mine.filter(n => n.status === 'APPROVED').length, color: '#15803d', bg: '#f0fdf4', border: '#86efac' },
          { label: 'Pending Review', value: mine.filter(n => n.status === 'PENDING').length, color: '#b45309', bg: '#fffbeb', border: '#fcd34d' },
        ].map(c => (
          <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: '18px 20px' }}>
            <p style={{ fontSize: 28, fontWeight: 800, color: c.color, letterSpacing: '-0.02em' }}>{c.value}</p>
            <p style={{ fontSize: 12, color: c.color, fontWeight: 500, marginTop: 4, opacity: 0.85 }}>{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeModule, setActiveModule] = useState<Module>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hoveredItem, setHoveredItem] = useState<Module | null>(null);
  const [showUserInfo, setShowUserInfo] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/'); return; }
    const u = JSON.parse(stored);
    if (u.role === 'ADMIN' || u.role === 'HR') { router.push('/admin'); return; }
    setUser(u);
  }, []);

  function logout() { localStorage.clear(); router.push('/'); }

  const SIDEBAR_W = sidebarOpen ? 240 : 64;

  if (!user) return null;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f1f5f9' }}>
      <aside style={{
        width: SIDEBAR_W, minHeight: '100vh',
        background: '#071428',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.22s ease',
        flexShrink: 0, overflow: 'hidden',
        borderRight: '1px solid #0e2744',
        position: 'relative', zIndex: 10,
      }}>
        <div style={{
          padding: sidebarOpen ? '18px 16px' : '18px 13px',
          borderBottom: '1px solid #0e2744',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          minHeight: 72, overflow: 'hidden',
          transition: 'padding 0.22s',
        }}>
          {sidebarOpen
            ? <DriveITLogo size={0.75} />
            : <DriveITMark size={0.85} />
          }
          <button
            onClick={() => { setSidebarOpen(!sidebarOpen); setShowUserInfo(false); }}
            style={{ background: 'none', border: 'none', color: '#8fadcc', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', flexShrink: 0, marginLeft: 4 }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {sidebarOpen ? <polyline points="15 18 9 12 15 6"/> : <polyline points="9 18 15 12 9 6"/>}
            </svg>
          </button>
        </div>

        <nav style={{ flex: 1, padding: '10px 0', overflow: 'hidden' }}>
          {NAV.map(item => {
            const isActive = activeModule === item.key;
            const isHov = hoveredItem === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveModule(item.key)}
                onMouseEnter={() => setHoveredItem(item.key)}
                onMouseLeave={() => setHoveredItem(null)}
                title={!sidebarOpen ? item.label : undefined}
                style={{
                  display: 'flex', alignItems: 'center',
                  gap: 10,
                  width: '100%', padding: sidebarOpen ? '11px 18px' : '11px 23px',
                  borderLeft: `3px solid ${isActive ? '#22d3ee' : 'transparent'}`,
                  borderTop: 'none', borderRight: 'none', borderBottom: 'none',
                  background: isActive ? 'rgba(34,211,238,0.09)' : isHov ? 'rgba(255,255,255,0.04)' : 'transparent',
                  color: isActive ? '#22d3ee' : isHov ? '#c7dff7' : '#8fadcc',
                  fontSize: 13, fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap', overflow: 'hidden',
                  textAlign: 'left',
                }}>
                <span style={{ flexShrink: 0 }}><item.icon /></span>
                {sidebarOpen && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div style={{ borderTop: '1px solid #0e2744', padding: sidebarOpen ? '14px 16px' : '14px 13px', position: 'relative' }}>
          {showUserInfo && sidebarOpen && (
            <div style={{ position: 'absolute', bottom: '100%', left: 12, right: 12, background: '#0d1f3c', border: '1px solid #1e3a5f', borderRadius: 12, padding: 16, marginBottom: 8, boxShadow: '0 -8px 32px rgba(0,0,0,0.5)', zIndex: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#1e3a5f', border: '2px solid #22d3ee', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: '#22d3ee' }}>{user?.name?.charAt(0).toUpperCase()}</span>
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</p>
                  <p style={{ fontSize: 11, color: '#8fadcc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #1e3a5f', paddingTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#8fadcc' }}>Role</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#22d3ee', background: 'rgba(34,211,238,0.1)', padding: '2px 9px', borderRadius: 20 }}>Employee</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#8fadcc' }}>Points</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0' }}>{user?.points ?? 0} pts</span>
                </div>
              </div>
              <button onClick={logout} style={{ marginTop: 12, width: '100%', height: 32, borderRadius: 8, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)', color: '#f87171', fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Sign out
              </button>
            </div>
          )}
          {sidebarOpen ? (
            <div onClick={() => setShowUserInfo(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderRadius: 8, padding: '4px 2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#22d3ee' }}>{user?.name?.charAt(0).toUpperCase()}</span>
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
                  <p style={{ fontSize: 10, color: '#8fadcc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employee</p>
                </div>
              </div>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#8fadcc" strokeWidth="2">
                {showUserInfo ? <polyline points="18 15 12 9 6 15"/> : <polyline points="6 9 12 15 18 9"/>}
              </svg>
            </div>
          ) : (
            <div onClick={() => setShowUserInfo(v => !v)} title={user?.name} style={{ cursor: 'pointer', width: '100%', display: 'flex', justifyContent: 'center', padding: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#22d3ee' }}>{user?.name?.charAt(0).toUpperCase()}</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>
        {activeModule === 'overview' && <OverviewModule user={user} />}
        {activeModule === 'reward' && <RewardModule />}
        {activeModule === 'helpdesk' && <ComingSoon label="Help Desk" />}
        {activeModule === 'team' && <ComingSoon label="My Team" />}
        {activeModule === 'settings' && <ComingSoon label="Settings" />}
      </div>
    </div>
  );
}