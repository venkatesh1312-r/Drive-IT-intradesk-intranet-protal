'use client';
import { useState } from 'react';

const CATEGORIES = ['Above & Beyond', 'Team Player', 'Innovation', 'Client Impact', 'Mentorship'];

type Status = 'pending' | 'approved' | 'declined';

interface Nomination {
  id: number;
  project: string;
  nominee: string;
  by: string;
  category: string;
  context: string;
  pts: number;
  status: Status;
}

const INITIAL: Nomination[] = [
  { id: 1, project: 'Medicine Database', nominee: 'Ravi Kumar', by: 'Team Lead', category: 'Above & Beyond', context: 'Delivered the full backend-to-database integration ahead of schedule, with clean documentation and zero bugs in production.', pts: 500, status: 'pending' },
  { id: 2, project: 'AI Chatbot Module', nominee: 'Priya Sharma', by: 'Team Lead', category: 'Innovation', context: 'Proactively resolved critical latency issues in the AI response pipeline, improving response time by 40%.', pts: 750, status: 'pending' },
  { id: 3, project: 'Client Dashboard', nominee: 'Arjun Mehta', by: 'Team Lead', category: 'Client Impact', context: 'Redesigned the entire dashboard UI from scratch within 3 days for a critical client demo, receiving direct praise from the client.', pts: 600, status: 'pending' },
];

const STATUS_STYLE: Record<Status, string> = {
  pending: 'bg-amber-950 text-amber-400 border border-amber-800',
  approved: 'bg-green-950 text-green-400 border border-green-800',
  declined: 'bg-red-950 text-red-400 border border-red-800',
};

