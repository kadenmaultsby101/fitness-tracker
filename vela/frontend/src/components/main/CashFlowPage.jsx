import { useState } from 'react';
import { money } from './format';
import { colorFor } from './categoryColors';
import { deriveForMonth } from '../../hooks/useFinancialData';
import MonthSwitcher from './MonthSwitcher';

// Cash Flow page (mobile): month switcher + in/out/net summary + a clean
// where-it-went category breakdown. (The Sankey flow diagram is reserved
// for the desktop website.)
export default function CashFlowPage({ data }) {
  const { accounts, transactions } = data;
  const [offset, setOffset] = useState(0);
  const view = deriveForMonth(accounts, transactions, offset);

  const cats = Object.entries(view.byCategory)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const maxCat = cats.length ? cats[0][1] : 1;

  return (
    <>
      <header className="ph">
        <div className="ph-l">
          <div className="ph-t">Cash Flow</div>
          <div className="ph-s">Where money comes & goes</div>
        </div>
      </header>

      <div className="card">
        <MonthSwitcher offset={offset} setOffset={setOffset} label={view.label} />
      </div>

      <div className="card">
        <div className="ctitle">Summary · {view.label}</div>
        <div style={{ display: 'flex', gap: 18 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--t3)' }}>In</div>
            <div style={{ fontSize: 18, color: 'var(--green)', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{money(view.monthIncome)}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--t3)' }}>Out</div>
            <div style={{ fontSize: 18, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{money(view.monthSpent + view.monthInvested)}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--t3)' }}>Net</div>
            <div style={{ fontSize: 18, marginTop: 3, color: view.monthRemaining >= 0 ? 'var(--green)' : 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>
              {view.monthRemaining >= 0 ? '+' : '−'}{money(Math.abs(view.monthRemaining))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="ctitle">Where It Went · {view.label}</div>
        {cats.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.7, padding: '4px 0' }}>
            No spending recorded this period yet.
          </div>
        ) : (
          cats.map(([cat, amt]) => (
            <div key={cat} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: 'var(--t1)' }}>{cat}</span>
                <span style={{ fontSize: 12, color: 'var(--t2)', fontVariantNumeric: 'tabular-nums' }}>
                  {money(amt)} · {Math.round((amt / view.monthSpent) * 100)}%
                </span>
              </div>
              <div style={{ height: 6, background: 'var(--c3)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${(amt / maxCat) * 100}%`, height: '100%', background: colorFor(cat), borderRadius: 3 }} />
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
