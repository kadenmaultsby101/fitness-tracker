import { useState } from 'react';
import { supabase, signOut } from '../lib/supabase';
import { API } from '../lib/apiUrl';
import { SageIcon, InsightsIcon, AccountsIcon, RecurringIcon } from './main/NavIcons';

const VALUE_PROPS = [
  { Icon: SageIcon, title: 'Sage, your AI advisor', body: 'Ask anything — Sage answers with your real numbers, not generic tips.' },
  { Icon: InsightsIcon, title: 'Insights that come to you', body: 'Daily briefings + a Sunday recap. Vela watches so you don’t have to.' },
  { Icon: AccountsIcon, title: 'Every account, one place', body: 'Balances, transactions, net worth — synced automatically via Plaid.' },
  { Icon: RecurringIcon, title: 'Catch the leaks', body: 'Auto-detected subscriptions and where every dollar actually goes.' },
];

// Premium full-screen sell screen for onboarded users without a plan.
// Start the 7-day trial (annual highlighted), redeem a comp code, or sign out.
export default function Paywall({ session, onUnlocked }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [plan, setPlan] = useState('annual');
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);

  // Use the session passed down from App so we never call
  // supabase.auth.getSession() inside Paywall — a previous bug was that
  // getSession()'s internal token refresh could hang indefinitely after a
  // long-lived session, trapping the Redeem / Subscribe buttons on "…".
  const token = session?.access_token;

  const startTrial = async () => {
    if (busy) return;
    setBusy('checkout'); setError('');
    try {
      if (!token) throw new Error('You\'re signed out. Refresh the page.');
      const res = await fetch(`${API}/api/stripe/checkout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval: plan }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.url) throw new Error(body.error || 'Could not start checkout.');
      window.location.href = body.url;
    } catch (err) { setError(err.message); setBusy(''); }
  };

  const redeem = async () => {
    if (busy || !code.trim()) return;
    setBusy('code'); setError('');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      if (!token) throw new Error('You\'re signed out. Refresh the page.');
      const res = await fetch(`${API}/api/redeem-code`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
        signal: controller.signal,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Could not redeem code (HTTP ${res.status}).`);
      // Hard-reload to bypass the supabase auth client's deadlocked profile
      // refresh path. Same trick Stripe checkout uses on success — fresh page
      // mount = fresh client = clean profile fetch.
      window.location.replace('/');
      return;
    } catch (err) {
      const msg = err?.name === 'AbortError'
        ? 'Redeem took too long. Try again.'
        : (err?.message || 'Network error. Check your connection and try again.');
      setError(msg);
      setBusy('');
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const opt = (id, label, sub, badge) => {
    const active = plan === id;
    return (
      <button
        type="button"
        onClick={() => setPlan(id)}
        style={{
          flex: 1, textAlign: 'left', cursor: 'pointer',
          background: active ? 'var(--accent-soft)' : 'var(--c2)',
          border: `1.5px solid ${active ? 'var(--accent)' : 'var(--b1)'}`,
          borderRadius: 'var(--radius)', padding: '14px 14px', position: 'relative',
        }}
      >
        {badge && (
          <span style={{
            position: 'absolute', top: -9, right: 10, fontSize: 8, letterSpacing: 1,
            textTransform: 'uppercase', background: 'var(--accent)', color: '#0a0a0c',
            padding: '2px 7px', borderRadius: 20, fontWeight: 700,
          }}>{badge}</span>
        )}
        <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: active ? 'var(--accent)' : 'var(--t3)' }}>{label}</div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 500, marginTop: 4, color: 'var(--t1)' }}>{sub}</div>
      </button>
    );
  };

  return (
    <div style={{ height: '100vh', background: 'radial-gradient(120% 60% at 50% 0%, rgba(139,147,255,0.16) 0%, var(--bg) 55%)', overflowY: 'auto' }}>
      <div style={{ maxWidth: 460, margin: '0 auto', padding: '48px 22px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 44, fontWeight: 400, letterSpacing: -2 }}>Vela</div>
          <div style={{ fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--t3)', marginTop: 2 }}>Your AI Financial Advisor</div>
        </div>

        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 400, lineHeight: 1.15, letterSpacing: '-0.5px', textAlign: 'center', margin: '24px 0 28px' }}>
          Money, finally clear — with an advisor that does the thinking.
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 30 }}>
          {VALUE_PROPS.map((v) => (
            <div key={v.title} style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
              <span className="pw-ic" style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <v.Icon />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)' }}>{v.title}</div>
                <div style={{ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.5, marginTop: 1 }}>{v.body}</div>
              </div>
            </div>
          ))}
        </div>

        {error && <div className="merr" style={{ marginBottom: 12 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          {opt('annual', 'Annual', '$79/yr', 'Save 34%')}
          {opt('monthly', 'Monthly', '$9.99/mo', null)}
        </div>

        <button type="button" className="bpri" style={{ width: '100%', padding: 16, fontSize: 15 }} onClick={startTrial} disabled={!!busy}>
          {busy === 'checkout' ? 'Opening…' : 'Start 7-day free trial →'}
        </button>
        <div style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'center', marginTop: 10, lineHeight: 1.5 }}>
          Free for 7 days, then {plan === 'annual' ? '$79/yr' : '$9.99/mo'}. Cancel anytime.<br />
          Bank connections are read-only via Plaid — never sold, never shared.
        </div>

        <div style={{ borderTop: '1px solid var(--b1)', margin: '24px 0 0', paddingTop: 16, textAlign: 'center' }}>
          {!showCode ? (
            <button type="button" onClick={() => setShowCode(true)} style={{ background: 'none', border: 'none', color: 'var(--t2)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>
              Have an access code?
            </button>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="finp" type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Access code" autoFocus disabled={busy === 'code'} style={{ marginBottom: 0, flex: 1 }} />
                <button type="button" className="bsec" style={{ flex: 'none', width: 'auto', padding: '0 18px' }} onClick={redeem} disabled={busy === 'code' || !code.trim()}>
                  {busy === 'code' ? '…' : 'Redeem'}
                </button>
              </div>
              {error && busy !== 'checkout' && (
                <div className="merr" style={{ marginTop: 10, textAlign: 'left' }}>{error}</div>
              )}
            </>
          )}
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            {(() => {
              let forced = false;
              try { forced = localStorage.getItem('vela:forceFree') === '1'; } catch { /* ignore */ }
              if (!forced) return null;
              return (
                <button
                  type="button"
                  onClick={() => {
                    try { localStorage.removeItem('vela:forceFree'); } catch { /* ignore */ }
                    window.location.replace('/');
                  }}
                  style={{ background: 'none', border: '1px solid var(--b2)', borderRadius: 20, padding: '6px 14px', color: 'var(--t2)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer' }}
                >
                  Restore Pro view
                </button>
              );
            })()}
            <button type="button" onClick={signOut} style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer' }}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
