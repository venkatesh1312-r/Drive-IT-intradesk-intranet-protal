'use client';
import React, { useState, useEffect } from 'react';

/* Persistent "Ask AI" launcher → right slide-out drawer.
   UI shell only — not wired to a model yet, so it states that honestly
   instead of faking answers. */
export function AskAiFab() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {/* FAB */}
      {!open && (
        <button onClick={() => setOpen(true)} aria-label="Ask AI" style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 95, height: 48, padding: '0 18px',
          borderRadius: 26, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9,
          background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', color: 'white',
          fontSize: 14, fontWeight: 600, boxShadow: '0 8px 24px rgba(37,99,235,0.35)',
        }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z"/></svg>
          Ask AI
        </button>
      )}

      {/* Drawer */}
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110 }}>
          <div onClick={() => setOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.35)' }} />
          <div style={{ position: 'absolute', top: 0, right: 0, height: '100%', width: 'min(380px, 100%)', background: 'var(--surface-elevated)', boxShadow: '-8px 0 40px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid var(--divider)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/></svg>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Ask AI</p>
                  <p style={{ fontSize: 11, color: 'var(--text-faint)' }}>Workplace assistant</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>×</button>
            </div>

            {/* Body — honest "not connected yet" state */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px' }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--b-violet-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.6"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/></svg>
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-soft)' }}>Coming soon</p>
              <p style={{ fontSize: 13, color: 'var(--text-faint)', marginTop: 6, maxWidth: 280, lineHeight: 1.5 }}>
                Your workplace assistant will answer questions about tickets, visitors, and policies right here.
              </p>
            </div>

            {/* Input (disabled until connected) */}
            <div style={{ padding: '14px 16px', borderTop: '1px solid var(--divider)' }}>
              <input disabled placeholder="Ask anything… (coming soon)" style={{
                width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)',
                fontSize: 13, color: 'var(--text-faint)', background: 'var(--surface-2)', boxSizing: 'border-box', cursor: 'not-allowed',
              }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
