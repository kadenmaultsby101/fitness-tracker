import { money } from './format';
import BankLogo from './BankLogo';

// Investments page: brokerage / investment-type accounts and their balances.
// Plaid gives us balances (not holdings) under the Transactions product, so
// this is a balance-level view of invested assets.
export default function InvestmentsPage({ data, onOpenAccount }) {
  const { accounts, plaidItems = [], loading } = data;
  const itemsById = Object.fromEntries(plaidItems.map((it) => [it.id, it]));
  const invest = accounts.filter((a) => {
    const t = (a.type || '').toLowerCase();
    return t === 'investment' || t === 'brokerage';
  });
  const total = invest.reduce((s, a) => s + (Number(a.balance_current) || 0), 0);

  return (
    <>
      <header className="ph">
        <div className="ph-l">
          <div className="ph-t">Investments</div>
          <div className="ph-s">{invest.length} {invest.length === 1 ? 'account' : 'accounts'}</div>
        </div>
      </header>

      <div className="nw">
        <div className="nw-lbl">Invested</div>
        <div className="nw-amt">{money(total)}</div>
      </div>

      <div className="card">
        <div className="ctitle">Investment Accounts</div>
        {loading ? (
          <div style={{ fontSize: 12, color: 'var(--t3)' }}>Loading…</div>
        ) : invest.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.7, padding: '4px 0' }}>
            No investment accounts connected. Link a brokerage (Robinhood, Fidelity, Schwab…) from Settings → Connect a bank.
          </div>
        ) : (
          invest.map((a) => {
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
                  <div className="sr-s">{item?.institution_name || a.subtype || 'investment'}</div>
                </div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 300 }}>
                  {money(Number(a.balance_current) || 0)}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ padding: '0 18px 8px', fontSize: 10.5, color: 'var(--t3)', lineHeight: 1.6 }}>
        Balances only — Vela tracks the total value of each investment account toward your net worth. Holdings-level detail needs Plaid's Investments product (coming later).
      </div>
    </>
  );
}
