import { useState } from 'react';
import { money } from './format';
import { deriveForMonth } from '../../hooks/useFinancialData';
import MonthSwitcher from './MonthSwitcher';
import CashFlowSankey from './CashFlowSankey';

// Dedicated Cash Flow page: income → spending → saved, with the month
// switcher. Houses the cash-flow visual (moved off the Insights page).
export default function CashFlowPage({ data }) {
  const { accounts, transactions } = data;
  const [offset, setOffset] = useState(0);
  const view = deriveForMonth(accounts, transactions, offset);

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
        <div style={{ display: 'flex', gap: 18, marginBottom: 4 }}>
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
        <div className="ctitle">Flow · {view.label}</div>
        <CashFlowSankey
          income={view.monthIncome}
          byCategory={view.byCategory}
          remaining={view.monthRemaining}
        />
      </div>
    </>
  );
}
