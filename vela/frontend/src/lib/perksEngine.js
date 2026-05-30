// Match this month's transactions against a card's monthly credits to
// figure out which credits the user has already "used" and which are still
// on the table.
//
// A credit is considered USED if there's at least one matching transaction
// on the same credit-card account in the current calendar month — even if
// the user spent less than the credit amount. (Amex's actual behavior is
// "spend $1 at Dunkin, the credit triggers and you get $7 back.")

import { CARD_PERKS } from '../data/cardPerks';

function currentMonthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startIso: start.toISOString().slice(0, 10),
    endIso: end.toISOString().slice(0, 10),
    daysLeft: Math.max(0, Math.ceil((end - now) / 86400000)),
    monthLabel: now.toLocaleString('en-US', { month: 'long' }),
  };
}

// For one credit account + the user's full transaction list, return:
//   {
//     productId,
//     card,                  // the full CARD_PERKS entry
//     credits: [{ id, label, amount, used, sampleTxn }],
//     usedTotal, unusedTotal, totalPotential,
//     monthLabel, daysLeft,
//   }
// Returns null if productId is not in CARD_PERKS.
export function computeCardPerks({ productId, account, transactions }) {
  const card = CARD_PERKS[productId];
  if (!card) return null;
  const { startIso, endIso, daysLeft, monthLabel } = currentMonthBounds();

  // Only this account's transactions, only this calendar month, only
  // outgoing charges (amount > 0). Refunds and inbound credits don't count.
  const monthTxns = (transactions || []).filter((t) => (
    t.account_id === account.id
    && Number(t.amount) > 0
    && t.date >= startIso
    && t.date <= endIso
  ));

  let usedTotal = 0;
  const credits = card.monthlyCredits.map((c) => {
    const sample = monthTxns.find((t) => c.detect(t));
    const used = Boolean(sample);
    if (used) usedTotal += Number(c.amount);
    return {
      id: c.id,
      label: c.label,
      amount: Number(c.amount),
      used,
      sampleTxn: sample || null,
    };
  });

  const totalPotential = credits.reduce((s, c) => s + c.amount, 0);
  const unusedTotal = totalPotential - usedTotal;

  return {
    productId,
    card,
    credits,
    usedTotal,
    unusedTotal,
    totalPotential,
    monthLabel,
    daysLeft,
  };
}