export default function Home() {
  const [view, setView] = useState<'employee' | 'admin'>('employee');
  const [noms, setNoms] = useState<Nomination[]>(INITIAL);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ project: '', nominee: '', by: '', category: '', context: '' });
  const [formError, setFormError] = useState('');
  const [nextId, setNextId] = useState(4);
  const [ptsInput, setPtsInput] = useState<Record<number, string>>({});
  const [consent, setConsent] = useState<Record<number, boolean>>({});

  function submitNom() {
    if (!form.project || !form.nominee || !form.by || !form.category || !form.context) {
      setFormError('Please fill all fields.');
      return;
    }
    setNoms([{ id: nextId, project: form.project, nominee: form.nominee, by: form.by, category: form.category, context: form.context, pts: 100, status: 'pending' }, ...noms]);
    setNextId(nextId + 1);
    setForm({ project: '', nominee: '', by: '', category: '', context: '' });
    setFormError('');
    setModalOpen(false);
  }

  function approve(id: number) {
    const pts = parseInt(ptsInput[id]);
    setNoms(noms.map(n => n.id === id ? { ...n, status: 'approved', pts: pts || n.pts } : n));
  }

  function decline(id: number) {
    setNoms(noms.map(n => n.id === id ? { ...n, status: 'declined' } : n));
  }

  function accept(id: number) {
    setNoms(noms.map(n => n.id === id ? { ...n, status: 'approved' } : n));
  }

  return (
    <div style={{ background: '#111110', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['employee', 'admin'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 10,
                border: '0.5px solid ' + (view === v ? '#555550' : '#2e2e2c'),
                background: view === v ? '#2c2c2a' : 'transparent',
                color: view === v ? '#f0f0ec' : '#6a6a65',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}>
                {v === 'employee' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l8 4v5c0 4.4-3.4 8.5-8 9.5C7.4 20.5 4 16.4 4 12V7l8-4z"/></svg>
                )}
                {v === 'employee' ? 'Employee view' : 'Admin / HR view'}
              </button>
            ))}
          </div>
          <button onClick={() => setModalOpen(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 18px', borderRadius: 10,
            border: '0.5px solid #3a3a38', background: '#242422',
            color: '#f0f0ec', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create nomination
          </button>
        </div>

        {/* Cards grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {noms.length === 0 && (
            <p style={{ color: '#6a6a65', fontSize: 13, gridColumn: '1/-1', textAlign: 'center', paddingTop: 48 }}>No nominations yet. Create one!</p>
          )}
          {noms.map((n, i) => (
            <div key={n.id} style={{
              background: '#1e1e1c', border: '0.5px solid #2e2e2c',
              borderRadius: 14, padding: '1rem 1.1rem',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#555550', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Nomination {i + 1}
                </span>
                {view === 'admin' && (
                  <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 9px', borderRadius: 999 }}
                    className={STATUS_STYLE[n.status]}>
                    {n.status.charAt(0).toUpperCase() + n.status.slice(1)}
                  </span>
                )}
              </div>

              <div style={{ fontSize: 17, fontWeight: 600, color: '#f0f0ec' }}>{n.project}</div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#c0c0bc' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                  {n.nominee}
                </div>
                <div style={{ fontSize: 12, color: '#555550', marginTop: 2 }}>Nominated by {n.by}</div>
              </div>

              <div style={{ fontSize: 12, color: '#909088', lineHeight: 1.6, borderLeft: '2px solid #2e2e2c', paddingLeft: 10 }}>
                {n.context}
              </div>

              {/* Employee footer */}
              {view === 'employee' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#1a2e1a', color: '#5db832', fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 999 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    {n.pts} pts
                  </span>
                  {n.status === 'pending' ? (
                    <button onClick={() => accept(n.id)} style={{
                      padding: '6px 18px', borderRadius: 9,
                      border: '0.5px solid #3a3a38', background: '#2c2c2a',
                      color: '#f0f0ec', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    }}>Accept</button>
                  ) : (
                    <span style={{ fontSize: 12, color: '#555550' }}>
                      {n.status === 'approved' ? '✓ Accepted' : '✕ Declined'}
                    </span>
                  )}
                </div>
              )}

              {/* Admin footer */}
              {view === 'admin' && n.status === 'pending' && (
                <div style={{ borderTop: '0.5px solid #2e2e2c', paddingTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    type="number" min="1" max="999" placeholder="pts"
                    value={ptsInput[n.id] || ''}
                    onChange={e => setPtsInput({ ...ptsInput, [n.id]: e.target.value })}
                    style={{
                      width: 60, padding: '4px 8px', borderRadius: 8,
                      background: '#111110', border: '0.5px solid #3a3a38',
                      color: '#f0f0ec', fontSize: 12, textAlign: 'center',
                    }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6a6a65', cursor: 'pointer' }}>
                    <input type="checkbox" checked={consent[n.id] || false}
                      onChange={e => setConsent({ ...consent, [n.id]: e.target.checked })}
                      style={{ accentColor: '#5db832' }}
                    />
                    Consent confirmed
                  </label>
                  <button
                    disabled={!consent[n.id] || !parseInt(ptsInput[n.id])}
                    onClick={() => approve(n.id)}
                    style={{
                      padding: '5px 12px', borderRadius: 8,
                      background: (!consent[n.id] || !parseInt(ptsInput[n.id])) ? '#1a2e1a' : '#1e3a1e',
                      border: '0.5px solid #3b6d11',
                      color: (!consent[n.id] || !parseInt(ptsInput[n.id])) ? '#3b5a20' : '#5db832',
                      fontSize: 12, fontWeight: 500, cursor: (!consent[n.id] || !parseInt(ptsInput[n.id])) ? 'not-allowed' : 'pointer',
                    }}>
                    ✓ Approve
                  </button>
                  <button onClick={() => decline(n.id)} style={{
                    padding: '5px 10px', borderRadius: 8,
                    background: 'transparent', border: '0.5px solid #3a3a38',
                    color: '#6a6a65', fontSize: 12, cursor: 'pointer',
                  }}>✕</button>
                </div>
              )}

              {view === 'admin' && n.status !== 'pending' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#1a2e1a', color: '#5db832', fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 999 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    {n.pts} pts
                  </span>
                  <span style={{ fontSize: 12, color: '#555550' }}>
                    {n.status === 'approved' ? 'Points awarded' : 'Nomination closed'}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Create Modal */}
      {modalOpen && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: '1rem',
          }}>
          <div style={{
            background: '#1e1e1c', borderRadius: 16,
            border: '0.5px solid #3a3a38',
            padding: '1.75rem', width: '100%', maxWidth: 560,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: 18, fontWeight: 600, color: '#f0f0ec' }}>New nomination</span>
              <button onClick={() => setModalOpen(false)} style={{
                background: '#2c2c2a', border: '0.5px solid #3a3a38',
                borderRadius: 9, width: 34, height: 34,
                color: '#a0a09a', fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              {[
                { label: 'PROJECT NAME', id: 'project', placeholder: 'e.g. Portal Redesign' },
                { label: 'NOMINEE NAME', id: 'nominee', placeholder: 'e.g. Riya Sharma' },
                { label: 'NOMINATED BY', id: 'by', placeholder: 'Team lead name' },
              ].map(f => (
                <div key={f.id}>
                  <div style={{ fontSize: 11, color: '#6a6a65', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>{f.label}</div>
                  <input
                    value={(form as any)[f.id]}
                    onChange={e => setForm({ ...form, [f.id]: e.target.value })}
                    placeholder={f.placeholder}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 10,
                      background: '#141412', border: '0.5px solid #3a3a38',
                      color: '#f0f0ec', fontSize: 14,
                    }}
                  />
                </div>
              ))}
              <div>
                <div style={{ fontSize: 11, color: '#6a6a65', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>CATEGORY</div>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10,
                    background: '#141412', border: '0.5px solid #3a3a38',
                    color: form.category ? '#f0f0ec' : '#555550', fontSize: 14,
                  }}>
                  <option value="">-- select --</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: '#6a6a65', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>CONTEXT / APPRECIATION NOTE</div>
              <textarea
                value={form.context}
                onChange={e => setForm({ ...form, context: e.target.value })}
                placeholder="Why does this person deserve recognition?"
                rows={4}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  background: '#141412', border: '0.5px solid #3a3a38',
                  color: '#f0f0ec', fontSize: 14, resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {formError && <p style={{ fontSize: 12, color: '#e05252', marginBottom: 8 }}>{formError}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button onClick={() => { setModalOpen(false); setFormError(''); }} style={{
                padding: '10px 20px', borderRadius: 10,
                border: '0.5px solid #3a3a38', background: 'transparent',
                color: '#a0a09a', fontSize: 14, cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={submitNom} style={{
                padding: '10px 20px', borderRadius: 10,
                border: '0.5px solid #3a3a38', background: '#2c2c2a',
                color: '#f0f0ec', fontSize: 14, fontWeight: 500, cursor: 'pointer',
              }}>Submit nomination</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
