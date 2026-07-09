'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import {
  CONTRIBUTION_TYPES, TYPE_META, TypeChip, ProjectChip, EmptyState, EntryCard,
  card, inputStyle, label, primaryBtn, ghostBtn, todayStr, entryDateStr, dateHeading,
} from './WorkLogModule';

type Lens = 'timeline' | 'by-project' | 'by-employee' | 'projects';
type RangePreset = 'today' | 'week' | 'month' | 'custom';

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }
function computeRange(preset: RangePreset, customFrom: string, customTo: string): { dateFrom?: string; dateTo?: string } {
  const today = new Date();
  if (preset === 'today') return { dateFrom: isoDate(today), dateTo: isoDate(today) };
  if (preset === 'week') {
    const day = today.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(today); monday.setDate(today.getDate() - diff);
    return { dateFrom: isoDate(monday), dateTo: isoDate(today) };
  }
  if (preset === 'month') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    return { dateFrom: isoDate(first), dateTo: isoDate(today) };
  }
  return { dateFrom: customFrom || undefined, dateTo: customTo || undefined };
}

const statTile: React.CSSProperties = { ...card, padding: '16px 18px', flex: 1, minWidth: 140 };
const tabBtn = (active: boolean): React.CSSProperties => ({
  padding: '8px 16px', borderRadius: 8, border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
  background: active ? 'var(--accent-soft)' : 'var(--surface)', color: active ? 'var(--accent)' : 'var(--text-muted)',
  fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
});
const filterSelect: React.CSSProperties = { ...inputStyle, width: 'auto', minWidth: 140, padding: '7px 10px', fontSize: 12.5 };

