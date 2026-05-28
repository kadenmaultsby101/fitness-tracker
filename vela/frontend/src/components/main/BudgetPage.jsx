import { useState } from 'react';
import { money, moneyAbs, relDate, displayAccountName } from './format';
import { colorFor } from './categoryColors';
import { deriveForMonth } from '../../hooks/useFinancialData';
import SpendingDonut from './SpendingDonut';
import WeeklyTrend from './WeeklyTrend';
import TxnIcon from './TxnIcon';
import MonthSwitcher from './MonthSwitcher';
import { SearchIcon } from './NavIcons';

export default function BudgetPage({ data, onEditBudgets, onAddTxn, onEditTxn, onOpenCategory, onOpenSearch }) {
  const { accounts, transactions, budgets, profile } = data;
  const accountsById = Object.fromEntries((accounts || []).map((a) => [a.id, a]));

  const [offset, setOffset] = useState(0);
  const view = deriveForMonth(accounts, transactions, offset);
  // Transactions within the viewed month, for the list + weekly trend.
  const monthTxns = transactions.filter((t) => t.date >= view.start && t.date < view.end);

  // Build merged rows: every budget row + any spending category not in budgets.
  const spendingCategories = new Set(Object.keys(view.byCategory));
  const budgetMap = Object.fromEntries(budgets.map((b) => [b.category, b]));
  const allCategories = Array.from(
    new Set([...budgets.map((b) => b.category), ...spendingCategories])
  );

  const rows = allCategories.map((cat) => {
    const limit = Number(budgetMap[cat]?.monthly_limit) || 0;
    const spent = Math.round(Number(view.byCategory[cat] || 0) * 100) / 100;
    return { cat, limit, spent };
  }).sort((a, b) => (b.limit + b.spent) - (a.limit + a.spent));

  const totalIncome = view.monthIncome || (offset === 0 ? profile?.monthly_income : 0) || 0;

  return (
    <>
      <header className="ph">
        <div className="ph-l">
          <div className="ph-t">Budget</div>
          <div className="ph-s">Spending & budgets by month</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="ph-action" onClick={onOpenSearch} aria-label="Search transactions"
            style={{ background: 'var(--c2)', color: 'var(--t1)' }}>
            <SearchIcon />
          </button>
          <button type="button" className="ph-action" onClick={onAddTxn} aria-label="Add transaction">+</button>
        </div>
      </header>

      <div className="card">
        <MonthSwitcher offset={offset} setOffset={setOffset} label={view.label} />
      </div>

      <div className="card">
        <div className="ctitle">Summary · {view.label}</div>
        <div className="bsum">
          <span className="bsl">Income</span>
          <span className="bsv pos">{money(totalIncome)}</span>
        </div>
        <div className="bsum">
          <span className="bsl">Spent</span>
          <span className="bsv">{money(view.monthSpent)}</span>
        </div>
        <div className="bsum">
          <span className="bsl">Invested</span>
          <span className="bsv gold">{money(view.monthInvested)}</span>
        </div>
        <div className="bsum">
          <span className="bsl">Remaining</span>
          <span className={`bsv ${view.monthRemaining < 0 ? 'neg' : 'pos'}`}>
            {money(view.monthRemaining)}
          </span>
        </div>
        <div className="bsum">
          <span className="bsl">Savings Rate</span>
          <span className="bsv">{view.savingsRate}%</span>
        </div>
      </div>

      <div className="card">
        <div className="ctitle">Spending by Category</div>
        <SpendingDonut
          byCategory={view.byCategory}
          monthSpent={view.monthSpent}
          onSelectCategory={onOpenCategory}
        />
      </div>

      <div className="card">
        <div className="ctitle">Weekly Spending</div>
        <WeeklyTrend transactions={offset === 0 ? transactions : monthTxns} />
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
            const accent = colorFor(r.cat);
            return (
              <div
                key={r.cat}
                className="br"
                role={onOpenCategory ? 'button' : undefined}
                tabIndex={onOpenCategory ? 0 : undefined}
                onClick={onOpenCategory ? () => onOpenCategory(r.cat) : undefined}
                style={{ cursor: onOpenCategory ? 'pointer' : 'default' }}
              >
                <div className="br-top">
                  <span className="br-cat" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: accent,
                      flexShrink: 0,
                    }} />
                    {r.cat}
                  </span>
                  <span className={`br-nums ${over ? 'neg' : ''}`}>
                    {money(r.spent)} {r.limit > 0 ? `/ ${money(r.limit)}` : ''}
                  </span>
                </div>
                <div className="br-track">
                  <div
                    className={`br-fill ${over ? 'over' : ''}`}
                    style={{
                      width: `${r.limit > 0 ? pct : 0}%`,
                      background: over ? undefined : accent,
                    }}
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
        {monthTxns.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.7 }}>
            Nothing logged in {view.label}.
          </div>
        ) : (
          monthTxns.slice(0, 80).map((t) => {
            const cat = t.category || 'Other';
            const acc = accountsById[t.account_id];
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
                  <div className="txn-ct">
                    <span style={{ color: colorFor(cat) }}>{cat}</span>
                    {acc && (
                      <span style={{ color: 'var(--t3)' }}>
                        {' · '}{displayAccountName(acc)}{acc.mask ? ` ··${acc.mask}` : ''}
                      </span>
                    )}
                  </div>
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
