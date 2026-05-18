import { colorFor } from './categoryColors';
import { money } from './format';

// SVG donut showing spending share by category. Total in center,
// legend rendered to the right (or below on narrow screens).
// Origin-inspired: muted segments, no labels on the ring, fixed-size
// SVG so it never reflows.
export default function SpendingDonut({ byCategory, monthSpent, size = 160, thickness = 22 }) {
  const entries = Object.entries(byCategory || {})
    .filter(([, amt]) => Number(amt) > 0)
    .sort((a, b) => b[1] - a[1]);

  const total = monthSpent || entries.reduce((s, [, a]) => s + a, 0);
  const radius = (size - thickness) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  const monthName = new Date().toLocaleDateString('en-US', { month: 'long' }).toUpperCase();

  if (entries.length === 0 || total <= 0) {
    return (
      <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.7, padding: '12px 0', textAlign: 'center' }}>
        No spending logged yet this month.
      </div>
    );
  }

  let offset = 0;
  const segments = entries.map(([cat, amt]) => {
    const fraction = amt / total;
    const length = circumference * fraction;
    const seg = {
      cat,
      amt,
      color: colorFor(cat),
      dasharray: `${length} ${circumference - length}`,
      dashoffset: -offset,
      pct: fraction * 100,
    };
    offset += length;
    return seg;
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--c3)"
            strokeWidth={thickness}
          />
          {segments.map((s) => (
            <circle
              key={s.cat}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={s.dasharray}
              strokeDashoffset={s.dashoffset}
              transform={`rotate(-90 ${center} ${center})`}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            fontSize: 8,
            letterSpacing: 2.5,
            color: 'var(--t3)',
            marginBottom: 4,
          }}>
            {monthName}
          </div>
          <div style={{
            fontFamily: 'var(--serif)',
            fontSize: size * 0.16,
            fontWeight: 300,
            letterSpacing: '-.5px',
            color: 'var(--t1)',
            lineHeight: 1,
          }}>
            {money(total)}
          </div>
          <div style={{
            fontSize: 8,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: 'var(--t3)',
            marginTop: 6,
          }}>
            Spent
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 160 }}>
        {segments.slice(0, 8).map((s) => (
          <div
            key={s.cat}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 10.5,
              padding: '5px 0',
              borderBottom: '1px solid var(--b1)',
            }}
          >
            <span style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: s.color,
              flexShrink: 0,
            }} />
            <span style={{
              flex: 1,
              color: 'var(--t1)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {s.cat}
            </span>
            <span style={{
              color: 'var(--t2)',
              fontVariantNumeric: 'tabular-nums',
              fontSize: 10,
              minWidth: 52,
              textAlign: 'right',
            }}>
              {money(s.amt).replace(/\.00$/, '')}
            </span>
            <span style={{
              color: 'var(--t3)',
              fontVariantNumeric: 'tabular-nums',
              fontSize: 9.5,
              minWidth: 32,
              textAlign: 'right',
            }}>
              {s.pct.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
