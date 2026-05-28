import { money } from './format';
import BankLogo from './BankLogo';
import { groupAccounts } from './accountGroups';

// Dedicated Accounts page: net worth + every account grouped by type with
// subtotals. Tap an account → detail. Mirrors the More-page grouping but as
// a first-class destination.
export default function AccountsPage({ data, onOpenAccount }) {
  const { accounts, plaidItems = [], derived, loading, error } = data;
  const itemsById = Object.fromEntries(plaidItems.map((it) => [it.id, it]));
  const groups = groupAccounts(accounts);

  return (
    <>
      <header className="ph">
        <div className="ph-l">
          <div className="ph-t">Accounts</div>
          <div className="ph-s">{accounts.length} connected</div>
        </div>
      </header>

      <div className="nw">
        <div className="nw-lbl">Net Worth</div>
        <div className="nw-amt">{money(derived.netWorth)}</div>
      </div>

      {loading ? (
        <div className="card"><div style={{ fontSize: 12, color: 'var(--t3)' }}>Loading accounts…</div></div>
      ) : error ? (
        <div className="card">
          <div className="merr" style={{ marginBottom: 10 }}>Couldn't load accounts: {error}</div>
          <button type="button" className="bsec" style={{ width: '100%' }} onClick={() => data.refresh()}>Retry</button>
        </div>
      ) : accounts.length === 0 ? (
        <div className="empty">
          <div className="empty-title">No accounts yet</div>
          Connect a bank from Settings — Plaid syncs balances automatically.
        </div>
      ) : (
        groups.map((section) => (
          <div className="card" key={section.group}>
            <div className="ctitle">
              <span>{section.group}</span>
              <span style={{ color: section.isDebt ? 'var(--red)' : 'var(--t2)', fontVariantNumeric: 'tabular-nums', textTransform: 'none', letterSpacing: 0 }}>
                {section.isDebt ? '−' : ''}{money(Math.abs(section.subtotal))}
              </span>
            </div>
            {section.accounts.map((a) => {
              const isDebt = a.type === 'credit' || a.type === 'loan';
              const bal = Number(a.balance_current) || 0;
              const item = itemsById[a.plaid_item_id];
              return (
                <div
                  key={a.id}
                  className="sr"
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenAccount?.(a)}
                  style={{ alignItems: 'center', gap: 12, cursor: 'pointer' }}
                >
                  <BankLogo item={item} size={32} fallbackName={a.name} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="sr-l">{a.name}{a.mask ? ` ··${a.mask}` : ''}</div>
                    <div className="sr-s">{item?.institution_name || a.subtype || a.type}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 300, color: isDebt ? 'var(--red)' : undefined }}>
                    {isDebt ? '−' : ''}{money(bal)}
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}
    </>
  );
}
