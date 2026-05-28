import Stripe from 'stripe';
import { getUser, supabaseAdmin } from '../_lib/auth.js';

export const config = { maxDuration: 30 };

// Creates a Stripe Checkout Session for a Vela Pro subscription and returns
// its URL. Reuses an existing stripe_customer_id when present, else creates
// a customer and stores it on the profile.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  try {
    const monthlyPrice = process.env.STRIPE_PRICE_ID;
    const annualPrice = process.env.STRIPE_PRICE_ID_ANNUAL;
    if (!process.env.STRIPE_SECRET_KEY || !monthlyPrice) {
      return res.status(503).json({ error: 'Billing not configured.' });
    }
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    // Pick monthly (default) or annual price.
    const interval = req.body?.interval === 'annual' ? 'annual' : 'monthly';
    const price = interval === 'annual' && annualPrice ? annualPrice : monthlyPrice;

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabaseAdmin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
    }

    const origin = req.headers.origin || 'https://velaos.app';
    const sessionObj = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      client_reference_id: user.id,
      success_url: `${origin}/?upgraded=1`,
      cancel_url: `${origin}/`,
      allow_promotion_codes: true,
    });

    return res.status(200).json({ url: sessionObj.url });
  } catch (err) {
    console.error('[stripe] checkout failed', err?.message);
    return res.status(500).json({ error: 'Could not start checkout.' });
  }
}
