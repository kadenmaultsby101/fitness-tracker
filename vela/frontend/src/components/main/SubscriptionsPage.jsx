import { useMemo } from 'react';
import { money, relDate } from './format';
import TxnIcon from './TxnIcon';
import { detectSubscriptions } from './detectSubscriptions';

export default function SubscriptionsPage({ data, onBack, onOpenMerchant }) {
  const { transactions } = data;
  const { subscriptions, monthlyTotal } = useMemo(
    () => detectSubscriptions(transactions),
    [transactions]
  );

  return (
    <>
      <header className="ph">
        <div className="ph-l">
          <button
            type="button"
            onClick={onBack}
            style={{ background: 'none', border: 'none', color: 'var(--t2)', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 6 }}
          >
            ← Back
          </button>
          <div className="ph-t">Subscriptions</div>
          <div className="ph-s">
            {subscriptions.length
              ? `${money(monthlyTotal)}/mo · ${subscriptions.length} recurring`
              : 'Recurring charges'}
          </div>
        </div>
      </header>

      <div className="card">
        <div className="ctitle">Recurring Charges</div>
        {subscriptions.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.7, padding: '4px 0' }}>
            No recurring charges detected yet. As more transactions sync, Vela will spot subscriptions automatically.
          </div>
        ) : (
          subscriptions.map((s) => (
            <div
              key={s.merchant + s.amount}
              className="txn"
              role="button"
              tabIndex={0}
              onClick={() => onOpenMerchant?.(s.merchant)}
              style={{ cursor: 'pointer' }}
            >
              <TxnIcon txn={s.sample} />
              <div className="txn-bd">
                <div className="txn-nm">{s.merchant}</div>
                <div className="txn-ct">
                  {s.cadence} · last {relDate(s.lastDate)}
                </div>
              </div>
              <div className="txn-r">
                <div className="txn-amt">{money(s.amount)}</div>
                <div className="txn-dt">{money(s.monthlyEstimate)}/mo</div>
              </div>
            </div>
          ))
        )}
      </div>

      {subscriptions.length > 0 && (
        <div style={{ padding: '0 18px', fontSize: 10.5, color: 'var(--t3)', lineHeight: 1.6 }}>
          Detected from your recent transactions by matching repeat charges. Cancel any you don't use — that's {money(monthlyTotal * 12)}/yr at stake.
        </div>
      )}
    </>
  );
}
