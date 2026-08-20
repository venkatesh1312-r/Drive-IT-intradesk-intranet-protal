'use client';
import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { TimeSelect12 } from '@/components/TimeSelect12';

/* ── Shared helpers ─────────────────────────────────────────────────── */
const VISIT_STATUS: Record<string, { label: string; bg: string; color: string; border: string }> = {
  SCHEDULED:   { label: 'Scheduled',   bg: 'var(--b-blue-bg)', color: 'var(--b-blue-fg)', border: 'var(--b-blue-bd)' },
  CHECKED_IN:  { label: 'Checked-in',  bg: 'var(--b-green-bg)', color: 'var(--b-green-fg)', border: 'var(--b-green-bd)' },
  CHECKED_OUT: { label: 'Checked-out', bg: 'var(--b-slate-bg)', color: 'var(--b-slate-fg)', border: 'var(--b-slate-bd)' },
  CANCELLED:   { label: 'Cancelled',   bg: 'var(--b-red-bg)', color: 'var(--b-red-fg)', border: 'var(--b-red-bd)' },
};
const todayStr = () => new Date().toISOString().slice(0, 10);
const roleLabel = (r?: string) => (r ? r.charAt(0) + r.slice(1).toLowerCase() : '');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\d{10}$/;

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border)',
  fontSize: 13, color: 'var(--text)', background: 'var(--surface-2)', outline: 'none', boxSizing: 'border-box',
};
const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--text-soft)', display: 'block', marginBottom: 5 };
const errText: React.CSSProperties = { fontSize: 11.5, color: 'var(--b-red-fg)', fontWeight: 500, marginTop: 4 };
const primaryBtn: React.CSSProperties = { height: 38, padding: '0 20px', borderRadius: 8, background: 'var(--accent)', border: '1px solid var(--accent-hover)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const ghostBtn: React.CSSProperties = { height: 38, padding: '0 16px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' };

// "14:30" → "2:30 PM"
function fmtTimeStr(t?: string) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h)) return t;
  const d = new Date(); d.setHours(h, m || 0, 0, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
function fmtDateTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function fmtTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
// Collapsed list of visitor names: "A, B and 3 more"
function visitorNames(v: any): string {
  const names = (v.visitors || []).map((x: any) => x.name).filter(Boolean);
  if (names.length === 0) return '—';
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
}

function StatusBadge({ status }: { status: string }) {
  const s = VISIT_STATUS[status] || VISIT_STATUS.SCHEDULED;
  return <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>{s.label}</span>;
}
const RescheduledTag = () => <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--b-violet-bg)', color: 'var(--b-violet-fg)', border: '1px solid var(--b-violet-bd)', whiteSpace: 'nowrap' }}>Rescheduled</span>;
const CountTag = ({ n }: { n: number }) => <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 8px', borderRadius: 20, background: 'var(--surface-2)', color: 'var(--text-soft)', border: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{n} visitor{n !== 1 ? 's' : ''}</span>;

/* ── Host search-as-you-type ────────────────────────────────────────── */
function HostSearch({ value, onSelect, error }: { value: string; onSelect: (name: string, id: number | null) => void; error?: string }) {
  const [q, setQ] = useState(value);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQ(value); }, [value]);

  // Debounced search — fires 300ms after the last keystroke, min 3 chars.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 3) { setResults([]); setSearched(false); setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try { setResults(await api.searchUsers(term)); }
      catch { setResults([]); }
      finally { setLoading(false); setSearched(true); }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  function onType(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQ(val); setOpen(true);
    // Any manual edit clears the previously stored host id.
    onSelect(val, null);
  }
  function choose(u: any) {
    setQ(u.name); setOpen(false);
    onSelect(u.name, u.id);
  }

  const term = q.trim();
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          style={inputStyle} placeholder="Search host by name…" value={q}
          onFocus={() => setOpen(true)} onChange={onType} autoComplete="off"
        />
        {loading && <span className="spinner" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} />}
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 5px)', left: 0, right: 0, zIndex: 200, background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 12px 32px rgba(0,0,0,0.16)', maxHeight: 230, overflowY: 'auto', padding: 4 }}>
          {term.length < 3 ? (
            <p style={{ fontSize: 12, color: 'var(--text-faint)', padding: '10px 12px' }}>Type at least 3 characters to search</p>
          ) : loading ? (
            <p style={{ fontSize: 12, color: 'var(--text-faint)', padding: '10px 12px' }}>Searching…</p>
          ) : results.length === 0 && searched ? (
            <p style={{ fontSize: 12, color: 'var(--text-faint)', padding: '10px 12px' }}>No results found</p>
          ) : results.map(u => {
            const i = u.name.toLowerCase().indexOf(term.toLowerCase());
            return (
              <button key={u.id} type="button" onClick={() => choose(u)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'transparent', borderRadius: 7, cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                  {i < 0 ? u.name : <>{u.name.slice(0, i)}<mark style={{ background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 2 }}>{u.name.slice(i, i + term.length)}</mark>{u.name.slice(i + term.length)}</>}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{roleLabel(u.role)}{u.department ? ` · ${u.department}` : ''}</span>
              </button>
            );
          })}
        </div>
      )}
      {error && <p style={errText}>{error}</p>}
    </div>
  );
}

