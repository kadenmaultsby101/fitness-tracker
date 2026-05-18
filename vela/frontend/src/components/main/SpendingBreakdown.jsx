import { money } from './format';
import { colorFor } from './categoryColors';

// Horizontal stacked bar of monthly spending by category, with a small
// legend below. Inspired by the colorful overview Origin shows on its
// dashboard — gives an at-a-glance read of where money went this month
// without making the user dig into a per-category list.
export default function SpendingBreakdown({ byCategory, monthSpent }) {
  const entries = Object.entries(byCategory || {})
    .filter(([, amt]) => Number(amt) > 0)
    .sort((a, b) => b[1] - a[1]);

  if (entries.length === 0 || monthSpent <= 0) {
    return (
      <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.7, padding: '4px 0' }}>
        No spending logged yet this month.
      </div>
    );
  }

  return (
    <>
      <div style={{
        display: 'flex',
        height: 14,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 14,
        background: 'var(--c3)',
      }}>
        {entries.map(([cat, amt]) => {
          const pct = (amt / monthSpent) * 100;
          if (pct < 0.5) return null;
          return (
            <div
              key={cat}
              title={`${cat}: ${money(amt)} · ${pct.toFixed(0)}%`}
              style={{
                width: `${pct}%`,
                background: colorFor(cat),
                borderRight: '1px solid var(--bg)',
              }}
            />
          );
        })}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px 14px',
      }}>
        {entries.map(([cat, amt]) => {
          const pct = (amt / monthSpent) * 100;
          return (
            <div
              key={cat}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 10.5,
                color: 'var(--t2)',
                lineHeight: 1.4,
              }}
            >
              <span style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: colorFor(cat),
                flexShrink: 0,
              }} />
              <span style={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: 'var(--t1)',
              }}>
                {cat}
              </span>
              <span style={{ color: 'var(--t3)', fontVariantNumeric: 'tabular-nums' }}>
                {pct.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
