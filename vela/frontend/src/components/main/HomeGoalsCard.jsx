import { money } from './format';

// Compact Goals summary for the bottom of Home. Shows up to 3 goals sorted
// by progress (closest-to-done first), each with a tappable progress bar.
// Footer link routes to the full Goals page.
//
// Hidden if there are no goals (CTA lives in Setup Checklist already, no
// need to repeat).
export default function HomeGoalsCard({ goals = [], onGoTo }) {
  if (!goals.length) return null;

  // Sort by % progress descending, so the most-advanced goal anchors the
  // card. (Most-motivating moment is "you're almost there.")
  const sorted = [...goals].sort((a, b) => {
    const pa = pct(a);
    const pb = pct(b);
    return pb - pa;
  });
  const visible = sorted.slice(0, 3);
  const hidden = Math.max(0, goals.length - visible.length);

  return (
    <div className="card">
      <div className="ctitle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span>Goals</span>
        <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: 1.5 }}>
          {goals.length} {goals.length === 1 ? 'goal' : 'goals'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {visible.map((g) => {
          const cur = Number(g.current_amount) || 0;
          const tgt = Number(g.target_amount) || 1;
          const p = pct(g);
          const monthly = Number(g.monthly_contribution) || 0;
          const remaining = Math.max(0, tgt - cur);
          const monthsLeft = monthly > 0 ? Math.ceil(remaining / monthly) : null;
          return (
            <div
              key={g.id}
              onClick={() => onGoTo?.('goals')}
              role="button"
              tabIndex={0}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {g.emoji && <span style={{ fontSize: 16 }}>{g.emoji}</span>}
                  <span style={{ fontSize: 13, color: 'var(--t1)', fontWeight: 500 }}>{g.name}</span>
                </div>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)' }}>{p}%</span>
              </div>
              <div className="br-track" style={{ marginBottom: 5 }}>
                <div className="br-fill" style={{ width: `${p}%` }} />
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 10, letterSpacing: 1, textTransform: 'uppercase',
                color: 'var(--t3)',
              }}>
                <span>{money(cur, 0)} of {money(tgt, 0)}</span>
                <span>
                  {monthsLeft != null
                    ? `${monthsLeft} mo${monthsLeft === 1 ? '' : 's'} left`
                    : 'No monthly set'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onGoTo?.('goals')}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '12px 0 2px', width: '100%',
          fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase',
          color: 'var(--t2)',
          marginTop: 6, borderTop: '1px solid var(--b1)',
        }}
      >
        {hidden > 0 ? `View all ${goals.length} goals →` : 'Manage goals →'}
      </button>
    </div>
  );
}

function pct(g) {
  const cur = Number(g.current_amount) || 0;
  const tgt = Number(g.target_amount) || 1;
  return Math.min(100, Math.round((cur / tgt) * 100));
}
