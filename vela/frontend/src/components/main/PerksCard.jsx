import { useState } from 'react';
import { getProductId, NO_PERKS } from '../../lib/cardMapping';
import { computeCardPerks } from '../../lib/perksEngine';
import { money } from './format';
import CardProductPicker from './CardProductPicker';

// Home card: monthly credit-card perk tracker for every credit account
// the user has. Shows usage status per card. Hidden if there are no
// credit accounts at all.
export default function PerksCard({ accounts, transactions }) {
  // Increment to force a re-render when a picker confirms a mapping (because
  // the mapping lives in localStorage, not React state).
  const [tick, setTick] = useState(0);

  const creditAccounts = (accounts || []).filter((a) => a.type === 'credit');
  if (creditAccounts.length === 0) return null;

  // Resolve each account → { account, productId, perks } where productId
  // may be null (unmapped) or NO_PERKS (user said skip).
  const resolved = creditAccounts.map((account) => {
    const productId = getProductId(account);
    const perks = productId && productId !== NO_PERKS
      ? computeCardPerks({ productId, account, transactions })
      : null;
    return { account, productId, perks };
  });

  // Hide entirely if every account is marked NO_PERKS and none need a picker.
  // (Don't show empty zero-state — would feel like nag.)
  const anyToShow = resolved.some((r) => (
    r.productId !== NO_PERKS && (!r.productId || r.perks)
  ));
  if (!anyToShow) return null;

  return (
    <div className="card">
      <div className="ctitle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>This month's perks</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {resolved.map(({ account, productId, perks }) => {
          if (productId === NO_PERKS) return null;
          if (!productId) {
            return (
              <CardProductPicker
                key={account.id}
                account={account}
                onConfirmed={() => setTick((t) => t + 1)}
              />
            );
          }
          if (!perks) return null;
          return <CardPerksRow key={account.id} account={account} perks={perks} />;
        })}
      </div>
    </div>
  );
}

function CardPerksRow({ account, perks }) {
  const { card, credits, usedTotal, unusedTotal, totalPotential, monthLabel, daysLeft } = perks;

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 8, paddingBottom: 6,
        borderBottom: '1px solid var(--b1)',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 400, letterSpacing: '-0.2px' }}>
            {card.name}
          </div>
          <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--t3)', marginTop: 2 }}>
            {monthLabel} · {money(usedTotal, 0)} of {money(totalPotential, 0)} used
          </div>
        </div>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 11,
          color: unusedTotal > 0 ? 'var(--accent)' : 'var(--green, #7ec39a)',
          textAlign: 'right',
        }}>
          {unusedTotal > 0
            ? `${money(unusedTotal, 2)} left · ${daysLeft}d`
            : 'All used 🎉'}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {credits.map((c) => (
          <div key={c.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '6px 2px', fontSize: 12,
          }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              color: c.used ? 'var(--t2)' : 'var(--t1)',
              textDecoration: c.used ? 'line-through' : 'none',
            }}>
              <span style={{
                width: 14, textAlign: 'center',
                color: c.used ? 'var(--green, #7ec39a)' : 'var(--t3)',
              }}>
                {c.used ? '✓' : '○'}
              </span>
              {c.label}
            </span>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 11,
              color: c.used ? 'var(--t3)' : 'var(--t2)',
            }}>
              ${c.amount.toFixed(2).replace(/\.00$/, '')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
