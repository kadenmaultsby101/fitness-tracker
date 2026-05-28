import Stripe from 'stripe';
import { getUser, supabaseAdmin } from '../_lib/auth.js';

export const config = { maxDuration: 30 };

// Opens the Stripe billing portal so a Pro user can manage / cancel their
// subscription. Returns the portal URL.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  try {
    if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'Billing not configured.' });
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile?.stripe_customer_id) return res.status(400).json({ error: 'no subscription found' });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = req.headers.origin || 'https://velaos.app';
    const portal = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/`,
    });
    return res.status(200).json({ url: portal.url });
  } catch (err) {
    console.error('[stripe] portal failed', err?.message);
    return res.status(500).json({ error: 'Could not open billing portal.' });
  }
}
