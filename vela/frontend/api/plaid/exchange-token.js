import { getUser, supabaseAdmin } from '../_lib/auth.js';
import {
  plaid,
  plaidErrorMessage,
  isoDateOffset,
  upsertAccountsFromPlaid,
  fetchAllTransactions,
  upsertTransactionsFromPlaid,
} from '../_lib/plaid.js';

// Vercel function config: allow up to 60s for the initial Plaid call on
// Production (first transactionsGet can be slow).
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const { public_token, institution } = req.body || {};
    if (!public_token) return res.status(400).json({ error: 'public_token required' });

    // 1. Exchange public_token for permanent access_token
    const { data: exch } = await plaid.itemPublicTokenExchange({ public_token });
    const accessToken = exch.access_token;
    const plaidItemId = exch.item_id;

    // 2. Save plaid_items row
    const { data: itemRow, error: itemErr } = await supabaseAdmin
      .from('plaid_items')
      .insert({
        user_id: user.id,
        plaid_item_id: plaidItemId,
        plaid_access_token: accessToken,
        institution_name: institution?.name || 'Unknown',
        institution_id: institution?.institution_id || null,
      })
      .select('id')
      .single();
    if (itemErr) throw itemErr;

    // 3. Pull accounts and upsert
    const { data: acc } = await plaid.accountsGet({ access_token: accessToken });
    await upsertAccountsFromPlaid(supabaseAdmin, user.id, itemRow.id, acc.accounts);

    // 4. Try transactions inline (small enough to fit in 60s on most accounts).
    //    On Production, first transactionsGet can be slow — if it errors, we
    //    just log and continue. The frontend's auto-sync on next mount or
    //    manual Sync button will backfill anything missed (idempotent upsert).
    let txnCount = 0;
    try {
      const start = isoDateOffset(-30);
      const end = isoDateOffset(0);
      const txns = await fetchAllTransactions(accessToken, start, end);
      txnCount = await upsertTransactionsFromPlaid(supabaseAdmin, user.id, txns);
    } catch (txErr) {
      console.warn('[plaid] initial transactionsGet failed (will retry on sync):', plaidErrorMessage(txErr));
    }

    return res.status(200).json({
      success: true,
      institution: institution?.name || 'Unknown',
      accounts: acc.accounts.length,
      transactions: txnCount,
    });
  } catch (err) {
    console.error('[plaid] exchange-token failed', plaidErrorMessage(err));
    return res.status(500).json({ error: plaidErrorMessage(err) });
  }
}
