'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';

/* ── Shared helpers ─────────────────────────────────────────────────── */
export const CONTRIBUTION_TYPES = ['FEATURE', 'BUG_FIX', 'IMPROVEMENT', 'DOCUMENTATION', 'MEETING', 'OTHER'];
export const TYPE_META: Record<string, { label: string; bg: string; color: string; border: string }> = {
  FEATURE:       { label: 'Feature',       bg: 'var(--b-blue-bg)',   color: 'var(--b-blue-fg)',   border: 'var(--b-blue-bd)' },
  BUG_FIX:       { label: 'Bug Fix',       bg: 'var(--b-red-bg)',    color: 'var(--b-red-fg)',    border: 'var(--b-red-bd)' },
  IMPROVEMENT:   { label: 'Improvement',   bg: 'var(--b-green-bg)',  color: 'var(--b-green-fg)',  border: 'var(--b-green-bd)' },
  DOCUMENTATION: { label: 'Documentation', bg: 'var(--b-indigo-bg)', color: 'var(--b-indigo-fg)', border: 'var(--b-indigo-bd)' },
  MEETING:       { label: 'Meeting',       bg: 'var(--b-amber-bg)',  color: 'var(--b-amber-fg)',  border: 'var(--b-amber-bd)' },
  OTHER:         { label: 'Other',         bg: 'var(--b-slate-bg)',  color: 'var(--b-slate-fg)',  border: 'var(--b-slate-bd)' },
};

export const todayStr = () => new Date().toISOString().slice(0, 10);
export const entryDateStr = (e: any) => (e.entryDate || '').slice(0, 10);

export function dateHeading(dateStr: string) {
  const today = todayStr();
  const d = new Date(dateStr + 'T00:00:00Z');
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday.toISOString().slice(0, 10)) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

export const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 };
export const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border)',
  fontSize: 13, color: 'var(--text)', background: 'var(--surface-2)', outline: 'none', boxSizing: 'border-box',
};
export const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--text-soft)', display: 'block', marginBottom: 5 };
export const primaryBtn: React.CSSProperties = { height: 38, padding: '0 20px', borderRadius: 8, background: 'var(--accent)', border: '1px solid var(--accent-hover)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
export const ghostBtn: React.CSSProperties = { height: 38, padding: '0 16px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' };

export function TypeChip({ type }: { type: string }) {
  const m = TYPE_META[type] || TYPE_META.OTHER;
  return <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: m.bg, color: m.color, border: `1px solid ${m.border}`, whiteSpace: 'nowrap' }}>{m.label}</span>;
}
export const ProjectChip = ({ name }: { name: string }) => <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: 'var(--surface-2)', color: 'var(--text-soft)', border: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{name}</span>;

/* ── Empty state ───────────────────────────────────────────────────── */
export function EmptyState({ icon, text }: { icon: 'log' | 'check'; text: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '40px 0' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon === 'check'
          ? <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2"><polyline points="20 6 9 17 4 12" /></svg>
          : <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="15" y2="17" /></svg>}
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>{text}</p>
    </div>
  );
}

