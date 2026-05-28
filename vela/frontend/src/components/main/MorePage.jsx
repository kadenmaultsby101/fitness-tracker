import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { API, BACKEND_AVAILABLE } from '../../lib/apiUrl';
import { money } from './format';
import PlaidLinkButton from '../PlaidLinkButton';
import BankLogo from './BankLogo';
import FeedbackCard from './FeedbackCard';
import UpgradeCard from './UpgradeCard';
import { groupAccounts } from './accountGroups';
import { isPro, PAYWALL_ENABLED } from '../../lib/plan';

const SETTINGS_KEYS = [
  { col: 'notify_transactions',   lbl: 'Transaction Alerts',   sub: 'Notify on every transaction' },
  { col: 'notify_weekly_summary', lbl: 'Weekly Summary',       sub: 'Sunday recap from Sage' },
  { col: 'notify_ai_insights',    lbl: 'AI Insights',          sub: 'Push when Sage spots something' },
  { col: 'two_factor_enabled',    lbl: 'Two-Factor Auth',      sub: 'Extra protection on sign-in' },
];

export default function MorePage({ data, session, onSignOut, onOpenAccount }) {
  const { profile, accounts, plaidItems = [], loading, error } = data;
  const itemsById = Object.fromEntries(plaidItems.map((it) => [it.id, it]));
  // 'grouped' = all groups on one page with section headers.
  // 'tabs' = one group at a time, switchable via chips.
  const [acctView, setAcctView] = useState('grouped');
  const [activeGroup, setActiveGroup] = useState(null);
  const plaidConnectedCount = accounts.filter(
    (a) => !String(a.plaid_account_id || '').startsWith('manual_')
  ).length;
  const [busyKey, setBusyKey] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [toggles, setToggles] = useState({
    notify_transactions: profile?.notify_transactions ?? true,
    notify_weekly_summary: profile?.notify_weekly_summary ?? true,
    notify_ai_insights: profile?.notify_ai_insights ?? true,
    two_factor_enabled: profile?.two_factor_enabled ?? false,
  });

  // Account-delete state machine: 'idle' | 'confirm' | 'deleting'
  const [deleteState, setDeleteState] = useState('idle');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const [portalBusy, setPortalBusy] = useState(false);
  const openBillingPortal = async () => {
    if (portalBusy) return;
    setPortalBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch(`${API}/api/stripe/portal`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.url) window.location.href = body.url;
      else setPortalBusy(false);
    } catch {
      setPortalBusy(false);
    }
  };

  const initiateDelete = () => {
    setDeleteState('confirm');
    setDeleteConfirmText('');
    setDeleteError('');
  };
  const cancelDelete = () => {
    setDeleteState('idle');
    setDeleteConfirmText('');
    setDeleteError('');
  };
  const confirmDelete = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      return setDeleteError('Type DELETE exactly to confirm.');
    }
    setDeleteState('deleting');
    setDeleteError('');
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error('Not signed in.');

      const res = await fetch(`${API}/api/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);

      // Clean up local "I'm onboarded" flag for the deleted user so the
      // next sign-up from this browser doesn't skip onboarding.
      try {
        const userId = sess.session?.user?.id;
        if (userId) localStorage.removeItem(`vela:onboarded:${userId}`);
      } catch { /* ignore */ }

      // Sign out (clears the auth token from localStorage) then reload
      // back to the auth screen.
      await supabase.auth.signOut();
      window.location.replace('/');
    } catch (err) {
      console.error('[account-delete]', err);
      setDeleteError(err?.message || 'Delete failed. Try again.');
      setDeleteState('confirm');
    }
  };

  // Sync local toggle state if the profile finishes loading after mount,
  // or refreshes from elsewhere in the app.
  useEffect(() => {
    if (!profile) return;
    setToggles({
      notify_transactions:   profile.notify_transactions   ?? true,
      notify_weekly_summary: profile.notify_weekly_summary ?? true,
      notify_ai_insights:    profile.notify_ai_insights    ?? true,
      two_factor_enabled:    profile.two_factor_enabled    ?? false,
    });
  }, [profile]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90000);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch(`${API}/api/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      const base = `Synced ${body.items} item${body.items === 1 ? '' : 's'} · ${body.new_transactions} new txn${body.new_transactions === 1 ? '' : 's'}`;
      const pendingNote = body.pending?.length
        ? ` · ${body.pending.join(', ')} still warming up (Plaid takes 1-30 min for new credit cards)`
        : '';
      setSyncMsg(base + pendingNote);
      data.refresh();
    } catch (e) {
      const msg = e?.name === 'AbortError'
        ? 'Sync timed out (90s). Plaid may be slow — try again.'
        : `Sync failed: ${e.message}`;
      setSyncMsg(msg);
    } finally {
      clearTimeout(timer);
      setSyncing(false);
      setTimeout(() => setSyncMsg(''), 8000);
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

      {PAYWALL_ENABLED && !isPro(profile) && <UpgradeCard />}
      {PAYWALL_ENABLED && isPro(profile) && (
        <div className="card">
          <div className="ctitle">Vela Pro</div>
          <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.6, marginBottom: 12 }}>
            You're on <strong style={{ color: 'var(--t1)' }}>Pro</strong> — unlimited Sage + proactive insights. Thank you.
          </div>
          <button type="button" className="bsec" style={{ width: '100%' }} onClick={openBillingPortal} disabled={portalBusy}>
            {portalBusy ? 'Opening…' : 'Manage subscription'}
          </button>
        </div>
      )}

      <div className="card">
        <div className="ctitle">
          Connected Accounts ({plaidConnectedCount} connected)
        </div>
        {loading ? (
          <div style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--t3)', padding: '4px 0' }}>
            Loading accounts…
          </div>
        ) : error ? (
          <>
            <div className="merr" style={{ marginBottom: 10 }}>
              Couldn't load accounts: {error}
            </div>
            <button
              type="button"
              className="bsec"
              style={{ width: '100%' }}
              onClick={() => data.refresh()}
            >
              Retry
            </button>
          </>
        ) : accounts.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.7, padding: '4px 0' }}>
            No banks connected yet — use the button below.
          </div>
        ) : (() => {
          const grouped = groupAccounts(accounts);
          const renderRow = (a) => {
            const isDebt = a.type === 'credit' || a.type === 'loan';
            const bal = Number(a.balance_current) || 0;
            const item = itemsById[a.plaid_item_id];
            return (
              <div
                key={a.id}
                className="sr"
                onClick={() => onOpenAccount?.(a)}
                role="button"
                tabIndex={0}
                style={{ alignItems: 'center', gap: 12, cursor: onOpenAccount ? 'pointer' : 'default' }}
              >
                <BankLogo item={item} size={32} fallbackName={a.name} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="sr-l">{a.name}{a.mask ? ` ··${a.mask}` : ''}</div>
                  <div className="sr-s">{item?.institution_name || a.subtype || a.type}</div>
                </div>
                <div style={{
                  fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 300,
                  color: isDebt ? 'var(--red)' : undefined,
                }}>
                  {isDebt ? '−' : ''}{money(bal)}
                </div>
              </div>
            );
          };

          const sectionHeader = (g, subtotal, isDebt) => (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              marginTop: 14, marginBottom: 4,
              fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--t3)',
            }}>
              <span>{g}</span>
              <span style={{ color: isDebt ? 'var(--red)' : 'var(--t2)', fontVariantNumeric: 'tabular-nums' }}>
                {isDebt ? '−' : ''}{money(Math.abs(subtotal))}
              </span>
            </div>
          );

          // Tabs view: chips to pick one group.
          if (acctView === 'tabs' && grouped.length > 1) {
            const current = grouped.find((s) => s.group === activeGroup) || grouped[0];
            return (
              <>
                {viewToggle(acctView, setAcctView)}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '4px 0 10px' }}>
                  {grouped.map((s) => (
                    <button
                      key={s.group}
                      type="button"
                      onClick={() => setActiveGroup(s.group)}
                      className={`chip ${current.group === s.group ? '' : ''}`}
                      style={{
                        fontSize: 9, letterSpacing: 1, padding: '6px 10px',
                        background: current.group === s.group ? 'var(--t1)' : 'transparent',
                        color: current.group === s.group ? 'var(--bg)' : 'var(--t2)',
                        border: '1px solid var(--b2)', borderRadius: 20, cursor: 'pointer',
                        textTransform: 'uppercase',
                      }}
                    >
                      {s.group} ({s.accounts.length})
                    </button>
                  ))}
                </div>
                {sectionHeader(current.group, current.subtotal, current.isDebt)}
                {current.accounts.map(renderRow)}
              </>
            );
          }

          // Grouped view: all sections stacked.
          return (
            <>
              {grouped.length > 1 && viewToggle(acctView, setAcctView)}
              {grouped.map((s) => (
                <div key={s.group}>
                  {sectionHeader(s.group, s.subtotal, s.isDebt)}
                  {s.accounts.map(renderRow)}
                </div>
              ))}
            </>
          );
        })()}

        {(() => {
          const accountedItemIds = new Set(accounts.map((a) => a.plaid_item_id).filter(Boolean));
          const ghostItems = plaidItems.filter((it) => !accountedItemIds.has(it.id));
          if (ghostItems.length === 0) return null;
          return (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--b1)' }}>
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 8 }}>
                Linked, no accounts yet
              </div>
              {ghostItems.map((it) => (
                <div key={it.id} className="sr" style={{ alignItems: 'center', gap: 12 }}>
                  <BankLogo item={it} size={32} fallbackName={it.institution_name} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="sr-l">{it.institution_name}</div>
                    <div className="sr-s">Plaid couldn't return accounts. Hit Sync to retry — investment-only institutions may need a product upgrade.</div>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      <div className="card">
        <div className="ctitle">
          {plaidConnectedCount > 0 ? 'Connect another bank' : 'Connect a bank'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.7, marginBottom: 12 }}>
          {BACKEND_AVAILABLE
            ? <>Via Plaid — <strong style={{ color: 'var(--t1)' }}>read-only</strong>, never stores credentials. Picks up balances and transactions automatically.</>
            : <>Plaid sync activates once the backend is deployed. Log accounts and transactions manually in the meantime — tap <strong style={{ color: 'var(--t1)' }}>+</strong> on Home.</>}
        </div>
        {BACKEND_AVAILABLE ? (
          <>
            <PlaidLinkButton onConnected={() => {
              data.refresh();
              // Plaid items occasionally need a moment after exchange to fully
              // expose accounts via accountsGet. Kick a second refresh + a
              // forced sync after a short delay so the user doesn't have to
              // manually pull-to-refresh.
              setTimeout(() => {
                data.refresh();
                handleSync();
              }, 5000);
            }} />
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

      <FeedbackCard session={session} />

      <div className="card" style={{ borderColor: 'rgba(235,159,159,0.25)' }}>
        <div className="ctitle" style={{ color: 'var(--red)' }}>Danger Zone</div>

        {deleteState === 'idle' && (
          <>
            <div style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.7, marginBottom: 14 }}>
              Deleting your account is <strong style={{ color: 'var(--red)' }}>permanent</strong>.
              Every account, transaction, goal, budget, and chat message tied
              to <strong style={{ color: 'var(--t1)' }}>{session?.user?.email}</strong> will be
              removed from Vela's database. This cannot be undone.
            </div>
            <button type="button" className="bdel" style={{ width: '100%' }} onClick={initiateDelete}>
              Delete account permanently
            </button>
          </>
        )}

        {deleteState === 'confirm' && (
          <>
            <div className="mnote" style={{ borderColor: 'rgba(235,159,159,0.30)', marginBottom: 12 }}>
              Type <strong>DELETE</strong> below to confirm. No undo, no recovery.
            </div>
            <input
              className="finp"
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              autoFocus
              style={{ marginBottom: 6 }}
            />
            {deleteError && <div className="merr" style={{ marginTop: 8 }}>{deleteError}</div>}
            <div className="mbtns">
              <button type="button" className="bsec" onClick={cancelDelete}>Cancel</button>
              <button
                type="button"
                className="bdel"
                style={{ flex: 1, marginTop: 0 }}
                onClick={confirmDelete}
              >
                Permanently delete
              </button>
            </div>
          </>
        )}

        {deleteState === 'deleting' && (
          <div style={{
            fontSize: 11,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: 'var(--t3)',
            textAlign: 'center',
            padding: '10px 0',
          }}>
            Deleting your account…
          </div>
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

// Small toggle between grouped-all-on-one-page and one-group-tabs views.
function viewToggle(acctView, setAcctView) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
      <button
        type="button"
        onClick={() => setAcctView('grouped')}
        style={{
          fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase',
          padding: '4px 9px', borderRadius: 20, cursor: 'pointer',
          border: '1px solid var(--b2)',
          background: acctView === 'grouped' ? 'var(--t1)' : 'transparent',
          color: acctView === 'grouped' ? 'var(--bg)' : 'var(--t3)',
        }}
      >
        All groups
      </button>
      <button
        type="button"
        onClick={() => setAcctView('tabs')}
        style={{
          fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase',
          padding: '4px 9px', borderRadius: 20, cursor: 'pointer',
          border: '1px solid var(--b2)',
          background: acctView === 'tabs' ? 'var(--t1)' : 'transparent',
          color: acctView === 'tabs' ? 'var(--bg)' : 'var(--t3)',
        }}
      >
        By type
      </button>
    </div>
  );
}
