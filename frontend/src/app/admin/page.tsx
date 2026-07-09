'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { DriveITLogo, DriveITMark } from '@/components/DriveITLogo';
import { NotificationBell } from '@/components/NotificationBell';
import { Pagination } from '@/components/Pagination';
import { SettingsModule } from '@/components/SettingsModule';
import { VisitorsModule } from '@/components/VisitorsModule';
import { WorkLogAdminModule } from '@/components/WorkLogAdminModule';
import { UserAdminModule } from '@/components/UserAdminModule';
import { AskAiFab } from '@/components/AskAiFab';

const PER_PAGE = 10;

/* ── Nav items ───────────────────────────────────────────────────── */
type Module = 'overview' | 'reward' | 'helpdesk' | 'worklog' | 'settings' | 'visitors' | 'visitor-admin' | 'users';

const VisitorIcon = () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11l-3 3-1.5-1.5"/></svg>;

const NAV_ITEMS: Record<string, { key: Module; label: string; icon: () => JSX.Element }> = {
  overview: { key: 'overview', label: 'Overview', icon: () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  helpdesk: { key: 'helpdesk', label: 'Help Desk', icon: () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
  worklog: { key: 'worklog', label: 'Work Log', icon: () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg> },
  reward: { key: 'reward', label: 'Reward System', icon: () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
  users: { key: 'users', label: 'User Management', icon: () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
  settings: { key: 'settings', label: 'Settings', icon: () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> },
};

/* ── Helpers ──────────────────────────────────────────────────────── */
const CAT_LABELS: Record<string, string> = {
  EXCELLENCE: 'Excellence in Execution', COLLABORATION: 'Collaboration & Teamwork',
  INNOVATION: 'Innovation', CUSTOMER_IMPACT: 'Customer Impact', LEADERSHIP: 'Leadership & Mentorship',
};
const STATUS_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  PENDING:   { bg: 'var(--b-amber-bg)', color: 'var(--b-amber-fg)',  border: 'var(--b-amber-bd)' },
  ESCALATED: { bg: 'var(--b-indigo-bg)', color: 'var(--b-indigo-fg)',  border: 'var(--b-indigo-bd)' },
  APPROVED:  { bg: 'var(--b-green-bg)', color: 'var(--b-green-fg)',  border: 'var(--b-green-bd)' },
  DECLINED:  { bg: 'var(--b-red-bg)', color: 'var(--b-red-fg)',  border: 'var(--b-red-bd)' },
};

const CATEGORIES = ['EXCELLENCE', 'COLLABORATION', 'INNOVATION', 'CUSTOMER_IMPACT', 'LEADERSHIP'];

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1.5px solid var(--border)', fontSize: 13, color: 'var(--text)',
  background: 'var(--surface-2)', outline: 'none', boxSizing: 'border-box',
};

/* ── Admin / HR reward module ────────────────────────────────────── */
const HR_CATS = ['COLLABORATION', 'EXCELLENCE'];

function AdminRewardModule({ user }: { user: any }) {
  const isHR = user?.role === 'HR';
  const [nominations, setNominations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'ESCALATED' | 'APPROVED' | 'DECLINED'>('ALL');
  const [ptsInput, setPtsInput] = useState<Record<number, string>>({});
  const [msgs, setMsgs] = useState<Record<number, string>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ nomineeName: '', nominatedBy: '', projectName: '', category: '', context: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createMsg, setCreateMsg] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { setPage(1); }, [filter]);

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
    if (!createForm.nomineeName.trim() || !createForm.context.trim() || !createForm.category) {
      setCreateMsg('Please fill all required fields, including a category.'); return;
    }
    setCreateLoading(true); setCreateMsg('');
    try {
      await api.submitNomination(createForm);
      setCreateMsg('Nomination created!');
      setCreateForm({ nomineeName: '', nominatedBy: '', projectName: '', category: '', context: '' });
      loadData();
      setTimeout(() => { setShowCreate(false); setCreateMsg(''); }, 1200);
    } catch (e: any) {
      setCreateMsg(e.message || 'Failed to create nomination.');
    } finally {
      setCreateLoading(false);
    }
  }

  const filtered = nominations.filter(n => filter === 'ALL' || n.status === filter);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>Reward System</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
            {isHR ? 'Review HR-level nominations. Escalate complex cases to Admin.' : 'Full view — all nominations including escalated cases.'}
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreateMsg(''); }}
          style={{ display: 'flex', alignItems: 'center', gap: 7, height: 38, padding: '0 16px', borderRadius: 9, background: 'var(--accent)', border: '1px solid var(--accent-hover)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create Nomination
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div style={{ background: 'var(--surface-elevated)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Create Nomination</h3>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
            </div>
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-soft)', display: 'block', marginBottom: 5 }}>Nominee Name *</label>
                <input style={inputStyle} placeholder="Full name" value={createForm.nomineeName} onChange={e => setCreateForm(p => ({ ...p, nomineeName: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-soft)', display: 'block', marginBottom: 5 }}>Nominated By</label>
                <input style={inputStyle} placeholder="Nominator name" value={createForm.nominatedBy} onChange={e => setCreateForm(p => ({ ...p, nominatedBy: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-soft)', display: 'block', marginBottom: 5 }}>Project / Team</label>
                <input style={inputStyle} placeholder="Project or team name" value={createForm.projectName} onChange={e => setCreateForm(p => ({ ...p, projectName: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-soft)', display: 'block', marginBottom: 5 }}>Category *</label>
                <select style={{ ...inputStyle, cursor: 'pointer', color: createForm.category ? 'var(--text)' : 'var(--text-faint)' }} value={createForm.category} onChange={e => setCreateForm(p => ({ ...p, category: e.target.value }))}>
                  <option value="" disabled>Select a category…</option>
                  {CATEGORIES.map(c => <option key={c} value={c} style={{ color: 'var(--text)' }}>{CAT_LABELS[c]}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-soft)', display: 'block', marginBottom: 5 }}>Context / Reason *</label>
                <textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} placeholder="Describe the contribution..." value={createForm.context} onChange={e => setCreateForm(p => ({ ...p, context: e.target.value }))} />
              </div>
              {createMsg && <p style={{ fontSize: 13, color: createMsg.includes('!') ? 'var(--b-green-fg)' : 'var(--b-red-fg)', fontWeight: 500 }}>{createMsg}</p>}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{ height: 38, padding: '0 16px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={createLoading} style={{ height: 38, padding: '0 20px', borderRadius: 8, background: 'var(--accent)', border: '1px solid var(--accent-hover)', color: 'white', fontSize: 13, fontWeight: 600, cursor: createLoading ? 'not-allowed' : 'pointer', opacity: createLoading ? 0.7 : 1 }}>
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
            { label: 'Total',     val: stats.total,          col: 'var(--accent)', bg: 'var(--b-blue-bg)', border: 'var(--b-blue-bd)' },
            { label: 'Pending',   val: stats.pending,        col: 'var(--b-amber-fg)', bg: 'var(--b-amber-bg)', border: 'var(--b-amber-bd)' },
            { label: 'Escalated', val: stats.escalated ?? 0, col: 'var(--b-indigo-fg)', bg: 'var(--b-indigo-bg)', border: 'var(--b-indigo-bd)' },
            { label: 'Approved',  val: stats.approved,       col: 'var(--b-green-fg)', bg: 'var(--b-green-bg)', border: 'var(--b-green-bd)' },
            { label: 'Declined',  val: stats.declined,       col: 'var(--b-red-fg)', bg: 'var(--b-red-bg)', border: 'var(--b-red-bd)' },
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
        <div style={{ marginBottom: 16, background: 'var(--b-indigo-bg)', border: '1px solid var(--b-indigo-bd)', borderRadius: 10, padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="var(--b-indigo-fg)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          <p style={{ fontSize: 13, color: 'var(--b-indigo-fg)' }}>
            Showing <strong>Collaboration &amp; Teamwork</strong> and <strong>Excellence in Execution</strong> nominations.
            Use <strong>Escalate</strong> to forward technical or complex cases to Admin.
          </p>
        </div>
      )}

      {/* Body: list + insights sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 264px', gap: 24, alignItems: 'start', maxWidth: 1180 }}>
       <div style={{ minWidth: 0 }}>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--divider)', borderRadius: 10, padding: 4, marginBottom: 20, width: 'fit-content' }}>
        {(['ALL', 'PENDING', 'ESCALATED', 'APPROVED', 'DECLINED'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 500,
            border: 'none', cursor: 'pointer', transition: 'all 150ms',
            background: filter === f ? 'var(--surface)' : 'transparent',
            color: filter === f ? 'var(--text)' : 'var(--text-muted)',
            boxShadow: filter === f ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}>
            {f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Nomination cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.length === 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No nominations found.</p>
          </div>
        )}
        {pageItems.map(n => {
          const sc = STATUS_COLOR[n.status] || STATUS_COLOR.PENDING;
          const canApprove = !!parseInt(ptsInput[n.id]);
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
              background: 'var(--surface)',
              border: `1px solid ${isEscalated ? 'var(--b-indigo-bd)' : 'var(--border)'}`,
              borderLeft: `4px solid ${isEscalated ? 'var(--b-indigo-fg)' : n.status === 'APPROVED' ? 'var(--b-green-fg)' : n.status === 'DECLINED' ? 'var(--b-red-fg)' : 'var(--b-amber-fg)'}`,
              borderRadius: 12, padding: '18px 22px',
            }}>
              {/* Escalated banner */}
              {isEscalated && !isHR && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, background: 'var(--b-indigo-bg)', borderRadius: 7, padding: '6px 12px', width: 'fit-content' }}>
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="var(--b-indigo-fg)" strokeWidth="2"><polyline points="17 11 12 6 7 11"/><line x1="12" y1="6" x2="12" y2="18"/></svg>
                  <span style={{ fontSize: 12, color: 'var(--b-indigo-fg)', fontWeight: 600 }}>Escalated from HR — needs Admin decision</span>
                </div>
              )}

              {/* Card header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                    #{n.id} · {n.projectName || 'No project'}
                  </p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{n.nomineeName}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    Nominated by {n.nominatedBy} · {CAT_LABELS[n.category]}
                  </p>
                  {n.submittedBy?.name && (
                    <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>Submitted by {n.submittedBy.name}</p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {n.points && n.status === 'APPROVED' && (
                    <span style={{ fontSize: 12, fontWeight: 700, background: 'var(--b-green-bg)', color: 'var(--b-green-fg)', border: '1px solid var(--b-green-bd)', padding: '3px 10px', borderRadius: 20 }}>
                      +{n.points} pts
                    </span>
                  )}
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                    {statusLabel}
                  </span>
                </div>
              </div>

              {/* Context */}
              <p style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.65, borderLeft: '3px solid var(--border)', paddingLeft: 12, marginBottom: (showApproveRow || showEscalateBtn) ? 14 : 0 }}>
                {n.context}
              </p>

              {/* Action row — award controls on the left, decision buttons bottom-right */}
              {(showApproveRow || showEscalateBtn) && (
                <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 14, display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
                  {showApproveRow && (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
                      {/* Points to award */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)' }}>Award points <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(1–10)</span></label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-2)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 10px' }}>
                          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 10.5h3a1.5 1.5 0 000-3h-2a1.5 1.5 0 000 3H13a1.5 1.5 0 010 3H9.5"/></svg>
                          <input
                            type="text" inputMode="numeric" placeholder="1–10"
                            value={ptsInput[n.id] || ''}
                            onChange={e => setPtsInput(prev => ({ ...prev, [n.id]: e.target.value.replace(/\D/g, '') }))}
                            style={{ width: 40, background: 'transparent', border: 'none', fontSize: 13, color: 'var(--text)', textAlign: 'center', outline: 'none' }}
                          />
                          <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>pts</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Decision buttons — pinned bottom-right */}
                  <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                    {showEscalateBtn && (
                      <button
                        onClick={() => handleEscalate(n.id)}
                        style={{ height: 34, padding: '0 14px', borderRadius: 8, background: 'var(--b-indigo-bg)', border: '1px solid var(--b-indigo-bd)', color: 'var(--b-indigo-fg)', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 11 12 6 7 11"/><line x1="12" y1="6" x2="12" y2="18"/></svg>
                        Escalate to Admin
                      </button>
                    )}
                    {showApproveRow && (
                      <>
                        <button onClick={() => handleDecline(n.id)} style={{ height: 34, padding: '0 14px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>
                          Decline
                        </button>
                        <button
                          disabled={!canApprove}
                          onClick={() => handleApprove(n.id)}
                          title={!canApprove ? 'Enter points (1–10) to approve' : undefined}
                          style={{ height: 34, padding: '0 16px', borderRadius: 8, background: canApprove ? 'var(--b-green-fg)' : 'var(--b-green-bg)', border: `1px solid ${canApprove ? 'var(--b-green-fg)' : 'var(--b-green-bd)'}`, color: canApprove ? 'white' : 'var(--b-green-bd)', fontSize: 13, fontWeight: 600, cursor: canApprove ? 'pointer' : 'not-allowed', transition: 'all 150ms' }}>
                          Approve
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Persistent feedback message — shown outside action row so it survives data reload */}
              {msgs[n.id] && (
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 12, color: msgs[n.id].startsWith('✓') ? 'var(--b-green-fg)' : 'var(--b-indigo-fg)', fontWeight: 500 }}>{msgs[n.id]}</span>
                </div>
              )}

              {/* Closed footer */}
              {(n.status === 'APPROVED' || n.status === 'DECLINED') && (
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                    {n.status === 'APPROVED' ? 'Points awarded — nomination closed' : 'Nomination closed'}
                  </span>
                </div>
              )}

              {/* Escalated footer — HR sees confirmation after escalating; Admin already has the banner above */}
              {isEscalated && isHR && !msgs[n.id] && (
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 12, color: 'var(--b-indigo-fg)' }}>Forwarded to Admin for review</span>
                </div>
              )}
            </div>
          );
        })}
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
       </div>

       {/* Insights sidebar */}
       <aside style={{ position: 'sticky', top: 64, display: 'flex', flexDirection: 'column', gap: 14 }}>
         <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
           <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>By Category</p>
           {(() => {
             const cats = isHR ? CATEGORIES.filter(c => HR_CATS.includes(c)) : CATEGORIES;
             const dot: Record<string, string> = { EXCELLENCE: 'var(--b-green-fg)', COLLABORATION: 'var(--accent)', INNOVATION: 'var(--b-violet-fg)', CUSTOMER_IMPACT: 'var(--b-orange-fg)', LEADERSHIP: 'var(--b-amber-fg)' };
             return cats.map(c => {
               const count = nominations.filter(n => n.category === c).length;
               return (
                 <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0' }}>
                   <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot[c] || 'var(--text-faint)', flexShrink: 0 }} />
                   <span style={{ flex: 1, fontSize: 13, color: 'var(--text-soft)' }}>{CAT_LABELS[c]}</span>
                   <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{count}</span>
                 </div>
               );
             });
           })()}
         </div>

         {stats && (stats.pending > 0 || (stats.escalated ?? 0) > 0) && (
           <div style={{ background: 'var(--b-amber-bg)', border: '1px solid var(--b-amber-bd)', borderRadius: 12, padding: '16px 18px' }}>
             <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--b-amber-fg)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Needs your attention</p>
             {stats.pending > 0 && (
               <button onClick={() => setFilter('PENDING')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '7px 0', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                 <span style={{ fontSize: 13, color: 'var(--b-amber-fg)' }}>Pending review</span>
                 <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--b-amber-fg)' }}>{stats.pending}</span>
               </button>
             )}
             {!isHR && (stats.escalated ?? 0) > 0 && (
               <button onClick={() => setFilter('ESCALATED')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '7px 0', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                 <span style={{ fontSize: 13, color: 'var(--b-amber-fg)' }}>Escalated to you</span>
                 <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--b-indigo-fg)' }}>{stats.escalated}</span>
               </button>
             )}
           </div>
         )}
       </aside>
      </div>
    </div>
  );
}

/* ── Admin overview ──────────────────────────────────────────────── */
function AdminOverview({ user, onNavigate }: { user: any; onNavigate: (m: Module) => void }) {
  const isHR = user?.role === 'HR';
  const [stats, setStats] = useState<any>(null);
  const [noms, setNoms] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {});
    api.getAllNominations().then(setNoms).catch(() => {});
    if (!isHR) api.getTicketAnalytics().then(setAnalytics).catch(() => {});
  }, []);

  const review = noms.filter(n => n.status === 'PENDING' || n.status === 'ESCALATED');
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 };

  const kpis = stats ? [
    { label: 'Total', val: stats.total, col: 'var(--accent)', bg: 'var(--b-blue-bg)', border: 'var(--b-blue-bd)' },
    { label: 'Pending', val: stats.pending, col: 'var(--b-amber-fg)', bg: 'var(--b-amber-bg)', border: 'var(--b-amber-bd)' },
    { label: 'Escalated', val: stats.escalated ?? 0, col: 'var(--b-indigo-fg)', bg: 'var(--b-indigo-bg)', border: 'var(--b-indigo-bd)' },
    { label: 'Approved', val: stats.approved, col: 'var(--b-green-fg)', bg: 'var(--b-green-bg)', border: 'var(--b-green-bd)' },
    { label: 'Declined', val: stats.declined, col: 'var(--b-red-fg)', bg: 'var(--b-red-bg)', border: 'var(--b-red-bd)' },
  ] : [];

  return (
    <div style={{ maxWidth: 1080 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4, letterSpacing: '-0.01em' }}>
        Welcome, {user?.name?.split(' ')[0] || 'Admin'} 👋
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 22 }}>{dateStr} · {isHR ? 'HR Portal — recognition & department help desk.' : 'Admin Portal — full recognition & help desk control.'}</p>

      {/* KPI cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 16 }}>
          {kpis.map(c => (
            <div key={c.label} onClick={() => onNavigate('reward')} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: '16px 18px', cursor: 'pointer' }}>
              <p style={{ fontSize: 26, fontWeight: 800, color: c.col, letterSpacing: '-0.02em' }}>{c.val}</p>
              <p style={{ fontSize: 11, color: c.col, fontWeight: 600, marginTop: 4, opacity: 0.85 }}>{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        {/* Awaiting review */}
        <div style={{ ...card, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Awaiting your review</p>
            {review.length > 0 && <button onClick={() => onNavigate('reward')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Review all</button>}
          </div>
          {review.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-faint)', padding: '20px 0', textAlign: 'center' }}>Nothing pending — you're all caught up. 🎉</p>}
          {review.slice(0, 6).map(n => {
            const esc = n.status === 'ESCALATED';
            return (
              <div key={n.id} onClick={() => onNavigate('reward')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--divider)', cursor: 'pointer' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.nomineeName}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-faint)' }}>{CAT_LABELS[n.category] || n.category} · by {n.nominatedBy}</p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: esc ? 'var(--b-indigo-bg)' : 'var(--b-amber-bg)', color: esc ? 'var(--b-indigo-fg)' : 'var(--b-amber-fg)', border: `1px solid ${esc ? 'var(--b-indigo-bd)' : 'var(--b-amber-bd)'}`, flexShrink: 0 }}>{esc ? 'Escalated' : 'Pending'}</span>
              </div>
            );
          })}
        </div>

        {/* Right: help desk snapshot (admin) + quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!isHR && analytics && (
            <div style={{ ...card, padding: '18px 20px' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Help Desk at a glance</p>
              {[
                { label: 'Open', val: analytics.open, color: 'var(--text-soft)' },
                { label: 'In Progress', val: analytics.inProgress, color: 'var(--b-amber-fg)' },
                { label: 'Resolved', val: analytics.resolved, color: 'var(--b-green-fg)' },
                { label: 'Blocked', val: analytics.blocked, color: 'var(--b-orange-fg)' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>{r.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: r.color }}>{r.val}</span>
                </div>
              ))}
              <button onClick={() => onNavigate('helpdesk')} style={{ marginTop: 10, width: '100%', height: 34, borderRadius: 8, background: 'var(--b-blue-bg)', border: '1px solid var(--b-blue-bd)', color: 'var(--accent-hover)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Open Help Desk</button>
            </div>
          )}

          <div style={{ ...card, padding: '18px 20px' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Quick Actions</p>
            <button onClick={() => onNavigate('reward')} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', borderRadius: 10, background: 'var(--b-green-bg)', border: '1px solid var(--b-green-bd)', color: 'var(--b-green-fg)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
              Review nominations
            </button>
            <button onClick={() => onNavigate('helpdesk')} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', borderRadius: 10, background: 'var(--b-blue-bg)', border: '1px solid var(--b-blue-bd)', color: 'var(--accent-hover)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
              Manage help desk
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Coming soon ─────────────────────────────────────────────────── */
function ComingSoon({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, background: 'var(--divider)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-soft)', marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>This module is coming soon.</p>
    </div>
  );
}

/* ── Ticket helpers ──────────────────────────────────────────────── */
const TICKET_STATUS_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  OPEN:        { bg: 'var(--divider)', color: 'var(--text-soft)', border: 'var(--b-slate-bd)' },
  ASSIGNED:    { bg: 'var(--b-blue-bg)', color: 'var(--accent)', border: 'var(--b-blue-bd)' },
  IN_PROGRESS: { bg: 'var(--b-amber-bg)', color: 'var(--b-amber-fg)', border: 'var(--b-amber-bd)' },
  RESOLVED:    { bg: 'var(--b-green-bg)', color: 'var(--b-green-fg)', border: 'var(--b-green-bd)' },
  CLOSED:      { bg: 'var(--surface-2)', color: 'var(--text-faint)', border: 'var(--border)' },
  REOPENED:    { bg: 'var(--b-red-bg)', color: 'var(--b-red-fg)', border: 'var(--b-red-bd)' },
  REASSIGNED:  { bg: 'var(--b-violet-bg)', color: 'var(--b-violet-fg)', border: 'var(--b-violet-bd)' },
};
const TICKET_PRIORITY_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  LOW:      { bg: 'var(--surface-2)', color: 'var(--text-muted)', border: 'var(--border)' },
  MEDIUM:   { bg: 'var(--b-blue-bg)', color: 'var(--accent)', border: 'var(--b-blue-bd)' },
  HIGH:     { bg: 'var(--b-orange-bg)', color: 'var(--b-orange-fg)', border: 'var(--b-orange-bd)' },
  CRITICAL: { bg: 'var(--b-red-bg)', color: 'var(--b-red-fg)', border: 'var(--b-red-bd)' },
};
function ticketStatusLabel(s: string) {
  return s === 'IN_PROGRESS' ? 'In Progress' : s.charAt(0) + s.slice(1).toLowerCase();
}

