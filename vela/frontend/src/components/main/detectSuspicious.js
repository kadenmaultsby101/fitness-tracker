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

const MIN_DUPLICATE_AMOUNT = 5;
const DUPLICATE_WINDOW_DAYS = 2;       // within 48 hours
const MIN_LARGE_AMOUNT = 20;
const LARGE_MULTIPLE = 3;              // ≥ 3× median
const MIN_HISTORY_FOR_LARGE = 5;       // need 5+ prior charges to baseline
const ONLY_FLAG_LAST_DAYS = 30;        // don't pester about old stuff

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
  // Group by normalized merchant; within each group, find pairs of charges
  // that share the same cents amount and are within 48h.
  const byMerchant = new Map();
  for (const t of expenses) {
    const k = normalize(t);
    if (!byMerchant.has(k)) byMerchant.set(k, []);
    byMerchant.get(k).push(t);
  }
  for (const txns of byMerchant.values()) {
    for (let i = 0; i < txns.length; i++) {
      const a = txns[i];
      if (Number(a.amount) < MIN_DUPLICATE_AMOUNT) continue;
      if (a.date < cutoffIso) continue;
      for (let j = i + 1; j < txns.length; j++) {
        const b = txns[j];
        if (Math.round(Number(a.amount) * 100) !== Math.round(Number(b.amount) * 100)) continue;
        if (daysBetween(a.date, b.date) > DUPLICATE_WINDOW_DAYS) continue;
        // Flag the more recent one as the duplicate of the older one.
        const [older, newer] = a.date <= b.date ? [a, b] : [b, a];
        if (seen.has(newer.id)) continue;
        seen.add(newer.id);
        flagged.push({
          txn: newer,
          reason: 'duplicate',
          message: `Same charge twice in ${Math.round(daysBetween(older.date, newer.date)) || '<24'}h — possible duplicate.`,
          severity: 'warn',
          related: older.id,
        });
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
