import { money } from './format';

// Last-4-weeks spending bar chart. Inspired by the Copilot "spend this
// month" calendar — but compressed into weekly totals for a clearer
// "are we trending up or down" read.
//
// Builds buckets locally from `transactions` (already pre-fetched by
// useFinancialData) so no extra API calls.
export default function WeeklyTrend({ transactions = [], height = 110 }) {
  const now = new Date();
  // Most recent Sunday as the anchor for the current week bucket.
  const anchor = new Date(now);
  anchor.setHours(0, 0, 0, 0);
  anchor.setDate(anchor.getDate() - anchor.getDay());

  const weeks = Array.from({ length: 4 }, (_, i) => {
    const start = new Date(anchor);
    start.setDate(anchor.getDate() - (3 - i) * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return {
      label: i === 3
        ? 'This week'
        : `${start.getMonth() + 1}/${start.getDate()}`,
      start,
      end,
      total: 0,
    };
  });

  for (const t of transactions) {
    const amt = Number(t.amount) || 0;
    if (amt <= 0) continue; // outflows only (Plaid: outflow positive)
    const d = new Date(t.date);
    for (const w of weeks) {
      if (d >= w.start && d < w.end) {
        w.total += amt;
        break;
      }
    }
  }

  const max = Math.max(...weeks.map((w) => w.total), 1);
  const allZero = weeks.every((w) => w.total === 0);

  if (allZero) {
    return (
      <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.7, padding: '12px 0', textAlign: 'center' }}>
        No spending in the last 4 weeks yet.
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 12,
        height,
        padding: '6px 4px 0',
      }}>
        {weeks.map((w, i) => {
          const ratio = w.total / max;
          const barHeight = Math.max(2, ratio * (height - 28));
          const isCurrent = i === weeks.length - 1;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                fontSize: 9,
                color: 'var(--t3)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: 0.5,
              }}>
                {w.total > 0 ? money(w.total).replace(/\.00$/, '') : '—'}
              </div>
              <div style={{
                width: '100%',
                height: barHeight,
                background: isCurrent ? 'var(--t1)' : 'var(--t3)',
                opacity: isCurrent ? 0.85 : 0.45,
                borderRadius: 2,
                transition: 'height .25s ease',
              }} />
            </div>
          );
        })}
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        padding: '8px 4px 0',
      }}>
        {weeks.map((w, i) => (
          <div key={i} style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 8.5,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: i === weeks.length - 1 ? 'var(--t1)' : 'var(--t3)',
          }}>
            {w.label}
          </div>
        ))}
      </div>
    </div>
  );
}
