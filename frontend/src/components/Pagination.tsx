'use client';
import React from 'react';

/* Lightweight page control. Renders nothing when there's only one page. */
export function Pagination({
  page, totalPages, onChange, accent = '#2563eb',
}: { page: number; totalPages: number; onChange: (p: number) => void; accent?: string }) {
  if (totalPages <= 1) return null;

  // Windowed page numbers: always show first, last, current ±1, with ellipses.
  const pages: (number | '…')[] = [];
  const push = (n: number | '…') => pages.push(n);
  const window = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  let prev = 0;
  for (let i = 1; i <= totalPages; i++) {
    if (window.has(i) && i >= 1 && i <= totalPages) {
      if (i - prev > 1) push('…');
      push(i);
      prev = i;
    }
  }

  const btn = (active: boolean, disabled = false): React.CSSProperties => ({
    minWidth: 32, height: 32, padding: '0 8px', borderRadius: 8,
    border: `1px solid ${active ? accent : 'var(--border)'}`,
    background: active ? accent : 'var(--surface)',
    color: active ? 'white' : disabled ? 'var(--text-faint)' : 'var(--text-soft)',
    fontSize: 13, fontWeight: active ? 700 : 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 18, flexWrap: 'wrap' }}>
      <button style={btn(false, page === 1)} disabled={page === 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      {pages.map((p, i) =>
        p === '…'
          ? <span key={`e${i}`} style={{ color: 'var(--text-faint)', fontSize: 13, padding: '0 2px' }}>…</span>
          : <button key={p} style={btn(p === page)} onClick={() => onChange(p)}>{p}</button>
      )}
      <button style={btn(false, page === totalPages)} disabled={page === totalPages} onClick={() => onChange(page + 1)} aria-label="Next page">
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
      </button>
    </div>
  );
}
