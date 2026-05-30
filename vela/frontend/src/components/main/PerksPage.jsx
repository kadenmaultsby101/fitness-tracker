import { useState } from 'react';
import { getProductId, NO_PERKS, setProductId } from '../../lib/cardMapping';
import { computeCardPerks, frequencyLabel } from '../../lib/perksEngine';
import { money, displayAccountName } from './format';
import CardProductPicker from './CardProductPicker';
import BankLogo from './BankLogo';

// Dedicated Perks page. Linked from the Menu (More) page.
// Per credit account: show all its credits with period-appropriate labels,
// what's used, what's left, when each period resets.
export default function PerksPage({ data, plaidItems = [], onBack }) {
  const [tick, setTick] = useState(0);
  const { accounts, transactions } = data;
  const itemsById = Object.fromEntries(plaidItems.map((it) => [it.id, it]));

  const creditAccounts = (accounts || []).filter((a) => a.type === 'credit');

  const resolved = creditAccounts.map((account) => {
    const productId = getProductId(account);
    const perks = productId && productId !== NO_PERKS
      ? computeCardPerks({ productId, account, transactions })
      : null;
    return { account, productId, perks };
  });

  // Aggregate "left to use" across all monthly credits this month.
  const totalMonthlyUnused = resolved.reduce(
    (s, r) => s + (r.perks?.monthlyUnused || 0), 0
  );

  return (
    <>
      <header className="ph">
        <div className="ph-l">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                background: 'none', border: 'none', color: 'var(--t2)',
                fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 6,
              }}
            >
              ← Back
            </button>
          )}
          <div className="ph-t">Card Perks</div>
          <div className="ph-s">
            {creditAccounts.length === 0
              ? 'Connect a credit card to track perks'
              : totalMonthlyUnused > 0
                ? `${money(totalMonthlyUnused, 2)} unused this month`
                : 'You\'re on top of your perks this month 🎉'}
          </div>
        </div>
      </header>

      {creditAccounts.length === 0 && (
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.7 }}>
            Once you connect a credit card via Plaid (from the Menu page), Vela tracks the monthly,
            quarterly, semi-annual, and annual statement credits your card offers — so you don\'t leave
            money on the table at the end of each period.
          </div>
        </div>
      )}

      {resolved.map(({ account, productId, perks }) => {
        if (productId === NO_PERKS) {
          return (
            <MutedAccountCard
              key={account.id}
              account={account}
              item={itemsById[account.plaid_item_id]}
              onReset={() => { setProductId(account.id, ''); setTick((t) => t + 1); }}
            />
          );
        }
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
        return (
          <CardSection
            key={account.id}
            account={account}
            item={itemsById[account.plaid_item_id]}
            perks={perks}
            onChangeCard={() => { setProductId(account.id, ''); setTick((t) => t + 1); }}
          />
        );
      })}
    </>
  );
}

function CardSection({ account, item, perks, onChangeCard }) {
  const { card, credits, usedTotal, totalPotential, monthlyUnused } = perks;

  return (
    <div className="card">
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 10, paddingBottom: 12, borderBottom: '1px solid var(--b1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BankLogo institutionName={card.issuer} item={item} size={28} />
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 400, letterSpacing: '-0.2px' }}>
              {card.name}
            </div>
            <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--t3)', marginTop: 2 }}>
              {displayAccountName(account)}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onChangeCard}
          style={{
            background: 'none', border: '1px solid var(--b2)', borderRadius: 14,
            padding: '4px 10px',
            fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase',
            color: 'var(--t3)', cursor: 'pointer',
          }}
        >
          Change
        </button>
      </div>

      {monthlyUnused > 0 ? (
        <div style={{
          fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--mono)',
          marginBottom: 12, letterSpacing: 0.4,
        }}>
          {money(monthlyUnused, 2)} unused this month
        </div>
      ) : (
        <div style={{
          fontSize: 11, color: 'var(--green, #7ec39a)', fontFamily: 'var(--mono)',
          marginBottom: 12, letterSpacing: 0.4,
        }}>
          All monthly credits used 🎉
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {credits.map((c) => (
          <div key={c.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 0', borderBottom: '1px solid var(--b1)',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                color: c.used ? 'var(--t2)' : 'var(--t1)',
                fontSize: 13,
                textDecoration: c.used ? 'line-through' : 'none',
              }}>
                <span style={{
                  width: 14, textAlign: 'center',
                  color: c.used ? 'var(--green, #7ec39a)' : 'var(--t3)',
                }}>
                  {c.used ? '✓' : '○'}
                </span>
                {c.label}
              </div>
              <div style={{
                fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase',
                color: 'var(--t3)', marginTop: 3, marginLeft: 22,
              }}>
                {frequencyLabel(c.frequency, c.period)} · {c.period.daysLeft}d left
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 12,
                color: c.used ? 'var(--t3)' : 'var(--t2)',
              }}>
                ${c.amount.toFixed(2).replace(/\.00$/, '')}
              </div>
              <div style={{ fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--t3)', marginTop: 2 }}>
                {c.frequency.replace('_', '-')}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 12, padding: '10px 0 2px',
        fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase',
        color: 'var(--t3)', textAlign: 'center',
      }}>
        {money(usedTotal, 0)} / {money(totalPotential, 0)} earned this year potential
      </div>
    </div>
  );
}

function MutedAccountCard({ account, item, onReset }) {
  return (
    <div className="card" style={{ borderColor: 'var(--b1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BankLogo institutionName={null} item={item} size={24} />
          <div>
            <div style={{ fontSize: 12, color: 'var(--t2)' }}>{account.name}</div>
            <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--t3)', marginTop: 2 }}>
              Muted · no perks tracking
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onReset}
          style={{
            background: 'none', border: '1px solid var(--b2)', borderRadius: 14,
            padding: '4px 10px',
            fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase',
            color: 'var(--t3)', cursor: 'pointer',
          }}
        >
          Re-add
        </button>
      </div>
    </div>
  );
}