/* ── Log entry form (create or edit) ──────────────────────────────────── */
function EntryForm({ projects, initial, onCancel, onSaved }: { projects: any[]; initial?: any; onCancel: () => void; onSaved: () => void }) {
  const [projectId, setProjectId] = useState<string>(initial?.projectId ? String(initial.projectId) : (projects[0]?.id ? String(projects[0].id) : ''));
  const [contributionType, setContributionType] = useState(initial?.contributionType || 'FEATURE');
  const [description, setDescription] = useState(initial?.description || '');
  const [link, setLink] = useState(initial?.link || '');
  const [tags, setTags] = useState((initial?.tags || []).join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) { setError('Select a project.'); return; }
    if (!description.trim()) { setError('Describe what you worked on.'); return; }
    setSaving(true); setError('');
    const body = {
      projectId: Number(projectId),
      contributionType,
      description: description.trim(),
      link: link.trim() || undefined,
      tags: tags.split(',').map((t: string) => t.trim()).filter(Boolean),
    };
    try {
      if (initial) await api.updateWorkLogEntry(initial.id, body);
      else await api.createWorkLogEntry(body);
      onSaved();
    } catch (e: any) {
      setError(e.message || 'Failed to save entry.');
    } finally {
      setSaving(false);
    }
  }

  if (projects.length === 0) {
    return (
      <div style={{ ...card, padding: 18, marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>You're not assigned to any projects yet. Ask your admin to add you to a project before logging work.</p>
        <button type="button" onClick={onCancel} style={{ ...ghostBtn, marginTop: 12 }}>Close</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ ...card, padding: 18, marginBottom: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={label}>Project</label>
          <select value={projectId} onChange={e => setProjectId(e.target.value)} style={inputStyle}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label style={label}>Contribution type</label>
          <select value={contributionType} onChange={e => setContributionType(e.target.value)} style={inputStyle}>
            {CONTRIBUTION_TYPES.map(t => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={label}>What did you do?</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="e.g. Shipped the CSV export for the admin Work Log view"
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={label}>Link <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(optional — PR, ticket, doc)</span></label>
          <input value={link} onChange={e => setLink(e.target.value)} placeholder="https://…" style={inputStyle} />
        </div>
        <div>
          <label style={label}>Tags <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(optional, comma separated)</span></label>
          <input value={tags} onChange={e => setTags(e.target.value)} placeholder="backend, urgent" style={inputStyle} />
        </div>
      </div>
      {error && <p style={{ fontSize: 12, color: 'var(--b-red-fg)', marginBottom: 12 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="submit" disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving…' : initial ? 'Save changes' : 'Log work'}</button>
        <button type="button" onClick={onCancel} style={ghostBtn}>Cancel</button>
      </div>
    </form>
  );
}

/* ── Single entry row ──────────────────────────────────────────────── */
export function EntryCard({ entry, editable, onEdit, onDelete, employeeLabel, extra }: { entry: any; editable: boolean; onEdit: () => void; onDelete: () => void; employeeLabel?: string; extra?: React.ReactNode }) {
  return (
    <div style={{ padding: '14px 0', borderBottom: '1px solid var(--divider)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {employeeLabel && <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{employeeLabel}</span>}
          <ProjectChip name={entry.project?.name || '—'} />
          <TypeChip type={entry.contributionType} />
          {entry.edited && <span style={{ fontSize: 10.5, color: 'var(--text-faint)', fontStyle: 'italic' }}>edited</span>}
        </div>
        {editable && (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={onEdit} title="Edit" style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: 4 }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5z" /></svg>
            </button>
            <button onClick={onDelete} title="Delete" style={{ background: 'none', border: 'none', color: 'var(--b-red-fg)', cursor: 'pointer', padding: 4 }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
            </button>
          </div>
        )}
      </div>
      <p style={{ fontSize: 13.5, color: 'var(--text)', marginTop: 8, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{entry.description}</p>
      {(entry.link || (entry.tags && entry.tags.length > 0)) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
          {entry.link && <a href={entry.link} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>🔗 {entry.link.length > 50 ? entry.link.slice(0, 50) + '…' : entry.link}</a>}
          {(entry.tags || []).map((t: string) => <span key={t} style={{ fontSize: 11, color: 'var(--text-faint)' }}>#{t}</span>)}
        </div>
      )}
      {entry.comments && entry.comments.length > 0 && (
        <div style={{ marginTop: 10, paddingLeft: 12, borderLeft: '2px solid var(--border)' }}>
          {entry.comments.map((c: any) => (
            <p key={c.id} style={{ fontSize: 12, color: 'var(--text-soft)', marginBottom: 4 }}>
              <strong style={{ color: 'var(--text)' }}>{c.author?.name}:</strong> {c.message}
            </p>
          ))}
        </div>
      )}
      {extra}
    </div>
  );
}

/* ── Employee personal Work Log ───────────────────────────────────── */
export function WorkLogModule({ user }: { user: any }) {
  const [entries, setEntries] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    Promise.all([api.getMyWorkLog(), api.getMyProjects()])
      .then(([e, p]) => { setEntries(e); setProjects(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  const loggedToday = useMemo(() => entries.some(e => entryDateStr(e) === todayStr()), [entries]);

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const e of entries) {
      const d = entryDateStr(e);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(e);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [entries]);

  async function handleDelete(id: number) {
    if (!confirm('Delete this entry?')) return;
    try { await api.deleteWorkLogEntry(id); load(); } catch (e: any) { alert(e.message || 'Failed to delete.'); }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Work Log</h2>
        {!showForm && !editing && (
          <button onClick={() => setShowForm(true)} style={primaryBtn}>+ Log work</button>
        )}
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>What you accomplished, not how long it took.</p>

      {!loggedToday && !loading && !showForm && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, background: 'var(--b-amber-bg)', border: '1px solid var(--b-amber-bd)', marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--b-amber-fg)', flex: 1 }}>You haven't logged today's work yet.</span>
          <button onClick={() => setShowForm(true)} style={{ background: 'none', border: 'none', color: 'var(--b-amber-fg)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', textDecoration: 'underline' }}>Log it now</button>
        </div>
      )}

      {showForm && <EntryForm projects={projects} onCancel={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
      {editing && <EntryForm projects={projects} initial={editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}

      <div style={{ ...card, padding: '4px 20px' }}>
        {loading && <p style={{ fontSize: 13, color: 'var(--text-faint)', padding: '20px 0', textAlign: 'center' }}>Loading…</p>}
        {!loading && entries.length === 0 && <EmptyState icon="log" text="No work logged yet — your first entry is one click away." />}
        {!loading && grouped.map(([date, dayEntries]) => (
          <div key={date} style={{ paddingTop: 14 }}>
            <p style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{dateHeading(date)}</p>
            {dayEntries.map(e => (
              <EntryCard key={e.id} entry={e} editable={date === todayStr()}
                onEdit={() => setEditing(e)} onDelete={() => handleDelete(e.id)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
