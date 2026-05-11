import { money, moneyAbs, emojiFor, relDate, displayAccountName } from './format';

export default function HomePage({ data, session, onAddTxn, onAddAccount, onGoTo }) {
  const { profile, accounts, transactions, derived, loading } = data;
  const firstName =
    (profile?.name || session?.user?.user_metadata?.name || '').split(' ')[0] ||
    'there';
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const recent = transactions.slice(0, 5);
  const hasAccounts = accounts.length > 0;
  const hasTxns = transactions.length > 0;

  // Build a quick insight from real data.
  let insight = null;
  if (hasTxns && derived.monthIncome > 0) {
    const rate = derived.savingsRate;
    if (rate >= 35) {
      insight = (
        <>You're saving <strong>{rate}%</strong> of income this month — that's elite. Sage will help you decide where the excess should go.</>
      );
    } else if (rate >= 15) {
      insight = (
        <>Saving <strong>{rate}%</strong> of income this month. Solid baseline. Push to 30%+ to accelerate your goals.</>
      );
    } else {
      insight = (
        <>Saving <strong>{rate}%</strong> this month. Below the 20% benchmark. Tap Sage for one specific change to make this week.</>
      );
    }
  } else if (hasAccounts && !hasTxns) {
    insight = (
      <>Accounts connected. Add or sync transactions so Sage can analyze your spending.</>
    );
  } else {
    insight = (
      <>Add an account or your first transaction below. Sage gets sharper the more real data it sees.</>
    );
  }

  return (
    <>
      <header className="ph">
        <div className="ph-l">
          <div className="ph-t">Vela</div>
          <div className="ph-s">Good day, {firstName} · {today}</div>
        </div>
        <button type="button" className="ph-action" onClick={onAddTxn} aria-label="Add transaction">
          +
        </button>
      </header>

      <div className="nw">
        <div className="nw-lbl">Total Net Worth</div>
        <div className="nw-amt">{money(derived.netWorth)}</div>
        <div className="nw-row">
          <span className="nw-pct">
            {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
            {derived.monthIncome > 0 && (
              <> · {derived.savingsRate}% saved this month</>
            )}
          </span>
        </div>
      </div>

      <div className="aib">
        <div className="ai-pill"><span className="ai-dot" />Sage · Live</div>
        <div className="ai-txt">{insight}</div>
        <button type="button" className="ai-more" onClick={() => onGoTo('coach')}>
          Ask Sage →
        </button>
      </div>

      <div className="slbl" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span>Accounts</span>
        <button type="button" className="ctitle-act" onClick={onAddAccount}>+ Add</button>
      </div>
      {!hasAccounts && !loading ? (
        <div className="empty">
          <div className="empty-title">No accounts yet</div>
          Add one manually now, or connect a bank later in **More**.
        </div>
      ) : (
        <div className="acc-scr">
          {accounts.map((a) => (
            <div key={a.id} className="am">
              <div className="am-inst">{a.subtype || a.type}</div>
              <div className="am-nm">
                {displayAccountName(a)}
                {a.mask ? ` ··${a.mask}` : ''}
              </div>
              <div className="am-bal">{money(a.balance_current)}</div>
            </div>
          ))}
          <div className="am add" onClick={onAddAccount} role="button">+</div>
        </div>
      )}

      <div className="card">
        <div className="ctitle">
          <span>Recent Transactions</span>
          <button type="button" className="ctitle-act" onClick={onAddTxn}>+ Add</button>
        </div>
        {recent.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.7, padding: '4px 0' }}>
            Nothing yet. Tap + to log income or an expense.
          </div>
        ) : (
          recent.map((t) => (
            <div key={t.id} className="txn">
              <div className="txn-em">{emojiFor(t.category, t.subcategory)}</div>
              <div className="txn-bd">
                <div className="txn-nm">{t.merchant_name || t.name}</div>
                <div className="txn-ct">{t.category || 'Other'}</div>
              </div>
              <div className="txn-r">
                <div className={`txn-amt ${t.amount < 0 ? 'pos' : ''}`}>
                  {t.amount < 0 ? '+' : '−'}{moneyAbs(t.amount)}
                </div>
                <div className="txn-dt">{relDate(t.date)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
