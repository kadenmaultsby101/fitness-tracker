import { useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { API } from '../../lib/apiUrl';
import { money, moneyAbs, relDate, displayAccountName } from './format';
import { colorFor } from './categoryColors';
import BankLogo from './BankLogo';
import TxnIcon from './TxnIcon';

// Detail view for a single account: header (logo, name, balance) +
// every transaction we have for that account, oldest-first reversed.
// Hit from the Home accounts strip or More Connected Accounts list.
export default function AccountDetailPage({ data, accountId, onBack, onEditAccount, onEditTxn }) {
  const { accounts, plaidItems = [], transactions } = data;
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [disconnectError, setDisconnectError] = useState('');

  const account = accounts.find((a) => a.id === accountId);
  const itemsById = useMemo(
    () => Object.fromEntries(plaidItems.map((it) => [it.id, it])),
    [plaidItems]
  );

  const txns = useMemo(
    () => transactions
      .filter((t) => t.account_id === accountId)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, accountId]
  );

  if (!account) {
    return (
      <>
        <header className="ph">
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--t1)',
              fontFamily: 'var(--mono)',
              fontSize: 11,
              letterSpacing: 2,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ← BACK
          </button>
        </header>
        <div className="empty">
          <div className="empty-title">Account not found</div>
          It may have been disconnected. Head back to Home.
        </div>
      </>
    );
  }

  const item = itemsById[account.plaid_item_id];
  const accent = item?.institution_color;
  const isDebt = account.type === 'credit' || account.type === 'loan';
  const bal = Number(account.balance_current) || 0;

  // Quick summaries this month, computed locally.
  const now = new Date();
  const start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().slice(0, 10);
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1)).toISOString().slice(0, 10);
  let monthSpent = 0;
  let monthIn = 0;
  for (const t of txns) {
    if (t.date < start || t.date >= end) continue;
    const amt = Number(t.amount) || 0;
    if (amt > 0) monthSpent += amt;
    else monthIn += Math.abs(amt);
  }

  const isManual = String(account.plaid_account_id || '').startsWith('manual_');
  const sameInstitutionCount = accounts.filter((a) => a.plaid_item_id === account.plaid_item_id).length;

  const disconnect = async () => {
    setDisconnecting(true);
    setDisconnectError('');
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error('Not signed in.');
      const res = await fetch(`${API}/api/plaid/remove-item`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: account.plaid_item_id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      data.refresh();
      onBack();
    } catch (err) {
      setDisconnectError(err?.message || 'Could not disconnect. Try again.');
      setDisconnecting(false);
    }
  };

  return (
    <>
      <header className="ph">
        <div className="ph-l">
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--t2)',
              fontFamily: 'var(--mono)',
              fontSize: 9,
              letterSpacing: 2,
              cursor: 'pointer',
              padding: 0,
              marginBottom: 4,
            }}
          >
            ← HOME
          </button>
          <div className="ph-t" style={{ fontSize: 32 }}>{displayAccountName(account)}</div>
          <div className="ph-s">
            {item?.institution_name || account.subtype || account.type}
            {account.mask ? ` · ··${account.mask}` : ''}
          </div>
        </div>
      </header>

      <div className="nw" style={{ borderTop: accent ? `2px solid ${accent}` : undefined }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 }}>
          <BankLogo item={item} size={36} fallbackName={account.name} />
          <div style={{ flex: 1 }}>
            <div className="nw-lbl">{isDebt ? 'Amount owed' : 'Balance'}</div>
            <div className="nw-amt" style={{ fontSize: 38, color: isDebt ? 'var(--red)' : undefined }}>
              {isDebt ? '−' : ''}{money(bal)}
            </div>
          </div>
        </div>
        {(monthSpent > 0 || monthIn > 0) && (
          <div className="nw-row" style={{ marginTop: 10 }}>
            <span className="nw-pct">
              {monthSpent > 0 && <>↑ {money(monthSpent)} spent this month</>}
              {monthSpent > 0 && monthIn > 0 && ' · '}
              {monthIn > 0 && <span style={{ color: 'var(--green)' }}>↓ {money(monthIn)} in</span>}
            </span>
          </div>
        )}
      </div>

      <div style={{ padding: '0 14px 8px' }}>
        <button
          type="button"
          className="bsec"
          style={{ width: '100%' }}
          onClick={() => onEditAccount?.(account)}
        >
          Edit account name
        </button>
      </div>

      {!isManual && (
        <div style={{ padding: '0 14px 8px' }}>
          {disconnectError && <div className="merr" style={{ marginBottom: 10 }}>{disconnectError}</div>}
          {!confirmDisconnect ? (
            <button
              type="button"
              className="bsec"
              style={{ width: '100%', color: 'var(--red)', borderColor: 'rgba(235,159,159,0.30)' }}
              onClick={() => setConfirmDisconnect(true)}
            >
              Disconnect this bank
            </button>
          ) : (
            <div className="card" style={{ margin: 0, borderColor: 'rgba(235,159,159,0.30)' }}>
              <div style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.6, marginBottom: 12 }}>
                Disconnect <strong style={{ color: 'var(--t1)' }}>{item?.institution_name || displayAccountName(account)}</strong>?
                {sameInstitutionCount > 1 && <> This removes all <strong>{sameInstitutionCount}</strong> accounts from this bank.</>}
                {' '}Their transactions leave Vela. You can reconnect anytime.
              </div>
              <div className="mbtns">
                <button type="button" className="bsec" onClick={() => setConfirmDisconnect(false)} disabled={disconnecting}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="bdel"
                  style={{ flex: 1, marginTop: 0 }}
                  onClick={disconnect}
                  disabled={disconnecting}
                >
                  {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div className="ctitle">
          All Transactions ({txns.length})
        </div>
        {txns.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.7, padding: '4px 0' }}>
            No transactions on this account yet. If you just linked it, Plaid may still be backfilling — give it 10-30 minutes.
          </div>
        ) : (
          txns.map((t) => {
            const cat = t.category || 'Other';
            return (
              <div
                key={t.id}
                className="txn"
                onClick={() => onEditTxn?.(t)}
                role="button"
                tabIndex={0}
                style={{ cursor: onEditTxn ? 'pointer' : 'default' }}
              >
                <TxnIcon txn={t} />
                <div className="txn-bd">
                  <div className="txn-nm">{t.merchant_name || t.name}</div>
                  <div className="txn-ct" style={{ color: colorFor(cat) }}>{cat}</div>
                </div>
                <div className="txn-r">
                  <div className={`txn-amt ${t.amount < 0 ? 'pos' : ''}`}>
                    {t.amount < 0 ? '+' : '−'}{moneyAbs(t.amount)}
                  </div>
                  <div className="txn-dt">{relDate(t.date)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
