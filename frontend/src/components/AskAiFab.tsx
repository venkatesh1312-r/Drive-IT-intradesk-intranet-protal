'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api, CHATBOT_BASE } from '@/lib/api';

// crypto.randomUUID() only exists in secure contexts (https:// or localhost).
// Over plain http:// on a LAN IP it's undefined even though `crypto` itself
// exists, so we check the method directly and fall back to a manual UUIDv4.
function safeRandomUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/* Persistent "Ask AI" launcher → right slide-out drawer with a live,
   policy-grounded chat. Compact single-column layout tuned for the drawer;
   conversation history lives behind a toggle in the header. */

const QUICK_QUESTIONS = [
  'How many leaves do I get in a year?',
  'What time do I need to be at office?',
  'Can I wear jeans to work?',
];
const LOADING_MESSAGES = [
  'Searching policy documents',
  'Fetching the latest details',
  'Almost there',
  'Getting your answer ready',
];

type Citation = { pd_id: number; page: number | null; section: string | null };
type Msg = { role: 'user' | 'bot'; text: string; citation?: Citation | null };
type Session = { id: string; title: string; updated_at: string };

// Must match CITATION_MARKER in chatbot-service/services/llm_services.js.
const CITATION_MARKER = '\u200b\u200bCITATION\u200b\u200b';

function splitCitation(raw: string): { text: string; citation: Citation | null } {
  const idx = raw.indexOf(CITATION_MARKER);
  if (idx === -1) return { text: raw, citation: null };
  const jsonPart = raw.slice(idx + CITATION_MARKER.length);
  let citation: Citation | null = null;
  try { citation = JSON.parse(jsonPart); } catch { /* still streaming in, ignore until complete */ }
  const text = raw.slice(0, idx);
  // Defensive: never show a section citation on the "not available"
  // fallback message, even if something upstream slipped through.
  if (text.includes('This information is not available in the company policy')) {
    return { text, citation: null };
  }
  return { text, citation };
}

const EMAIL_RE = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

// Renders message text exactly as before (including any literal markdown
// characters like **) — the ONLY change is the HR email becomes a
// clickable mailto: link, colored blue so it's visibly a link against
// either bubble background.
function renderMessageText(text: string, isUser: boolean): React.ReactNode[] {
  const parts = text.split(EMAIL_RE); // odd indices = email matches
  const linkColor = isUser ? '#bfdbfe' : '#2563eb'; // light blue on the dark user bubble, standard blue on the light bot bubble
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <a key={i} href={`mailto:${part}`} style={{ color: linkColor, textDecoration: 'underline', fontWeight: 600 }}>{part}</a>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

function formatDate(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function TypingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c3aed', display: 'inline-block', animation: `askDot 1.2s ease-in-out ${i * 0.18}s infinite` }} />
      ))}
    </span>
  );
}

