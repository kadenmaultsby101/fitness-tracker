import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { money } from './format';

const API = import.meta.env.VITE_API_URL || '';

const SUGGESTIONS = [
  'Where should I focus this month?',
  'Am I saving enough?',
  'How should I allocate my next paycheck?',
  'Where am I overspending?',
];

// Parse **bold** segments inline. Tight markdown rendering without a library.
function renderText(text) {
  if (!text) return null;
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
}

export default function SagePage({ data, session }) {
  const { profile, accounts, goals, derived } = data;
  const firstName = (profile?.name || session?.user?.user_metadata?.name || '').split(' ')[0] || 'there';
  const userInitial = firstName.charAt(0).toUpperCase();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState('');

  const scrollRef = useRef(null);
  const endRef = useRef(null);

  // Load conversation on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const userId = sess.session?.user?.id;
        if (!userId) {
          if (!cancelled) setLoadingHistory(false);
          return;
        }
        const { data: history, error } = await supabase
          .from('chat_messages')
          .select('id, role, content, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .limit(100);
        if (error) throw error;
        if (!cancelled) setMessages(history || []);
      } catch (err) {
        if (!cancelled) setHistoryError(err?.message || 'Could not load history.');
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-scroll on new messages / while sending.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const send = useCallback(async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;

    if (!API) {
      setMessages((m) => [
        ...m,
        { id: `local-u-${Date.now()}`, role: 'user', content: text },
        { id: `local-a-${Date.now()}`, role: 'assistant',
          content: 'I\'m not connected yet. Backend needs to be deployed before I can answer.' },
      ]);
      setInput('');
      return;
    }

    setInput('');
    setSending(true);

    const optimistic = { id: `local-u-${Date.now()}`, role: 'user', content: text };
    setMessages((m) => [...m, optimistic]);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error('Not signed in.');

      const historyPayload = messages.map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(`${API}/api/sage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text, history: historyPayload }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);

      setMessages((m) => [
        ...m,
        { id: `local-a-${Date.now()}`, role: 'assistant', content: body.reply },
      ]);
    } catch (err) {
      console.error('[vela] Sage send failed', err);
      setMessages((m) => [
        ...m,
        { id: `local-err-${Date.now()}`, role: 'assistant',
          content: `Hit an error: **${err.message}**. Try again — Render may be waking if idle.` },
      ]);
    } finally {
      setSending(false);
    }
  }, [input, messages, sending]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const empty = !loadingHistory && messages.length === 0 && !historyError;

  // Tailored intro text — uses the user's real data state.
  const introMessage = (() => {
    if (accounts.length === 0 && goals.length === 0) {
      return <>Add an account, log a couple transactions, and set a goal — then I'll coach you with <strong>real numbers</strong> from your data.</>;
    }
    const goalLine = goals.length ? <> and <strong>{goals.length} goal{goals.length === 1 ? '' : 's'}</strong></> : null;
    return (
      <>
        I'm watching <strong>{money(derived.netWorth)}</strong> across <strong>{accounts.length}</strong> {accounts.length === 1 ? 'account' : 'accounts'}{goalLine}. Tap a question below or ask me anything.
      </>
    );
  })();

  return (
    <>
      <div className="coach-hd">
        <div className="coach-av">✦</div>
        <div>
          <div className="coach-nm">Sage</div>
          <div className="coach-st">
            <span className="ai-dot" />
            {API ? 'Live · Powered by Claude' : 'Backend offline'}
          </div>
        </div>
      </div>

      <div className="chat-msgs" ref={scrollRef}>
        {loadingHistory ? (
          <div style={{
            color: 'var(--t3)', fontSize: 9, letterSpacing: 2,
            textTransform: 'uppercase', textAlign: 'center', padding: 24,
          }}>
            Loading conversation…
          </div>
        ) : historyError ? (
          <div className="merr">
            Could not load chat history: {historyError}
          </div>
        ) : empty ? (
          <>
            <div className="sage-hero">
              <div className="sage-hero-glyph">✦</div>
              <div className="sage-hero-title">Hey, {firstName}.</div>
              <div className="sage-hero-tag">Your AI financial coach</div>
              <div className="sage-hero-msg">{introMessage}</div>
            </div>

            <div className="sage-suggest-lbl">Try one of these</div>
            <div className="chips">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="chip"
                  onClick={() => send(s)}
                  disabled={sending}
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`msg ${m.role === 'user' ? 'u' : ''}`}>
              {m.role !== 'user' && <div className="mav ai">✦</div>}
              <div className="mbub">
                <div className="mfrom">{m.role === 'user' ? 'You' : 'Sage'}</div>
                <div className="mtxt">{renderText(m.content)}</div>
              </div>
              {m.role === 'user' && <div className="mav us">{userInitial}</div>}
            </div>
          ))
        )}
        {sending && (
          <div className="msg">
            <div className="mav ai">✦</div>
            <div className="mbub">
              <div className="mfrom">Sage</div>
              <div className="typing-wrap">
                <div className="td" />
                <div className="td" />
                <div className="td" />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="cin-wrap">
        <textarea
          className="cin"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={API ? 'Ask Sage anything…' : 'Backend not deployed yet'}
          disabled={sending || !API}
          rows={1}
        />
        <button
          type="button"
          className="csend"
          onClick={() => send()}
          disabled={sending || !input.trim() || !API}
          aria-label="Send"
        >
          →
        </button>
      </div>
    </>
  );
}
