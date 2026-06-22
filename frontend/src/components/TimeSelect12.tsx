'use client';
import React, { useState, useRef, useEffect } from 'react';

/* Custom 12-hour time picker.
   - Click the field to open a styled dropdown with three columns: hours (1-12),
     minutes (00/15/30/45) and an AM/PM toggle.
   - Closes when clicking outside or once a full time is chosen.
   - value / onChange use 24-hour "HH:mm" for storage; the field DISPLAYS "2:30 PM".
   - Emits "" until hour, minute and AM/PM together form a valid time. */

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = ['00', '15', '30', '45'];

function to24(h12: number, m: number, ap: 'AM' | 'PM'): string {
  let H = h12 % 12;
  if (ap === 'PM') H += 12;
  return `${String(H).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function parse(value: string): { h12: number | null; m: number | null; ap: 'AM' | 'PM' } {
  if (value && value.includes(':')) {
    const [h, m] = value.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      return { h12: h % 12 === 0 ? 12 : h % 12, m, ap: h >= 12 ? 'PM' : 'AM' };
    }
  }
  return { h12: null, m: null, ap: 'AM' };
}
function display(value: string): string {
  const { h12, m, ap } = parse(value);
  if (h12 == null || m == null) return '';
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
}

export function TimeSelect12({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cur = parse(value);
  const [h12, setH12] = useState<number | null>(cur.h12);
  const [m, setM] = useState<number | null>(cur.m);
  const [ap, setAp] = useState<'AM' | 'PM'>(cur.ap);

  // Keep internal parts in sync when the value is changed externally (e.g. reset).
  useEffect(() => {
    const p = parse(value);
    setH12(p.h12); setM(p.m); setAp(p.ap);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  function commit(nh: number | null, nm: number | null, nap: 'AM' | 'PM') {
    setH12(nh); setM(nm); setAp(nap);
    if (nh != null && nm != null) {
      onChange(to24(nh, nm, nap));
      setOpen(false);
    } else {
      onChange('');
    }
  }

  const shown = display(value);
  const colHead: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 4px 6px', position: 'sticky', top: 0, background: 'var(--surface-elevated)' };
  const cell = (active: boolean): React.CSSProperties => ({
    padding: '7px 0', textAlign: 'center', fontSize: 13, fontWeight: active ? 700 : 500, borderRadius: 7, cursor: 'pointer',
    background: active ? 'var(--accent)' : 'transparent', color: active ? 'white' : 'var(--text)',
  });

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button" onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13,
          color: shown ? 'var(--text)' : 'var(--text-faint)', background: 'var(--surface-2)', cursor: 'pointer', boxSizing: 'border-box',
        }}>
        <span>{shown || 'Select time'}</span>
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 200,
          display: 'grid', gridTemplateColumns: '52px 52px 56px', gap: 6,
          background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 12,
          padding: 10, boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
        }}>
          {/* Hours */}
          <div style={{ maxHeight: 188, overflowY: 'auto' }}>
            <div style={colHead}>Hr</div>
            {HOURS.map(h => (
              <div key={h} onClick={() => commit(h, m ?? 0, ap)} style={cell(h12 === h)}>{h}</div>
            ))}
          </div>
          {/* Minutes */}
          <div>
            <div style={colHead}>Min</div>
            {MINUTES.map(mm => (
              <div key={mm} onClick={() => commit(h12 ?? 12, Number(mm), ap)} style={cell(m === Number(mm))}>{mm}</div>
            ))}
          </div>
          {/* AM / PM */}
          <div>
            <div style={colHead}>&nbsp;</div>
            {(['AM', 'PM'] as const).map(x => (
              <div key={x} onClick={() => commit(h12, m, x)} style={cell(ap === x)}>{x}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
