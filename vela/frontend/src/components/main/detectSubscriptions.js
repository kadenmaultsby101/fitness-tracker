// Detect recurring charges (subscriptions) from the loaded transactions.
// Pure frontend — operates on the 500 txns useFinancialData already holds.
// A merchant is "recurring" when it has 2+ outflow charges of a consistent
// amount at a roughly regular cadence (weekly / monthly / yearly).

function normalize(t) {
  return (t.merchant_name || t.name || '').trim().toLowerCase();
}

function median(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// Classify a median day-gap into a cadence + monthly multiplier.
function cadenceFor(gapDays) {
  if (gapDays >= 5 && gapDays <= 9) return { cadence: 'Weekly', perMonth: 4.33 };
  if (gapDays >= 12 && gapDays <= 16) return { cadence: 'Every 2 weeks', perMonth: 2.17 };
  if (gapDays >= 25 && gapDays <= 35) return { cadence: 'Monthly', perMonth: 1 };
  if (gapDays >= 58 && gapDays <= 70) return { cadence: 'Every 2 months', perMonth: 0.5 };
  if (gapDays >= 85 && gapDays <= 100) return { cadence: 'Quarterly', perMonth: 1 / 3 };
  if (gapDays >= 350 && gapDays <= 380) return { cadence: 'Yearly', perMonth: 1 / 12 };
  return null;
}

export function detectSubscriptions(transactions = []) {
  const groups = {};
  for (const t of transactions) {
    if (Number(t.amount) <= 0) continue; // outflows only
    const key = normalize(t);
    if (!key) continue;
    (groups[key] ||= []).push(t);
  }

  const subs = [];
  for (const txns of Object.values(groups)) {
    if (txns.length < 2) continue;

    const amounts = txns.map((t) => Number(t.amount));
    const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    if (avg <= 0) continue;

    // Amounts must be consistent (within ~15% of the average).
    const consistent = amounts.every((a) => Math.abs(a - avg) <= avg * 0.15);
    if (!consistent) continue;

    // Cadence from the median gap between charge dates.
    const dates = txns.map((t) => new Date(t.date).getTime()).sort((a, b) => a - b);
    const gaps = [];
    for (let i = 1; i < dates.length; i++) {
      gaps.push((dates[i] - dates[i - 1]) / 86400000);
    }
    const medGap = median(gaps);
    const cad = cadenceFor(medGap);
    if (!cad) continue;

    const sample = txns.reduce((a, b) => (a.date > b.date ? a : b));
    subs.push({
      merchant: sample.merchant_name || sample.name,
      sample,
      amount: avg,
      cadence: cad.cadence,
      monthlyEstimate: avg * cad.perMonth,
      count: txns.length,
      lastDate: sample.date,
    });
  }

  subs.sort((a, b) => b.monthlyEstimate - a.monthlyEstimate);
  const monthlyTotal = subs.reduce((s, x) => s + x.monthlyEstimate, 0);
  return { subscriptions: subs, monthlyTotal };
}