export function AskAiFab() {
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [userInp, setUserInp] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState(0);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const session_id = useRef<string>(safeRandomUUID());

  /* Esc closes drawer (or the history panel first) */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (showHistory) setShowHistory(false);
      else setOpen(false);
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, showHistory]);

  /* Load history when the drawer first opens. Point 7: always land on a
     fresh "new chat" — never auto-resume whatever was open last time. */
  useEffect(() => {
    if (open) {
      fetchSessions();
      startNewChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the input focused: on open, and again once it's re-enabled after
  // a reply finishes. Only relevant while composing a new message — the
  // input is hidden entirely while browsing history (see below).
  useEffect(() => {
    if (open && !showHistory && !loading) inputRef.current?.focus();
  }, [open, showHistory, loading]);

  const viewCitation = useCallback(async (citation: Citation) => {
    try {
      const blobUrl = await api.viewPolicyDoc(citation.pd_id);
      const url = citation.page ? `${blobUrl}#page=${citation.page}` : blobUrl;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      /* document may have been deleted since the chunk was indexed — noop */
    }
  }, []);

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);
      const data = await api.getChatSessions();
      if (data.success) setSessions(data.sessions);
    } catch { /* service may be down — leave empty */ }
    finally { setSessionsLoading(false); }
  };

  useEffect(() => {
    if (!loading) return;
    setLoadingText(0);
    const t = setInterval(() => setLoadingText(p => (p + 1) % LOADING_MESSAGES.length), 1500);
    return () => clearInterval(t);
  }, [loading]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const startNewChat = useCallback(() => {
    session_id.current = safeRandomUUID();
    setMessages([]);
    setUserInp('');
    setShowHistory(false);
  }, []);

  const loadSession = useCallback(async (s: Session) => {
    try {
      const data = await api.getChatSession(s.id);
      if (data.success) {
        session_id.current = s.id;
        // Saved bot messages may carry the raw citation marker — split it
        // back into { text, citation } so old conversations render the
        // same clickable "View Section" button as live ones.
        const restored: Msg[] = (data.session.messages || []).map((m: Msg) =>
          m.role === 'bot' ? { ...m, ...splitCitation(m.text) } : m
        );
        setMessages(restored);
        setShowHistory(false);
      }
    } catch { /* noop */ }
  }, []);

  const handleDelete = useCallback(async (e: React.MouseEvent, sid: string) => {
    e.stopPropagation();
    try {
      await api.deleteChatSession(sid);
      setSessions(prev => prev.filter(s => s.id !== sid));
      if (session_id.current === sid) startNewChat();
    } catch { /* noop */ }
  }, [startNewChat]);

  const updateSidebarLocally = useCallback((question: string) => {
    const sid = session_id.current;
    setSessions(prev => {
      const existing = prev.find(s => s.id === sid);
      const title = existing?.title || (question.length > 50 ? question.slice(0, 50) + '…' : question);
      const entry: Session = { id: sid, title, updated_at: new Date().toISOString() };
      if (existing) return [entry, ...prev.filter(s => s.id !== sid)];
      return [entry, ...prev];
    });
  }, []);

  const askQuestion = async (overrideQuestion?: string) => {
    const question = (overrideQuestion || userInp).trim();
    if (!question || loading) return;
    setUserInp('');
    setMessages(prev => [...prev, { role: 'user', text: question }]);
    setLoading(true);
    try {
      const response = await fetch(`${CHATBOT_BASE}/askbot`, {
        method: 'POST',
        credentials: 'include', // httpOnly auth cookie, sent automatically
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, session_id: session_id.current }),
      });
      if (!response.ok || !response.body) {
        let msg = 'Something went wrong.';
        try { const j = await response.json(); msg = j.error || j.message || msg; } catch {}
        setLoading(false);
        setMessages(prev => [...prev, { role: 'bot', text: msg }]);
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '', botAdded = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const { text: displayText, citation } = splitCitation(accumulated);
        if (!botAdded) {
          setLoading(false);
          setMessages(prev => [...prev, { role: 'bot', text: displayText, citation }]);
          botAdded = true;
        } else {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { ...updated[updated.length - 1], text: displayText, citation };
            return updated;
          });
        }
      }
      updateSidebarLocally(question);
    } catch {
      setLoading(false);
      setMessages(prev => [...prev, { role: 'bot', text: 'Something went wrong. Is the chatbot service running?' }]);
    }
  };

  const grouped = sessions.reduce<Record<string, Session[]>>((acc, s) => {
    const label = formatDate(s.updated_at);
    (acc[label] ||= []).push(s);
    return acc;
  }, {});

  const iconBtn: React.CSSProperties = { background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' };

  return (
    <>
      <style>{`
        @keyframes askDot { 0%,80%,100% { opacity:.3; transform:scale(.7);} 40% { opacity:1; transform:scale(1);} }
        /* Selected text used to render in the browser's default blue,
           unreadable on the accent-colored user bubble and invisible on
           the plain bot bubble. Give each its own contrasting highlight. */
        .askai-bubble-user::selection, .askai-bubble-user *::selection { background: rgba(0,0,0,0.35); color: #ffffff; }
        .askai-bubble-bot::selection, .askai-bubble-bot *::selection { background: var(--accent-soft); color: var(--text); }
      `}</style>

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
          <div style={{ position: 'absolute', top: 0, right: 0, height: '100%', width: 'min(420px, 100%)', background: 'var(--surface-elevated)', boxShadow: '-8px 0 40px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--divider)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/></svg>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Ask AI</p>
                  <p style={{ fontSize: 11, color: 'var(--text-faint)' }}>Workplace assistant</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <button onClick={() => setShowHistory(v => !v)} title="History" aria-label="History"
                  style={{ ...iconBtn, color: showHistory ? 'var(--accent)' : 'var(--text-faint)' }}>
                  <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>
                </button>
                <button onClick={startNewChat} title="New conversation" aria-label="New conversation" style={iconBtn}>
                  <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>
                </button>
                <button onClick={() => setOpen(false)} title="Close" aria-label="Close" style={{ ...iconBtn, fontSize: 22, lineHeight: 1, padding: '2px 8px' }}>×</button>
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* History panel (overlay) */}
              {showHistory && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 5, background: 'var(--surface-elevated)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--divider)' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Recent conversations</p>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px' }}>
                    {sessionsLoading && <p style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '16px 0' }}>Loading…</p>}
                    {!sessionsLoading && sessions.length === 0 && (
                      <p style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '20px 6px', lineHeight: 1.5 }}>No conversations yet.<br />Ask a question to start.</p>
                    )}
                    {Object.entries(grouped).map(([label, group]) => (
                      <div key={label}>
                        <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-faint)', padding: '10px 6px 4px', margin: 0 }}>{label}</p>
                        {group.map(s => {
                          const active = s.id === session_id.current;
                          return (
                            <div key={s.id} onClick={() => loadSession(s)}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 2, background: active ? 'var(--accent-soft)' : 'transparent', border: `1px solid ${active ? 'var(--b-blue-bd)' : 'transparent'}` }}>
                              <span style={{ flex: 1, fontSize: 12.5, color: active ? 'var(--accent)' : 'var(--text-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</span>
                              <button onClick={e => handleDelete(e, s.id)} title="Delete" style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 12, padding: 2, lineHeight: 1 }}>✕</button>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--surface-2)' }}>
                {messages.length === 0 && !loading && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--b-violet-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.6"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/></svg>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-faint)', maxWidth: 260, lineHeight: 1.5 }}>Ask about company policies — answers are grounded in official policy documents.</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                      {QUICK_QUESTIONS.map((q, i) => (
                        <button key={i} onClick={() => askQuestion(q)}
                          style={{ textAlign: 'left', fontSize: 13, color: 'var(--accent)', background: 'var(--surface)', border: '1px solid var(--b-blue-bd)', borderRadius: 10, padding: '10px 14px', cursor: 'pointer' }}>{q}</button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <span style={{ fontSize: 10.5, color: 'var(--text-faint)', padding: '0 4px' }}>{msg.role === 'user' ? 'You' : 'Assistant'}</span>
                    <div
                      className={msg.role === 'user' ? 'askai-bubble-user' : 'askai-bubble-bot'}
                      style={{ maxWidth: '85%', padding: '10px 14px', borderRadius: 14, fontSize: 13.5, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface)',
                      color: msg.role === 'user' ? '#fff' : 'var(--text)',
                      border: msg.role === 'user' ? 'none' : '1px solid var(--border)' }}>
                      {renderMessageText(msg.text, msg.role === 'user')}
                      {msg.citation && (
                        <div style={{ marginTop: 8 }}>
                          <button
                            onClick={() => viewCitation(msg.citation as Citation)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-soft)', border: '1px solid var(--b-blue-bd)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}
                          >
                            📄 View {msg.citation.section || 'source policy'}{msg.citation.page ? ` · Page ${msg.citation.page}` : ''}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 10.5, color: 'var(--text-faint)', padding: '0 4px' }}>Assistant</span>
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <TypingDots />
                      <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{LOADING_MESSAGES[loadingText]}…</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input — hidden while browsing history (point 6): history is
                read-only; asking a question means starting a new chat. */}
            {!showHistory && (
              <div style={{ padding: '12px 14px', borderTop: '1px solid var(--divider)', display: 'flex', gap: 8, background: 'var(--surface)' }}>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ask something about company policy…"
                  value={userInp}
                  onChange={e => setUserInp(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !loading && userInp.trim()) askQuestion(); }}
                  disabled={loading}
                  autoFocus
                  autoComplete="off"
                  style={{ flex: 1, height: 40, borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', padding: '0 14px', fontSize: 13, outline: 'none' }}
                />
                <button onClick={() => askQuestion()} disabled={loading || !userInp.trim()} aria-label="Send"
                  style={{ height: 40, width: 44, padding: 0, borderRadius: 10, background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', border: 'none', color: 'white', fontSize: 15, cursor: 'pointer', opacity: loading || !userInp.trim() ? 0.4 : 1 }}>➤</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}