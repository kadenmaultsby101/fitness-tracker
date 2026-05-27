import { money } from './format';

// Origin-style segmented allocation bar: shows the split of total assets
// across Cash, Investments, and (separately) Debt owed. Cash + Investments
// make up the positive bar; debt is shown as a small label below.
const SEG_COLORS = {
  Cash: '#5fd39a',
  Investments: '#8b93ff',
  Other: '#9a9aa3',
};

export default function AllocationBar({ accounts }) {
  let cash = 0;
  let investments = 0;
  let otherAssets = 0;
  let debt = 0;

  for (const a of accounts) {
    const bal = Number(a.balance_current) || 0;
    const type = (a.type || '').toLowerCase();
    if (type === 'credit' || type === 'loan') { debt += bal; continue; }
    if (type === 'investment' || type === 'brokerage') { investments += bal; continue; }
    if (type === 'depository') { cash += bal; continue; }
    otherAssets += bal;
  }

  const assets = cash + investments + otherAssets;
  if (assets <= 0) return null;

  const segs = [
    { label: 'Cash', value: cash, color: SEG_COLORS.Cash },
    { label: 'Investments', value: investments, color: SEG_COLORS.Investments },
    { label: 'Other', value: otherAssets, color: SEG_COLORS.Other },
  ].filter((s) => s.value > 0);

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{
        display: 'flex',
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        gap: 2,
        background: 'transparent',
      }}>
        {segs.map((s) => (
          <div
            key={s.label}
            style={{
              width: `${(s.value / assets) * 100}%`,
              background: s.color,
              borderRadius: 4,
            }}
            title={`${s.label}: ${money(s.value)}`}
          />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 10 }}>
        {segs.map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--t2)' }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: s.color }} />
            <span>{s.label}</span>
            <span style={{ color: 'var(--t3)', fontVariantNumeric: 'tabular-nums' }}>
              {Math.round((s.value / assets) * 100)}%
            </span>
          </div>
        ))}
        {debt > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--red)' }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: 'var(--red)' }} />
            <span>Debt</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>−{money(debt)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
