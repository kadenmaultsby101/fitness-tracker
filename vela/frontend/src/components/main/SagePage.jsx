import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { money } from './format';

const API = import.meta.env.VITE_API_URL || '';

const SUGGESTIONS = [
  'Where should I focus this month?',
  'Am I saving enough?',
  'How should I allocate my next paycheck?',
  'Where am I overspending?',
  'What\'s the smartest next move with my money?',
];

// Parse **bold** segments inline. Keeps the markdown rendering tight without
// pulling in a full library.
function renderText(text) {
  if (!text) return null;
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
}

export default function SagePage({ data, session }) {
  const { profile, accounts, transactions, goals, derived } = data;
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
          content: 'I\'m not connected yet. Backend needs to be deployed before I can answer. Tell Kaden to set `GEMINI_API_KEY` on Render.' },
      ]);
      setInput('');
      return;
    }

    setInput('');
    setSending(true);

    // Optimistic user bubble.
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
          content: `Hit an error: **${err.message}**. Try again in a sec — Render may be waking up if it's been idle.` },
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

  // Tailored welcome line based on the user's data state.
  const welcomeLine = (() => {
    if (accounts.length === 0 && transactions.length === 0 && goals.length === 0) {
      return `Hey ${firstName}. Add an account, log a couple transactions, set a goal or two — then come back and I'll have real numbers to coach you on.`;
    }
    const goalLine = goals.length ? ` and **${goals.length} goal${goals.length === 1 ? '' : 's'}** I'm tracking` : '';
    return `Hey ${firstName}. I can see **${money(derived.netWorth)}** across **${accounts.length}** ${accounts.length === 1 ? 'account' : 'accounts'}${goalLine}. What's on your mind?`;
  })();

  return (
    <>
      <div className="coach-hd">
        <div className="coach-av">✦</div>
        <div>
          <div className="coach-nm">Sage</div>
          <div className="coach-st">
            <span className="ai-dot" />
            {API ? 'Live' : 'Backend offline'}
          </div>
        </div>
      </div>

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

      <div className="chat-msgs" ref={scrollRef}>
        {loadingHistory ? (
          <div style={{
            color: 'var(--t3)', fontSize: 9, letterSpacing: 2,
            textTransform: 'uppercase', textAlign: 'center', padding: 24,
          }}>
            Loading conversation…
          </div>
        ) : historyError ? (
          <div className="merr" style={{ margin: 14 }}>
            Could not load chat history: {historyError}
          </div>
        ) : empty ? (
          <div className="msg">
            <div className="mav ai">✦</div>
            <div className="mbub">
              <div className="mfrom">Sage</div>
              <div className="mtxt">{renderText(welcomeLine)}</div>
            </div>
          </div>
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
          disabled={sending}
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
