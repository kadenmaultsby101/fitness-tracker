import { money } from './format';

export default function GoalsPage({ data, onAddGoal, onEditGoal }) {
  const { goals } = data;

  return (
    <>
      <header className="ph">
        <div className="ph-l">
          <div className="ph-t">Goals</div>
          <div className="ph-s">{goals.length} active</div>
        </div>
        <button type="button" className="ph-action" onClick={onAddGoal} aria-label="Add goal">+</button>
      </header>

      {goals.length === 0 ? (
        <div className="empty">
          <div className="empty-title">No goals yet</div>
          Emergency Fund. Max Roth IRA. FHA down payment. Add your first goal —
          Sage will track it.
          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              className="bpri"
              style={{ width: 'auto', padding: '11px 22px' }}
              onClick={onAddGoal}
            >
              + Add a goal
            </button>
          </div>
        </div>
      ) : (
        goals.map((g) => {
          const cur = Number(g.current_amount) || 0;
          const tgt = Number(g.target_amount) || 1;
          const pct = Math.min(100, Math.round((cur / tgt) * 100));
          const monthly = Number(g.monthly_contribution) || 0;
          const remaining = Math.max(0, tgt - cur);
          const monthsLeft = monthly > 0 ? Math.ceil(remaining / monthly) : null;
          return (
            <div key={g.id} className="gc" onClick={() => onEditGoal(g)}>
              <div className="gc-top">
                <div className="gc-l">
                  {g.emoji && <div className="gc-em">{g.emoji}</div>}
                  <div className="gc-nm">{g.name}</div>
                  {g.description && (
                    <div className="gc-ds">{g.description}</div>
                  )}
                </div>
                <div className="gc-pct">{pct}%</div>
              </div>
              <div className="gc-track">
                <div className="gc-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="gc-row">
                <span className="gc-cur">{money(cur)}</span>
                <span className="gc-tgt">of {money(tgt)}</span>
              </div>
              <div className="gc-mo">
                {monthly > 0
                  ? <>{money(monthly)}/mo · {monthsLeft ? `${monthsLeft} months left` : 'on track'}</>
                  : 'No monthly contribution set'}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
