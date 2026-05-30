// Match a card's credits against the user's transactions for the
// appropriate billing period — monthly credits look at this month,
// semi-annual look at this half, etc.
//
// A credit is USED if there's at least one matching transaction on the same
// credit-card account in the current period, even if the spend is below the
// credit amount (mirrors how Amex actually triggers: spend $1 at Dunkin,
// the $7 credit fires).

import { CARD_PERKS } from '../data/cardPerks';

// Period bounds for each supported frequency. Always returns ISO dates
// (YYYY-MM-DD) suitable for our `date` column comparisons.
function periodFor(frequency) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0–11

  if (frequency === 'annual') {
    return makeBounds(new Date(y, 0, 1), new Date(y, 11, 31), `${y}`);
  }
  if (frequency === 'semi_annual') {
    const isFirstHalf = m < 6;
    const start = new Date(y, isFirstHalf ? 0 : 6, 1);
    const end = new Date(y, isFirstHalf ? 5 : 11, isFirstHalf ? 30 : 31);
    return makeBounds(start, end, isFirstHalf ? `Jan–Jun ${y}` : `Jul–Dec ${y}`);
  }
  if (frequency === 'quarterly') {
    const q = Math.floor(m / 3);                 // 0..3
    const start = new Date(y, q * 3, 1);
    const end = new Date(y, q * 3 + 3, 0);       // last day of quarter
    return makeBounds(start, end, `Q${q + 1} ${y}`);
  }
  // monthly (default)
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  return makeBounds(start, end, now.toLocaleString('en-US', { month: 'long' }));
}

function makeBounds(start, end, label) {
  const now = new Date();
  return {
    startIso: toIso(start),
    endIso:   toIso(end),
    daysLeft: Math.max(0, Math.ceil((end - now) / 86400000)),
    label,
  };
}

function toIso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// For one credit-card account + the user's full transaction list, return
// a fully-decorated view of each credit:
//   credits: [{ id, label, amount, frequency, period, used, sampleTxn }]
// plus card-level summaries computed against the *currently-active monthly
// window* (so "$X left this month" is consistent on the Home summary).
export function computeCardPerks({ productId, account, transactions }) {
  const card = CARD_PERKS[productId];
  if (!card) return null;
  const allTxns = (transactions || []).filter((t) => (
    t.account_id === account.id && Number(t.amount) > 0
  ));

  const credits = card.credits.map((c) => {
    const period = periodFor(c.frequency || 'monthly');
    const periodTxns = allTxns.filter((t) => t.date >= period.startIso && t.date <= period.endIso);
    const sample = periodTxns.find((t) => c.detect(t));
    return {
      id: c.id,
      label: c.label,
      amount: Number(c.amount),
      frequency: c.frequency || 'monthly',
      period,
      used: Boolean(sample),
      sampleTxn: sample || null,
    };
  });

  // Card-level summary numbers across all credits (any frequency).
  const totalPotential = credits.reduce((s, c) => s + c.amount, 0);
  const usedTotal      = credits.filter((c) => c.used).reduce((s, c) => s + c.amount, 0);
  const unusedTotal    = totalPotential - usedTotal;

  // Monthly-only summary for compact UIs.
  const monthly = credits.filter((c) => c.frequency === 'monthly');
  const monthlyPotential = monthly.reduce((s, c) => s + c.amount, 0);
  const monthlyUsed      = monthly.filter((c) => c.used).reduce((s, c) => s + c.amount, 0);
  const monthlyUnused    = monthlyPotential - monthlyUsed;

  return {
    productId,
    card,
    credits,
    usedTotal, unusedTotal, totalPotential,
    monthlyUsed, monthlyUnused, monthlyPotential,
  };
}

export function frequencyLabel(frequency, period) {
  if (frequency === 'monthly')     return period?.label || 'this month';
  if (frequency === 'quarterly')   return period?.label || 'this quarter';
  if (frequency === 'semi_annual') return period?.label || 'this half';
  if (frequency === 'annual')      return period?.label || 'this year';
  return period?.label || '';
}
