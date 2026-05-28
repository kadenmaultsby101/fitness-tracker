import { getUser, supabaseAdmin } from './_lib/auth.js';

export const config = { maxDuration: 15 };

// Redeem a comp / access code → flips the user to Pro for free (no Stripe).
// Valid codes live in the VELA_COMP_CODES env var (comma-separated,
// case-insensitive), so they can be changed/revoked without a deploy.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const code = String(req.body?.code || '').trim().toLowerCase();
    if (!code) return res.status(400).json({ error: 'Enter a code.' });

    const valid = (process.env.VELA_COMP_CODES || '')
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);

    if (!valid.includes(code)) {
      return res.status(400).json({ error: 'That code isn\'t valid.' });
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ plan: 'pro', subscription_status: 'comp' })
      .eq('id', user.id);
    if (error) throw error;

    return res.status(200).json({ success: true, plan: 'pro' });
  } catch (err) {
    console.error('[redeem-code] failed', err?.message);
    return res.status(500).json({ error: 'Could not redeem code. Try again.' });
  }
}
