import { supabaseAdmin } from '../_lib/auth.js';

export const config = { maxDuration: 60 };

// Daily net-worth snapshotter. Triggered by Vercel Cron (see vercel.json).
// Loops every user that has at least one account, computes today's net worth
// from accounts.balance_current, and upserts one snapshot row per user.
// Idempotent on (user_id, captured_on) so a same-day re-run is a no-op.
//
// Auth: CRON_SECRET in the Authorization header (set in Vercel env vars).
// Vercel Cron automatically sends this when configured in vercel.json.
export default async function handler(req, res) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const got = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (got !== expected) return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC

    // Pull every account row. Small data even at thousands of users; we
    // aggregate in JS rather than per-user round-trips.
    const { data: accounts, error: accErr } = await supabaseAdmin
      .from('accounts')
      .select('user_id, type, balance_current');
    if (accErr) throw accErr;

    // Group by user → compute net worth + by_type breakdown.
    const byUser = new Map();
    for (const a of accounts || []) {
      const bal = Number(a.balance_current) || 0;
      const bucket = bucketFor(a.type);
      if (!byUser.has(a.user_id)) {
        byUser.set(a.user_id, { cash: 0, investments: 0, debt: 0 });
      }
      byUser.get(a.user_id)[bucket] += bal;
    }

    const rows = [];
    for (const [user_id, agg] of byUser.entries()) {
      const net = (agg.cash || 0) + (agg.investments || 0) - (agg.debt || 0);
      rows.push({
        user_id,
        captured_on: today,
        net_worth: round2(net),
        by_type: {
          cash: round2(agg.cash),
          investments: round2(agg.investments),
          debt: round2(agg.debt),
        },
      });
    }

    if (rows.length === 0) {
      return res.status(200).json({ ok: true, users: 0, captured_on: today });
    }

    // Upsert keyed on (user_id, captured_on). The unique index from
    // migration 08 makes this idempotent — same-day reruns are no-ops.
    const { error: upErr } = await supabaseAdmin
      .from('net_worth_snapshots')
      .upsert(rows, { onConflict: 'user_id,captured_on', ignoreDuplicates: false });
    if (upErr) throw upErr;

    return res.status(200).json({ ok: true, users: rows.length, captured_on: today });
  } catch (err) {
    console.error('[snapshot] run failed', err?.message);
    return res.status(500).json({ error: 'Snapshot run failed.' });
  }
}

function bucketFor(type) {
  if (type === 'credit' || type === 'loan') return 'debt';
  if (type === 'investment') return 'investments';
  return 'cash'; // depository, brokerage cash, anything else → cash
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}
