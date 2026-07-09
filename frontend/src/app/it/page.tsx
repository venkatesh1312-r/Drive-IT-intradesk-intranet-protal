'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { DriveITLogo, DriveITMark } from '@/components/DriveITLogo';
import { NotificationBell } from '@/components/NotificationBell';
import { Pagination } from '@/components/Pagination';
import { WorkLogModule } from '@/components/WorkLogModule';
import { AskAiFab } from '@/components/AskAiFab';

const PER_PAGE = 10;

/* ── Ticket colour maps ──────────────────────────────────────────── */
const STATUS_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  OPEN:        { bg: 'var(--b-slate-bg)',  color: 'var(--b-slate-fg)',  border: 'var(--b-slate-bd)' },
  ASSIGNED:    { bg: 'var(--b-blue-bg)',   color: 'var(--b-blue-fg)',   border: 'var(--b-blue-bd)' },
  IN_PROGRESS: { bg: 'var(--b-amber-bg)',  color: 'var(--b-amber-fg)',  border: 'var(--b-amber-bd)' },
  RESOLVED:    { bg: 'var(--b-green-bg)',  color: 'var(--b-green-fg)',  border: 'var(--b-green-bd)' },
  CLOSED:      { bg: 'var(--b-slate-bg)',  color: 'var(--b-slate-fg)',  border: 'var(--b-slate-bd)' },
  REOPENED:    { bg: 'var(--b-red-bg)',    color: 'var(--b-red-fg)',    border: 'var(--b-red-bd)' },
  REASSIGNED:  { bg: 'var(--b-violet-bg)', color: 'var(--b-violet-fg)', border: 'var(--b-violet-bd)' },
};
const PRIORITY_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  LOW:      { bg: 'var(--b-slate-bg)',  color: 'var(--b-slate-fg)',  border: 'var(--b-slate-bd)' },
  MEDIUM:   { bg: 'var(--b-blue-bg)',   color: 'var(--b-blue-fg)',   border: 'var(--b-blue-bd)' },
  HIGH:     { bg: 'var(--b-orange-bg)', color: 'var(--b-orange-fg)', border: 'var(--b-orange-bd)' },
  CRITICAL: { bg: 'var(--b-red-bg)',    color: 'var(--b-red-fg)',    border: 'var(--b-red-bd)' },
};
function statusLabel(s: string) {
  return s === 'IN_PROGRESS' ? 'In Progress' : s.charAt(0) + s.slice(1).toLowerCase();
}

const STATUS_ORDER = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED', 'RESOLVED', 'CLOSED', 'REASSIGNED'];

/* ── Nav items ───────────────────────────────────────────────────── */
type View = 'queue' | 'mine' | 'worklog';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1.5px solid var(--border)', fontSize: 13, color: 'var(--text)',
  background: 'var(--surface-2)', outline: 'none', boxSizing: 'border-box',
};