/* ── Activity overview ────────────────────────────────────────────── */
function Overview({ overview }: { overview: any }) {
  if (!overview) return null;
  const notLoggedToday = (overview.employeeActivity || []).filter((e: any) => !e.loggedToday);
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={statTile}>
          <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>{overview.entriesToday}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Entries logged today</p>
        </div>
        <div style={statTile}>
          <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>{overview.entriesThisWeek}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Entries this week</p>
        </div>
        <div style={statTile}>
          <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>{overview.byProject?.length || 0}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Active projects with activity</p>
        </div>
        <div style={statTile}>
          <p style={{ fontSize: 24, fontWeight: 800, color: notLoggedToday.length > 0 ? 'var(--b-amber-fg)' : 'var(--b-green-fg)' }}>
            {(overview.employeeActivity?.length || 0) - notLoggedToday.length}/{overview.employeeActivity?.length || 0}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>People logged today</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ ...card, padding: '16px 18px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>By project</p>
          {(!overview.byProject || overview.byProject.length === 0) && <p style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>No activity yet.</p>}
          {overview.byProject?.slice(0, 6).map((p: any) => (
            <div key={p.projectId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--divider)' }}>
              <span style={{ fontSize: 12.5, color: 'var(--text)' }}>{p.projectName}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-soft)' }}>{p.count}</span>
            </div>
          ))}
        </div>
        <div style={{ ...card, padding: '16px 18px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            Hasn't logged today <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— visibility, not pressure</span>
          </p>
          {notLoggedToday.length === 0 && <p style={{ fontSize: 12.5, color: 'var(--b-green-fg)' }}>Everyone's logged today. 🎉</p>}
          {notLoggedToday.slice(0, 6).map((e: any) => (
            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--divider)' }}>
              <span style={{ fontSize: 12.5, color: 'var(--text)' }}>{e.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{e.lastLoggedDate ? `last: ${e.lastLoggedDate.slice(0, 10)}` : 'never logged'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Comment composer ─────────────────────────────────────────────── */
function CommentForm({ entryId, onAdded }: { entryId: number; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  if (!open) {
    return <button onClick={() => setOpen(true)} style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>+ Comment</button>;
  }
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
      <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="Leave a short note…" style={{ ...inputStyle, fontSize: 12 }} />
      <button disabled={saving || !msg.trim()} onClick={async () => {
        setSaving(true);
        try { await api.addWorkLogComment(entryId, msg.trim()); setMsg(''); setOpen(false); onAdded(); }
        catch { /* noop */ } finally { setSaving(false); }
      }} style={{ ...primaryBtn, height: 32, padding: '0 14px', fontSize: 12 }}>Post</button>
    </div>
  );
}

/* ── Projects management ──────────────────────────────────────────── */
function ProjectsManager() {
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [addName, setAddName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [error, setError] = useState('');

  function load() {
    Promise.all([api.getAllProjects(), api.listUsers()]).then(([p, u]) => { setProjects(p); setUsers(u); }).catch(() => {});
  }
  useEffect(() => { load(); }, []);

  async function toggleExpand(id: number) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    try { setMembers(await api.getProjectMembers(id)); } catch { setMembers([]); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) { setError('Project name is required.'); return; }
    try {
      await api.createProject({ name: newName.trim(), description: newDesc.trim() || undefined });
      setNewName(''); setNewDesc(''); setShowCreate(false); setError(''); load();
    } catch (e: any) { setError(e.message || 'Failed to create project.'); }
  }

  async function handleToggleActive(p: any) {
    try { await api.updateProject(p.id, { isActive: !p.isActive }); load(); } catch { /* noop */ }
  }

  async function handleAddMember(projectId: number) {
    const q = addName.trim().toLowerCase();
    if (!q) return;
    // Resolve the typed name (or email) to an existing user.
    const match =
      users.find(u => u.name?.toLowerCase() === q || u.email?.toLowerCase() === q) ||
      users.find(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
    if (!match) { alert(`No employee found matching "${addName.trim()}". Type their full name or email.`); return; }
    if (members.some(m => m.id === match.id)) { alert(`${match.name} is already a member.`); return; }
    try { setMembers(await api.addProjectMember(projectId, match.id)); setAddName(''); load(); } catch (e: any) { alert(e.message || 'Failed to add member.'); }
  }

  async function handleRemoveMember(projectId: number, userId: number) {
    try { setMembers(await api.removeProjectMember(projectId, userId)); load(); } catch { /* noop */ }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Manage which projects exist and who's assigned to them.</p>
        {!showCreate && <button onClick={() => setShowCreate(true)} style={primaryBtn}>+ New project</button>}
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} style={{ ...card, padding: 16, marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
            <div>
              <label style={label}>Project name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={label}>Description (optional)</label>
              <input value={newDesc} onChange={e => setNewDesc(e.target.value)} style={inputStyle} />
            </div>
          </div>
          {error && <p style={{ fontSize: 12, color: 'var(--b-red-fg)', marginBottom: 10 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" style={primaryBtn}>Create</button>
            <button type="button" onClick={() => setShowCreate(false)} style={ghostBtn}>Cancel</button>
          </div>
        </form>
      )}

      {projects.length === 0 && <EmptyState icon="log" text="No projects yet — create one to get started." />}
      {projects.map(p => (
        <div key={p.id} style={{ ...card, padding: '14px 18px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => toggleExpand(p.id)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{p.name}</span>
              {!p.isActive && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--b-slate-bg)', color: 'var(--b-slate-fg)' }}>INACTIVE</span>}
              <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{p.memberCount} member{p.memberCount !== 1 ? 's' : ''} · {p.entryCount} entries</span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button onClick={e => { e.stopPropagation(); handleToggleActive(p); }} style={{ ...ghostBtn, height: 30, padding: '0 12px', fontSize: 11.5 }}>{p.isActive ? 'Deactivate' : 'Activate'}</button>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2">{expanded === p.id ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}</svg>
            </div>
          </div>
          {expanded === p.id && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--divider)' }}>
              {members.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                  <span style={{ fontSize: 12.5, color: 'var(--text)' }}>{m.name} <span style={{ color: 'var(--text-faint)' }}>· {m.email}</span></span>
                  <button onClick={() => handleRemoveMember(p.id, m.id)} style={{ background: 'none', border: 'none', color: 'var(--b-red-fg)', fontSize: 11.5, cursor: 'pointer' }}>Remove</button>
                </div>
              ))}
              {members.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 8 }}>No members yet.</p>}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <input
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddMember(p.id); } }}
                  placeholder="Type employee name…"
                  style={{ ...inputStyle, fontSize: 12.5 }}
                />
                <button onClick={() => handleAddMember(p.id)} disabled={!addName.trim()} style={{ ...primaryBtn, height: 34, padding: '0 14px', fontSize: 12 }}>Add</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Admin / HR aggregate Work Log ────────────────────────────────── */
export function WorkLogAdminModule({ user }: { user: any }) {
  const [lens, setLens] = useState<Lens>('timeline');
  const [entries, setEntries] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [employeeId, setEmployeeId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [contributionType, setContributionType] = useState('');
  const [preset, setPreset] = useState<RangePreset>('week');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const range = useMemo(() => computeRange(preset, customFrom, customTo), [preset, customFrom, customTo]);
  const filters = useMemo(() => ({
    employeeId: employeeId ? Number(employeeId) : undefined,
    projectId: projectId ? Number(projectId) : undefined,
    contributionType: contributionType || undefined,
    ...range,
  }), [employeeId, projectId, contributionType, range]);

  function loadEntries() {
    setLoading(true);
    api.getWorkLogAggregate(filters).then(setEntries).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(() => { loadEntries(); }, [filters]);
  useEffect(() => {
    api.getWorkLogOverview().then(setOverview).catch(() => {});
    api.listUsers().then(setAllUsers).catch(() => {});
    api.getAllProjects().then(setAllProjects).catch(() => {});
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const e of entries) {
      const d = entryDateStr(e);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(e);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [entries]);

  const byProject = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const e of entries) {
      const k = e.project?.name || 'Unknown';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [entries]);

  const byEmployee = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const e of entries) {
      const k = e.employee?.name || 'Unknown';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [entries]);

  const entryRow = (e: any) => (
    <EntryCard key={e.id} entry={e} editable={false} onEdit={() => {}} onDelete={() => {}}
      employeeLabel={e.employee?.name} extra={<CommentForm entryId={e.id} onAdded={loadEntries} />} />
  );

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Work Log</h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>What the team has been shipping — output over hours.</p>

      <Overview overview={overview} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['timeline', 'by-project', 'by-employee', 'projects'] as Lens[]).map(l => (
          <button key={l} onClick={() => setLens(l)} style={tabBtn(lens === l)}>
            {l === 'timeline' ? 'Timeline' : l === 'by-project' ? 'By Project' : l === 'by-employee' ? 'By Employee' : 'Projects'}
          </button>
        ))}
      </div>

      {lens === 'projects' ? <ProjectsManager /> : (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} style={filterSelect}>
              <option value="">All employees</option>
              {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} style={filterSelect}>
              <option value="">All projects</option>
              {allProjects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={contributionType} onChange={e => setContributionType(e.target.value)} style={filterSelect}>
              <option value="">All types</option>
              {CONTRIBUTION_TYPES.map(t => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['today', 'week', 'month', 'custom'] as RangePreset[]).map(p => (
                <button key={p} onClick={() => setPreset(p)} style={tabBtn(preset === p)}>
                  {p === 'today' ? 'Today' : p === 'week' ? 'This week' : p === 'month' ? 'This month' : 'Custom'}
                </button>
              ))}
            </div>
            {preset === 'custom' && (
              <>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ ...filterSelect, minWidth: 0 }} />
                <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>to</span>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ ...filterSelect, minWidth: 0 }} />
              </>
            )}
            <button onClick={() => api.exportWorkLogCsv(filters)} style={{ ...ghostBtn, marginLeft: 'auto', height: 34, fontSize: 12.5 }}>⬇ Export CSV</button>
          </div>

          <div style={{ ...card, padding: '4px 20px' }}>
            {loading && <p style={{ fontSize: 13, color: 'var(--text-faint)', padding: '20px 0', textAlign: 'center' }}>Loading…</p>}
            {!loading && entries.length === 0 && <EmptyState icon="check" text="No activity in this range." />}

            {!loading && lens === 'timeline' && grouped.map(([date, dayEntries]) => (
              <div key={date} style={{ paddingTop: 14 }}>
                <p style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{dateHeading(date)}</p>
                {dayEntries.map(entryRow)}
              </div>
            ))}

            {!loading && lens === 'by-project' && byProject.map(([name, list]) => (
              <div key={name} style={{ paddingTop: 14 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{name} <span style={{ fontWeight: 400, color: 'var(--text-faint)', fontSize: 12 }}>({list.length})</span></p>
                {list.map(entryRow)}
              </div>
            ))}

            {!loading && lens === 'by-employee' && byEmployee.map(([name, list]) => (
              <div key={name} style={{ paddingTop: 14 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{name} <span style={{ fontWeight: 400, color: 'var(--text-faint)', fontSize: 12 }}>({list.length})</span></p>
                {list.map(entryRow)}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
