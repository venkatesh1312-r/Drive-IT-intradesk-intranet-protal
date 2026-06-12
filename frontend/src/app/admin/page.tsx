'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { DriveITLogo, DriveITMark } from '@/components/DriveITLogo';

/* ── Nav items ───────────────────────────────────────────────────── */
type Module = 'overview' | 'reward' | 'helpdesk' | 'directory' | 'analytics' | 'settings';

const NAV: { key: Module; label: string; icon: () => JSX.Element }[] = [
  { key: 'overview',   label: 'Overview', icon: () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { key: 'reward',     label: 'Reward System', icon: () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
  { key: 'helpdesk',   label: 'Help Desk Mgmt', icon: () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
  { key: 'directory',  label: 'Employee Directory', icon: () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
  { key: 'analytics',  label: 'Analytics', icon: () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { key: 'settings',   label: 'Settings', icon: () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> },
];

/* ── Helpers ──────────────────────────────────────────────────────── */
const CAT_LABELS: Record<string, string> = {
  ABOVE_AND_BEYOND: 'Above & Beyond', TEAM_PLAYER: 'Team Player',
  INNOVATION: 'Innovation', CLIENT_IMPACT: 'Client Impact', MENTORSHIP: 'Mentorship',
};
const STATUS_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  PENDING:   { bg: '#fffbeb', color: '#b45309',  border: '#fcd34d' },
  ESCALATED: { bg: '#eef2ff', color: '#4f46e5',  border: '#a5b4fc' },
  APPROVED:  { bg: '#f0fdf4', color: '#15803d',  border: '#86efac' },
  DECLINED:  { bg: '#fef2f2', color: '#dc2626',  border: '#fca5a5' },
};

const CATEGORIES = ['ABOVE_AND_BEYOND', 'TEAM_PLAYER', 'INNOVATION', 'CLIENT_IMPACT', 'MENTORSHIP'];

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1.5px solid #e2e8f0', fontSize: 13, color: '#1e293b',
  background: '#f8fafc', outline: 'none', boxSizing: 'border-box',
};

/* ── Admin / HR reward module ────────────────────────────────────── */
const HR_CATS = ['TEAM_PLAYER', 'ABOVE_AND_BEYOND'];

function AdminRewardModule({ user }: { user: any }) {
  const isHR = user?.role === 'HR';
  const [nominations, setNominations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'ESCALATED' | 'APPROVED' | 'DECLINED'>('ALL');
  const [ptsInput, setPtsInput] = useState<Record<number, string>>({});
  const [consent, setConsent] = useState<Record<number, boolean>>({});
  const [msgs, setMsgs] = useState<Record<number, string>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ nomineeName: '', nominatedBy: '', projectName: '', category: 'ABOVE_AND_BEYOND', context: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createMsg, setCreateMsg] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [noms, s] = await Promise.all([api.getAllNominations(), api.getStats()]);
      setNominations(noms); setStats(s);
    } catch {}
  }

  async function handleApprove(id: number) {
    const pts = parseInt(ptsInput[id]);
    if (!ptsInput[id] || isNaN(pts)) { alert('Enter a points value.'); return; }
    if (pts < 1 || pts > 10) { alert('Points must be 1–10.'); return; }
    try {
      await api.approveNomination(id, pts);
      setMsgs(prev => ({ ...prev, [id]: '✓ Approved' }));
      loadData();
    } catch (e: any) { setMsgs(prev => ({ ...prev, [id]: e.message })); }
  }

  async function handleDecline(id: number) {
    try { await api.declineNomination(id); loadData(); } catch {}
  }

  async function handleEscalate(id: number) {
    try {
      await api.escalateNomination(id);
      setMsgs(prev => ({ ...prev, [id]: '↑ Escalated to Admin' }));
      loadData();
    } catch (e: any) { setMsgs(prev => ({ ...prev, [id]: e.message })); }
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.nomineeName.trim() || !createForm.context.trim()) {
      setCreateMsg('Please fill all required fields.'); return;
    }
    setCreateLoading(true); setCreateMsg('');
    try {
      await api.submitNomination(createForm);
      setCreateMsg('Nomination created!');
      setCreateForm({ nomineeName: '', nominatedBy: '', projectName: '', category: 'ABOVE_AND_BEYOND', context: '' });
      loadData();
      setTimeout(() => { setShowCreate(false); setCreateMsg(''); }, 1200);
    } catch (e: any) {
      setCreateMsg(e.message || 'Failed to create nomination.');
    } finally {
      setCreateLoading(false);
    }
  }

  const filtered = nominations.filter(n => filter === 'ALL' || n.status === filter);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>Reward System</h2>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>
            {isHR ? 'Review HR-level nominations. Escalate complex cases to Admin.' : 'Full view — all nominations including escalated cases.'}
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreateMsg(''); }}
          style={{ display: 'flex', alignItems: 'center', gap: 7, height: 38, padding: '0 16px', borderRadius: 9, background: '#2563eb', border: '1px solid #1d4ed8', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create Nomination
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Create Nomination</h3>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
            </div>
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Nominee Name *</label>
                <input style={inputStyle} placeholder="Full name" value={createForm.nomineeName} onChange={e => setCreateForm(p => ({ ...p, nomineeName: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Nominated By</label>
                <input style={inputStyle} placeholder="Nominator name" value={createForm.nominatedBy} onChange={e => setCreateForm(p => ({ ...p, nominatedBy: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Project / Team</label>
                <input style={inputStyle} placeholder="Project or team name" value={createForm.projectName} onChange={e => setCreateForm(p => ({ ...p, projectName: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Category</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={createForm.category} onChange={e => setCreateForm(p => ({ ...p, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Context / Reason *</label>
                <textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} placeholder="Describe the contribution..." value={createForm.context} onChange={e => setCreateForm(p => ({ ...p, context: e.target.value }))} />
              </div>
              {createMsg && <p style={{ fontSize: 13, color: createMsg.includes('!') ? '#16a34a' : '#dc2626', fontWeight: 500 }}>{createMsg}</p>}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{ height: 38, padding: '0 16px', borderRadius: 8, background: 'white', border: '1px solid #e2e8f0', color: '#64748b', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={createLoading} style={{ height: 38, padding: '0 20px', borderRadius: 8, background: '#2563eb', border: '1px solid #1d4ed8', color: 'white', fontSize: 13, fontWeight: 600, cursor: createLoading ? 'not-allowed' : 'pointer', opacity: createLoading ? 0.7 : 1 }}>
                  {createLoading ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats row */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24, maxWidth: 840 }}>
          {[
            { label: 'Total',     val: stats.total,          col: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
            { label: 'Pending',   val: stats.pending,        col: '#b45309', bg: '#fffbeb', border: '#fcd34d' },
            { label: 'Escalated', val: stats.escalated ?? 0, col: '#4f46e5', bg: '#eef2ff', border: '#a5b4fc' },
            { label: 'Approved',  val: stats.approved,       col: '#15803d', bg: '#f0fdf4', border: '#86efac' },
            { label: 'Declined',  val: stats.declined,       col: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
          ].map(c => (
            <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: c.col, letterSpacing: '-0.02em' }}>{c.val}</p>
              <p style={{ fontSize: 11, color: c.col, fontWeight: 600, marginTop: 3, opacity: 0.8 }}>{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* HR info banner */}
      {isHR && (
        <div style={{ marginBottom: 16, background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 10, padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          <p style={{ fontSize: 13, color: '#3730a3' }}>
            Showing <strong>Team Player</strong> and <strong>Above & Beyond</strong> nominations.
            Use <strong>Escalate</strong> to forward technical or complex cases to Admin.
          </p>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 4, marginBottom: 20, width: 'fit-content' }}>
        {(['ALL', 'PENDING', 'ESCALATED', 'APPROVED', 'DECLINED'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 500,
            border: 'none', cursor: 'pointer', transition: 'all 150ms',
            background: filter === f ? '#ffffff' : 'transparent',
            color: filter === f ? '#1e293b' : '#64748b',
            boxShadow: filter === f ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}>
            {f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Nomination cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 760 }}>
        {filtered.length === 0 && (
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ color: '#64748b', fontSize: 14 }}>No nominations found.</p>
          </div>
        )}
        {filtered.map(n => {
          const sc = STATUS_COLOR[n.status] || STATUS_COLOR.PENDING;
          const canApprove = !!(consent[n.id] && parseInt(ptsInput[n.id]));
          const isEscalated = n.status === 'ESCALATED';
          const isHRCat = HR_CATS.includes(n.category);
          // HR: approve HR-category PENDING; escalate non-HR-category PENDING; Admin: approve PENDING + ESCALATED
          const showApproveRow = isHR
            ? (n.status === 'PENDING' && isHRCat)
            : (n.status === 'PENDING' || isEscalated);
          const showEscalateBtn = isHR && n.status === 'PENDING';
          const statusLabel = isEscalated ? 'Escalated' : n.status.charAt(0) + n.status.slice(1).toLowerCase();

          return (
            <div key={n.id} style={{
              background: 'white',
              border: `1px solid ${isEscalated ? '#a5b4fc' : '#e2e8f0'}`,
              borderLeft: `4px solid ${isEscalated ? '#4f46e5' : n.status === 'APPROVED' ? '#16a34a' : n.status === 'DECLINED' ? '#dc2626' : '#f59e0b'}`,
              borderRadius: 12, padding: '18px 22px',
            }}>
              {/* Escalated banner */}
              {isEscalated && !isHR && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, background: '#eef2ff', borderRadius: 7, padding: '6px 12px', width: 'fit-content' }}>
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2"><polyline points="17 11 12 6 7 11"/><line x1="12" y1="6" x2="12" y2="18"/></svg>
                  <span style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600 }}>Escalated from HR — needs Admin decision</span>
                </div>
              )}

              {/* Card header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                    #{n.id} · {n.projectName || 'No project'}
                  </p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{n.nomineeName}</p>
                  <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    Nominated by {n.nominatedBy} · {CAT_LABELS[n.category]}
                  </p>
                  {n.submittedBy?.name && (
                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Submitted by {n.submittedBy.name}</p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {n.points && n.status === 'APPROVED' && (
                    <span style={{ fontSize: 12, fontWeight: 700, background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', padding: '3px 10px', borderRadius: 20 }}>
                      +{n.points} pts
                    </span>
                  )}
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                    {statusLabel}
                  </span>
                </div>
              </div>

              {/* Context */}
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.65, borderLeft: '3px solid #e2e8f0', paddingLeft: 12, marginBottom: (showApproveRow || showEscalateBtn) ? 14 : 0 }}>
                {n.context}
              </p>

              {/* Action row */}
              {(showApproveRow || showEscalateBtn) && (
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {showApproveRow && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '5px 10px' }}>
                        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 10.5h3a1.5 1.5 0 000-3h-2a1.5 1.5 0 000 3H13a1.5 1.5 0 010 3H9.5"/></svg>
                        <input
                          type="text" inputMode="numeric" placeholder="1–10 pts"
                          value={ptsInput[n.id] || ''}
                          onChange={e => setPtsInput(prev => ({ ...prev, [n.id]: e.target.value.replace(/\D/g, '') }))}
                          style={{ width: 52, background: 'transparent', border: 'none', fontSize: 13, color: '#1e293b', textAlign: 'center' }}
                        />
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', cursor: 'pointer' }}>
                        <input type="checkbox" checked={consent[n.id] || false} onChange={e => setConsent(prev => ({ ...prev, [n.id]: e.target.checked }))} style={{ accentColor: '#2563eb', width: 14, height: 14 }} />
                        Consent confirmed
                      </label>
                      <button
                        disabled={!canApprove}
                        onClick={() => handleApprove(n.id)}
                        style={{ height: 34, padding: '0 16px', borderRadius: 8, background: canApprove ? '#16a34a' : '#dcfce7', border: `1px solid ${canApprove ? '#15803d' : '#86efac'}`, color: canApprove ? 'white' : '#86efac', fontSize: 13, fontWeight: 600, cursor: canApprove ? 'pointer' : 'not-allowed', transition: 'all 150ms' }}>
                        Approve
                      </button>
                      <button onClick={() => handleDecline(n.id)} style={{ height: 34, padding: '0 14px', borderRadius: 8, background: 'white', border: '1px solid #e2e8f0', color: '#64748b', fontSize: 13, cursor: 'pointer' }}>
                        Decline
                      </button>
                    </>
                  )}
                  {showEscalateBtn && (
                    <button
                      onClick={() => handleEscalate(n.id)}
                      style={{ height: 34, padding: '0 14px', borderRadius: 8, background: '#eef2ff', border: '1px solid #a5b4fc', color: '#4f46e5', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 11 12 6 7 11"/><line x1="12" y1="6" x2="12" y2="18"/></svg>
                      Escalate to Admin
                    </button>
                  )}
                </div>
              )}

              {/* Persistent feedback message — shown outside action row so it survives data reload */}
              {msgs[n.id] && (
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 12, color: msgs[n.id].startsWith('✓') ? '#16a34a' : '#4f46e5', fontWeight: 500 }}>{msgs[n.id]}</span>
                </div>
              )}

              {/* Closed footer */}
              {(n.status === 'APPROVED' || n.status === 'DECLINED') && (
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>
                    {n.status === 'APPROVED' ? 'Points awarded — nomination closed' : 'Nomination closed'}
                  </span>
                </div>
              )}

              {/* Escalated footer — HR sees confirmation after escalating; Admin already has the banner above */}
              {isEscalated && isHR && !msgs[n.id] && (
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 12, color: '#4f46e5' }}>Forwarded to Admin for review</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Admin overview ──────────────────────────────────────────────── */
function AdminOverview({ user }: { user: any }) {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => { api.getStats().then(setStats).catch(() => {}); }, []);
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
        Welcome, {user?.name?.split(' ')[0] || 'Admin'} 👋
      </h2>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 28 }}>HR Admin Portal — Reward & Nomination Dashboard</p>
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, maxWidth: 800 }}>
          {[
            { label: 'Total Nominations', val: stats.total,    col: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
            { label: 'Pending Review',    val: stats.pending,  col: '#b45309', bg: '#fffbeb', border: '#fcd34d' },
            { label: 'Approved',          val: stats.approved, col: '#15803d', bg: '#f0fdf4', border: '#86efac' },
            { label: 'Declined',          val: stats.declined, col: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
          ].map(c => (
            <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: '20px 22px' }}>
              <p style={{ fontSize: 30, fontWeight: 800, color: c.col, letterSpacing: '-0.02em' }}>{c.val}</p>
              <p style={{ fontSize: 12, color: c.col, fontWeight: 500, marginTop: 5, opacity: 0.85 }}>{c.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Coming soon ─────────────────────────────────────────────────── */
function ComingSoon({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, background: '#f1f5f9', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <p style={{ fontSize: 16, fontWeight: 600, color: '#334155', marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 13, color: '#94a3b8' }}>This module is coming soon.</p>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */
export default function AdminPage() {
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
    if (u.role !== 'ADMIN' && u.role !== 'HR') { router.push('/dashboard'); return; }
    setUser(u);
  }, []);

  function logout() { localStorage.clear(); router.push('/'); }

  const SIDEBAR_W = sidebarOpen ? 240 : 64;

  if (!user) return null;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f1f5f9' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: SIDEBAR_W, minHeight: '100vh',
        background: '#071428',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.22s ease',
        flexShrink: 0, overflow: 'hidden',
        borderRight: '1px solid #0e2744',
        position: 'relative', zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{
          padding: sidebarOpen ? '18px 16px' : '18px 13px',
          borderBottom: '1px solid #0e2744',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          minHeight: 72, overflow: 'hidden',
        }}>
          {sidebarOpen ? <DriveITLogo size={0.75} /> : <DriveITMark size={0.85} />}
          <button
            onClick={() => { setSidebarOpen(!sidebarOpen); setShowUserInfo(false); }}
            style={{ background: 'none', border: 'none', color: '#8fadcc', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', flexShrink: 0, marginLeft: 4 }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {sidebarOpen ? <polyline points="15 18 9 12 15 6"/> : <polyline points="9 18 15 12 9 6"/>}
            </svg>
          </button>
        </div>

        {/* Admin badge */}
        {sidebarOpen && (
          <div style={{ padding: '8px 16px', borderBottom: '1px solid #0e2744' }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 20, padding: '3px 10px' }}>
              {user?.role === 'HR' ? 'HR Officer' : 'Administrator'}
            </span>
          </div>
        )}

        {/* Nav */}
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
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: sidebarOpen ? '11px 18px' : '11px 23px',
                  borderLeft: `3px solid ${isActive ? '#22d3ee' : 'transparent'}`,
                  borderTop: 'none', borderRight: 'none', borderBottom: 'none',
                  background: isActive ? 'rgba(34,211,238,0.09)' : isHov ? 'rgba(255,255,255,0.04)' : 'transparent',
                  color: isActive ? '#22d3ee' : isHov ? '#c7dff7' : '#8fadcc',
                  fontSize: 13, fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap', overflow: 'hidden', textAlign: 'left',
                }}>
                <span style={{ flexShrink: 0 }}><item.icon /></span>
                {sidebarOpen && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User + logout */}
        <div style={{ borderTop: '1px solid #0e2744', padding: sidebarOpen ? '14px 16px' : '14px 13px', position: 'relative' }}>
          {showUserInfo && sidebarOpen && (
            <div style={{ position: 'absolute', bottom: '100%', left: 12, right: 12, background: '#0d1f3c', border: '1px solid #1e3a5f', borderRadius: 12, padding: 16, marginBottom: 8, boxShadow: '0 -8px 32px rgba(0,0,0,0.5)', zIndex: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', border: '2px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: '#f59e0b' }}>{user?.name?.charAt(0).toUpperCase()}</span>
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</p>
                  <p style={{ fontSize: 11, color: '#8fadcc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #1e3a5f', paddingTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#8fadcc' }}>Role</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', padding: '2px 9px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {user?.role === 'HR' ? 'HR Officer' : 'Administrator'}
                  </span>
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
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', border: '1.5px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>{user?.name?.charAt(0).toUpperCase()}</span>
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
                  <p style={{ fontSize: 10, color: '#8fadcc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{user?.role}</p>
                </div>
              </div>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#8fadcc" strokeWidth="2">
                {showUserInfo ? <polyline points="18 15 12 9 6 15"/> : <polyline points="6 9 12 15 18 9"/>}
              </svg>
            </div>
          ) : (
            <div onClick={() => setShowUserInfo(v => !v)} title={user?.name} style={{ cursor: 'pointer', width: '100%', display: 'flex', justifyContent: 'center', padding: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', border: '1.5px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>{user?.name?.charAt(0).toUpperCase()}</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Content area ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>
        {activeModule === 'overview'   && <AdminOverview user={user} />}
        {activeModule === 'reward'     && <AdminRewardModule user={user} />}
        {activeModule === 'helpdesk'   && <ComingSoon label="Help Desk Management" />}
        {activeModule === 'directory'  && <ComingSoon label="Employee Directory" />}
        {activeModule === 'analytics'  && <ComingSoon label="Analytics" />}
        {activeModule === 'settings'   && <ComingSoon label="Settings" />}
      </div>
    </div>
  );
}