/* Human-friendly audit trail entries — no raw "true → false" or trailing IDs */
function describeAudit(log: any): { text: string; dot: string } {
  const cap = (v: string) => (v ? v.charAt(0) + v.slice(1).toLowerCase() : '');
  switch (log.changeType) {
    case 'STATUS_CHANGE':
      return { text: `Status changed from ${ticketStatusLabel(log.oldValue)} to ${ticketStatusLabel(log.newValue)}`, dot: 'var(--accent)' };
    case 'PRIORITY_CHANGE':
      return { text: `Priority changed from ${cap(log.oldValue)} to ${cap(log.newValue)}`, dot: 'var(--b-violet-fg)' };
    case 'BLOCKED':
      return { text: 'Ticket marked as blocked', dot: 'var(--b-orange-fg)' };
    case 'UNBLOCKED':
      return { text: 'Ticket unblocked', dot: 'var(--b-green-fg)' };
    case 'ASSIGNMENT':
      return { text: 'Ticket assigned to an agent', dot: 'var(--accent)' };
    case 'COMMENT_ADDED':
      return { text: 'Comment added', dot: 'var(--text-faint)' };
    default:
      return { text: log.changeType.replace(/_/g, ' ').toLowerCase(), dot: 'var(--text-faint)' };
  }
}

