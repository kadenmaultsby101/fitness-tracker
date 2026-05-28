import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { API } from '../../lib/apiUrl';
import { PRO_PRICE_LABEL } from '../../lib/plan';

// Vela Pro upsell. Shown to free users (only renders when the paywall is on,
// since isPro() is true for everyone while it's dormant). Starts Stripe
// Checkout on tap.
export default function UpgradeCard() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const upgrade = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch(`${API}/api/stripe/checkout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.url) throw new Error(body.error || 'Could not start checkout.');
      window.location.href = body.url;
    } catch (err) {
      setError(err.message || 'Could not start checkout.');
      setBusy(false);
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
        Unlimited Sage, proactive briefings, your Sunday recap, and deeper reports. <strong style={{ color: 'var(--t1)' }}>{PRO_PRICE_LABEL}</strong>.
      </div>
      {error && <div className="merr" style={{ marginBottom: 10 }}>{error}</div>}
      <button type="button" className="bpri" style={{ width: '100%' }} onClick={upgrade} disabled={busy}>
        {busy ? 'Opening checkout…' : 'Upgrade to Pro →'}
      </button>
    </div>
  );
}
