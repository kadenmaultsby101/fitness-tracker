import { money } from './format';
import { colorFor } from './categoryColors';

// Lightweight custom SVG cash-flow diagram: a single Income node on the left
// flows into spending-category nodes (+ a green "Saved" node) on the right,
// each band sized by its share of income. Avoids a heavy charting dep and
// matches Vela's dark editorial look.
export default function CashFlowSankey({ income, byCategory, remaining }) {
  if (!income || income <= 0) {
    return (
      <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.7, padding: '8px 0', textAlign: 'center' }}>
        No income recorded this month yet — connect a paycheck or wait for the next sync to see your cash flow.
      </div>
    );
  }

  // Build right-side nodes: spending categories (desc) + Saved (if positive).
  const cats = Object.entries(byCategory || {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  const nodes = cats.map(([cat, amt]) => ({ label: cat, amt, color: colorFor(cat) }));
  if (remaining > 0) nodes.push({ label: 'Saved', amt: remaining, color: 'var(--green)' });

  // Denominator = max(income, total outflows+saved) so bands never overflow.
  const rightTotal = nodes.reduce((s, n) => s + n.amt, 0);
  const denom = Math.max(income, rightTotal);

  const W = 340;
  const H = Math.max(120, nodes.length * 46);
  const gap = 6;
  const leftX = 0;
  const leftW = 14;
  const rightX = W - 14;
  const rightW = 14;
  const incomeH = (income / denom) * (H - (nodes.length - 1) * gap);

  // Lay out right nodes stacked top→down.
  let ry = 0;
  const laidOut = nodes.map((n) => {
    const h = Math.max(3, (n.amt / denom) * (H - (nodes.length - 1) * gap));
    const node = { ...n, y: ry, h };
    ry += h + gap;
    return node;
  });

  // Bands leave the income node sequentially from the top.
  let ly = 0;

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
        {/* Income node */}
        <rect x={leftX} y={0} width={leftW} height={incomeH} rx={3} fill="var(--accent)" />
        {/* Flow bands */}
        {laidOut.map((n, i) => {
          const bandH = n.h;
          const sy = ly + bandH / 2;
          ly += bandH;
          const ty = n.y + n.h / 2;
          const x1 = leftX + leftW;
          const x2 = rightX;
          const mx = (x1 + x2) / 2;
          const d = `M ${x1} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${x2} ${ty}`;
          return (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={n.color}
              strokeWidth={Math.max(2, bandH)}
              strokeOpacity={0.35}
            />
          );
        })}
        {/* Right category nodes */}
        {laidOut.map((n, i) => (
          <rect key={i} x={rightX} y={n.y} width={rightW} height={n.h} rx={3} fill={n.color} />
        ))}
      </svg>

      {/* Legend */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, padding: '4px 0', borderBottom: '1px solid var(--b1)' }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)' }} />
          <span style={{ flex: 1, color: 'var(--t1)' }}>Income</span>
          <span style={{ color: 'var(--t2)', fontVariantNumeric: 'tabular-nums' }}>{money(income)}</span>
        </div>
        {laidOut.map((n, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, padding: '4px 0', borderBottom: '1px solid var(--b1)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: n.color }} />
            <span style={{ flex: 1, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.label}</span>
            <span style={{ color: 'var(--t2)', fontVariantNumeric: 'tabular-nums', minWidth: 52, textAlign: 'right' }}>{money(n.amt)}</span>
            <span style={{ color: 'var(--t3)', fontVariantNumeric: 'tabular-nums', minWidth: 34, textAlign: 'right' }}>
              {Math.round((n.amt / income) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