/* ── Dynamic visitor rows (fade in / out) ───────────────────────────── */
function useVisitorRows() {
  const keyer = useRef(0);
  const newRow = () => ({ key: ++keyer.current, name: '', email: '', phone: '', govtId: '', exiting: false });
  const [rows, setRows] = useState<any[]>([]);

  function setCount(n: number) {
    setRows(prev => {
      const live = prev.filter(r => !r.exiting);
      if (n === live.length) return prev;
      if (n > live.length) return [...prev.filter(r => !r.exiting), ...Array.from({ length: n - live.length }, newRow)];
      const keep = new Set(live.slice(0, n).map(r => r.key));
      return prev.map(r => (keep.has(r.key) ? r : { ...r, exiting: true }));
    });
  }
  // Drop exiting rows once their fade-out has played.
  useEffect(() => {
    if (!rows.some(r => r.exiting)) return;
    const t = setTimeout(() => setRows(prev => prev.filter(r => !r.exiting)), 220);
    return () => clearTimeout(t);
  }, [rows]);

  const update = (key: number, field: string, val: string) =>
    setRows(prev => prev.map(r => (r.key === key ? { ...r, [field]: val } : r)));

  return { rows, live: rows.filter(r => !r.exiting), setCount, update, reset: () => setRows([]) };
}

