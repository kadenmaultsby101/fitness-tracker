import { getUser, supabaseAdmin } from '../_lib/auth.js';
import { plaid, plaidErrorMessage } from '../_lib/plaid.js';

export const config = { maxDuration: 30 };

// Disconnect a linked institution: tell Plaid to remove the item (stops
// billing + access), then delete our plaid_items row. The accounts and
// transactions FK-cascade on delete, so they go too.
export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const itemId = req.body?.item_id || req.query?.item_id;
    if (!itemId) return res.status(400).json({ error: 'item_id required' });

    // Verify the item belongs to this user before touching it.
    const { data: item, error: itemErr } = await supabaseAdmin
      .from('plaid_items')
      .select('id, plaid_access_token, institution_name')
      .eq('id', itemId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (itemErr) throw itemErr;
    if (!item) return res.status(404).json({ error: 'account not found' });

    // Best-effort Plaid item removal — even if this fails (e.g. token
    // already invalid) we still remove our local rows so the user gets
    // what they asked for.
    try {
      await plaid.itemRemove({ access_token: item.plaid_access_token });
    } catch (plaidErr) {
      console.warn('[plaid] itemRemove failed (continuing with local delete):', plaidErrorMessage(plaidErr));
    }

    const { error: delErr } = await supabaseAdmin
      .from('plaid_items')
      .delete()
      .eq('id', item.id)
      .eq('user_id', user.id);
    if (delErr) throw delErr;

    return res.status(200).json({ success: true, removed: item.institution_name });
  } catch (err) {
    console.error('[plaid] remove-item failed', plaidErrorMessage(err));
    return res.status(500).json({ error: plaidErrorMessage(err) });
  }
}
