import { getUser, supabaseAdmin } from './_lib/auth.js';
import {
  plaid,
  plaidErrorMessage,
  isoDateOffset,
  upsertAccountsFromPlaid,
  fetchAllTransactions,
  upsertTransactionsFromPlaid,
} from './_lib/plaid.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const { data: items, error: itemsErr } = await supabaseAdmin
      .from('plaid_items')
      .select('id, plaid_access_token, institution_name')
      .eq('user_id', user.id);
    if (itemsErr) throw itemsErr;

    if (!items || items.length === 0) {
      return res.status(200).json({ success: true, new_transactions: 0, items: 0 });
    }

    const start = isoDateOffset(-7);
    const end = isoDateOffset(0);
    let newTxns = 0;

    for (const item of items) {
      try {
        const { data: acc } = await plaid.accountsGet({ access_token: item.plaid_access_token });
        await upsertAccountsFromPlaid(supabaseAdmin, user.id, item.id, acc.accounts);

        const txns = await fetchAllTransactions(item.plaid_access_token, start, end);
        newTxns += await upsertTransactionsFromPlaid(supabaseAdmin, user.id, txns);
      } catch (itemErr) {
        console.warn(
          `[plaid] sync failed for item ${item.id} (${item.institution_name})`,
          plaidErrorMessage(itemErr)
        );
      }
    }

    res.status(200).json({ success: true, new_transactions: newTxns, items: items.length });
  } catch (err) {
    console.error('[plaid] sync failed', plaidErrorMessage(err));
    res.status(500).json({ error: plaidErrorMessage(err) });
  }
}
