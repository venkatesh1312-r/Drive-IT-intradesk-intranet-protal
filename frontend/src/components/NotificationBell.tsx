'use client';
import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';

/* Department-scoped in-app notifications. The backend already routes each
   notification to the right recipient (assignee / requester / dept agents),
   so this widget just renders whatever belongs to the logged-in user. */
export function NotificationBell({ accent = '#2563eb' }: { accent?: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function refreshCount() {
    try { const r = await api.getUnreadCount(); setUnread(r?.count ?? 0); } catch {}
  }
  async function loadItems() {
    try { setItems(await api.getNotifications()); } catch {}
  }

  useEffect(() => {
    refreshCount();
    const t = setInterval(refreshCount, 20000); // poll unread count
    return () => clearInterval(t);
  }, []);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      await loadItems();
      // Opening the panel marks everything as read
      if (unread > 0) { try { await api.markAllRead(); } catch {} setUnread(0); }
    }
  }

  async function clearAll() {
    try { await api.clearNotifications(); } catch {}
    setItems([]); setUnread(0);
  }

  function timeAgo(iso: string) {
    if (!iso) return '';
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  return (
    <div ref={ref} style={{ position: 'relative', zIndex: 90 }}>
      {/* Bell button */}
      <button
        onClick={toggle}
        title="Notifications"
        style={{
          position: 'relative', width: 40, height: 40, borderRadius: 10,
          background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}>
        <svg width={19} height={19} viewBox="0 0 24 24" fill="none" style={{ stroke: 'var(--text-soft)' }} strokeWidth="1.8">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, padding: '0 4px',
            borderRadius: 9, background: '#ef4444', color: 'white', fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--surface)',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 48, right: 0, width: 340, maxHeight: 440, overflow: 'hidden',
          background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 12,
          boxShadow: '0 12px 40px rgba(0,0,0,0.16)', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--divider)' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Notifications</span>
            {items.length > 0 && (
              <button onClick={clearAll} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 12, cursor: 'pointer' }}>Clear all</button>
            )}
          </div>
          <div style={{ overflowY: 'auto' }}>
            {items.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', padding: '32px 16px' }}>You're all caught up.</p>
            )}
            {items.map((n: any) => (
              <div key={n.id} style={{
                display: 'flex', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--divider)',
                background: n.isRead ? 'var(--surface)' : 'var(--unread)',
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: n.isRead ? 'var(--text-faint)' : accent, marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  {n.ticketNumber && <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '0.05em' }}>#{n.ticketNumber}</p>}
                  <p style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.45 }}>{n.message}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3 }}>{timeAgo(n.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
