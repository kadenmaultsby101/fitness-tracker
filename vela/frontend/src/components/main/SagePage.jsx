import { money } from './format';

export default function SagePage({ data, session }) {
  const { derived, accounts, transactions, goals } = data;
  const name =
    (data.profile?.name || session?.user?.user_metadata?.name || '').split(' ')[0] ||
    'there';

  const haveData =
    accounts.length > 0 || transactions.length > 0 || goals.length > 0;

  return (
    <>
      <div className="coach-hd">
        <div className="coach-av">✦</div>
        <div>
          <div className="coach-nm">Sage</div>
          <div className="coach-st">
            <span className="ai-dot" />
            Preparing
          </div>
        </div>
      </div>

      <div className="sage-placeholder">
        <div className="ic-em">✦</div>
        <div className="sage-q">Sage is almost online.</div>
        <div className="sage-b">
          Sage is your AI financial coach — powered by Claude, fed your real
          accounts, transactions, and goals. Sharp, direct, specific. No fluff.
          <br /><br />
          {haveData ? (
            <>
              I can see <strong style={{ color: 'var(--t1)' }}>
                {money(derived.netWorth)}
              </strong> across <strong style={{ color: 'var(--t1)' }}>
                {accounts.length}
              </strong> {accounts.length === 1 ? 'account' : 'accounts'},
              {' '}<strong style={{ color: 'var(--t1)' }}>
                {transactions.length}
              </strong> transactions, and <strong style={{ color: 'var(--t1)' }}>
                {goals.length}
              </strong> goals. Sage will be wired in next session and start
              coaching from this data.
            </>
          ) : (
            <>
              Add accounts, transactions, or goals first. Sage gets sharper the
              more real data she sees. Come back here once you've logged a few
              things.
            </>
          )}
        </div>
      </div>
    </>
  );
}