function VisitorSection({ row, index, withGovtId, errors, onChange }: { row: any; index: number; withGovtId: boolean; errors: Record<string, string>; onChange: (field: string, val: string) => void }) {
  const ek = (f: string) => errors[`v_${row.key}_${f}`];
  return (
    <div className={`visitor-section${row.exiting ? ' exiting' : ''}`} style={{ marginTop: 10 }}>
      <div style={{ border: '1px solid var(--border)', background: 'var(--surface-2)', borderRadius: 10, padding: '12px 14px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Visitor {index + 1}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={label}>Visitor Name *</label>
            <input style={inputStyle} value={row.name} onChange={e => onChange('name', e.target.value)} placeholder="Full name" />
            {ek('name') && <p style={errText}>{ek('name')}</p>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={label}>Visitor Email</label>
              <input style={inputStyle} value={row.email} onChange={e => onChange('email', e.target.value)} placeholder="name@company.com" />
              {ek('email') && <p style={errText}>{ek('email')}</p>}
            </div>
            <div>
              <label style={label}>Visitor Phone Number *</label>
              <input style={inputStyle} value={row.phone} inputMode="numeric" maxLength={10}
                onChange={e => onChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit number" />
              {ek('phone') && <p style={errText}>{ek('phone')}</p>}
            </div>
          </div>
          {withGovtId && (
            <div>
              <label style={label}>Govt ID / Badge Number *</label>
              <input style={inputStyle} value={row.govtId} onChange={e => onChange('govtId', e.target.value)} placeholder="ID / badge number" />
              {ek('govtId') && <p style={errText}>{ek('govtId')}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NumberOfVisitors({ count, onChange, error }: { count: number | ''; onChange: (n: number) => void; error?: string }) {
  return (
    <div>
      <label style={label}>Number of Visitors *</label>
      <select style={{ ...inputStyle, cursor: 'pointer', color: count === '' ? 'var(--text-faint)' : 'var(--text)' }} value={count} onChange={e => onChange(Number(e.target.value))}>
        <option value="" disabled>Select…</option>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => <option key={n} value={n} style={{ color: 'var(--text)' }}>{n}</option>)}
      </select>
      {error && <p style={errText}>{error}</p>}
    </div>
  );
}

/* ── Schedule form ──────────────────────────────────────────────────── */
// showHost=false is used for employee self-service, where the host is implicitly
// the requesting user and is set server-side (no host search shown).
export function ScheduleForm({ submitLabel, onSubmit, onClose, showHost = true }: { submitLabel: string; onSubmit: (payload: any) => Promise<void>; onClose: () => void; showHost?: boolean }) {
  const [company, setCompany] = useState('');
  const [purpose, setPurpose] = useState('');
  const [count, setCount] = useState<number | ''>('');
  const v = useVisitorRows();
  const [hostName, setHostName] = useState('');
  const [hostId, setHostId] = useState<number | null>(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverErr, setServerErr] = useState('');
  const [loading, setLoading] = useState(false);

  const clearErr = (k: string) => setErrors(p => { if (!p[k]) return p; const n = { ...p }; delete n[k]; return n; });

  function pickCount(n: number) { setCount(n); v.setCount(n); clearErr('count'); }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!company.trim()) e.company = 'Company / organisation is required.';
    if (!purpose.trim()) e.purpose = 'Purpose of visit is required.';
    if (!count) e.count = 'Select the number of visitors.';
    v.live.forEach(r => {
      if (!r.name.trim()) e[`v_${r.key}_name`] = 'Name is required.';
      if (!r.phone.trim()) e[`v_${r.key}_phone`] = 'Phone number is required.';
      else if (!PHONE_RE.test(r.phone.trim())) e[`v_${r.key}_phone`] = 'Enter a valid 10-digit phone number.';
      if (r.email.trim() && !EMAIL_RE.test(r.email.trim())) e[`v_${r.key}_email`] = 'Enter a valid email.';
    });
    if (showHost && !hostName.trim()) e.host = 'Host name is required.';
    if (!checkIn) e.checkIn = 'Expected check-in time is required.';
    if (!checkOut) e.checkOut = 'Expected check-out time is required.';
    if (checkIn && checkOut && checkOut <= checkIn) e.checkOut = 'Check-out time must be after check-in time.';
    if (!date) e.date = 'Date is required.';
    else if (date < todayStr()) e.date = 'Date cannot be in the past.';
    return e;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setServerErr('');
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await onSubmit({
        visitorCompany: company.trim(),
        purpose: purpose.trim(),
        numberOfVisitors: v.live.length,
        visitors: v.live.map(r => ({ name: r.name.trim(), phone: r.phone.trim(), ...(r.email.trim() ? { email: r.email.trim() } : {}) })),
        ...(showHost ? { hostId: hostId ?? undefined, hostName: hostName.trim() } : {}),
        scheduledDate: new Date(`${date}T${checkIn}`).toISOString(),
        expectedCheckInTime: checkIn,
        expectedCheckOutTime: checkOut,
        notes: notes.trim() || undefined,
      });
    } catch (err: any) { setServerErr(err.message || 'Failed to schedule visit.'); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={label}>Visitor Company / Organisation *</label>
        <input style={inputStyle} value={company} onChange={e => { setCompany(e.target.value); clearErr('company'); }} placeholder="Company or organisation" />
        {errors.company && <p style={errText}>{errors.company}</p>}
      </div>
      <div>
        <label style={label}>Purpose of Visit *</label>
        <input style={inputStyle} value={purpose} onChange={e => { setPurpose(e.target.value); clearErr('purpose'); }} placeholder="e.g. Client meeting, interview" />
        {errors.purpose && <p style={errText}>{errors.purpose}</p>}
      </div>

      <div>
        <NumberOfVisitors count={count} onChange={pickCount} error={errors.count} />
        {v.rows.map((row, i) => (
          <VisitorSection key={row.key} row={row} index={i} withGovtId={false} errors={errors} onChange={(f, val) => { v.update(row.key, f, val); clearErr(`v_${row.key}_${f}`); }} />
        ))}
      </div>

      {showHost && (
        <div>
          <label style={label}>Host Name *</label>
          <HostSearch value={hostName} error={errors.host} onSelect={(name, id) => { setHostName(name); setHostId(id); clearErr('host'); }} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={label}>Expected Check-in Time *</label>
          <TimeSelect12 value={checkIn} onChange={val => { setCheckIn(val); clearErr('checkIn'); clearErr('checkOut'); }} />
          {errors.checkIn && <p style={errText}>{errors.checkIn}</p>}
        </div>
        <div>
          <label style={label}>Expected Check-out Time *</label>
          <TimeSelect12 value={checkOut} onChange={val => { setCheckOut(val); clearErr('checkOut'); }} />
          {errors.checkOut && <p style={errText}>{errors.checkOut}</p>}
        </div>
      </div>

      <div>
        <label style={label}>Date *</label>
        <input type="date" min={todayStr()} style={inputStyle} value={date} onChange={e => { setDate(e.target.value); clearErr('date'); }} />
        {errors.date && <p style={errText}>{errors.date}</p>}
      </div>

      <div>
        <label style={label}>Notes</label>
        <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Any additional internal notes for HR (e.g. visitor has mobility needs, bring to ground floor)" />
        <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4, textAlign: 'right' }}>{notes.length} characters</p>
      </div>

      {serverErr && <p style={{ fontSize: 13, color: 'var(--b-red-fg)', fontWeight: 500 }}>{serverErr}</p>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 2 }}>
        <button type="button" onClick={onClose} style={ghostBtn}>Cancel</button>
        <button type="submit" disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>{loading ? 'Saving…' : submitLabel}</button>
      </div>
    </form>
  );
}

/* ── Walk-in form (no date/times; Govt ID per visitor) ──────────────── */
function WalkinForm({ onSubmit, onClose }: { onSubmit: (payload: any) => Promise<void>; onClose: () => void }) {
  const [company, setCompany] = useState('');
  const [purpose, setPurpose] = useState('');
  const [count, setCount] = useState<number | ''>('');
  const v = useVisitorRows();
  const [hostName, setHostName] = useState('');
  const [hostId, setHostId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverErr, setServerErr] = useState('');
  const [loading, setLoading] = useState(false);

  const clearErr = (k: string) => setErrors(p => { if (!p[k]) return p; const n = { ...p }; delete n[k]; return n; });
  function pickCount(n: number) { setCount(n); v.setCount(n); clearErr('count'); }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!company.trim()) e.company = 'Company / organisation is required.';
    if (!purpose.trim()) e.purpose = 'Purpose of visit is required.';
    if (!count) e.count = 'Select the number of visitors.';
    v.live.forEach(r => {
      if (!r.name.trim()) e[`v_${r.key}_name`] = 'Name is required.';
      if (!r.phone.trim()) e[`v_${r.key}_phone`] = 'Phone number is required.';
      else if (!PHONE_RE.test(r.phone.trim())) e[`v_${r.key}_phone`] = 'Enter a valid 10-digit phone number.';
      if (!r.govtId.trim()) e[`v_${r.key}_govtId`] = 'Govt ID / badge number is required.';
      if (r.email.trim() && !EMAIL_RE.test(r.email.trim())) e[`v_${r.key}_email`] = 'Enter a valid email.';
    });
    if (!hostName.trim()) e.host = 'Host name is required.';
    return e;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setServerErr('');
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await onSubmit({
        visitorCompany: company.trim(),
        purpose: purpose.trim(),
        numberOfVisitors: v.live.length,
        visitors: v.live.map(r => ({ name: r.name.trim(), phone: r.phone.trim(), govtIdNumber: r.govtId.trim(), ...(r.email.trim() ? { email: r.email.trim() } : {}) })),
        hostId: hostId ?? undefined,
        hostName: hostName.trim(),
        notes: notes.trim() || undefined,
      });
    } catch (err: any) { setServerErr(err.message || 'Failed to check in walk-in.'); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={label}>Visitor Company / Organisation *</label>
        <input style={inputStyle} value={company} onChange={e => { setCompany(e.target.value); clearErr('company'); }} placeholder="Company or organisation" />
        {errors.company && <p style={errText}>{errors.company}</p>}
      </div>
      <div>
        <label style={label}>Purpose of Visit *</label>
        <input style={inputStyle} value={purpose} onChange={e => { setPurpose(e.target.value); clearErr('purpose'); }} placeholder="e.g. Delivery, drop-in meeting" />
        {errors.purpose && <p style={errText}>{errors.purpose}</p>}
      </div>

      <div>
        <NumberOfVisitors count={count} onChange={pickCount} error={errors.count} />
        {v.rows.map((row, i) => (
          <VisitorSection key={row.key} row={row} index={i} withGovtId errors={errors} onChange={(f, val) => { v.update(row.key, f, val); clearErr(`v_${row.key}_${f}`); }} />
        ))}
      </div>

      <div>
        <label style={label}>Host Name *</label>
        <HostSearch value={hostName} error={errors.host} onSelect={(name, id) => { setHostName(name); setHostId(id); clearErr('host'); }} />
      </div>

      <div>
        <label style={label}>Notes</label>
        <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Any additional internal notes for HR (e.g. visitor has mobility needs, bring to ground floor)" />
        <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4, textAlign: 'right' }}>{notes.length} characters</p>
      </div>

      {serverErr && <p style={{ fontSize: 13, color: 'var(--b-red-fg)', fontWeight: 500 }}>{serverErr}</p>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 2 }}>
        <button type="button" onClick={onClose} style={ghostBtn}>Cancel</button>
        <button type="submit" disabled={loading} style={{ ...primaryBtn, background: 'var(--b-green-fg)', border: '1px solid var(--b-green-fg)', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>{loading ? 'Saving…' : 'Check In Now'}</button>
      </div>
    </form>
  );
}

/* ── Add Visitor — popup modal, two modes (Schedule / Walk-in) ──────── */
function AddVisitorModal({ user, initialMode, onClose, onCreated }: { user: any; initialMode: 'schedule' | 'walkin'; onClose: () => void; onCreated: () => void }) {
  const isHR = user?.role === 'HR';
  const [mode, setMode] = useState<'schedule' | 'walkin'>(isHR && initialMode === 'walkin' ? 'walkin' : 'schedule');

  async function done() { onCreated(); onClose(); }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{mode === 'walkin' ? 'Walk-in Visitor' : 'Schedule a Visit'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
        </div>

        {isHR && (
          <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', borderRadius: 10, padding: 4, marginBottom: 16, width: 'fit-content' }}>
            {([['schedule', 'Schedule for later'], ['walkin', 'Walk-in (now)']] as const).map(([key, lbl]) => (
              <button key={key} type="button" onClick={() => setMode(key)} style={{
                padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: mode === key ? 'var(--surface)' : 'transparent', color: mode === key ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: mode === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}>{lbl}</button>
            ))}
          </div>
        )}

        {mode === 'walkin'
          ? <WalkinForm onClose={onClose} onSubmit={async p => { await api.walkInVisit(p); await done(); }} />
          : <ScheduleForm submitLabel="Schedule Visit" onClose={onClose} onSubmit={async p => { await api.scheduleVisit(p); await done(); }} />}
      </div>
    </div>
  );
}

/* ── Reschedule modal — only date & expected times editable ─────────── */
function RescheduleModal({ visit, onClose, onSaved }: { visit: any; onClose: () => void; onSaved: () => void }) {
  const [date, setDate] = useState(new Date(visit.scheduledDate).toISOString().slice(0, 10));
  const [checkIn, setCheckIn] = useState(visit.expectedCheckInTime || '');
  const [checkOut, setCheckOut] = useState(visit.expectedCheckOutTime || '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const lockedStyle: React.CSSProperties = { ...inputStyle, color: 'var(--text-faint)', cursor: 'not-allowed' };

  async function save() {
    setErr('');
    if (!date || !checkIn || !checkOut) { setErr('Date, check-in and check-out are all required.'); return; }
    if (new Date(`${date}T${checkIn}`).getTime() < Date.now()) { setErr('The new date and time cannot be in the past.'); return; }
    if (checkOut <= checkIn) { setErr('Check-out time must be after check-in time.'); return; }
    setBusy(true);
    try {
      await api.rescheduleVisit(visit.id, {
        scheduledDate: new Date(`${date}T${checkIn}`).toISOString(),
        expectedCheckInTime: checkIn,
        expectedCheckOutTime: checkOut,
      });
      onSaved(); onClose();
    } catch (e: any) { setErr(e.message || 'Reschedule failed.'); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 16, padding: 26, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Reschedule visit</h3>
        <p style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 16 }}>Only the date and expected times can be changed. Other details are locked.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <div><label style={label}>Company 🔒</label><input disabled style={lockedStyle} value={visit.visitorCompany || ''} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={label}>Visitors 🔒</label><input disabled style={lockedStyle} value={`${visit.numberOfVisitors} (${visitorNames(visit)})`} /></div>
            <div><label style={label}>Host 🔒</label><input disabled style={lockedStyle} value={visit.hostName || '—'} /></div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><label style={label}>Date *</label><input type="date" min={todayStr()} style={inputStyle} value={date} onChange={e => { setDate(e.target.value); setErr(''); }} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={label}>Expected check-in *</label><TimeSelect12 value={checkIn} onChange={v => { setCheckIn(v); setErr(''); }} /></div>
            <div><label style={label}>Expected check-out *</label><TimeSelect12 value={checkOut} onChange={v => { setCheckOut(v); setErr(''); }} /></div>
          </div>
          {err && <p style={{ fontSize: 13, color: 'var(--b-red-fg)', fontWeight: 500 }}>{err}</p>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={ghostBtn}>Cancel</button>
            <button disabled={busy} onClick={save} style={{ ...primaryBtn, opacity: busy ? 0.7 : 1 }}>Save changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Cancellation modal ─────────────────────────────────────────────── */
function CancelNoteModal({ name, busy, onClose, onConfirm }: { name: string; busy: boolean; onClose: () => void; onConfirm: (note: string) => void }) {
  const [note, setNote] = useState('');
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 420 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Cancel visit — {name}</h3>
        <p style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 14 }}>Add an optional reason (saved on the visit record). You can leave it blank.</p>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Reason for cancellation (optional)" style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
          <button onClick={onClose} style={ghostBtn}>Back</button>
          <button disabled={busy} onClick={() => onConfirm(note)} style={{ height: 36, padding: '0 16px', borderRadius: 8, background: 'var(--b-red-fg)', border: '1px solid var(--b-red-fg)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Confirm Cancellation</button>
        </div>
      </div>
    </div>
  );
}

/* ── Calendar / list view (HR + Admin) ──────────────────────────────── */
function CalendarView({ user }: { user: any }) {
  const isHR = user?.role === 'HR';
  const isAdmin = user?.role === 'ADMIN';
  const [visits, setVisits] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [visitorIdNumber, setVisitorIdNumber] = useState('');
  const [checkinError, setCheckinError] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<'schedule' | 'walkin'>('schedule');

  useEffect(() => { load(); }, [statusFilter, dateFilter]);

  async function load() {
    try {
      const data = await api.getVisits({ status: statusFilter !== 'ALL' ? statusFilter : undefined, date: dateFilter || undefined });
      setVisits(data);
    } catch (e: any) { alert(e.message || 'Failed to load visits. Please refresh.'); }
  }
  function closeDetail() { setSelected(null); setCheckinOpen(false); setCancelOpen(false); setVisitorIdNumber(''); setCheckinError(''); }

  async function doCheckOut() {
    setBusy(true);
    try { await api.checkOutVisit(selected.id); closeDetail(); load(); } catch (e: any) { alert(e.message || 'Action failed'); } finally { setBusy(false); }
  }
  async function doCheckIn() {
    setBusy(true); setCheckinError('');
    try { await api.checkInVisit(selected.id, { visitorIdNumber: visitorIdNumber.trim() }); closeDetail(); load(); }
    catch (e: any) { setCheckinError(e.message || 'Check-in failed'); }
    finally { setBusy(false); }
  }
  async function doCancel(note: string) {
    setBusy(true);
    try { await api.cancelVisit(selected.id, { cancellationNote: note.trim() || undefined }); closeDetail(); load(); }
    catch (e: any) { alert(e.message || 'Action failed'); }
    finally { setBusy(false); }
  }

  const canCancel = (v: any) =>
    (v.status === 'SCHEDULED' || (v.status === 'CHECKED_IN' && v.isWalkIn)) && (isAdmin || (isHR && v.createdById === user.id));
  const canReschedule = (v: any) => v.status === 'SCHEDULED' && (isAdmin || (isHR && v.createdById === user.id));

  return (
    <div style={{ maxWidth: 1120 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Visitor Calendar</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Upcoming and recent visits across the company.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {isHR && <button onClick={() => { setAddMode('walkin'); setAddOpen(true); }} style={{ height: 38, padding: '0 16px', borderRadius: 9, background: 'var(--surface)', border: '1px solid var(--b-green-bd)', color: 'var(--b-green-fg)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Add Walk-in</button>}
          <button onClick={() => { setAddMode('schedule'); setAddOpen(true); }} style={{ ...primaryBtn, height: 38 }}>+ Schedule Visit</button>
        </div>
      </div>

      {addOpen && <AddVisitorModal user={user} initialMode={addMode} onClose={() => setAddOpen(false)} onCreated={load} />}

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', borderRadius: 10, padding: 4 }}>
          {(['ALL', 'SCHEDULED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'] as const).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)} style={{
              padding: '7px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
              background: statusFilter === f ? 'var(--surface)' : 'transparent', color: statusFilter === f ? 'var(--text)' : 'var(--text-muted)',
              boxShadow: statusFilter === f ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', whiteSpace: 'nowrap',
            }}>{f === 'ALL' ? 'All' : VISIT_STATUS[f].label}</button>
          ))}
        </div>
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
        {dateFilter && <button onClick={() => setDateFilter('')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, cursor: 'pointer' }}>Clear date</button>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visits.length === 0 && (
          <div style={{ ...card, padding: '48px 24px', textAlign: 'center' }}><p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No visits found.</p></div>
        )}
        {visits.map(v => {
          const sc = VISIT_STATUS[v.status] || VISIT_STATUS.SCHEDULED;
          return (
            <div key={v.id} onClick={() => { closeDetail(); setSelected(v); }} style={{ ...card, borderLeft: `4px solid ${sc.color}`, padding: '16px 22px', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{v.visitorCompany}</span>
                    <CountTag n={v.numberOfVisitors} />
                    {v.isWalkIn && <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 8px', borderRadius: 20, background: 'var(--b-orange-bg)', color: 'var(--b-orange-fg)', border: '1px solid var(--b-orange-bd)' }}>Walk-in</span>}
                  </div>
                  <p style={{ fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 3 }}>{visitorNames(v)}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-faint)' }}>{v.purpose} · {fmtDateTime(v.scheduledDate)}{v.expectedCheckInTime ? ` · expected ${fmtTimeStr(v.expectedCheckInTime)}` : ''}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0 }}>
                  {v.isRescheduled && v.status === 'SCHEDULED' ? <RescheduledTag /> : <StatusBadge status={v.status} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 16, padding: 26, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{selected.visitorCompany}</h3>
                {selected.isRescheduled && selected.status === 'SCHEDULED' ? <RescheduledTag /> : <StatusBadge status={selected.status} />}
              </div>
              <button onClick={closeDetail} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, marginBottom: 16 }}>
              {[
                ['Purpose', selected.purpose],
                ['Host', selected.hostName || '—'],
                ['Type', selected.isWalkIn ? 'Walk-in' : 'Scheduled'],
                ['Scheduled', fmtDateTime(selected.scheduledDate)],
                ['Expected check-in', fmtTimeStr(selected.expectedCheckInTime)],
                ['Expected check-out', fmtTimeStr(selected.expectedCheckOutTime)],
                ['Arrived', fmtTime(selected.actualArrivalTime)],
                ['Checked out', fmtTime(selected.checkoutTime)],
                ['Created by', selected.createdBy?.name || '—'],
              ].map(([k, val]) => (
                <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ color: 'var(--text-faint)' }}>{k}</span><span style={{ color: 'var(--text-soft)', fontWeight: 500, textAlign: 'right' }}>{val}</span>
                </div>
              ))}
            </div>

            {/* Visitors */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{selected.numberOfVisitors} Visitor{selected.numberOfVisitors !== 1 ? 's' : ''}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(selected.visitors || []).map((vt: any, i: number) => (
                  <div key={vt.id ?? i} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{vt.name}</p>
                    <p style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>
                      {vt.phone}{vt.email ? ` · ${vt.email}` : ''}{vt.govtIdNumber ? ` · ID: ${vt.govtIdNumber}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {selected.notes && <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-soft)', marginBottom: 12, fontSize: 13 }}><strong>Notes:</strong> {selected.notes}</div>}
            {selected.cancellationNote && <div style={{ background: 'var(--b-red-bg)', border: '1px solid var(--b-red-bd)', borderRadius: 8, padding: '8px 12px', color: 'var(--b-red-fg)', marginBottom: 12, fontSize: 13 }}><strong>Cancellation reason:</strong> {selected.cancellationNote}</div>}

            {/* Check-in inline form */}
            {checkinOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                <input style={inputStyle} placeholder="Govt ID / Badge Number" value={visitorIdNumber} onChange={e => { setVisitorIdNumber(e.target.value); setCheckinError(''); }} />
                {checkinError && <p style={{ fontSize: 12, color: 'var(--b-red-fg)', fontWeight: 500 }}>{checkinError}</p>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button disabled={busy || !visitorIdNumber.trim()} onClick={doCheckIn} style={{ ...primaryBtn, height: 34, background: 'var(--b-green-fg)', border: '1px solid var(--b-green-fg)', opacity: visitorIdNumber.trim() ? 1 : 0.6 }}>Confirm Check-in</button>
                  <button onClick={() => { setCheckinOpen(false); setCheckinError(''); }} style={{ ...ghostBtn, height: 34 }}>Back</button>
                </div>
              </div>
            )}

            {!checkinOpen && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {canReschedule(selected) && (
                  <button onClick={() => { const v = selected; closeDetail(); setRescheduleTarget(v); }} style={{ height: 36, padding: '0 14px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--b-blue-bd)', color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Reschedule</button>
                )}
                {canCancel(selected) && (
                  <button disabled={busy} onClick={() => setCancelOpen(true)} style={{ height: 36, padding: '0 14px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--b-red-bd)', color: 'var(--b-red-fg)', fontSize: 13, cursor: 'pointer' }}>Cancel visit</button>
                )}
                {isHR && selected.status === 'SCHEDULED' && (
                  <button onClick={() => setCheckinOpen(true)} style={{ ...primaryBtn, height: 36 }}>Check In</button>
                )}
                {isHR && selected.status === 'CHECKED_IN' && (
                  <button disabled={busy} onClick={doCheckOut} style={{ height: 36, padding: '0 16px', borderRadius: 8, background: 'var(--text-soft)', border: '1px solid var(--text-soft)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Check Out</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {cancelOpen && selected && (
        <CancelNoteModal name={selected.visitorCompany} busy={busy} onClose={() => setCancelOpen(false)} onConfirm={doCancel} />
      )}
      {rescheduleTarget && (
        <RescheduleModal visit={rescheduleTarget} onClose={() => setRescheduleTarget(null)} onSaved={load} />
      )}
    </div>
  );
}

/* ── Admin full history (Admin only) ────────────────────────────────── */
function AdminHistoryView({ user }: { user: any }) {
  const [visits, setVisits] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [reschedule, setReschedule] = useState<any>(null);
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => { load(); }, [statusFilter, dateFilter]);

  async function load() {
    try { setVisits(await api.getVisits({ status: statusFilter !== 'ALL' ? statusFilter : undefined, date: dateFilter || undefined })); } catch (e: any) { alert(e.message || 'Failed to load visits. Please refresh.'); }
  }
  async function act(fn: () => Promise<any>) {
    setBusy(true);
    try { await fn(); setCancelTarget(null); load(); } catch (e: any) { alert(e.message || 'Action failed'); } finally { setBusy(false); }
  }
  const canCancel = (v: any) => v.status === 'SCHEDULED' || (v.status === 'CHECKED_IN' && v.isWalkIn);

  const th: React.CSSProperties = { textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '10px 12px' };
  const td: React.CSSProperties = { fontSize: 13, color: 'var(--text-soft)', padding: '12px', borderTop: '1px solid var(--divider)' };

  return (
    <div style={{ maxWidth: 1180 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>All Visits</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Full visit history across the company.</p>
        </div>
        <button onClick={() => setAddOpen(true)} style={{ ...primaryBtn, height: 38 }}>+ Schedule Visit</button>
      </div>
      {addOpen && <AddVisitorModal user={user} initialMode="schedule" onClose={() => setAddOpen(false)} onCreated={load} />}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', borderRadius: 10, padding: 4 }}>
          {(['ALL', 'SCHEDULED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'] as const).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)} style={{
              padding: '7px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
              background: statusFilter === f ? 'var(--surface)' : 'transparent', color: statusFilter === f ? 'var(--text)' : 'var(--text-muted)',
              boxShadow: statusFilter === f ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', whiteSpace: 'nowrap',
            }}>{f === 'ALL' ? 'All' : VISIT_STATUS[f].label}</button>
          ))}
        </div>
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
        {dateFilter && <button onClick={() => setDateFilter('')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, cursor: 'pointer' }}>Clear</button>}
      </div>

      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
            <thead><tr style={{ background: 'var(--surface-2)' }}>
              {['Company', 'Visitors', 'Host', 'Purpose', 'Scheduled', 'Expected', 'Status', 'Created by', ''].map(h => <th key={h} style={th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {visits.length === 0 && <tr><td style={{ ...td, textAlign: 'center', color: 'var(--text-faint)' }} colSpan={9}>No visits found.</td></tr>}
              {visits.map(v => (
                <tr key={v.id}>
                  <td style={{ ...td, fontWeight: 600, color: 'var(--text)' }}>{v.visitorCompany}{v.isWalkIn && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--b-orange-fg)', marginLeft: 6 }}>(walk-in)</span>}</td>
                  <td style={td}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><CountTag n={v.numberOfVisitors} /><span style={{ color: 'var(--text-faint)' }}>{visitorNames(v)}</span></span></td>
                  <td style={td}>{v.hostName || '—'}</td>
                  <td style={td}>{v.purpose}</td>
                  <td style={td}>{fmtDateTime(v.scheduledDate)}</td>
                  <td style={td}>{v.expectedCheckInTime ? `${fmtTimeStr(v.expectedCheckInTime)} – ${fmtTimeStr(v.expectedCheckOutTime)}` : '—'}</td>
                  <td style={td}><span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>{v.isRescheduled && v.status === 'SCHEDULED' ? <RescheduledTag /> : <StatusBadge status={v.status} />}</span></td>
                  <td style={td}>{v.createdBy?.name || '—'}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'flex', gap: 8 }}>
                      {v.status === 'SCHEDULED' && <button onClick={() => setReschedule(v)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Reschedule</button>}
                      {canCancel(v) && <button onClick={() => setCancelTarget(v)} style={{ background: 'none', border: 'none', color: 'var(--b-red-fg)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {reschedule && (
        <RescheduleModal visit={reschedule} onClose={() => setReschedule(null)} onSaved={load} />
      )}
      {cancelTarget && (
        <CancelNoteModal name={cancelTarget.visitorCompany} busy={busy} onClose={() => setCancelTarget(null)} onConfirm={(note) => act(() => api.cancelVisit(cancelTarget.id, { cancellationNote: note.trim() || undefined }))} />
      )}
    </div>
  );
}

/* ── Entry — switches sub-view based on the active module ───────────── */
export function VisitorsModule({ user, view }: { user: any; view: string }) {
  if (view === 'visitor-admin') return <AdminHistoryView user={user} />;
  return <CalendarView user={user} />;
}
