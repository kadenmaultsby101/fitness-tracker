import { money, moneyAbs, emojiFor, relDate } from './format';

export default function BudgetPage({ data, onEditBudgets, onAddTxn, onEditTxn }) {
  const { transactions, budgets, derived, profile } = data;
  const today = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Build merged rows: every budget row + any spending category not in budgets.
  const spendingCategories = new Set(
    transactions
      .filter((t) => Number(t.amount) > 0)
      .map((t) => t.category || 'Other')
  );
  const budgetMap = Object.fromEntries(budgets.map((b) => [b.category, b]));
  const allCategories = Array.from(
    new Set([...budgets.map((b) => b.category), ...spendingCategories])
  );

  const rows = allCategories.map((cat) => {
    const limit = Number(budgetMap[cat]?.monthly_limit) || 0;
    const spent = Math.round(Number(derived.byCategory[cat] || 0) * 100) / 100;
    return { cat, limit, spent };
  }).sort((a, b) => (b.limit + b.spent) - (a.limit + a.spent));

  const totalIncome = derived.monthIncome || profile?.monthly_income || 0;

  return (
    <>
      <header className="ph">
        <div className="ph-l">
          <div className="ph-t">Budget</div>
          <div className="ph-s">{today}</div>
        </div>
        <button type="button" className="ph-action" onClick={onAddTxn} aria-label="Add transaction">+</button>
      </header>

      <div className="card">
        <div className="ctitle">Monthly Summary</div>
        <div className="bsum">
          <span className="bsl">Income</span>
          <span className="bsv pos">{money(totalIncome)}</span>
        </div>
        <div className="bsum">
          <span className="bsl">Spent</span>
          <span className="bsv">{money(derived.monthSpent)}</span>
        </div>
        <div className="bsum">
          <span className="bsl">Invested</span>
          <span className="bsv gold">{money(derived.monthInvested)}</span>
        </div>
        <div className="bsum">
          <span className="bsl">Remaining</span>
          <span className={`bsv ${derived.monthRemaining < 0 ? 'neg' : 'pos'}`}>
            {money(derived.monthRemaining)}
          </span>
        </div>
        <div className="bsum">
          <span className="bsl">Savings Rate</span>
          <span className="bsv">{derived.savingsRate}%</span>
        </div>
      </div>

      <div className="card">
        <div className="ctitle">
          <span>Spending vs. Budget</span>
          {budgets.length > 0 && (
            <button type="button" className="ctitle-act" onClick={onEditBudgets}>Edit budget</button>
          )}
        </div>
        {budgets.length === 0 ? (
          <div style={{ padding: '8px 0 4px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 300, letterSpacing: '-.5px', color: 'var(--t1)', marginBottom: 6 }}>
              You haven't set a budget yet
            </div>
            <div style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.7, marginBottom: 18, padding: '0 6px' }}>
              Sage will track your spending against limits and call out anything that drifts.
              Takes about 60 seconds — Sage can pre-fill suggestions based on your income.
            </div>
            <button
              type="button"
              className="bpri"
              style={{ padding: '13px 26px', width: 'auto' }}
              onClick={onEditBudgets}
            >
              Build your budget →
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.7 }}>
            Budget set, but no spending logged yet this month.
          </div>
        ) : (
          rows.map((r) => {
            const pct = r.limit > 0
              ? Math.min(100, (r.spent / r.limit) * 100)
              : 0;
            const over = r.limit > 0 && r.spent > r.limit;
            return (
              <div key={r.cat} className="br">
                <div className="br-top">
                  <span className="br-cat">{r.cat}</span>
                  <span className={`br-nums ${over ? 'neg' : ''}`}>
                    {money(r.spent)} {r.limit > 0 ? `/ ${money(r.limit)}` : ''}
                  </span>
                </div>
                <div className="br-track">
                  <div
                    className={`br-fill ${over ? 'over' : ''}`}
                    style={{ width: `${r.limit > 0 ? pct : 0}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="card">
        <div className="ctitle">
          <span>All Transactions</span>
          <button type="button" className="ctitle-act" onClick={onAddTxn}>+ Add</button>
        </div>
        {transactions.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.7 }}>
            Nothing logged yet this month.
          </div>
        ) : (
          transactions.slice(0, 50).map((t) => (
            <div
              key={t.id}
              className="txn"
              onClick={() => onEditTxn?.(t)}
              role="button"
              tabIndex={0}
              style={{ cursor: onEditTxn ? 'pointer' : 'default' }}
            >
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
