import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { money } from './format';
import PlaidLinkButton from '../PlaidLinkButton';

const API = import.meta.env.VITE_API_URL || '';

const SETTINGS_KEYS = [
  { col: 'notify_transactions',   lbl: 'Transaction Alerts',   sub: 'Notify on every transaction' },
  { col: 'notify_weekly_summary', lbl: 'Weekly Summary',       sub: 'Sunday recap from Sage' },
  { col: 'notify_ai_insights',    lbl: 'AI Insights',          sub: 'Push when Sage spots something' },
  { col: 'two_factor_enabled',    lbl: 'Two-Factor Auth',      sub: 'Extra protection on sign-in' },
];

export default function MorePage({ data, session, onSignOut }) {
  const { profile, accounts } = data;
  const [busyKey, setBusyKey] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [toggles, setToggles] = useState({
    notify_transactions: profile?.notify_transactions ?? true,
    notify_weekly_summary: profile?.notify_weekly_summary ?? true,
    notify_ai_insights: profile?.notify_ai_insights ?? true,
    two_factor_enabled: profile?.two_factor_enabled ?? false,
  });

  const handleSync = async () => {
    if (!API) return setSyncMsg('Backend not deployed yet.');
    setSyncing(true);
    setSyncMsg('');
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch(`${API}/api/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setSyncMsg(`Synced ${body.items} item${body.items === 1 ? '' : 's'} · ${body.new_transactions} new txn${body.new_transactions === 1 ? '' : 's'}`);
      data.refresh();
    } catch (e) {
      setSyncMsg(`Sync failed: ${e.message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(''), 5000);
    }
  };

  const toggle = async (col) => {
    if (!session?.user?.id || busyKey) return;
    const next = !toggles[col];
    setToggles((t) => ({ ...t, [col]: next }));
    setBusyKey(col);
    const { error } = await supabase
      .from('profiles')
      .update({ [col]: next })
      .eq('id', session.user.id);
    if (error) {
      setToggles((t) => ({ ...t, [col]: !next }));
    }
    setBusyKey('');
  };

  const email = session?.user?.email || '—';
  const name = profile?.name || session?.user?.user_metadata?.name || '—';
  const monthlyIncome = profile?.monthly_income;

  return (
    <>
      <header className="ph">
        <div className="ph-l">
          <div className="ph-t">More</div>
          <div className="ph-s">Profile · Settings · Accounts</div>
        </div>
      </header>

      <div className="card">
        <div className="ctitle">Profile</div>
        <div className="sr">
          <div>
            <div className="sr-l">{name}</div>
            <div className="sr-s">{email}</div>
          </div>
        </div>
        {monthlyIncome != null && (
          <div className="sr">
            <div>
              <div className="sr-l">Monthly Income</div>
              <div className="sr-s">Used by Sage and budget suggestions</div>
            </div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 300 }}>
              {money(monthlyIncome)}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="ctitle">Connect a bank</div>
        <div style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.7, marginBottom: 12 }}>
          {API
            ? <>Via Plaid — <strong style={{ color: 'var(--t1)' }}>read-only</strong>, never stores credentials. Picks up balances and transactions automatically.</>
            : <>Plaid sync activates once the backend is deployed. Log accounts and transactions manually in the meantime — tap <strong style={{ color: 'var(--t1)' }}>+</strong> on Home.</>}
        </div>
        {API ? (
          <>
            <PlaidLinkButton onConnected={() => data.refresh()} />
            {accounts.length > 0 && (
              <button
                type="button"
                className="bsec"
                style={{ width: '100%', marginTop: 10 }}
                onClick={handleSync}
                disabled={syncing}
              >
                {syncing ? 'Syncing…' : 'Sync balances now'}
              </button>
            )}
            {syncMsg && (
              <div style={{
                marginTop: 10,
                fontSize: 10,
                letterSpacing: 1.5,
                color: syncMsg.startsWith('Sync failed') ? 'var(--red)' : 'var(--green)',
                textAlign: 'center',
              }}>
                {syncMsg}
              </div>
            )}
          </>
        ) : (
          <div className="bt-st off" style={{ display: 'inline-block' }}>
            Coming soon
          </div>
        )}
      </div>

      <div className="card">
        <div className="ctitle">Security</div>
        <div style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.8 }}>
          <strong style={{ color: 'var(--t1)' }}>Bank-grade.</strong> Connections via Plaid use TLS encryption and a read-only token — Vela never sees your bank password. Account data is scoped per user via row-level security in Postgres. Sign-in is hardened with email confirmation.
        </div>
      </div>

      <div className="card">
        <div className="ctitle">Settings</div>
        {SETTINGS_KEYS.map((s) => (
          <div key={s.col} className="sr">
            <div>
              <div className="sr-l">{s.lbl}</div>
              <div className="sr-s">{s.sub}</div>
            </div>
            <button
              type="button"
              className={`tog ${toggles[s.col] ? 'on' : ''}`}
              onClick={() => toggle(s.col)}
              disabled={busyKey === s.col}
              aria-pressed={!!toggles[s.col]}
              aria-label={s.lbl}
            >
              <span className="tok" />
            </button>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="ctitle">Connected Accounts ({accounts.length})</div>
        {accounts.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.7 }}>
            None yet.
          </div>
        ) : (
          accounts.map((a) => (
            <div key={a.id} className="sr">
              <div>
                <div className="sr-l">{a.name}{a.mask ? ` ··${a.mask}` : ''}</div>
                <div className="sr-s">{a.subtype || a.type}</div>
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 300 }}>
                {money(a.balance_current)}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ padding: '14px 14px 40px' }}>
        <button type="button" className="bsec" style={{ width: '100%' }} onClick={onSignOut}>
          Sign Out
        </button>
      </div>
    </>
  );
}
