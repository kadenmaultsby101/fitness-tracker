import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { API } from '../lib/apiUrl';
import './AuthScreen.css';

// Full-screen gate shown to authenticated, onboarded users who aren't on a
// paid/trial/comp plan. No free tier — start a trial, subscribe, or redeem a
// comp code. Also offers sign-out.
export default function Paywall({ onUnlocked }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);

  const checkout = async (interval) => {
    if (busy) return;
    setBusy(interval); setError('');
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch(`${API}/api/stripe/checkout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.url) throw new Error(body.error || 'Could not start checkout.');
      window.location.href = body.url;
    } catch (err) { setError(err.message); setBusy(''); }
  };

  const redeem = async () => {
    if (busy || !code.trim()) return;
    setBusy('code'); setError('');
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch(`${API}/api/redeem-code`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not redeem code.');
      onUnlocked?.();
    } catch (err) { setError(err.message); setBusy(''); }
  };

  return (
    <div className="auth-screen">
      <div className="auth-brand">
        <div className="auth-wordmark">Vela</div>
        <div className="auth-tagline">Your AI financial advisor</div>
      </div>

      <div className="auth-card">
        <div style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 500, marginBottom: 8 }}>
          Start your 7-day free trial
        </div>
        <div className="auth-note" style={{ marginBottom: 16 }}>
          Unlimited Sage, proactive insights, full tracking. Free for 7 days,
          then <strong>$9.99/mo</strong> or <strong>$79/yr</strong>. Cancel anytime.
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button type="button" className="auth-submit" onClick={() => checkout('annual')} disabled={!!busy} style={{ marginBottom: 8 }}>
          {busy === 'annual' ? '…' : 'Start free trial — then $79/yr (save 34%)'}
        </button>
        <button
          type="button"
          onClick={() => checkout('monthly')}
          disabled={!!busy}
          style={{ width: '100%', padding: 13, background: 'transparent', border: '1px solid var(--b2)', borderRadius: 'var(--radius-sm,12px)', color: 'var(--t1)', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
        >
          {busy === 'monthly' ? '…' : 'Start free trial — then $9.99/mo'}
        </button>

        {!showCode ? (
          <button type="button" onClick={() => setShowCode(true)} style={{ background: 'none', border: 'none', color: 'var(--t2)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', padding: '16px 0 0', width: '100%' }}>
            Have an access code?
          </button>
        ) : (
          <div style={{ marginTop: 16 }}>
            <input className="auth-input" type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Access code" autoFocus />
            <button type="button" className="auth-submit" onClick={redeem} disabled={busy === 'code' || !code.trim()} style={{ marginTop: 8 }}>
              {busy === 'code' ? 'Redeeming…' : 'Redeem'}
            </button>
          </div>
        )}

        <button type="button" onClick={() => supabase.auth.signOut()} style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', padding: '20px 0 0', width: '100%' }}>
          Sign out
        </button>
      </div>
    </div>
  );
}
