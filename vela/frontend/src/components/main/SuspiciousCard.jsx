import { useMemo } from 'react';
import { detectSuspicious } from './detectSuspicious';
import TxnIcon from './TxnIcon';
import { moneyAbs, relDate } from './format';

// Surface "something off?" flags from transactions on Home.
// Hidden when there's nothing to flag — no zero-state spam.
export default function SuspiciousCard({ transactions, onOpenTxn }) {
  const flags = useMemo(() => detectSuspicious(transactions || []), [transactions]);
  if (!flags.length) return null;

  // Cap at 3 so the card stays a card, not a wall.
  const visible = flags.slice(0, 3);
  const hidden = flags.length - visible.length;

  return (
    <div className="card" style={{ borderColor: 'rgba(235,159,159,0.30)' }}>
      <div className="ctitle" style={{ color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: 'var(--red, #eb9f9f)' }}>⚠</span>
        Vela noticed
      </div>
      <div style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.6, marginBottom: 12 }}>
        {flags.length === 1
          ? 'One charge worth a second look.'
          : `${flags.length} charges worth a second look.`}
      </div>
      {visible.map((f) => (
        <div
          key={f.txn.id}
          className="txn"
          role="button"
          tabIndex={0}
          onClick={() => onOpenTxn?.(f.txn)}
          style={{ cursor: onOpenTxn ? 'pointer' : 'default' }}
        >
          <TxnIcon txn={f.txn} />
          <div className="txn-bd">
            <div className="txn-nm">{f.txn.merchant_name || f.txn.name}</div>
            <div className="txn-ct" style={{ color: 'var(--t2)', lineHeight: 1.5 }}>
              {f.message}
            </div>
          </div>
          <div className="txn-r">
            <div className="txn-amt">−{moneyAbs(f.txn.amount)}</div>
            <div className="txn-dt">{relDate(f.txn.date)}</div>
          </div>
        </div>
      ))}
      {hidden > 0 && (
        <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--t3)', textAlign: 'center', padding: '8px 0 2px' }}>
          + {hidden} more
        </div>
      )}
    </div>
  );
}
