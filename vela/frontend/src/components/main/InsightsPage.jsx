import { useState, useMemo } from 'react';
import { money } from './format';
import { colorFor } from './categoryColors';
import { deriveForMonth } from '../../hooks/useFinancialData';
import MonthSwitcher from './MonthSwitcher';
import TxnIcon from './TxnIcon';

export default function InsightsPage({ data, onOpenCategory, onOpenMerchant }) {
  const { accounts, transactions } = data;
  const [offset, setOffset] = useState(0);

  const view = deriveForMonth(accounts, transactions, offset);
  const prev = deriveForMonth(accounts, transactions, offset - 1);

  const spent = view.monthSpent;
  const prevSpent = prev.monthSpent;
  const delta = spent - prevSpent;
  const pctChange = prevSpent > 0 ? Math.round((delta / prevSpent) * 100) : null;

  const topCategories = useMemo(
    () => Object.entries(view.byCategory)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6),
    [view.byCategory]
  );

  const topMerchants = useMemo(() => {
    const map = {};
    for (const t of transactions) {
      if (t.date < view.start || t.date >= view.end) continue;
      if (Number(t.amount) <= 0) continue;
      const name = (t.merchant_name || t.name || 'Unknown').trim();
      (map[name] ||= { name, total: 0, count: 0, sample: t });
      map[name].total += Number(t.amount);
      map[name].count += 1;
    }
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 6);
  }, [transactions, view.start, view.end]);

  const maxCat = topCategories.length ? topCategories[0][1] : 1;

  return (
    <>
      <header className="ph">
        <div className="ph-l">
          <div className="ph-t">Insights</div>
          <div className="ph-s">Where your money goes</div>
        </div>
      </header>

      <div className="card">
        <MonthSwitcher offset={offset} setOffset={setOffset} label={view.label} />
      </div>

      {/* Spend vs last month */}
      <div className="card">
        <div className="ctitle">Spending · {view.label}</div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 40, fontWeight: 500, letterSpacing: '-1px', lineHeight: 1 }}>
          {money(spent)}
        </div>
        {pctChange != null ? (
          <div style={{ fontSize: 12, marginTop: 8, color: delta <= 0 ? 'var(--green)' : 'var(--red)' }}>
            {delta <= 0 ? '↓' : '↑'} {money(Math.abs(delta))} ({Math.abs(pctChange)}%) vs {prev.label}
          </div>
        ) : (
          <div style={{ fontSize: 11, marginTop: 8, color: 'var(--t3)' }}>
            No prior-month data to compare yet.
          </div>
        )}
        <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--t3)' }}>Income</div>
            <div style={{ fontSize: 16, color: 'var(--green)', marginTop: 3 }}>{money(view.monthIncome)}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--t3)' }}>Net cash flow</div>
            <div style={{ fontSize: 16, color: view.monthRemaining >= 0 ? 'var(--green)' : 'var(--red)', marginTop: 3 }}>
              {view.monthRemaining >= 0 ? '+' : '−'}{money(Math.abs(view.monthRemaining))}
            </div>
          </div>
        </div>
      </div>

      {/* Top categories */}
      <div className="card">
        <div className="ctitle">Top Categories</div>
        {topCategories.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--t3)' }}>No spending in {view.label}.</div>
        ) : (
          topCategories.map(([cat, amt]) => (
            <div
              key={cat}
              role="button"
              tabIndex={0}
              onClick={() => onOpenCategory?.(cat)}
              style={{ cursor: 'pointer', marginBottom: 12 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: 'var(--t1)' }}>{cat}</span>
                <span style={{ fontSize: 12, color: 'var(--t2)', fontVariantNumeric: 'tabular-nums' }}>{money(amt)}</span>
              </div>
              <div style={{ height: 6, background: 'var(--c3)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${(amt / maxCat) * 100}%`, height: '100%', background: colorFor(cat), borderRadius: 3 }} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Top merchants */}
      <div className="card">
        <div className="ctitle">Top Merchants</div>
        {topMerchants.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--t3)' }}>No merchants in {view.label}.</div>
        ) : (
          topMerchants.map((m) => (
            <div
              key={m.name}
              className="txn"
              role="button"
              tabIndex={0}
              onClick={() => onOpenMerchant?.(m.name)}
              style={{ cursor: 'pointer' }}
            >
              <TxnIcon txn={m.sample} />
              <div className="txn-bd">
                <div className="txn-nm">{m.name}</div>
                <div className="txn-ct">{m.count} transaction{m.count === 1 ? '' : 's'}</div>
              </div>
              <div className="txn-r">
                <div className="txn-amt">{money(m.total)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
