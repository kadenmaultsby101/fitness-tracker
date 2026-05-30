import { getProductId, NO_PERKS } from '../../lib/cardMapping';
import { computeCardPerks } from '../../lib/perksEngine';
import { money } from './format';

// Slim Home summary. Links to the full Perks page in the Menu.
// Hidden when there are no credit accounts or no perks to talk about.
export default function PerksCard({ accounts, transactions, onGoTo }) {
  const creditAccounts = (accounts || []).filter((a) => a.type === 'credit');
  if (creditAccounts.length === 0) return null;

  const resolved = creditAccounts.map((account) => {
    const productId = getProductId(account);
    const perks = productId && productId !== NO_PERKS
      ? computeCardPerks({ productId, account, transactions })
      : null;
    return { productId, perks };
  });

  const needsPicker  = resolved.some((r) => !r.productId);
  const mappedCount  = resolved.filter((r) => r.perks).length;
  const totalUnused  = resolved.reduce((s, r) => s + (r.perks?.monthlyUnused || 0), 0);

  // Nothing to say + nothing to ask about → hide.
  if (!needsPicker && mappedCount === 0) return null;

  return (
    <button
      type="button"
      onClick={() => onGoTo?.('perks')}
      className="card"
      style={{
        textAlign: 'left', width: '100%', cursor: 'pointer',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 14, padding: '16px 18px',
      }}
    >
      <div>
        <div className="ctitle" style={{ marginBottom: 6 }}>Card Perks</div>
        <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.5 }}>
          {needsPicker
            ? 'Tell Vela which cards you have to start tracking your monthly credits.'
            : totalUnused > 0
              ? <>You have <strong style={{ color: 'var(--accent)' }}>{money(totalUnused, 2)}</strong> in unused monthly credits.</>
              : 'You\'ve used every monthly credit on your cards. 🎉'}
        </div>
      </div>
      <div style={{
        fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--t2)',
        flexShrink: 0,
      }}>
        →
      </div>
    </button>
  );
}
