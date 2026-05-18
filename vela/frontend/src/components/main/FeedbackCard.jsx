import { useState } from 'react';
import { supabase } from '../../lib/supabase';

// Friends-and-family feedback inbox. Lives on More.
// Saves to the `feedback` table; Kaden reads via the Supabase Table Editor.
export default function FeedbackCard({ session }) {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!msg.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const { error: e } = await supabase.from('feedback').insert({
        user_id: session?.user?.id || null,
        user_email: session?.user?.email || null,
        message: msg.trim(),
        page: typeof window !== 'undefined' ? window.location.pathname : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 300) : null,
      });
      if (e) throw e;
      setDone(true);
      setMsg('');
      setTimeout(() => setDone(false), 6000);
    } catch (err) {
      setError(err?.message || 'Could not send. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="ctitle">Feedback</div>
      <div style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.7, marginBottom: 12 }}>
        Found a bug, hate how something looks, or have an idea? Drop a note — it goes straight to Vela.
      </div>
      <textarea
        className="cin"
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        placeholder="What's on your mind?"
        rows={3}
        style={{ width: '100%', minHeight: 80, resize: 'vertical', marginBottom: 10 }}
        disabled={busy}
      />
      {error && <div className="merr" style={{ marginBottom: 10 }}>{error}</div>}
      {done && (
        <div style={{
          marginBottom: 10,
          fontSize: 10,
          letterSpacing: 1.5,
          color: 'var(--green)',
          textAlign: 'center',
        }}>
          THANKS — GOT IT
        </div>
      )}
      <button
        type="button"
        className="bpri"
        style={{ width: '100%' }}
        onClick={submit}
        disabled={busy || !msg.trim()}
      >
        {busy ? 'Sending…' : 'Send feedback →'}
      </button>
    </div>
  );
}
