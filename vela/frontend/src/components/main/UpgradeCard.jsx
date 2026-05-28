import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { API } from '../../lib/apiUrl';

// Vela Pro upsell. Monthly or annual Stripe checkout, plus a comp-code
// redeem box for testers (instant free Pro, no card). onRedeemed refreshes
// the app data so Pro unlocks immediately.
export default function UpgradeCard({ onRedeemed }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState('');

  const checkout = async (interval) => {
    if (busy) return;
    setBusy(interval);
    setError('');
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
    } catch (err) {
      setError(err.message || 'Could not start checkout.');
      setBusy('');
    }
  };

  const redeem = async () => {
    if (busy || !code.trim()) return;
    setBusy('code');
    setError('');
    setRedeemMsg('');
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
      setRedeemMsg('Unlocked — welcome to Pro.');
      onRedeemed?.();
    } catch (err) {
      setError(err.message || 'Could not redeem code.');
      setBusy('');
    }
  };

  return (
    <div className="card" style={{
      background: 'linear-gradient(150deg, rgba(139,147,255,0.16) 0%, var(--c1) 60%)',
      borderColor: 'rgba(139,147,255,0.30)',
    }}>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 500, letterSpacing: '-0.4px', marginBottom: 6 }}>
        Vela Pro
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.6, marginBottom: 14 }}>
        Unlimited Sage, proactive briefings, your Sunday recap, and deeper reports.
      </div>

      {error && <div className="merr" style={{ marginBottom: 10 }}>{error}</div>}
      {redeemMsg && (
        <div style={{ marginBottom: 10, fontSize: 11, letterSpacing: 1, color: 'var(--green)', textAlign: 'center' }}>
          {redeemMsg}
        </div>
      )}

      <button type="button" className="bpri" style={{ width: '100%', marginBottom: 8 }} onClick={() => checkout('annual')} disabled={!!busy}>
        {busy === 'annual' ? 'Opening…' : 'Annual — $79/yr (save 34%)'}
      </button>
      <button type="button" className="bsec" style={{ width: '100%' }} onClick={() => checkout('monthly')} disabled={!!busy}>
        {busy === 'monthly' ? 'Opening…' : 'Monthly — $9.99/mo'}
      </button>

      {!showCode ? (
        <button
          type="button"
          onClick={() => setShowCode(true)}
          style={{ background: 'none', border: 'none', color: 'var(--t2)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', padding: '14px 0 0', width: '100%' }}
        >
          Have an access code?
        </button>
      ) : (
        <div style={{ marginTop: 14 }}>
          <input
            className="finp"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Access code"
            autoFocus
            style={{ marginBottom: 8 }}
          />
          <button type="button" className="bsec" style={{ width: '100%' }} onClick={redeem} disabled={busy === 'code' || !code.trim()}>
            {busy === 'code' ? 'Redeeming…' : 'Redeem code'}
          </button>
        </div>
      )}
    </div>
  );
}