/* ── IT Helpdesk page ────────────────────────────────────────────── */
export default function ITDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [theme, setTheme] = useState('light');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [view, setView] = useState<View>('queue');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [tickets, setTickets] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [comment, setComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [resolveNote, setResolveNote] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  /* ── Auth ── */
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'IT') { router.push(u.role === 'ADMIN' ? '/admin' : u.role === 'HR' ? '/hr' : '/dashboard'); return; }
    const saved = localStorage.getItem('theme_' + u.email);
    if (saved) setTheme(saved);
    api.getMe().then(me => setUser({ ...u, id: me.id, name: me.name })).catch(() => { setUser(u); });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => { loadTickets(); setPage(1); }, [view]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  async function loadTickets() {
    try {
      const data = view === 'queue' ? await api.getDeptQueue() : await api.getMyTickets();
      setTickets(data);
    } catch {}
  }

  async function openTicket(t: any) {
    try {
      const [detail, comms] = await Promise.all([api.getTicket(t.id), api.getComments(t.id)]);
      setSelected(detail); setComments(comms);
      setShowResolveForm(false); setShowBlockForm(false);
      setResolveNote(''); setBlockReason('');
    } catch {}
  }

  async function ticketAction(body: object) {
    if (!selected) return;
    setActionLoading(true);
    try {
      await api.updateTicket(selected.id, body);
      const [detail, comms] = await Promise.all([api.getTicket(selected.id), api.getComments(selected.id)]);
      setSelected(detail); setComments(comms);
      loadTickets();
      setShowResolveForm(false); setShowBlockForm(false);
      setResolveNote(''); setBlockReason('');
    } catch {}
    finally { setActionLoading(false); }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim() || !selected) return;
    setCommentLoading(true);
    try {
      const c = await api.createComment(selected.id, { message: comment });
      setComments(prev => [...prev, c]);
      setComment('');
    } catch {}
    finally { setCommentLoading(false); }
  }

  function toggleTheme() {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try { const e = JSON.parse(localStorage.getItem('user') || '{}')?.email; localStorage.setItem('theme_' + e, next); } catch {}
      return next;
    });
  }

  function logout() { localStorage.clear(); router.push('/'); }

  if (!user) return null;

  const SIDEBAR_W = sidebarOpen ? 240 : 64;
  const ACCENT = '#0ea5e9';

  /* ── Ticket detail ── */
  function TicketDetail() {
    if (!selected) return null;
    const sc = STATUS_COLOR[selected.status] || STATUS_COLOR.OPEN;
    const pc = PRIORITY_COLOR[selected.priority] || PRIORITY_COLOR.MEDIUM;
    const isOwner = selected.raisedById === user?.id;
    const canAct = selected.department === 'IT' && !isOwner && !['CLOSED', 'RESOLVED'].includes(selected.status);
    const isWorking = ['IN_PROGRESS', 'REOPENED'].includes(selected.status);
    const isClosed = selected.status === 'CLOSED';

    return (
      <div style={{ maxWidth: 760 }}>
        <button onClick={() => setSelected(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', marginBottom: 20, padding: 0 }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to queue
        </button>

        {/* Header */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-faint)', fontWeight: 600 }}>{selected.ticketNumber}</span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{statusLabel(selected.status)}</span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: pc.bg, color: pc.color, border: `1px solid ${pc.border}` }}>{selected.priority}</span>
            {selected.isBlocked && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: 'var(--b-orange-bg)', color: 'var(--b-orange-fg)', border: '1px solid var(--b-orange-bd)' }}>Blocked</span>}
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{selected.title}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.7, marginBottom: 12, whiteSpace: 'pre-wrap' }}>{selected.description}</p>
          <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--text-faint)', flexWrap: 'wrap' }}>
            <span>Raised by: <strong style={{ color: 'var(--text-soft)' }}>{selected.raisedBy?.name ?? '—'}</strong></span>
            {selected.assignedTo && <span>Agent: <strong style={{ color: 'var(--text-soft)' }}>{selected.assignedTo.name}</strong></span>}
            <span>Dept: <strong style={{ color: 'var(--text-soft)' }}>{selected.department}</strong></span>
          </div>
          {selected.isBlocked && selected.blockedReason && (
            <div style={{ marginTop: 14, background: 'var(--b-orange-bg)', border: '1px solid var(--b-orange-bd)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--b-orange-fg)' }}>
              <strong>Blocked:</strong> {selected.blockedReason}
            </div>
          )}
          {(selected.status === 'RESOLVED' || selected.status === 'CLOSED') && (
            <div style={{ marginTop: 14, background: 'var(--b-green-bg)', border: '1px solid var(--b-green-bd)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--b-green-fg)' }}>
              <strong>Resolved{selected.assignedTo?.name ? ` by ${selected.assignedTo.name}` : ''}</strong>
              {selected.resolutionNote ? ` — ${selected.resolutionNote}` : ''}
            </div>
          )}
        </div>

        {/* Agent actions */}
        {canAct && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 24px', marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>IT Agent Actions</p>
            {!showResolveForm && !showBlockForm && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {['OPEN', 'ASSIGNED'].includes(selected.status) && (
                  <button disabled={actionLoading} onClick={() => ticketAction({ status: 'IN_PROGRESS' })}
                    style={{ height: 36, padding: '0 16px', borderRadius: 8, background: ACCENT, border: `1px solid ${ACCENT}`, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {selected.assignedToId ? 'Start working' : 'Claim & start'}
                  </button>
                )}
                {isWorking && (
                  <button onClick={() => setShowResolveForm(true)}
                    style={{ height: 36, padding: '0 16px', borderRadius: 8, background: '#16a34a', border: '1px solid #15803d', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Mark resolved
                  </button>
                )}
                {isWorking && !selected.isBlocked && (
                  <button onClick={() => setShowBlockForm(true)}
                    style={{ height: 36, padding: '0 16px', borderRadius: 8, background: 'var(--surface)', border: '1px solid #fed7aa', color: '#c2410c', fontSize: 13, cursor: 'pointer' }}>
                    Mark blocked
                  </button>
                )}
              </div>
            )}
            {showResolveForm && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <textarea value={resolveNote} onChange={e => setResolveNote(e.target.value)} placeholder="Resolution note (optional)" style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button disabled={actionLoading} onClick={() => ticketAction({ status: 'RESOLVED', resolutionNote: resolveNote })}
                    style={{ height: 34, padding: '0 16px', borderRadius: 8, background: '#16a34a', border: '1px solid #15803d', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Confirm Resolved
                  </button>
                  <button onClick={() => setShowResolveForm(false)}
                    style={{ height: 34, padding: '0 12px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {showBlockForm && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <textarea value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="Reason for blocking (required)" style={{ ...inputStyle, resize: 'vertical', minHeight: 70, border: '1.5px solid var(--b-orange-bd)', background: 'var(--b-orange-bg)' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button disabled={actionLoading || !blockReason.trim()} onClick={() => ticketAction({ blockedReason: blockReason })}
                    style={{ height: 34, padding: '0 16px', borderRadius: 8, background: '#c2410c', border: '1px solid #9a3412', color: 'white', fontSize: 13, fontWeight: 600, cursor: blockReason.trim() ? 'pointer' : 'not-allowed', opacity: blockReason.trim() ? 1 : 0.6 }}>
                    Confirm Block
                  </button>
                  <button onClick={() => setShowBlockForm(false)}
                    style={{ height: 34, padding: '0 12px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Comments */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Comments ({comments.length})</p>
          {comments.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-faint)', marginBottom: 16 }}>No comments yet.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            {comments.map((c: any) => (
              <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--b-blue-bg)', border: '1px solid var(--b-blue-bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT }}>{c.author?.name?.charAt(0).toUpperCase()}</span>
                </div>
                <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.author?.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{c.author?.role}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.6 }}>{c.message}</p>
                </div>
              </div>
            ))}
          </div>
          {!isClosed ? (
            <form onSubmit={handleComment} style={{ display: 'flex', gap: 10 }}>
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(e as any); } }}
                placeholder="Write a comment… (Enter to send)"
                style={{ ...inputStyle, resize: 'none', minHeight: 70, flex: 1 }} />
              <button type="submit" disabled={commentLoading || !comment.trim()}
                style={{ alignSelf: 'flex-end', height: 38, padding: '0 16px', borderRadius: 8, background: ACCENT, border: `1px solid ${ACCENT}`, color: 'white', fontSize: 13, fontWeight: 600, cursor: commentLoading ? 'not-allowed' : 'pointer', opacity: commentLoading ? 0.7 : 1, flexShrink: 0 }}>
                Send
              </button>
            </form>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--text-faint)' }}>Ticket is closed — comments are disabled.</p>
          )}
        </div>
      </div>
    );
  }

  /* ── Ticket list ── */
  function TicketList() {
    const visible = statusFilter === 'ALL' ? tickets : tickets.filter(t => t.status === statusFilter);
    const counts: Record<string, number> = {};
    tickets.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });
    const blockedCount = tickets.filter(t => t.isBlocked).length;
    const paged = [...visible]
      .sort((a, b) => (a.status === 'CLOSED' ? 1 : 0) - (b.status === 'CLOSED' ? 1 : 0))
      .slice((page - 1) * PER_PAGE, page * PER_PAGE);

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>IT Help Desk</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Manage and resolve IT department tickets.</p>
          </div>
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', borderRadius: 10, padding: 4, marginBottom: 20, width: 'fit-content' }}>
          {([['queue', 'Queue'], ['mine', 'My Tickets']] as const).map(([key, label]) => (
            <button key={key} onClick={() => { setView(key); setSelected(null); }} style={{
              padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600,
              border: 'none', cursor: 'pointer', transition: 'all 150ms',
              background: view === key ? 'var(--surface-active)' : 'transparent',
              color: view === key ? 'var(--text)' : 'var(--text-muted)',
              boxShadow: view === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}>{label}</button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 260px', gap: 24, alignItems: 'start', maxWidth: 1100 }}>
          {/* Main */}
          <div style={{ minWidth: 0 }}>
            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', borderRadius: 10, padding: 4, marginBottom: 20, width: 'fit-content' }}>
              {(['ALL', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map(f => (
                <button key={f} onClick={() => setStatusFilter(f)} style={{
                  padding: '7px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500,
                  border: 'none', cursor: 'pointer', transition: 'all 150ms',
                  background: statusFilter === f ? 'var(--surface-active)' : 'transparent',
                  color: statusFilter === f ? 'var(--text)' : 'var(--text-muted)',
                  boxShadow: statusFilter === f ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}>
                  {f === 'IN_PROGRESS' ? 'In Progress' : f === 'ALL' ? 'All' : statusLabel(f)}
                </button>
              ))}
            </div>

            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
              {view === 'queue' ? 'IT Department Queue' : 'My Tickets'} ({visible.length})
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {paged.length === 0 && (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '56px 24px', textAlign: 'center' }}>
                  <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{ margin: '0 auto 12px', display: 'block' }}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>No tickets in this view.</p>
                </div>
              )}
              {paged.map(t => {
                const sc = STATUS_COLOR[t.status] || STATUS_COLOR.OPEN;
                const pc = PRIORITY_COLOR[t.priority] || PRIORITY_COLOR.MEDIUM;
                const isClosed = t.status === 'CLOSED';
                const borderLeft = t.status === 'RESOLVED' ? '#16a34a' : t.status === 'CLOSED' ? 'var(--text-faint)' : t.status === 'IN_PROGRESS' ? '#f59e0b' : t.status === 'REOPENED' ? '#dc2626' : ACCENT;
                return (
                  <div key={t.id} onClick={() => openTicket(t)} style={{
                    background: isClosed ? 'var(--surface-2)' : 'var(--surface)',
                    border: '1px solid var(--border)', borderLeft: `4px solid ${borderLeft}`,
                    borderRadius: 12, padding: '18px 22px', cursor: 'pointer',
                    filter: isClosed ? 'grayscale(1)' : 'none', opacity: isClosed ? 0.6 : 1,
                  }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-faint)', fontWeight: 600 }}>{t.ticketNumber}</span>
                          {t.isBlocked && <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 20, background: 'var(--b-orange-bg)', color: 'var(--b-orange-fg)', border: '1px solid var(--b-orange-bd)' }}>Blocked</span>}
                        </div>
                        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{t.title}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 3 }}>
                          {view === 'queue' && t.raisedBy?.name ? `Raised by ${t.raisedBy.name} · ` : ''}
                          {t.assignedTo ? `Agent: ${t.assignedTo.name}` : 'Unassigned'} · {t._count?.comments ?? 0} comment{(t._count?.comments ?? 0) !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
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

          {/* Sidebar summary */}
          <aside style={{ position: 'sticky', top: 64, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Overview</p>
              <p style={{ fontSize: 30, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{tickets.length}<span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-faint)' }}> total</span></p>
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {STATUS_ORDER.filter(s => counts[s]).map(s => {
                  const c = STATUS_COLOR[s] || STATUS_COLOR.OPEN;
                  const isActive = statusFilter === s;
                  return (
                    <button key={s} onClick={() => setStatusFilter(statusFilter === s ? 'ALL' : s)} style={{
                      display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '7px 8px', margin: '0 -8px',
                      border: 'none', borderRadius: 8, background: isActive ? 'var(--surface-2)' : 'transparent',
                      cursor: 'pointer', textAlign: 'left',
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
          </aside>
        </div>
      </div>
    );
  }

  /* ── Layout ── */
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{ width: SIDEBAR_W, minWidth: SIDEBAR_W, background: '#071428', display: 'flex', flexDirection: 'column', transition: 'width 0.2s', overflow: 'hidden', position: 'relative', zIndex: 10 }}>
        {/* Logo */}
        <div style={{ padding: sidebarOpen ? '22px 20px 16px' : '22px 16px 16px', borderBottom: '1px solid #0e2744', display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'space-between' : 'center' }}>
          {sidebarOpen ? <DriveITLogo size={0.75} /> : <DriveITMark size={0.85} />}
          <button onClick={() => setSidebarOpen(v => !v)} style={{ background: 'none', border: 'none', color: '#4a7fa5', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {sidebarOpen ? <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></> : <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>}
            </svg>
          </button>
        </div>

        {/* IT badge */}
        {sidebarOpen && (
          <div style={{ margin: '12px 14px', background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.25)', borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT, letterSpacing: '0.06em' }}>IT SUPPORT</span>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
          {([
            ['queue', 'Queue', <svg key="q" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>],
            ['mine', 'My Tickets', <svg key="m" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>],
            ['worklog', 'Work Log', <svg key="w" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>],
          ] as [View, string, React.ReactNode][]).map(([key, label, icon]) => {
            const isActive = view === key && !selected;
            return (
              <button key={key} onClick={() => { setView(key); setSelected(null); }} title={!sidebarOpen ? label : undefined} style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: sidebarOpen ? '11px 18px' : '11px 23px',
                borderLeft: `3px solid ${isActive ? ACCENT : 'transparent'}`,
                borderTop: 'none', borderRight: 'none', borderBottom: 'none',
                background: isActive ? 'rgba(14,165,233,0.09)' : 'transparent',
                color: isActive ? ACCENT : '#8fadcc',
                fontSize: 13, fontWeight: isActive ? 600 : 500, cursor: 'pointer', textAlign: 'left',
              }}>
                <span style={{ flexShrink: 0 }}>{icon}</span>
                {sidebarOpen && <span>{label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User + logout */}
        <div style={{ borderTop: '1px solid #0e2744', padding: sidebarOpen ? '14px 16px' : '14px 13px', position: 'relative' }}>
          {showUserInfo && sidebarOpen && (
            <div style={{ position: 'absolute', bottom: '100%', left: 12, right: 12, background: '#0d1f3c', border: '1px solid #1e3a5f', borderRadius: 12, padding: 16, marginBottom: 8, boxShadow: '0 -8px 32px rgba(0,0,0,0.5)', zIndex: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(14,165,233,0.15)', border: `2px solid ${ACCENT}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: ACCENT }}>{user?.name?.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{user?.name}</p>
                  <p style={{ fontSize: 11, color: '#8fadcc' }}>{user?.email}</p>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1e3a5f', paddingTop: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: '#8fadcc' }}>Role</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT, background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)', padding: '2px 9px', borderRadius: 20 }}>IT SUPPORT</span>
              </div>
              <button onClick={logout} style={{ width: '100%', height: 32, borderRadius: 8, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)', color: '#f87171', fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Sign out
              </button>
            </div>
          )}
          {sidebarOpen ? (
            <div onClick={() => setShowUserInfo(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderRadius: 8, padding: '4px 2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(14,165,233,0.15)', border: `1.5px solid rgba(14,165,233,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT }}>{user?.name?.charAt(0).toUpperCase()}</span>
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
                  <p style={{ fontSize: 10, color: '#8fadcc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>IT Support</p>
                </div>
              </div>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#8fadcc" strokeWidth="2">
                {showUserInfo ? <polyline points="18 15 12 9 6 15"/> : <polyline points="6 9 12 15 18 9"/>}
              </svg>
            </div>
          ) : (
            <div onClick={() => setShowUserInfo(v => !v)} title={user?.name} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'center', padding: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(14,165,233,0.15)', border: `1.5px solid rgba(14,165,233,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT }}>{user?.name?.charAt(0).toUpperCase()}</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Content */}
      <div className="dash-content" style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
        {/* Top bar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 60, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, padding: '16px 28px 0', background: 'var(--bg)' }}>
          <button onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} aria-label="Toggle theme"
            style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {theme === 'dark'
              ? <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/></svg>
              : <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>}
          </button>
          <NotificationBell accent={ACCENT} />
        </div>

        <div style={{ padding: '8px 28px 28px' }}>
          {view === 'worklog' ? <WorkLogModule user={user} /> : selected ? <TicketDetail /> : <TicketList />}
        </div>
      </div>

      <AskAiFab />
    </div>
  );
}
