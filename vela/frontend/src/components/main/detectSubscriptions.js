// Detect recurring charges (subscriptions) from the loaded transactions.
// STRICT by design: we'd rather miss a real subscription than invent one.
// A subscription requires the SAME merchant + the EXACT same amount + at
// least 3 occurrences at a consistent regular cadence (every gap inside a
// tight window). Coincidental repeat purchases (two same-price lunches a
// month apart) are rejected because they rarely hit 3 identical-amount,
// evenly-spaced charges.

function normalize(t) {
  return (t.merchant_name || t.name || '').trim().toLowerCase();
}

// Round to cents so float noise doesn't split a group.
function cents(n) {
  return Math.round(Number(n) * 100);
}

function median(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// Tight cadence windows. A group qualifies only if EVERY gap falls inside
// one window. perMonth converts the charge amount to a monthly estimate.
const CADENCES = [
  { cadence: 'Weekly', lo: 6, hi: 8, perMonth: 4.33 },
  { cadence: 'Every 2 weeks', lo: 13, hi: 15, perMonth: 2.17 },
  { cadence: 'Monthly', lo: 27, hi: 33, perMonth: 1 },
  { cadence: 'Quarterly', lo: 88, hi: 95, perMonth: 1 / 3 },
  { cadence: 'Yearly', lo: 360, hi: 370, perMonth: 1 / 12 },
];

export function detectSubscriptions(transactions = []) {
  // Group by merchant + exact amount (cents).
  const groups = {};
  for (const t of transactions) {
    if (Number(t.amount) <= 0) continue; // outflows only
    const merchant = normalize(t);
    if (!merchant) continue;
    const key = `${merchant}|${cents(t.amount)}`;
    (groups[key] ||= []).push(t);
  }

  const subs = [];
  for (const txns of Object.values(groups)) {
    if (txns.length < 3) continue; // need strong repetition

    const dates = [...new Set(txns.map((t) => t.date))]
      .map((d) => new Date(d).getTime())
      .sort((a, b) => a - b);
    if (dates.length < 3) continue; // distinct charge dates

    const gaps = [];
    for (let i = 1; i < dates.length; i++) gaps.push((dates[i] - dates[i - 1]) / 86400000);

    const med = median(gaps);
    const cad = CADENCES.find((c) => med >= c.lo && med <= c.hi);
    if (!cad) continue;
    // STRICT: every gap must sit inside the same window, not just the median.
    if (!gaps.every((g) => g >= cad.lo && g <= cad.hi)) continue;

    const amount = Number(txns[0].amount);
    const sample = txns.reduce((a, b) => (a.date > b.date ? a : b));
    subs.push({
      merchant: sample.merchant_name || sample.name,
      sample,
      amount,
      cadence: cad.cadence,
      monthlyEstimate: amount * cad.perMonth,
      count: dates.length,
      lastDate: sample.date,
    });
  }

  subs.sort((a, b) => b.monthlyEstimate - a.monthlyEstimate);
  const monthlyTotal = subs.reduce((s, x) => s + x.monthlyEstimate, 0);
  return { subscriptions: subs, monthlyTotal };
}
