'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { DriveITLogo, DriveITMark } from '@/components/DriveITLogo';
import { NotificationBell } from '@/components/NotificationBell';
import { Pagination } from '@/components/Pagination';
import { SettingsModule } from '@/components/SettingsModule';
import { AskAiFab } from '@/components/AskAiFab';
import { ScheduleForm } from '@/components/VisitorsModule';

const PER_PAGE = 10;

/* ── Nav items ───────────────────────────────────────────────────── */
type Module = 'overview' | 'reward' | 'helpdesk' | 'settings';

const NAV: { key: Module; label: string; icon: () => JSX.Element }[] = [
  { key: 'overview', label: 'Overview', icon: () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { key: 'helpdesk', label: 'Help Desk', icon: () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
  { key: 'reward',   label: 'Reward System', icon: () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
  { key: 'settings', label: 'Settings', icon: () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> },
];

/* ── CATEGORIES for nomination form ─────────────────────────────── */
const CATEGORIES = ['EXCELLENCE', 'COLLABORATION', 'INNOVATION', 'CUSTOMER_IMPACT', 'LEADERSHIP'];
const CAT_LABELS: Record<string, string> = {
  EXCELLENCE: 'Excellence in Execution', COLLABORATION: 'Collaboration & Teamwork',
  INNOVATION: 'Innovation', CUSTOMER_IMPACT: 'Customer Impact', LEADERSHIP: 'Leadership & Mentorship',
};
const STATUS_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  PENDING:   { bg: '#fffbeb', color: '#b45309', border: '#fcd34d' },
  ESCALATED: { bg: '#eef2ff', color: '#4f46e5', border: '#a5b4fc' },
  APPROVED:  { bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
  DECLINED:  { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
};

/* ── Reward module — Employee (view-only: rewards received) ──────────── */
function RewardModule() {
  const [received, setReceived] = useState<any[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [board, setBoard] = useState<any>(null);
  const [page, setPage] = useState(1);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [rec, wallet, lb] = await Promise.all([
        api.getReceivedNominations(), api.getWallet(), api.getLeaderboard(),
      ]);
      setReceived(rec);
      setTotalPoints(wallet?.points ?? 0);
      setBoard(lb);
    } catch {}
  }

  // Category breakdown of received recognition
  const catCounts: Record<string, number> = {};
  received.forEach(n => { catCounts[n.category] = (catCounts[n.category] || 0) + 1; });
  const catDot: Record<string, string> = { EXCELLENCE: '#16a34a', COLLABORATION: 'var(--accent)', INNOVATION: '#7c3aed', CUSTOMER_IMPACT: '#c2410c', LEADERSHIP: '#b45309' };
  const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 };

  return (
    <div style={{ maxWidth: 1120 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>My Rewards</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Recognition you've received from your team.</p>
      </div>

      {/* Body: rewards list + standing sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 20, alignItems: 'start' }}>
        {/* Main column */}
        <div style={{ minWidth: 0 }}>
          {/* Total points hero */}
          {received.length > 0 && (
            <div className="points-hero" style={{ borderRadius: 14, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Points Earned</p>
                <p style={{ fontSize: 40, fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginTop: 4, lineHeight: 1 }}>{totalPoints} <span style={{ fontSize: 16, fontWeight: 600, opacity: 0.85 }}>pts</span></p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 6 }}>from {received.length} recognition{received.length !== 1 ? 's' : ''}</p>
              </div>
              <svg width={120} height={120} viewBox="0 0 24 24" fill="rgba(255,255,255,0.08)" stroke="none" style={{ position: 'absolute', right: -18, bottom: -28 }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            </div>
          )}

          {/* Section label */}
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
            Rewards Received ({received.length})
          </p>

          {/* Received cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {received.length === 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '56px 24px', textAlign: 'center' }}>
                <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{ margin: '0 auto 12px', display: 'block' }}>
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>No rewards yet.</p>
                <p style={{ color: 'var(--text-faint)', fontSize: 13, marginTop: 4 }}>Recognition from your team will appear here.</p>
              </div>
            )}
            {received.slice((page - 1) * PER_PAGE, page * PER_PAGE).map((n) => (
              <div key={n.id} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderLeft: '4px solid #16a34a', borderRadius: 12, padding: '18px 22px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>
                      {CAT_LABELS[n.category] || 'Recognition'}
                    </p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{n.projectName || 'Recognition'}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 3 }}>
                      Nominated by {n.nominatedBy}
                    </p>
                  </div>
                  {n.points && (
                    <span style={{ fontSize: 12, fontWeight: 700, background: 'var(--b-green-bg)', color: 'var(--b-green-fg)', border: '1px solid var(--b-green-bd)', padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                      +{n.points} pts
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.65, borderLeft: '3px solid var(--border)', paddingLeft: 12 }}>
                  {n.context}
                </p>
              </div>
            ))}
            <Pagination page={page} totalPages={Math.ceil(received.length / PER_PAGE)} onChange={setPage} />
          </div>
        </div>

        {/* Standing sidebar */}
        <aside style={{ position: 'sticky', top: 64, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Your standing */}
          <div style={{ ...card, padding: '16px 18px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Your Standing</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{board?.rank ? `#${board.rank}` : 'Unranked'}</span>
              {board?.total ? <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>of {board.total}</span> : null}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 4 }}>{totalPoints} pts on the company leaderboard</p>
          </div>

          {/* By category */}
          {received.length > 0 && (
            <div style={{ ...card, padding: '16px 18px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>By Category</p>
              {Object.keys(catCounts).map(c => (
                <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: catDot[c] || 'var(--text-faint)', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text-soft)' }}>{CAT_LABELS[c] || c}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{catCounts[c]}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tip */}
          <div style={{ background: 'var(--b-green-bg)', border: '1px solid var(--b-green-bd)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="#16a34a" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--b-green-fg)' }}>How recognition works</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--b-green-fg)', lineHeight: 1.5, opacity: 0.85 }}>
              Points are awarded by HR when colleagues nominate your work. Keep collaborating — your recognitions stack up here.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, background: 'var(--surface-2)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-soft)', marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>This module is coming soon. Stay tuned!</p>
    </div>
  );
}

/* ── Ticket status / priority helpers ──────────────────────────────── */
const TICKET_STATUS_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  OPEN:        { bg: 'var(--b-slate-bg)',  color: 'var(--b-slate-fg)',  border: 'var(--b-slate-bd)' },
  ASSIGNED:    { bg: 'var(--b-blue-bg)',   color: 'var(--b-blue-fg)',   border: 'var(--b-blue-bd)' },
  IN_PROGRESS: { bg: 'var(--b-amber-bg)',  color: 'var(--b-amber-fg)',  border: 'var(--b-amber-bd)' },
  RESOLVED:    { bg: 'var(--b-green-bg)',  color: 'var(--b-green-fg)',  border: 'var(--b-green-bd)' },
  CLOSED:      { bg: 'var(--b-slate-bg)',  color: 'var(--b-slate-fg)',  border: 'var(--b-slate-bd)' },
  REOPENED:    { bg: 'var(--b-red-bg)',    color: 'var(--b-red-fg)',    border: 'var(--b-red-bd)' },
  REASSIGNED:  { bg: 'var(--b-violet-bg)', color: 'var(--b-violet-fg)', border: 'var(--b-violet-bd)' },
  BLOCKED:     { bg: 'var(--b-orange-bg)', color: 'var(--b-orange-fg)', border: 'var(--b-orange-bd)' },
};
const TICKET_PRIORITY_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  LOW:      { bg: 'var(--b-slate-bg)',  color: 'var(--b-slate-fg)',  border: 'var(--b-slate-bd)' },
  MEDIUM:   { bg: 'var(--b-blue-bg)',   color: 'var(--b-blue-fg)',   border: 'var(--b-blue-bd)' },
  HIGH:     { bg: 'var(--b-orange-bg)', color: 'var(--b-orange-fg)', border: 'var(--b-orange-bd)' },
  CRITICAL: { bg: 'var(--b-red-bg)',    color: 'var(--b-red-fg)',    border: 'var(--b-red-bd)' },
};
function statusLabel(s: string) {
  return s === 'IN_PROGRESS' ? 'In Progress' : s.charAt(0) + s.slice(1).toLowerCase();
}

/* ── Help Desk module — Employee ────────────────────────────────────── */
function HelpdeskModule({ user }: { user: any }) {
  const isAgent = user?.role === 'IT'; // IT staff can resolve IT-department tickets
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  // IT agents toggle between the IT queue and tickets they personally raised
  const [viewMode, setViewMode] = useState<'QUEUE' | 'MINE'>(isAgent ? 'QUEUE' : 'MINE');
  const [page, setPage] = useState(1);
  const [createForm, setCreateForm] = useState({ title: '', description: '', department: 'IT', priority: 'MEDIUM' });
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [msg, setMsg] = useState('');
  // Agent action state
  const [resolveNote, setResolveNote] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Load the full set once per view; filter by status on the client so the
  // summary sidebar counts stay accurate no matter which tab is active.
  useEffect(() => { loadTickets(); }, [viewMode]);
  useEffect(() => { setPage(1); }, [statusFilter, viewMode]);

  async function loadTickets() {
    try {
      const data = isAgent && viewMode === 'QUEUE'
        ? await api.getDeptQueue()
        : await api.getMyTickets();
      setTickets(data);
    } catch {}
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMsg('');
    try {
      await api.createTicket(createForm);
      setMsg('✓ Ticket raised!');
      setCreateForm({ title: '', description: '', department: 'IT', priority: 'MEDIUM' });
      loadTickets();
      setTimeout(() => { setShowCreate(false); setMsg(''); }, 1200);
    } catch (err: any) { setMsg(err.message); }
    finally { setLoading(false); }
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

  async function ticketAction(body: object) {
    if (!selectedTicket) return;
    setActionLoading(true);
    try {
      await api.updateTicket(selectedTicket.id, body);
      // Re-fetch the full ticket + comments so all relations stay intact
      const [detail, comms] = await Promise.all([
        api.getTicket(selectedTicket.id),
        api.getComments(selectedTicket.id),
      ]);
      setSelectedTicket(detail);
      setComments(comms);
      loadTickets();
      setShowResolveForm(false);
      setShowBlockForm(false);
      setResolveNote('');
      setBlockReason('');
    } catch {}
    finally { setActionLoading(false); }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1.5px solid var(--border)', fontSize: 13, color: 'var(--text)',
    background: 'var(--surface-2)', outline: 'none', boxSizing: 'border-box',
  };

  /* ── Ticket detail view ── */
  if (selectedTicket) {
    const sc = TICKET_STATUS_COLOR[selectedTicket.status] || TICKET_STATUS_COLOR.OPEN;
    const pc = TICKET_PRIORITY_COLOR[selectedTicket.priority] || TICKET_PRIORITY_COLOR.MEDIUM;
    const isOwner = selectedTicket.raisedBy?.id === user?.id || selectedTicket.raisedById === user?.id;
    const isClosed = selectedTicket.status === 'CLOSED';
    // IT agent acting on an IT-department ticket they did not raise themselves
    const canAgentAct = isAgent && selectedTicket.department === 'IT' && !isOwner && !['CLOSED', 'RESOLVED'].includes(selectedTicket.status);
    const isWorking = ['IN_PROGRESS', 'REOPENED'].includes(selectedTicket.status);

    return (
      <div style={{ maxWidth: 760 }}>
        {/* Back */}
        <button onClick={() => setSelectedTicket(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', marginBottom: 20, padding: 0 }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to tickets
        </button>

        {/* Header card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-faint)', fontWeight: 600 }}>{selectedTicket.ticketNumber}</span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{statusLabel(selectedTicket.status)}</span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: pc.bg, color: pc.color, border: `1px solid ${pc.border}` }}>{selectedTicket.priority}</span>
            {selectedTicket.isBlocked && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: 'var(--b-orange-bg)', color: 'var(--b-orange-fg)', border: '1px solid var(--b-orange-bd)' }}>Blocked</span>
            )}
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{selectedTicket.title}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.7, marginBottom: 12, whiteSpace: 'pre-wrap' }}>{selectedTicket.description}</p>
          <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--text-faint)' }}>
            <span>Dept: <strong style={{ color: 'var(--text-soft)' }}>{selectedTicket.department}</strong></span>
            {selectedTicket.assignedTo && <span>Agent: <strong style={{ color: 'var(--text-soft)' }}>{selectedTicket.assignedTo.name}</strong></span>}
          </div>

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

        {/* IT agent action card */}
        {canAgentAct && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 24px', marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>IT Agent Actions</p>
            {/* Show buttons only when neither form is open — resolve & block are mutually exclusive */}
            {!showResolveForm && !showBlockForm && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {/* Claim & start working — only before work begins */}
                {['OPEN', 'ASSIGNED'].includes(selectedTicket.status) && (
                  <button disabled={actionLoading} onClick={() => ticketAction({ status: 'IN_PROGRESS' })} style={{ height: 36, padding: '0 16px', borderRadius: 8, background: 'var(--accent)', border: '1px solid var(--accent-hover)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {selectedTicket.assignedToId ? 'Start working' : 'Claim & start'}
                  </button>
                )}
                {/* Mark resolved — while working */}
                {isWorking && (
                  <button onClick={() => setShowResolveForm(true)} style={{ height: 36, padding: '0 16px', borderRadius: 8, background: '#16a34a', border: '1px solid #15803d', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Mark resolved
                  </button>
                )}
                {/* Block — only while actively working */}
                {isWorking && !selectedTicket.isBlocked && (
                  <button onClick={() => setShowBlockForm(true)} style={{ height: 36, padding: '0 16px', borderRadius: 8, background: 'var(--surface)', border: '1px solid #fed7aa', color: '#c2410c', fontSize: 13, cursor: 'pointer' }}>
                    Mark blocked
                  </button>
                )}
              </div>
            )}

            {/* Resolve form */}
            {showResolveForm && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <textarea value={resolveNote} onChange={e => setResolveNote(e.target.value)} placeholder="Resolution note (optional)" style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button disabled={actionLoading} onClick={() => ticketAction({ status: 'RESOLVED', resolutionNote: resolveNote })} style={{ height: 34, padding: '0 16px', borderRadius: 8, background: '#16a34a', border: '1px solid #15803d', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Confirm Resolved
                  </button>
                  <button onClick={() => setShowResolveForm(false)} style={{ height: 34, padding: '0 12px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}

            {/* Block form */}
            {showBlockForm && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <textarea value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="Reason for blocking (required)" style={{ ...inputStyle, resize: 'vertical', minHeight: 70, border: '1.5px solid var(--b-orange-bd)', background: 'var(--b-orange-bg)' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button disabled={actionLoading || !blockReason.trim()} onClick={() => ticketAction({ blockedReason: blockReason })} style={{ height: 34, padding: '0 16px', borderRadius: 8, background: '#c2410c', border: '1px solid #9a3412', color: 'white', fontSize: 13, fontWeight: 600, cursor: blockReason.trim() ? 'pointer' : 'not-allowed', opacity: blockReason.trim() ? 1 : 0.6 }}>
                    Confirm Block
                  </button>
                  <button onClick={() => setShowBlockForm(false)} style={{ height: 34, padding: '0 12px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Employee close/reopen section — when a ticket is resolved */}
        {selectedTicket.status === 'RESOLVED' && isOwner && (
          <div style={{ background: 'var(--b-amber-bg)', border: '1px solid var(--b-amber-bd)', borderRadius: 12, padding: '18px 24px', marginBottom: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--b-amber-fg)', marginBottom: 14 }}>Was your issue resolved?</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button disabled={actionLoading} onClick={() => ticketAction({ status: 'CLOSED' })} style={{ height: 36, padding: '0 18px', borderRadius: 8, background: '#16a34a', border: '1px solid #15803d', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Yes, close ticket
              </button>
              <button disabled={actionLoading} onClick={() => ticketAction({ status: 'REOPENED' })} style={{ height: 36, padding: '0 18px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>
                No, reopen it
              </button>
            </div>
          </div>
        )}

        {/* Employee reopen section — when a closed ticket needs to come back */}
        {selectedTicket.status === 'CLOSED' && isOwner && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 24px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>This ticket is closed</p>
              <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>Still facing the issue? Reopen it and the same agent will pick it back up.</p>
            </div>
            <button disabled={actionLoading} onClick={() => ticketAction({ status: 'REOPENED' })} style={{ height: 36, padding: '0 18px', borderRadius: 8, background: 'var(--accent)', border: '1px solid var(--accent-hover)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
              Reopen ticket
            </button>
          </div>
        )}

        {/* Comments */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
            Comments ({comments.length})
          </p>

          {comments.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-faint)', marginBottom: 16 }}>No comments yet. Start the conversation.</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            {comments.map((c: any) => (
              <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--b-blue-bg)', border: '1px solid var(--b-blue-bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{c.author?.name?.charAt(0).toUpperCase()}</span>
                </div>
                <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.author?.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{c.author?.role}</span>
                    {c.isEdited && <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>(edited)</span>}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.6 }}>{c.message}</p>
                </div>
              </div>
            ))}
          </div>

          {!isClosed && (
            <form onSubmit={handleComment} style={{ display: 'flex', gap: 10 }}>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(e as any); } }}
                placeholder="Write a comment… (Enter to send, Shift+Enter for newline)"
                style={{ ...inputStyle, resize: 'none', minHeight: 70, flex: 1 }}
              />
              <button type="submit" disabled={commentLoading || !comment.trim()} style={{ alignSelf: 'flex-end', height: 38, padding: '0 16px', borderRadius: 8, background: 'var(--accent)', border: '1px solid var(--accent-hover)', color: 'white', fontSize: 13, fontWeight: 600, cursor: commentLoading ? 'not-allowed' : 'pointer', opacity: commentLoading ? 0.7 : 1, flexShrink: 0 }}>
                Send
              </button>
            </form>
          )}
          {isClosed && <p style={{ fontSize: 12, color: 'var(--text-faint)' }}>Ticket is closed — comments are disabled.</p>}
        </div>
      </div>
    );
  }

  /* ── Ticket list view ── */
  const visible = statusFilter === 'ALL' ? tickets : tickets.filter((t: any) => t.status === statusFilter);
  const STATUS_ORDER = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED', 'RESOLVED', 'CLOSED', 'REASSIGNED'];
  const counts: Record<string, number> = {};
  tickets.forEach((t: any) => { counts[t.status] = (counts[t.status] || 0) + 1; });
  const blockedCount = tickets.filter((t: any) => t.isBlocked).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>{isAgent ? 'IT Help Desk' : 'Help Desk'}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
            {isAgent ? 'Resolve IT department tickets, or raise your own.' : 'Raise support tickets and track their progress.'}
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setMsg(''); }}
          style={{ display: 'flex', alignItems: 'center', gap: 7, height: 38, padding: '0 16px', borderRadius: 9, background: 'var(--accent)', border: '1px solid var(--accent-hover)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Raise Ticket
        </button>
      </div>

      {/* IT agent view toggle */}
      {isAgent && (
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', borderRadius: 10, padding: 4, marginBottom: 16, width: 'fit-content' }}>
          {([['QUEUE', 'IT Queue'], ['MINE', 'My Tickets']] as const).map(([key, label]) => (
            <button key={key} onClick={() => { setViewMode(key); setSelectedTicket(null); }} style={{
              padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600,
              border: 'none', cursor: 'pointer', transition: 'all 150ms',
              background: viewMode === key ? 'var(--surface-active)' : 'transparent',
              color: viewMode === key ? 'var(--text)' : 'var(--text-muted)',
              boxShadow: viewMode === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Raise a Support Ticket</h3>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Title *</label>
                <input style={inputStyle} placeholder="Brief description (min 5 chars)" required minLength={5} maxLength={200} value={createForm.title} onChange={e => setCreateForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Description *</label>
                <textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} required minLength={10} placeholder="Describe the issue in detail (min 10 chars)" value={createForm.description} onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Department</label>
                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={createForm.department} onChange={e => setCreateForm(p => ({ ...p, department: e.target.value }))}>
                    <option value="IT">IT</option>
                    <option value="HR">HR</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Priority</label>
                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={createForm.priority} onChange={e => setCreateForm(p => ({ ...p, priority: e.target.value }))}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>
              {msg && <p style={{ fontSize: 13, color: msg.startsWith('✓') ? '#16a34a' : '#dc2626', fontWeight: 500 }}>{msg}</p>}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{ height: 38, padding: '0 16px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={loading} style={{ height: 38, padding: '0 20px', borderRadius: 8, background: 'var(--accent)', border: '1px solid var(--accent-hover)', color: 'white', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Body: ticket list + summary sidebar (fills the width) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 264px', gap: 24, alignItems: 'start', maxWidth: 1120 }}>
        {/* Main column */}
        <div style={{ minWidth: 0 }}>
          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', borderRadius: 10, padding: 4, marginBottom: 20, width: 'fit-content' }}>
            {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map(f => (
              <button key={f} onClick={() => setStatusFilter(f)} style={{
                padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 500,
                border: 'none', cursor: 'pointer', transition: 'all 150ms',
                background: statusFilter === f ? 'var(--surface-active)' : 'transparent',
                color: statusFilter === f ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: statusFilter === f ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}>
                {f === 'IN_PROGRESS' ? 'In Progress' : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Section label */}
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
            {isAgent && viewMode === 'QUEUE' ? 'IT Department Queue' : 'My Tickets'} ({visible.length})
          </p>

          {/* Ticket cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visible.length === 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '56px 24px', textAlign: 'center' }}>
                <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{ margin: '0 auto 12px', display: 'block' }}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>{statusFilter === 'ALL' ? 'No tickets yet.' : 'No tickets in this view.'}</p>
                <p style={{ color: 'var(--text-faint)', fontSize: 13, marginTop: 4 }}>Click "Raise Ticket" to submit a support request.</p>
              </div>
            )}
            {[...visible]
              .sort((a, b) => (a.status === 'CLOSED' ? 1 : 0) - (b.status === 'CLOSED' ? 1 : 0))
              .slice((page - 1) * PER_PAGE, page * PER_PAGE)
              .map((t: any) => {
              const sc = TICKET_STATUS_COLOR[t.status] || TICKET_STATUS_COLOR.OPEN;
              const pc = TICKET_PRIORITY_COLOR[t.priority] || TICKET_PRIORITY_COLOR.MEDIUM;
              const isClosedCard = t.status === 'CLOSED';
              const borderLeft = t.status === 'RESOLVED' ? '#16a34a' : t.status === 'CLOSED' ? 'var(--text-faint)' : t.status === 'IN_PROGRESS' ? '#f59e0b' : t.status === 'REOPENED' ? '#dc2626' : 'var(--accent)';
              return (
                <div key={t.id} onClick={() => openTicket(t)} style={{
                  background: isClosedCard ? 'var(--surface-2)' : 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderLeft: `4px solid ${borderLeft}`,
                  borderRadius: 12, padding: '18px 22px',
                  cursor: 'pointer', transition: 'box-shadow 0.15s',
                  filter: isClosedCard ? 'grayscale(1)' : 'none', opacity: isClosedCard ? 0.6 : 1,
                }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-faint)', fontWeight: 600 }}>{t.ticketNumber}</span>
                        {t.isBlocked && <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 20, background: 'var(--b-orange-bg)', color: 'var(--b-orange-fg)', border: '1px solid var(--b-orange-bd)' }}>Blocked</span>}
                      </div>
                      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{t.title}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 3 }}>
                        {isAgent && viewMode === 'QUEUE' && t.raisedBy?.name ? `Raised by ${t.raisedBy.name} · ` : ''}{t.department} dept · {t.assignedTo ? `Agent: ${t.assignedTo.name}` : 'Unassigned'} · {t._count?.comments ?? 0} comment{(t._count?.comments ?? 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, whiteSpace: 'nowrap' }}>{statusLabel(t.status)}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: pc.bg, color: pc.color, border: `1px solid ${pc.border}` }}>{t.priority}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination page={page} totalPages={Math.ceil(visible.length / PER_PAGE)} onChange={setPage} />
        </div>

        {/* Summary sidebar — offset so it parks below the sticky notification bar */}
        <aside style={{ position: 'sticky', top: 64, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Overview</p>
            <p style={{ fontSize: 30, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{tickets.length}<span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-faint)' }}> total</span></p>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {STATUS_ORDER.filter(s => counts[s]).map(s => {
                const c = TICKET_STATUS_COLOR[s] || TICKET_STATUS_COLOR.OPEN;
                const isActive = statusFilter === s;
                const clickable = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(s);
                return (
                  <button key={s} onClick={() => clickable && setStatusFilter(s)} style={{
                    display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '7px 8px', margin: '0 -8px',
                    border: 'none', borderRadius: 8, background: isActive ? 'var(--surface-2)' : 'transparent',
                    cursor: clickable ? 'pointer' : 'default', textAlign: 'left',
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text-soft)' }}>{statusLabel(s)}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{counts[s]}</span>
                  </button>
                );
              })}
              {blockedCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px', margin: '4px -8px 0', borderTop: '1px solid var(--divider)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#c2410c', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: '#c2410c' }}>Blocked</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#c2410c' }}>{blockedCount}</span>
                </div>
              )}
            </div>
          </div>

          {/* Help tip */}
          <div style={{ background: 'var(--b-blue-bg)', border: '1px solid var(--b-blue-bd)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--b-blue-fg)' }}>Need a hand?</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--b-blue-fg)', lineHeight: 1.5, opacity: 0.85 }}>
              Raise a ticket and it's routed to the right team automatically. You'll be notified as it progresses.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function timeAgoShort(iso: string) {
  if (!iso) return '';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  const d = Math.floor(s / 86400);
  if (d < 7) return `${d}d`;
  if (d < 30) return `${Math.floor(d / 7)}w`;
  return `${Math.floor(d / 30)}mo`;
}
const VISIT_STATUS_MINI: Record<string, { label: string; color: string }> = {
  SCHEDULED:   { label: 'Scheduled',  color: 'var(--accent)' },
  CHECKED_IN:  { label: 'Arrived',    color: '#16a34a' },
  CHECKED_OUT: { label: 'Left',       color: 'var(--text-faint)' },
  CANCELLED:   { label: 'Cancelled',  color: '#dc2626' },
};

function OverviewModule({ user, onNavigate }: { user: any; onNavigate: (m: Module) => void }) {
  const [points, setPoints] = useState(0);
  const [received, setReceived] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [addGuestOpen, setAddGuestOpen] = useState(false);

  function loadVisits() { api.getMyVisits().then(setVisits).catch(() => {}); }
  useEffect(() => {
    api.getWallet().then(w => setPoints(w?.points ?? 0)).catch(() => {});
    api.getReceivedNominations().then(setReceived).catch(() => {});
    api.getMyTickets().then(setTickets).catch(() => {});
    api.getNotifications().then(setActivity).catch(() => {});
    if (user?.role === 'HR' || user?.role === 'ADMIN') loadVisits();
  }, []);

  const firstName = user?.name?.split(' ')[0] || 'there';
  const openTickets = tickets.filter(t => !['CLOSED', 'RESOLVED'].includes(t.status));
  const resolvedTickets = tickets.filter(t => ['CLOSED', 'RESOLVED'].includes(t.status));
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const unread = activity.filter(a => !a.isRead).length;

  // Progress toward the next 100-point milestone
  const TIER = 100;
  const nextMilestone = (Math.floor(points / TIER) + 1) * TIER;
  const progressPct = Math.round(((points % TIER) / TIER) * 100);

  // My visitors (host = me)
  const todayStr = new Date().toDateString();
  const expectedToday = visits.filter(v => v.status === 'SCHEDULED' && new Date(v.scheduledDate).toDateString() === todayStr).length;
  const guestRank = (s: string) => (s === 'CHECKED_IN' ? 0 : s === 'SCHEDULED' ? 1 : 2);
  const myGuests = [...visits].sort((a, b) => guestRank(a.status) - guestRank(b.status)).slice(0, 4);

  const kpis = [
    { label: 'My Redeemed Rewards', value: received.length, color: '#16a34a', bg: 'var(--tile-green-bg)', border: 'var(--tile-green-bd)', go: 'reward' as Module },
    { label: 'Open Tickets', value: openTickets.length, color: '#d97706', bg: 'var(--tile-amber-bg)', border: 'var(--tile-amber-bd)', go: 'helpdesk' as Module },
    { label: 'Resolved Tickets', value: resolvedTickets.length, color: '#8b5cf6', bg: 'var(--tile-violet-bg)', border: 'var(--tile-violet-bd)', go: 'helpdesk' as Module },
  ];

  const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 };
  // Visitors panel is only for HR/Admin — employees (and IT) almost never host visitors
  const showVisitors = user?.role === 'HR' || user?.role === 'ADMIN';

  // Support tickets card: only actionable tickets, grouped into two columns by status
  const actionableTickets = tickets.filter(t => !['RESOLVED', 'CLOSED'].includes(t.status));
  const leftTickets = actionableTickets.filter(t => ['IN_PROGRESS', 'REOPENED'].includes(t.status));
  const rightTickets = actionableTickets.filter(t => !['IN_PROGRESS', 'REOPENED'].includes(t.status)); // Assigned / Open / Reassigned
  const ticketRow = (t: any) => {
    const sc = TICKET_STATUS_COLOR[t.status] || TICKET_STATUS_COLOR.OPEN;
    const pc = TICKET_PRIORITY_COLOR[t.priority] || TICKET_PRIORITY_COLOR.MEDIUM;
    return (
      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--divider)' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: pc.color, flexShrink: 0 }} title={`${t.priority} priority`} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</p>
          <p style={{ fontSize: 11, color: 'var(--text-faint)' }}>{t.priority.charAt(0) + t.priority.slice(1).toLowerCase()} · opened {timeAgoShort(t.createdAt)} ago</p>
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, whiteSpace: 'nowrap', flexShrink: 0 }}>{statusLabel(t.status)}</span>
      </div>
    );
  };
  const emptyCol = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '28px 8px', textAlign: 'center' }}>
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
      <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>All clear</span>
    </div>
  );

  return (
    <div style={{ maxWidth: 1040 }}>
      {/* Greeting */}
      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4, letterSpacing: '-0.01em' }}>
        Welcome back, {firstName} 👋
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>{dateStr} · Here's what's happening in your workspace.</p>

      {/* Personal points — light informational widget (private, no rank/leaderboard) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, borderRadius: 12, padding: '14px 20px', marginBottom: 16, background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '4px solid #16a34a', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--tile-green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width={17} height={17} viewBox="0 0 24 24" fill="#16a34a" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
          </div>
          <div>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#16a34a', lineHeight: 1 }}>{points}<span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}> pts</span></p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
              My Points Balance
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--text-faint)' }}>
                <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                Only you can see this
              </span>
            </p>
          </div>
        </div>
        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)' }} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Next milestone</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{points} / {nextMilestone}</span>
          </div>
          <div style={{ height: 6, borderRadius: 20, background: 'var(--track)', overflow: 'hidden' }}>
            <div style={{ width: `${progressPct}%`, height: '100%', borderRadius: 20, background: '#16a34a' }} />
          </div>
          <p style={{ fontSize: 10.5, color: 'var(--text-faint)', marginTop: 5 }}>{Math.max(0, nextMilestone - points)} pts to your next milestone</p>
        </div>
      </div>

      {/* KPI tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16 }}>
        {kpis.map(c => (
          <div key={c.label} onClick={() => onNavigate(c.go)} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: '18px 18px', minHeight: 88, display: 'flex', flexDirection: 'column', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.12s' }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'none')}>
            <p style={{ fontSize: 26, fontWeight: 800, color: c.color, letterSpacing: '-0.02em' }}>{c.value}</p>
            <p style={{ fontSize: 12, color: c.color, fontWeight: 600, marginTop: 4, opacity: 0.85 }}>{c.label}</p>
          </div>
        ))}
      </div>

      {/* My Visitors (HR/Admin only) + My Support Tickets */}
      <div style={{ display: 'grid', gridTemplateColumns: showVisitors ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 16 }}>
        {/* My Visitors — hidden entirely for employees/IT; tickets card reflows full-width */}
        {showVisitors && (
        <div style={{ ...card, padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🚪 My Visitors</p>
            <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>Expected today: <strong style={{ color: 'var(--text)' }}>{expectedToday}</strong></span>
          </div>
          <button onClick={() => setAddGuestOpen(true)}
            onMouseEnter={e => (e.currentTarget.style.background = '#1d4ed8')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', height: 38, borderRadius: 9, background: 'var(--accent)', border: '1px solid var(--accent-hover)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 12, transition: 'background 0.15s' }}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Pre-register a Guest
          </button>
          <div style={{ flex: 1 }}>
            {myGuests.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-faint)', padding: '14px 0', textAlign: 'center' }}>No guests yet — pre-register one so reception is ready.</p>}
            {myGuests.map(v => {
              const st = VISIT_STATUS_MINI[v.status] || VISIT_STATUS_MINI.SCHEDULED;
              return (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--divider)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: st.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.visitorCompany}{v.numberOfVisitors > 1 ? ` · ${v.numberOfVisitors} visitors` : ''}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-faint)' }}>{v.visitors?.[0]?.name || ''} · {new Date(v.scheduledDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: st.color, flexShrink: 0 }}>{st.label}</span>
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* Tickets snapshot with urgency */}
        <div style={{ ...card, padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>My Support Tickets</p>
            {tickets.length > 0 && <button onClick={() => onNavigate('helpdesk')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>View all</button>}
          </div>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div style={{ paddingRight: 18, borderRight: '1px solid var(--divider)' }}>
              {leftTickets.length ? leftTickets.slice(0, 4).map(ticketRow) : emptyCol}
            </div>
            <div style={{ paddingLeft: 18 }}>
              {rightTickets.length ? rightTickets.slice(0, 4).map(ticketRow) : emptyCol}
            </div>
          </div>
          <button onClick={() => onNavigate('helpdesk')}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
            style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', height: 38, borderRadius: 9, background: 'var(--accent)', border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s' }}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Raise a ticket
          </button>
        </div>
      </div>

      {/* Recent activity */}
      <div style={{ ...card, padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recent Activity</p>
            {unread > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: 'white', background: '#ef4444', borderRadius: 20, padding: '1px 7px' }}>{unread} new</span>}
          </div>
        </div>
        {activity.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '20px 0' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--tile-green-bg)', border: '1px solid var(--tile-green-bd)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>You're all caught up.</p>
          </div>
        )}
        {activity.slice(0, 5).map(a => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--divider)' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: a.isRead ? 'var(--text-faint)' : 'var(--accent)', flexShrink: 0 }} />
            <p style={{ flex: 1, fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.4 }}>{a.message}</p>
            <span style={{ fontSize: 11, color: 'var(--text-faint)', flexShrink: 0 }}>{timeAgoShort(a.createdAt)}</span>
          </div>
        ))}
      </div>

      {addGuestOpen && <PreRegisterGuestModal onClose={() => setAddGuestOpen(false)} onCreated={loadVisits} />}
    </div>
  );
}

/* Employee self-service: pre-register your own guests (host = you, set server-side) */
function PreRegisterGuestModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Pre-register a Guest</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 16 }}>Reception will be notified to expect them. You are the host. Track their status here.</p>
        <ScheduleForm
          submitLabel="Pre-register"
          showHost={false}
          onClose={onClose}
          onSubmit={async (p) => { await api.scheduleMyVisit(p); onCreated(); onClose(); }}
        />
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
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Theme is per-user and stored locally — toggling here never affects other users or the admin/HR portals
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
    if (u.role === 'ADMIN' || u.role === 'HR') { router.push(u.role === 'HR' ? '/hr' : '/admin'); return; }
    if (u.role === 'IT') { router.push('/it'); return; }
    api.getMe().then(me => {
      setUser({ ...u, id: me.id, name: me.name, points: me.points });
    }).catch(() => {
      localStorage.clear();
      router.push('/');
    });
  }, []);

  // IT agents see only the Help Desk (plus Settings); everyone else sees all modules
  const navItems = user?.role === 'IT' ? NAV.filter(n => n.key === 'helpdesk' || n.key === 'settings') : NAV;
  const roleLabel = user?.role === 'IT' ? 'IT Support' : 'Employee';

  function logout() { localStorage.clear(); router.push('/'); }

  const SIDEBAR_W = sidebarOpen ? 240 : 64;

  if (!user) return null;

  return (
    <div data-theme={theme} style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
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
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#dce4f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</p>
                  <p style={{ fontSize: 11, color: '#8fadcc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #1e3a5f', paddingTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#8fadcc' }}>Role</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#22d3ee', background: 'rgba(34,211,238,0.1)', padding: '2px 9px', borderRadius: 20 }}>{roleLabel}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#8fadcc' }}>Points</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#dce4f0' }}>{user?.points ?? 0} pts</span>
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
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#dce4f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
                  <p style={{ fontSize: 10, color: '#8fadcc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{roleLabel}</p>
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

      <div className="dash-content" style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
        {/* Sticky top bar: theme toggle + notifications */}
        <div style={{ position: 'sticky', top: 0, zIndex: 60, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, padding: '16px 28px 0', background: 'var(--bg)' }}>
          <button onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} aria-label="Toggle theme"
            style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {theme === 'dark'
              ? <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/></svg>
              : <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>}
          </button>
          <NotificationBell />
        </div>
        <AskAiFab />
        <div style={{ padding: '8px 28px 28px' }}>
          {activeModule === 'overview' && <OverviewModule user={user} onNavigate={setActiveModule} />}
          {activeModule === 'reward' && <RewardModule />}
          {activeModule === 'helpdesk' && <HelpdeskModule user={user} />}
          {activeModule === 'settings' && <SettingsModule user={user} onUpdated={u => setUser((prev: any) => ({ ...prev, name: u.name, designation: u.designation }))} />}
        </div>
      </div>
    </div>
  );
}