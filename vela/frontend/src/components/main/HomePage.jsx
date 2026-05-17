import { money, moneyAbs, emojiFor, relDate, displayAccountName } from './format';
import AnimatedNumber from './AnimatedNumber';
import { BACKEND_AVAILABLE } from '../../lib/apiUrl';

function setupSteps({ accounts, transactions, goals, budgets, plaidConnected }) {
  return [
    { key: 'account',  done: accounts.length > 0,      label: 'Add your first account' },
    { key: 'txn',      done: transactions.length > 0,  label: 'Log a transaction' },
    { key: 'goal',     done: goals.length > 0,         label: 'Create a goal' },
    { key: 'budget',   done: budgets.length > 0,       label: 'Set a monthly budget' },
    { key: 'plaid',    done: plaidConnected,           label: 'Connect a bank via Plaid', optional: !BACKEND_AVAILABLE },
  ];
}

export default function HomePage({ data, session, onAddTxn, onAddAccount, onEditAccount, onEditTxn, onGoTo }) {
  const { profile, accounts, transactions, goals, budgets, derived, loading } = data;
  const firstName =
    (profile?.name || session?.user?.user_metadata?.name || '').split(' ')[0] ||
    'there';
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const recent = transactions.slice(0, 5);
  const hasAccounts = accounts.length > 0;
  const hasTxns = transactions.length > 0;
  const plaidConnected = accounts.some((a) => !String(a.plaid_account_id || '').startsWith('manual_'));

  // Setup checklist — hides itself once every required step is done.
  const steps = setupSteps({ accounts, transactions, goals, budgets, plaidConnected });
  const required = steps.filter((s) => !s.optional);
  const completed = required.filter((s) => s.done).length;
  const showChecklist = completed < required.length;

  // Sage-style insight from real data.
  let insight = null;
  if (hasTxns && derived.monthIncome > 0) {
    const rate = derived.savingsRate;
    if (rate >= 35) {
      insight = (
        <>You're saving <strong>{rate}%</strong> of income this month — elite. Sage will help decide where the excess goes.</>
      );
    } else if (rate >= 15) {
      insight = (
        <>Saving <strong>{rate}%</strong> of income this month. Solid baseline. Push to 30%+ to accelerate your goals.</>
      );
    } else {
      insight = (
        <>Saving <strong>{rate}%</strong> this month. Below the 20% benchmark. Sage will surface one specific change to make this week.</>
      );
    }
  } else if (hasAccounts && !hasTxns) {
    insight = <>Accounts in. Log a transaction so Sage can start analyzing your spending.</>;
  } else {
    insight = <>Add an account or your first transaction below. Sage gets sharper the more real data she sees.</>;
  }

  return (
    <>
      <header className="ph">
        <div className="ph-l">
          <div className="ph-t">Vela</div>
          <div className="ph-s">Good day, {firstName} · {today}</div>
        </div>
        <button type="button" className="ph-action" onClick={onAddTxn} aria-label="Add transaction">
          +
        </button>
      </header>

      <div className="nw">
        <div className="nw-lbl">Total Net Worth</div>
        <div className="nw-amt">
          <AnimatedNumber value={derived.netWorth} format={(n) => money(n)} />
        </div>
        <div className="nw-row">
          <span className="nw-pct">
            {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
            {derived.monthIncome > 0 && (
              <> · {derived.savingsRate}% saved this month</>
            )}
          </span>
        </div>
      </div>

      {showChecklist && !loading && (
        <div className="card" style={{ borderColor: 'var(--b2)' }}>
          <div className="ctitle">
            <span>Setup · {completed} of {required.length}</span>
            <span style={{ color: 'var(--t2)', fontSize: 8 }}>{Math.round((completed / required.length) * 100)}%</span>
          </div>
          <div className="br-track" style={{ marginBottom: 14 }}>
            <div
              className="br-fill"
              style={{ width: `${(completed / required.length) * 100}%` }}
            />
          </div>
          {steps.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                if (s.key === 'account') onAddAccount();
                else if (s.key === 'txn') onAddTxn();
                else if (s.key === 'goal') onGoTo('goals');
                else if (s.key === 'budget') onGoTo('budget');
                else if (s.key === 'plaid') onGoTo('more');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 0',
                width: '100%',
                background: 'none',
                border: 'none',
                color: 'inherit',
                fontFamily: 'inherit',
                cursor: s.done ? 'default' : 'pointer',
                borderBottom: '1px solid var(--b1)',
                textAlign: 'left',
              }}
              disabled={s.done}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  border: '1px solid var(--b2)',
                  background: s.done ? 'var(--green)' : 'transparent',
                  color: s.done ? 'var(--bg)' : 'var(--t3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  flexShrink: 0,
                }}
                aria-hidden
              >
                {s.done ? '✓' : ''}
              </span>
              <span
                style={{
                  flex: 1,
                  fontSize: 11,
                  color: s.done ? 'var(--t3)' : 'var(--t1)',
                  textDecoration: s.done ? 'line-through' : 'none',
                  letterSpacing: 0.2,
                }}
              >
                {s.label}
                {s.optional && <span style={{ color: 'var(--t3)', marginLeft: 6, fontSize: 8, letterSpacing: 1.5 }}>OPTIONAL</span>}
              </span>
              {!s.done && (
                <span style={{ color: 'var(--t3)', fontSize: 14 }}>→</span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="aib">
        <div className="ai-pill"><span className="ai-dot" />Sage · Live</div>
        <div className="ai-txt">{insight}</div>
        <button type="button" className="ai-more" onClick={() => onGoTo('coach')}>
          Ask Sage →
        </button>
      </div>

      <div className="slbl" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span>Accounts</span>
        <button type="button" className="ctitle-act" onClick={onAddAccount}>+ Add</button>
      </div>
      {!hasAccounts && !loading ? (
        <div className="empty">
          <div className="empty-title">No accounts yet</div>
          Add one manually now, or connect a bank later from <strong style={{ color: 'var(--t1)' }}>More</strong>.
        </div>
      ) : loading ? (
        <SkeletonAccounts />
      ) : (
        <div className="acc-scr">
          {accounts.map((a) => {
            const isDebt = a.type === 'credit' || a.type === 'loan';
            const bal = Number(a.balance_current) || 0;
            return (
              <div
                key={a.id}
                className="am"
                onClick={() => onEditAccount?.(a)}
                role="button"
                tabIndex={0}
                style={{ cursor: onEditAccount ? 'pointer' : 'default' }}
              >
                <div className="am-inst">{a.subtype || a.type}</div>
                <div className="am-nm">
                  {displayAccountName(a)}
                  {a.mask ? ` ··${a.mask}` : ''}
                </div>
                <div className="am-bal" style={isDebt ? { color: 'var(--red)' } : undefined}>
                  {isDebt ? '−' : ''}{money(bal)}
                </div>
              </div>
            );
          })}
          <div className="am add" onClick={onAddAccount} role="button">+</div>
        </div>
      )}

      <div className="card">
        <div className="ctitle">
          <span>Recent Transactions</span>
          <button type="button" className="ctitle-act" onClick={onAddTxn}>+ Add</button>
        </div>
        {loading ? (
          <SkeletonRows />
        ) : recent.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.7, padding: '4px 0' }}>
            Nothing yet. Tap + to log income or an expense.
          </div>
        ) : (
          recent.map((t) => (
            <div
              key={t.id}
              className="txn"
              onClick={() => onEditTxn?.(t)}
              role="button"
              tabIndex={0}
              style={{ cursor: onEditTxn ? 'pointer' : 'default' }}
            >
              <div className="txn-em">{emojiFor(t.category, t.subcategory)}</div>
              <div className="txn-bd">
                <div className="txn-nm">{t.merchant_name || t.name}</div>
                <div className="txn-ct">{t.category || 'Other'}</div>
              </div>
              <div className="txn-r">
                <div className={`txn-amt ${t.amount < 0 ? 'pos' : ''}`}>
                  {t.amount < 0 ? '+' : '−'}{moneyAbs(t.amount)}
                </div>
                <div className="txn-dt">{relDate(t.date)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function SkeletonAccounts() {
  return (
    <div className="acc-scr" aria-busy="true" aria-live="polite">
      {[1, 2, 3].map((i) => (
        <div key={i} className="am" style={{ minWidth: 140, opacity: 0.5 }}>
          <div style={{ height: 8, background: 'var(--c3)', marginBottom: 8 }} />
          <div style={{ height: 9, background: 'var(--c3)', width: '70%', marginBottom: 10 }} />
          <div style={{ height: 18, background: 'var(--c3)', width: '60%' }} />
        </div>
      ))}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div aria-busy="true" aria-live="polite">
      {[1, 2, 3].map((i) => (
        <div key={i} className="txn" style={{ opacity: 0.5 }}>
          <div className="txn-em" style={{ background: 'var(--c3)' }} />
          <div className="txn-bd">
            <div style={{ height: 12, background: 'var(--c3)', width: '60%', marginBottom: 6 }} />
            <div style={{ height: 8, background: 'var(--c3)', width: '40%' }} />
          </div>
          <div className="txn-r">
            <div style={{ height: 12, background: 'var(--c3)', width: 60, marginLeft: 'auto', marginBottom: 4 }} />
            <div style={{ height: 8, background: 'var(--c3)', width: 40, marginLeft: 'auto' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
