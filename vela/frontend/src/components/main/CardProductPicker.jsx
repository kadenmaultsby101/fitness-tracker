import { useState } from 'react';
import { CARD_LIST } from '../../data/cardPerks';
import { setProductId, NO_PERKS } from '../../lib/cardMapping';

// Inline picker for "which card is this exactly?" — shows for credit
// accounts we don't have a confirmed productId for.
//
// Renders as a small card itself (no modal) so the perks UI on Home stays
// in one column. User picks → mapping saved → onConfirmed fires so the
// parent re-renders the perks card immediately.
export default function CardProductPicker({ account, onConfirmed }) {
  const [picking, setPicking] = useState(false);

  const choose = (productId) => {
    setProductId(account.id, productId);
    onConfirmed?.();
  };

  if (!picking) {
    return (
      <div className="card" style={{ borderColor: 'var(--b2)' }}>
        <div className="ctitle">Which card is this?</div>
        <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.6, marginBottom: 12 }}>
          {account.name}{account.mask ? ` · ··${account.mask}` : ''}
          <br />
          So Vela can track your monthly perks.
        </div>
        <button
          type="button"
          className="bsec"
          style={{ width: '100%' }}
          onClick={() => setPicking(true)}
        >
          Pick a card →
        </button>
      </div>
    );
  }

  return (
    <div className="card" style={{ borderColor: 'var(--accent)' }}>
      <div className="ctitle">Pick a card</div>
      <div style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.6, marginBottom: 10 }}>
        {account.name}{account.mask ? ` · ··${account.mask}` : ''}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {CARD_LIST.map((c) => (
          <button
            key={c.productId}
            type="button"
            onClick={() => choose(c.productId)}
            style={{
              textAlign: 'left',
              padding: '12px 14px',
              borderRadius: 'var(--radius)',
              background: 'var(--c2)',
              border: '1px solid var(--b1)',
              cursor: 'pointer',
              color: 'var(--t1)',
              fontSize: 13,
            }}
          >
            <div style={{ fontWeight: 500 }}>{c.fullName}</div>
            <div style={{ fontSize: 10, color: 'var(--t3)', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>
              {c.issuer}
            </div>
          </button>
        ))}
        <button
          type="button"
          onClick={() => choose(NO_PERKS)}
          style={{
            textAlign: 'left',
            padding: '12px 14px',
            borderRadius: 'var(--radius)',
            background: 'transparent',
            border: '1px dashed var(--b2)',
            cursor: 'pointer',
            color: 'var(--t3)',
            fontSize: 12,
            marginTop: 4,
          }}
        >
          None of these / no perks card
        </button>
      </div>
      <button
        type="button"
        onClick={() => setPicking(false)}
        style={{
          background: 'none', border: 'none', color: 'var(--t3)',
          fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase',
          cursor: 'pointer', marginTop: 12, padding: 4, width: '100%',
        }}
      >
        Cancel
      </button>
    </div>
  );
}