/* ── Admin / HR Help Desk module ─────────────────────────────────── */
function AdminHelpdeskModule({ user }: { user: any }) {
  const isHR = user?.role === 'HR';
  const [tickets, setTickets] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [comment, setComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [resolveNote, setResolveNote] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { loadAll(); }, [statusFilter, deptFilter, priorityFilter]);
  useEffect(() => { setPage(1); }, [statusFilter, deptFilter, priorityFilter]);

  async function loadAll() {
    const params: any = {};
    if (statusFilter !== 'ALL') params.status = statusFilter;
    if (deptFilter) params.department = deptFilter;
    if (priorityFilter) params.priority = priorityFilter;
    // Fetch tickets and analytics INDEPENDENTLY — analytics is admin-only, so a 403
    // there must never prevent the ticket list from loading for HR.
    try { setTickets(await api.getAllTickets(params)); } catch {}
    if (!isHR) {
      try { setAnalytics(await api.getTicketAnalytics()); } catch {}
    }
  }

  async function openTicket(t: any) {
    try {
      const [detail, comms] = await Promise.all([api.getTicket(t.id), api.getComments(t.id)]);
      setSelectedTicket(detail);
      setComments(comms);
      setShowResolveForm(false);
      setShowBlockForm(false);
      setResolveNote('');
      setBlockReason('');
    } catch {}
  }

  async function ticketAction(body: object) {
    if (!selectedTicket) return;
    setActionLoading(true);
    try {
      await api.updateTicket(selectedTicket.id, body);
      // Re-fetch the full ticket so audit trail, comments and all relations stay intact
      const [detail, comms] = await Promise.all([
        api.getTicket(selectedTicket.id),
        api.getComments(selectedTicket.id),
      ]);
      setSelectedTicket(detail);
      setComments(comms);
      loadAll();
      setShowResolveForm(false);
      setShowBlockForm(false);
      setResolveNote('');
      setBlockReason('');
    } catch {}
    finally { setActionLoading(false); }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim() || !selectedTicket) return;
    setCommentLoading(true);
    try {
      const newComment = await api.createComment(selectedTicket.id, { message: comment });
      setComments(prev => [...prev, newComment]);
      setComment('');
    } catch {}
    finally { setCommentLoading(false); }
  }

  const isClosed = selectedTicket?.status === 'CLOSED' || selectedTicket?.status === 'RESOLVED';
  // Agents can only act while the ticket is live — not once it's RESOLVED (awaiting requester) or CLOSED
  const canAct = selectedTicket && !['CLOSED', 'RESOLVED'].includes(selectedTicket.status);
  // "Working" states: the assigned agent is actively handling the ticket
  const isWorking = selectedTicket && ['IN_PROGRESS', 'REOPENED'].includes(selectedTicket.status);

  /* ── Ticket detail view ── */
  if (selectedTicket) {
    const sc = TICKET_STATUS_COLOR[selectedTicket.status] || TICKET_STATUS_COLOR.OPEN;
    const pc = TICKET_PRIORITY_COLOR[selectedTicket.priority] || TICKET_PRIORITY_COLOR.MEDIUM;

    return (
      <div style={{ maxWidth: 800 }}>
        {/* Back */}
        <button onClick={() => setSelectedTicket(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', marginBottom: 20, padding: 0 }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to tickets
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 16, alignItems: 'start' }}>
          {/* Main column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header card */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-faint)', fontWeight: 600 }}>{selectedTicket.ticketNumber}</span>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{ticketStatusLabel(selectedTicket.status)}</span>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: pc.bg, color: pc.color, border: `1px solid ${pc.border}` }}>{selectedTicket.priority}</span>
                {selectedTicket.isBlocked && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: 'var(--b-orange-bg)', color: 'var(--b-orange-fg)', border: '1px solid var(--b-orange-bd)' }}>Blocked</span>}
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{selectedTicket.title}</h2>
              <p style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{selectedTicket.description}</p>

              {selectedTicket.isBlocked && selectedTicket.blockedReason && (
                <div style={{ marginTop: 14, background: 'var(--b-orange-bg)', border: '1px solid var(--b-orange-bd)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--b-orange-fg)' }}>
                  <strong>Blocked:</strong> {selectedTicket.blockedReason}
                </div>
              )}
              {(selectedTicket.status === 'RESOLVED' || selectedTicket.status === 'CLOSED') && (
                <div style={{ marginTop: 14, background: 'var(--b-green-bg)', border: '1px solid var(--b-green-bd)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--b-green-fg)' }}>
                  <strong>Resolved{selectedTicket.assignedTo?.name ? ` by ${selectedTicket.assignedTo.name}` : ''}</strong>
                  {selectedTicket.resolutionNote ? ` — ${selectedTicket.resolutionNote}` : ''}
                </div>
              )}
            </div>

            {/* Agent actions */}
            {canAct && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 24px' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Actions</p>
                {/* Show the action buttons only when neither form is open — resolve & block are mutually exclusive */}
                {!showResolveForm && !showBlockForm && (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {/* Claim & start working — only before work begins (OPEN / ASSIGNED) */}
                    {['OPEN', 'ASSIGNED'].includes(selectedTicket.status) && (
                      <button disabled={actionLoading} onClick={() => ticketAction({ status: 'IN_PROGRESS' })} style={{ height: 36, padding: '0 16px', borderRadius: 8, background: 'var(--accent)', border: '1px solid var(--accent-hover)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        {selectedTicket.assignedToId ? 'Start working' : 'Claim & start'}
                      </button>
                    )}
                    {/* Mark resolved — available while working (In Progress or Reopened) */}
                    {isWorking && (
                      <button onClick={() => setShowResolveForm(true)} style={{ height: 36, padding: '0 16px', borderRadius: 8, background: 'var(--b-green-fg)', border: '1px solid var(--b-green-fg)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Mark resolved
                      </button>
                    )}
                    {/* Block — only while actively working, never at the start or after resolve */}
                    {isWorking && !selectedTicket.isBlocked && (
                      <button onClick={() => setShowBlockForm(true)} style={{ height: 36, padding: '0 16px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--b-orange-bd)', color: 'var(--b-orange-fg)', fontSize: 13, cursor: 'pointer' }}>
                        Mark blocked
                      </button>
                    )}
                  </div>
                )}

                {/* Resolve form */}
                {showResolveForm && (
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <textarea
                      value={resolveNote}
                      onChange={e => setResolveNote(e.target.value)}
                      placeholder="Resolution note (optional)"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13, color: 'var(--text)', background: 'var(--surface-2)', outline: 'none', resize: 'vertical', minHeight: 70, boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button disabled={actionLoading} onClick={() => ticketAction({ status: 'RESOLVED', resolutionNote: resolveNote })} style={{ height: 34, padding: '0 16px', borderRadius: 8, background: 'var(--b-green-fg)', border: '1px solid var(--b-green-fg)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Confirm Resolved
                      </button>
                      <button onClick={() => setShowResolveForm(false)} style={{ height: 34, padding: '0 12px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </div>
                )}

                {/* Block form */}
                {showBlockForm && (
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <textarea
                      value={blockReason}
                      onChange={e => setBlockReason(e.target.value)}
                      placeholder="Reason for blocking (required)"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--b-orange-bd)', fontSize: 13, color: 'var(--text)', background: 'var(--b-amber-bg)', outline: 'none', resize: 'vertical', minHeight: 70, boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button disabled={actionLoading || !blockReason.trim()} onClick={() => ticketAction({ blockedReason: blockReason })} style={{ height: 34, padding: '0 16px', borderRadius: 8, background: 'var(--b-orange-fg)', border: '1px solid var(--b-orange-fg)', color: 'white', fontSize: 13, fontWeight: 600, cursor: blockReason.trim() ? 'pointer' : 'not-allowed', opacity: blockReason.trim() ? 1 : 0.6 }}>
                        Confirm Block
                      </button>
                      <button onClick={() => setShowBlockForm(false)} style={{ height: 34, padding: '0 12px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Comments */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
                Comments ({comments.length})
              </p>
              {comments.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-faint)', marginBottom: 16 }}>No comments yet.</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                {comments.map((c: any) => (
                  <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--b-blue-bg)', border: '1px solid var(--b-blue-bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{c.author?.name?.charAt(0).toUpperCase()}</span>
                    </div>
                    <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.author?.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{c.author?.role}{c.author?.department ? ` · ${c.author.department}` : ''}</span>
                        {c.isEdited && <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>(edited)</span>}
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.6 }}>{c.message}</p>
                    </div>
                  </div>
                ))}
              </div>
              {selectedTicket.status !== 'CLOSED' && (
                <form onSubmit={handleComment} style={{ display: 'flex', gap: 10 }}>
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(e as any); } }}
                    placeholder="Write a comment… (Enter to send)"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13, color: 'var(--text)', background: 'var(--surface-2)', outline: 'none', resize: 'none', minHeight: 70, flex: 1, boxSizing: 'border-box' }}
                  />
                  <button type="submit" disabled={commentLoading || !comment.trim()} style={{ alignSelf: 'flex-end', height: 38, padding: '0 16px', borderRadius: 8, background: 'var(--accent)', border: '1px solid var(--accent-hover)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: commentLoading ? 0.7 : 1, flexShrink: 0 }}>
                    Send
                  </button>
                </form>
              )}
            </div>

          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Details</p>
              {[
                { label: 'Department', value: selectedTicket.department },
                { label: 'Raised by', value: selectedTicket.raisedBy?.name },
                { label: 'Claimed by', value: selectedTicket.assignedTo?.name || 'Unassigned' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 12 }}>
                  <span style={{ color: 'var(--text-faint)' }}>{row.label}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-soft)' }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Audit trail (Admin only) — sits in the sidebar, right below Details */}
            {!isHR && selectedTicket.auditLogs && selectedTicket.auditLogs.length > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Audit Trail</p>
                <div style={{ position: 'relative' }}>
                  {selectedTicket.auditLogs.map((log: any, i: number) => {
                    const { text, dot } = describeAudit(log);
                    const isLast = i === selectedTicket.auditLogs.length - 1;
                    return (
                      <div key={log.id} style={{ display: 'flex', gap: 10, position: 'relative', paddingBottom: isLast ? 0 : 16 }}>
                        {/* Timeline rail */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                          <div style={{ width: 9, height: 9, borderRadius: '50%', background: dot, border: '2px solid var(--surface)', boxShadow: `0 0 0 1.5px ${dot}`, marginTop: 3, zIndex: 1 }} />
                          {!isLast && <div style={{ width: 1.5, flex: 1, background: 'var(--border)', marginTop: 2 }} />}
                        </div>
                        {/* Entry */}
                        <div style={{ paddingBottom: 2 }}>
                          <p style={{ fontSize: 12, color: 'var(--text-soft)', lineHeight: 1.45 }}>{text}</p>
                          <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>by {log.user?.name || 'System'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Ticket list view ── */
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>Help Desk Management</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
            {isHR ? 'Manage support tickets for your department.' : 'Full view of all support tickets across all departments.'}
          </p>
        </div>
      </div>

      {/* Analytics cards */}
      {analytics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24, maxWidth: 840 }}>
          {[
            { label: 'Total',       val: analytics.total,      col: 'var(--accent)', bg: 'var(--b-blue-bg)', border: 'var(--b-blue-bd)' },
            { label: 'Open',        val: analytics.open,       col: 'var(--text-soft)', bg: 'var(--divider)', border: 'var(--b-slate-bd)' },
            { label: 'In Progress', val: analytics.inProgress, col: 'var(--b-amber-fg)', bg: 'var(--b-amber-bg)', border: 'var(--b-amber-bd)' },
            { label: 'Resolved',    val: analytics.resolved,   col: 'var(--b-green-fg)', bg: 'var(--b-green-bg)', border: 'var(--b-green-bd)' },
            { label: 'Blocked',     val: analytics.blocked,    col: 'var(--b-orange-fg)', bg: 'var(--b-orange-bg)', border: 'var(--b-orange-bd)' },
          ].map(c => (
            <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: c.col, letterSpacing: '-0.02em' }}>{c.val}</p>
              <p style={{ fontSize: 11, color: c.col, fontWeight: 600, marginTop: 3, opacity: 0.8 }}>{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--divider)', borderRadius: 10, padding: 4 }}>
          {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)} style={{
              padding: '7px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500,
              border: 'none', cursor: 'pointer', transition: 'all 150ms',
              background: statusFilter === f ? 'var(--surface)' : 'transparent',
              color: statusFilter === f ? 'var(--text)' : 'var(--text-muted)',
              boxShadow: statusFilter === f ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              whiteSpace: 'nowrap',
            }}>
              {f === 'IN_PROGRESS' ? 'In Progress' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        {/* Admin can filter by department; HR is locked to their own department */}
        {!isHR && (
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{ height: 36, padding: '0 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13, color: 'var(--text-soft)', background: 'var(--surface-2)', cursor: 'pointer' }}>
            <option value="">All Departments</option>
            <option value="IT">IT</option>
            <option value="HR">HR</option>
          </select>
        )}
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={{ height: 36, padding: '0 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13, color: 'var(--text-soft)', background: 'var(--surface-2)', cursor: 'pointer' }}>
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </div>

      {/* Body: ticket list + breakdown sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 264px', gap: 24, alignItems: 'start', maxWidth: 1180 }}>
       <div style={{ minWidth: 0 }}>
      {/* Ticket list */}
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
        Tickets ({tickets.length})
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tickets.length === 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No tickets found.</p>
          </div>
        )}
        {[...tickets]
          .sort((a, b) => (a.status === 'CLOSED' ? 1 : 0) - (b.status === 'CLOSED' ? 1 : 0))
          .slice((page - 1) * PER_PAGE, page * PER_PAGE)
          .map((t: any) => {
          const sc = TICKET_STATUS_COLOR[t.status] || TICKET_STATUS_COLOR.OPEN;
          const pc = TICKET_PRIORITY_COLOR[t.priority] || TICKET_PRIORITY_COLOR.MEDIUM;
          const isClosedCard = t.status === 'CLOSED';
          const borderLeft = t.status === 'RESOLVED' ? 'var(--b-green-fg)' : t.status === 'CLOSED' ? 'var(--text-faint)' : t.status === 'IN_PROGRESS' ? 'var(--b-amber-fg)' : t.status === 'REOPENED' ? 'var(--b-red-fg)' : 'var(--accent)';
          return (
            <div key={t.id} onClick={() => openTicket(t)} style={{
              background: isClosedCard ? 'var(--surface-2)' : 'var(--surface)', border: '1px solid var(--border)',
              borderLeft: `4px solid ${borderLeft}`,
              borderRadius: 12, padding: '16px 22px', cursor: 'pointer', transition: 'box-shadow 0.15s',
              filter: isClosedCard ? 'grayscale(1)' : 'none', opacity: isClosedCard ? 0.6 : 1,
            }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-faint)', fontWeight: 600 }}>{t.ticketNumber}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 20, background: 'var(--divider)', color: 'var(--text-soft)', border: '1px solid var(--border)' }}>{t.department}</span>
                    {t.isBlocked && <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 20, background: 'var(--b-orange-bg)', color: 'var(--b-orange-fg)', border: '1px solid var(--b-orange-bd)' }}>Blocked</span>}
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{t.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                    Raised by {t.raisedBy?.name} · {t.assignedTo ? `Agent: ${t.assignedTo.name}` : 'Unassigned'} · {t._count?.comments ?? 0} comment{(t._count?.comments ?? 0) !== 1 ? 's' : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, whiteSpace: 'nowrap' }}>{ticketStatusLabel(t.status)}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: pc.bg, color: pc.color, border: `1px solid ${pc.border}` }}>{t.priority}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <Pagination page={page} totalPages={Math.ceil(tickets.length / PER_PAGE)} onChange={setPage} />
       </div>

       {/* Breakdown sidebar */}
       <aside style={{ position: 'sticky', top: 64, display: 'flex', flexDirection: 'column', gap: 14 }}>
         <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
           <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>By Priority</p>
           {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(p => {
             const pc = TICKET_PRIORITY_COLOR[p];
             const count = analytics?.byPriority?.[p] ?? tickets.filter((t: any) => t.priority === p).length;
             return (
               <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0' }}>
                 <span style={{ width: 8, height: 8, borderRadius: '50%', background: pc.color, flexShrink: 0 }} />
                 <span style={{ flex: 1, fontSize: 13, color: 'var(--text-soft)' }}>{p.charAt(0) + p.slice(1).toLowerCase()}</span>
                 <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{count}</span>
               </div>
             );
           })}
         </div>

         {!isHR && (
           <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
             <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>By Department</p>
             {(['IT', 'HR'] as const).map(d => {
               const count = analytics?.byDepartment?.[d] ?? tickets.filter((t: any) => t.department === d).length;
               return (
                 <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0' }}>
                   <span style={{ width: 8, height: 8, borderRadius: '50%', background: d === 'IT' ? 'var(--accent)' : 'var(--b-violet-fg)', flexShrink: 0 }} />
                   <span style={{ flex: 1, fontSize: 13, color: 'var(--text-soft)' }}>{d}</span>
                   <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{count}</span>
                 </div>
               );
             })}
           </div>
         )}
       </aside>
      </div>
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
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Theme is per-user and stored locally — toggling here never affects other users or the employee dashboard
  useEffect(() => {
    try { const e = JSON.parse(localStorage.getItem('user') || '{}')?.email; if (localStorage.getItem('theme_' + e) === 'dark') setTheme('dark'); } catch {}
  }, []);
  function toggleTheme() {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try { const e = JSON.parse(localStorage.getItem('user') || '{}')?.email; localStorage.setItem('theme_' + e, next); } catch {}
      return next;
    });
  }

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'ADMIN' && u.role !== 'HR') { router.push('/dashboard'); return; }
    api.getMe().then(me => {
      setUser({ ...u, id: me.id, name: me.name, points: me.points });
    }).catch(() => {
      // 401 is already handled in api.ts (clears storage + redirects).
      // For network errors (backend down), keep the stored session.
      setUser(u);
    });
  }, []);

  function logout() { localStorage.clear(); router.push('/'); }

  const SIDEBAR_W = sidebarOpen ? 240 : 64;

  // Order: Overview · Help Desk · Visitor Management · Reward · Settings
  // (Visitor entry is role-aware: HR → calendar, Admin → all visits)
  const visitorItem = { key: (user?.role === 'HR' ? 'visitors' : 'visitor-admin') as Module, label: 'Visitor Management', icon: VisitorIcon };
  // User Management is ADMIN-only (backend enforces this on every endpoint;
  // hiding it here is just UX for the HR view of this page).
  const navItems = [
    NAV_ITEMS.overview, NAV_ITEMS.helpdesk, visitorItem, NAV_ITEMS.worklog, NAV_ITEMS.reward,
    ...(user?.role === 'ADMIN' ? [NAV_ITEMS.users] : []),
    NAV_ITEMS.settings,
  ];

  if (!user) return null;

  return (
    <div data-theme={theme} style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

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
              {user?.role === 'HR' ? 'HR' : 'Administrator'}
            </span>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 0', overflow: 'auto' }}>
          {navItems.map(item => {
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
                    {user?.role === 'HR' ? 'HR' : 'Administrator'}
                  </span>
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
      <div className="dash-content" style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
        {/* Sticky top bar: theme toggle + notifications */}
        <div style={{ position: 'sticky', top: 0, zIndex: 60, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, padding: '16px 28px 0', background: 'var(--bg)' }}>
          <button onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} aria-label="Toggle theme"
            style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {theme === 'dark'
              ? <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/></svg>
              : <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>}
          </button>
          <NotificationBell accent="#f59e0b" />
        </div>
        <div style={{ padding: '8px 28px 28px' }}>
          {activeModule === 'overview'   && <AdminOverview user={user} onNavigate={setActiveModule} />}
          {activeModule === 'reward'     && <AdminRewardModule user={user} />}
          {activeModule === 'helpdesk'   && <AdminHelpdeskModule user={user} />}
          {activeModule === 'worklog'    && <WorkLogAdminModule user={user} />}
          {activeModule === 'users'      && user?.role === 'ADMIN' && <UserAdminModule user={user} />}
          {activeModule === 'settings'   && <SettingsModule user={user} onUpdated={u => setUser((prev: any) => ({ ...prev, name: u.name, designation: u.designation }))} />}
          {(activeModule === 'visitors' || activeModule === 'visitor-admin') && <VisitorsModule user={user} view={activeModule} />}
        </div>
      </div>

      <AskAiFab />
    </div>
  );
}
