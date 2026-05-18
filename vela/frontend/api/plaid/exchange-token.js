import { getUser, supabaseAdmin } from '../_lib/auth.js';
import {
  plaid,
  plaidErrorMessage,
  isoDateOffset,
  upsertAccountsFromPlaid,
  fetchAllTransactions,
  upsertTransactionsFromPlaid,
} from '../_lib/plaid.js';
import { CountryCode } from 'plaid';

export const config = { maxDuration: 60 };

// Fetch institution branding (logo as base64, primary brand color as hex).
// Returns { logo, color } — both nullable if Plaid doesn't have them or
// the call fails (non-fatal).
async function fetchInstitutionBranding(institutionId) {
  if (!institutionId) return { logo: null, color: null };
  try {
    const { data } = await plaid.institutionsGetById({
      institution_id: institutionId,
      country_codes: [CountryCode.Us],
      options: { include_optional_metadata: true },
    });
    return {
      logo: data?.institution?.logo || null,
      color: data?.institution?.primary_color || null,
    };
  } catch (e) {
    console.warn('[plaid] institutionsGetById failed (non-fatal):', plaidErrorMessage(e));
    return { logo: null, color: null };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const { public_token, institution } = req.body || {};
    if (!public_token) return res.status(400).json({ error: 'public_token required' });

    const { data: exch } = await plaid.itemPublicTokenExchange({ public_token });
    const accessToken = exch.access_token;
    const plaidItemId = exch.item_id;

    const branding = await fetchInstitutionBranding(institution?.institution_id);

    const { data: itemRow, error: itemErr } = await supabaseAdmin
      .from('plaid_items')
      .insert({
        user_id: user.id,
        plaid_item_id: plaidItemId,
        plaid_access_token: accessToken,
        institution_name: institution?.name || 'Unknown',
        institution_id: institution?.institution_id || null,
        institution_logo: branding.logo,
        institution_color: branding.color,
      })
      .select('id')
      .single();
    if (itemErr) throw itemErr;

    const { data: acc } = await plaid.accountsGet({ access_token: accessToken });
    await upsertAccountsFromPlaid(supabaseAdmin, user.id, itemRow.id, acc.accounts);

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
