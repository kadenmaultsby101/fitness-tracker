import { money } from './format';
import { colorFor } from './categoryColors';

// Clean, mobile-reliable cash-flow visual (Monarch-inspired). Instead of a
// cramped multi-band bezier Sankey, this renders a single income bar that
// visually splits into stacked outflow segments (categories + Saved) below,
// connected by tapered bands. Always renders correctly at narrow widths.
export default function CashFlowSankey({ income, byCategory, remaining }) {
  if (!income || income <= 0) {
    return (
      <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.7, padding: '8px 0', textAlign: 'center' }}>
        No income recorded this period yet — once a paycheck syncs, your cash flow shows here.
      </div>
    );
  }

  const segs = Object.entries(byCategory || {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => ({ label: cat, amt, color: colorFor(cat) }));
  if (remaining > 0) segs.push({ label: 'Saved', amt: remaining, color: 'var(--green)' });

  const denom = Math.max(income, segs.reduce((s, x) => s + x.amt, 0)) || 1;

  const W = 320;
  const topH = 26;
  const gap = 3;
  const bandH = 34;
  const botY = topH + bandH;
  const botBarH = 22;

  // Lay out bottom segments left→right across the full width.
  let bx = 0;
  const laid = segs.map((s) => {
    const w = (s.amt / denom) * W;
    const node = { ...s, x: bx, w };
    bx += w + gap;
    return node;
  });
  const incomeW = (income / denom) * W;

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${botY + botBarH}`} style={{ display: 'block' }}>
        {/* Income bar (top) */}
        <rect x={0} y={0} width={incomeW} height={topH} rx={4} fill="var(--accent)" />
        {/* Tapered connector bands from income → each bottom segment */}
        {laid.map((s, i) => {
          const totalOut = laid.reduce((q, z) => q + z.amt, 0) || 1;
          const srcX0 = laid.slice(0, i).reduce((a, p) => a + p.amt, 0) / totalOut * incomeW;
          const srcX1 = srcX0 + (s.amt / totalOut) * incomeW;
          const d = `M ${srcX0} ${topH} L ${srcX1} ${topH} L ${s.x + s.w} ${botY} L ${s.x} ${botY} Z`;
          return <path key={i} d={d} fill={s.color} fillOpacity={0.18} />;
        })}
        {/* Bottom segment bars */}
        {laid.map((s, i) => (
          <rect key={i} x={s.x} y={botY} width={Math.max(2, s.w)} height={botBarH} rx={3} fill={s.color} />
        ))}
      </svg>

      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, padding: '5px 0', borderBottom: '1px solid var(--b1)' }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)' }} />
          <span style={{ flex: 1, color: 'var(--t1)' }}>Income</span>
          <span style={{ color: 'var(--t2)', fontVariantNumeric: 'tabular-nums' }}>{money(income)}</span>
        </div>
        {laid.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, padding: '5px 0', borderBottom: '1px solid var(--b1)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
            <span style={{ flex: 1, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
            <span style={{ color: 'var(--t2)', fontVariantNumeric: 'tabular-nums', minWidth: 52, textAlign: 'right' }}>{money(s.amt)}</span>
            <span style={{ color: 'var(--t3)', fontVariantNumeric: 'tabular-nums', minWidth: 34, textAlign: 'right' }}>
              {Math.round((s.amt / income) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
