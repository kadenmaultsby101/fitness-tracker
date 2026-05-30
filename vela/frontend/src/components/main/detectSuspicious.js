// Detect transactions that look "off" so Sage can flag them on Home.
//
// CONSERVATIVE by design — a false alarm trains users to ignore the badge,
// so every rule has noise thresholds. Two detections for v1:
//
//   1. DUPLICATE — same merchant + same amount within 48 hours, ≥ $5
//   2. UNUSUALLY LARGE — charge is ≥ 3× the median of the last ≥5 charges
//      at that merchant, and the charge is ≥ $20
//
// Both detections only consider real expenses (amount > 0) and ignore
// transfers, paydowns, and refunds.

function normalize(t) {
  return (t.merchant_name || t.name || '').trim().toLowerCase();
}

function median(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function daysBetween(isoA, isoB) {
  const a = new Date(isoA + 'T00:00:00').getTime();
  const b = new Date(isoB + 'T00:00:00').getTime();
  return Math.abs(a - b) / 86400000;
}

function hoursBetween(isoA, isoB) {
  return daysBetween(isoA, isoB) * 24;
}

// IMPORTANT — KNOWN LIMITATION
// Our transactions table only stores the posted DATE (YYYY-MM-DD), with no
// time-of-day. That means we genuinely cannot distinguish "two charges 6
// minutes apart at Raising Cane's" (real glitch) from "lunch and dinner at
// Raising Cane's" (legit, common). The proper fix is a follow-up project:
// add authorized_datetime to the transactions table, update the Plaid sync
// to fill it, and update useFinancialData's select. Until that's done we
// stay ULTRA-CONSERVATIVE — flag only patterns that almost always indicate
// a real problem, even if we miss some real glitches.
//
// What we flag now (v3 — strict):
//   - CROSS-DAY ONLY: same merchant + same cents amount, 1-3 days apart,
//     amount ≥ $30. (Classic posting-glitch / pending-vs-posted-ghost
//     pattern; rare for legit repeat purchases of identical price.)
//   - UNUSUALLY LARGE: charge ≥ 4× the median of ≥8 prior charges at that
//     merchant, amount ≥ $30. (User explicitly wants this surfaced.)
//
// What we explicitly DON'T flag anymore:
//   - Same-day duplicates of any count — too noisy without time data
//     (cane's lunch+dinner, multiple Starbucks runs, etc.)
const MIN_DUPLICATE_AMOUNT = 30;
const DUPLICATE_CROSS_DAY_MAX = 3;
const MIN_LARGE_AMOUNT = 30;
const LARGE_MULTIPLE = 4;
const MIN_HISTORY_FOR_LARGE = 8;
const ONLY_FLAG_LAST_DAYS = 30;

export function detectSuspicious(transactions = []) {
  const expenses = transactions.filter((t) => Number(t.amount) > 0);
  const today = new Date().toISOString().slice(0, 10);
  const cutoffIso = (() => {
    const d = new Date();
    d.setDate(d.getDate() - ONLY_FLAG_LAST_DAYS);
    return d.toISOString().slice(0, 10);
  })();

  const flagged = [];
  const seen = new Set(); // dedupe by txn id so a row isn't double-flagged

  // ---------- DUPLICATE PASS ----------
  // Group by normalized merchant. Within each merchant, group same-amount
  // charges. Two same-day repeats are NOT flagged (legit double-spend); we
  // only flag (a) cross-day repeats 1-N days apart, or (b) 3+ identical
  // same-day charges.
  const byMerchant = new Map();
  for (const t of expenses) {
    const k = normalize(t);
    if (!byMerchant.has(k)) byMerchant.set(k, []);
    byMerchant.get(k).push(t);
  }
  for (const txns of byMerchant.values()) {
    // Group same-amount charges (round to cents).
    const byCents = new Map();
    for (const t of txns) {
      const c = Math.round(Number(t.amount) * 100);
      if (c < MIN_DUPLICATE_AMOUNT * 100) continue;
      if (t.date < cutoffIso) continue;
      if (!byCents.has(c)) byCents.set(c, []);
      byCents.get(c).push(t);
    }
    for (const group of byCents.values()) {
      if (group.length < 2) continue;
      // Sort oldest → newest.
      group.sort((a, b) => a.date.localeCompare(b.date));
      // CROSS-DAY duplicates within DUPLICATE_CROSS_DAY_MAX. Same-day
      // pairs are intentionally skipped — too noisy without time data.
      for (let i = 0; i < group.length - 1; i++) {
        const older = group[i];
        for (let j = i + 1; j < group.length; j++) {
          const newer = group[j];
          if (older.date === newer.date) continue;
          const days = daysBetween(older.date, newer.date);
          if (days > DUPLICATE_CROSS_DAY_MAX) break;
          if (seen.has(newer.id)) continue;
          seen.add(newer.id);
          const dLabel = days < 1.5 ? '1 day' : `${Math.round(days)} days`;
          flagged.push({
            txn: newer,
            reason: 'duplicate',
            message: `Same charge ${dLabel} after the original — possible duplicate posting.`,
            severity: 'warn',
            related: older.id,
          });
        }
      }
    }
  }

  // ---------- LARGE-OUTLIER PASS ----------
  // For each merchant with enough history, flag charges ≥ LARGE_MULTIPLE ×
  // the median of all prior amounts at that merchant.
  for (const txns of byMerchant.values()) {
    if (txns.length < MIN_HISTORY_FOR_LARGE + 1) continue;
    // Sort oldest → newest so we can build a rolling baseline.
    const sorted = [...txns].sort((a, b) => a.date.localeCompare(b.date));
    const history = sorted.slice(0, sorted.length - 1).map((t) => Number(t.amount));
    const med = median(history);
    if (med <= 0) continue;
    for (const t of sorted) {
      const amt = Number(t.amount);
      if (amt < MIN_LARGE_AMOUNT) continue;
      if (t.date < cutoffIso) continue;
      if (amt < med * LARGE_MULTIPLE) continue;
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      flagged.push({
        txn: t,
        reason: 'unusually_large',
        message: `${formatMoney(amt)} — about ${Math.round(amt / med)}× your usual ${formatMoney(med)} at this merchant.`,
        severity: 'info',
      });
    }
  }

  // Sort newest first so the Home card surfaces the most recent items.
  flagged.sort((x, y) => y.txn.date.localeCompare(x.txn.date));
  return flagged;
}

// Build a Set of flagged txn IDs for cheap lookup when rendering rows.
export function flaggedIdSet(flags) {
  return new Set(flags.map((f) => f.txn.id));
}

function formatMoney(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
}
