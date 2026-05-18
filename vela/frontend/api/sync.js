import { getUser, supabaseAdmin } from './_lib/auth.js';
import {
  plaid,
  plaidErrorMessage,
  isoDateOffset,
  upsertAccountsFromPlaid,
  fetchAllTransactions,
  upsertTransactionsFromPlaid,
} from './_lib/plaid.js';
import { CountryCode } from 'plaid';

export const config = { maxDuration: 60 };

// Self-heal: if an item is missing branding (logo/color) — either because it
// was created before migration 04, or because institutionsGetById was rate-
// limited during exchange — fetch it now and patch the row. Best-effort,
// silent on failure.
async function backfillBranding(item) {
  if (!item.institution_id) return;
  if (item.institution_logo && item.institution_color) return;
  try {
    const { data } = await plaid.institutionsGetById({
      institution_id: item.institution_id,
      country_codes: [CountryCode.Us],
      options: { include_optional_metadata: true },
    });
    const patch = {};
    if (!item.institution_logo && data?.institution?.logo) {
      patch.institution_logo = data.institution.logo;
    }
    if (!item.institution_color && data?.institution?.primary_color) {
      patch.institution_color = data.institution.primary_color;
    }
    if (Object.keys(patch).length > 0) {
      await supabaseAdmin.from('plaid_items').update(patch).eq('id', item.id);
      console.info(`[plaid] backfilled branding for ${item.institution_name}`, Object.keys(patch));
    }
  } catch (e) {
    console.warn('[plaid] branding backfill failed:', plaidErrorMessage(e));
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const { data: items, error: itemsErr } = await supabaseAdmin
      .from('plaid_items')
      .select('id, plaid_access_token, institution_name, institution_id, institution_logo, institution_color')
      .eq('user_id', user.id);
    if (itemsErr) throw itemsErr;

    if (!items || items.length === 0) {
      return res.status(200).json({ success: true, new_transactions: 0, items: 0 });
    }

    // 90-day rolling window. Idempotent upsert by plaid_transaction_id
    // makes re-fetching cheap; the wider window catches late-posted
    // credit card transactions (1-3 day post-swipe lag is common) and
    // back-fills if Plaid's initial pull hadn't finished at link time.
    const start = isoDateOffset(-90);
    const end = isoDateOffset(0);
    let newTxns = 0;
    let branded = 0;
    const pending = [];

    for (const item of items) {
      try {
        await backfillBranding(item);
        if (item.institution_logo || item.institution_color) branded += 1;

        const { data: acc } = await plaid.accountsGet({ access_token: item.plaid_access_token });
        console.info(`[plaid] sync: ${item.institution_name} returned ${acc.accounts.length} accounts`);
        await upsertAccountsFromPlaid(supabaseAdmin, user.id, item.id, acc.accounts);

        try {
          const txns = await fetchAllTransactions(item.plaid_access_token, start, end);
          newTxns += await upsertTransactionsFromPlaid(supabaseAdmin, user.id, txns);
        } catch (txErr) {
          const code = txErr?.response?.data?.error_code;
          if (code === 'PRODUCT_NOT_READY' || code === 'TRANSACTIONS_LIMIT') {
            // Plaid's initial pull for this item is still warming up. Common
            // for credit cards in the first 30 min after link.
            pending.push(item.institution_name);
            console.info(`[plaid] sync: ${item.institution_name} txns not ready yet (${code})`);
          } else {
            throw txErr;
          }
        }
      } catch (itemErr) {
        console.warn(
          `[plaid] sync failed for item ${item.id} (${item.institution_name})`,
          plaidErrorMessage(itemErr)
        );
      }
    }

    res.status(200).json({
      success: true,
      new_transactions: newTxns,
      items: items.length,
      branded,
      pending, // institution names whose initial transaction pull isn't ready
    });
  } catch (err) {
    console.error('[plaid] sync failed', plaidErrorMessage(err));
    res.status(500).json({ error: plaidErrorMessage(err) });
  }
}
