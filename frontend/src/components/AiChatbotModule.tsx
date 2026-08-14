'use client';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { api, CHATBOT_BASE, getToken } from '@/lib/api';

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

/* ── Static content ──────────────────────────────────────────────────── */
const QUICK_QUESTIONS = [
  'Can I get a warning for misconduct?',
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

type Msg = { role: 'user' | 'bot'; text: string };
type Session = { id: string; title: string; updated_at: string };

function formatDate(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

/* ── Shared styles (project design system) ───────────────────────────── */
const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 };
const primaryBtn: React.CSSProperties = { height: 38, padding: '0 18px', borderRadius: 8, background: 'var(--accent)', border: '1px solid var(--accent-hover)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' };

function TypingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: `chatDot 1.2s ease-in-out ${i * 0.18}s infinite` }} />
      ))}
    </span>
  );
}

export function AiChatbotModule({ user }: { user: any }) {
  const [userInp, setUserInp] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState(0);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const session_id = useRef<string>(safeRandomUUID());

  useEffect(() => { fetchSessions(); }, []);

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);
      const data = await api.getChatSessions();
      if (data.success) setSessions(data.sessions);
    } catch (e) { /* service may be down — leave empty */ }
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
  }, []);

  const loadSession = useCallback(async (s: Session) => {
    try {
      const data = await api.getChatSession(s.id);
      if (data.success) {
        session_id.current = s.id;
        setMessages(data.session.messages);
      }
    } catch (e) { /* noop */ }
  }, []);

  const handleDelete = useCallback(async (e: React.MouseEvent, sid: string) => {
    e.stopPropagation();
    try {
      await api.deleteChatSession(sid);
      setSessions(prev => prev.filter(s => s.id !== sid));
      if (session_id.current === sid) startNewChat();
    } catch (e) { /* noop */ }
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
      const token = getToken();
      const response = await fetch(`${CHATBOT_BASE}/askbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
        if (!botAdded) {
          setLoading(false);
          setMessages(prev => [...prev, { role: 'bot', text: accumulated }]);
          botAdded = true;
        } else {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { ...updated[updated.length - 1], text: accumulated };
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

  return (
    <div style={{ maxWidth: 1100 }}>
      <style>{`@keyframes chatDot { 0%,80%,100% { opacity:.3; transform:scale(.7);} 40% { opacity:1; transform:scale(1);} }`}</style>

      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>AI Assistant</h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>Ask about company policies — answers are grounded in official policy documents.</p>

      <div style={{ display: 'flex', gap: 16, height: 620 }}>
        {/* ── Sessions panel ── */}
        <div style={{ ...card, width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: 12, borderBottom: '1px solid var(--divider)' }}>
            <button onClick={startNewChat} style={{ ...primaryBtn, width: '100%', height: 34, fontSize: 12.5 }}>+ New conversation</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
            {sessionsLoading && <p style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '16px 0' }}>Loading…</p>}
            {!sessionsLoading && sessions.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '16px 6px', lineHeight: 1.5 }}>No conversations yet.<br />Ask a question to start.</p>
            )}
            {Object.entries(grouped).map(([label, group]) => (
              <div key={label}>
                <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-faint)', padding: '10px 6px 4px', margin: 0 }}>{label}</p>
                {group.map(s => {
                  const active = s.id === session_id.current;
                  return (
                    <div key={s.id} onClick={() => loadSession(s)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 8px', borderRadius: 8, cursor: 'pointer', marginBottom: 2, background: active ? 'var(--accent-soft)' : 'transparent', border: `1px solid ${active ? 'var(--b-blue-bd)' : 'transparent'}` }}>
                      <span style={{ flex: 1, fontSize: 12.5, color: active ? 'var(--accent)' : 'var(--text-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</span>
                      <button onClick={e => handleDelete(e, s.id)} title="Delete" style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 12, padding: 2, lineHeight: 1 }}>✕</button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* ── Chat column ── */}
        <div style={{ ...card, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--surface-2)' }}>
            {messages.length === 0 && !loading && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <p style={{ fontSize: 13, color: 'var(--text-faint)', marginBottom: 4 }}>Ask a question to get started</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 420 }}>
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
                <div style={{ maxWidth: '80%', padding: '10px 14px', borderRadius: 14, fontSize: 13.5, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface)',
                  color: msg.role === 'user' ? '#fff' : 'var(--text)',
                  border: msg.role === 'user' ? 'none' : '1px solid var(--border)' }}>
                  {msg.text}
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

          {/* Input */}
          <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 8, background: 'var(--surface)' }}>
            <input
              type="text"
              placeholder="Ask something about company policy…"
              value={userInp}
              onChange={e => setUserInp(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !loading && userInp.trim()) askQuestion(); }}
              disabled={loading}
              autoComplete="off"
              style={{ flex: 1, height: 40, borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', padding: '0 14px', fontSize: 13, outline: 'none' }}
            />
            <button onClick={() => askQuestion()} disabled={loading || !userInp.trim()}
              style={{ ...primaryBtn, height: 40, width: 44, padding: 0, opacity: loading || !userInp.trim() ? 0.4 : 1 }} aria-label="Send">➤</button>
          </div>
        </div>
      </div>
    </div>
  );
}