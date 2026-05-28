import Stripe from 'stripe';
import { supabaseAdmin } from '../_lib/auth.js';

// Stripe needs the EXACT raw request bytes to verify the signature, so we
// disable Vercel's automatic body parsing and read the stream ourselves.
export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

async function setPlanByCustomer(stripe, customerId, plan, sub) {
  const patch = { plan };
  if (sub) {
    patch.subscription_status = sub.status;
    patch.current_period_end = sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null;
  }
  await supabaseAdmin.from('profiles').update(patch).eq('stripe_customer_id', customerId);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Billing not configured.' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let event;
  try {
    const raw = await readRawBody(req);
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[stripe] webhook signature failed', err?.message);
    return res.status(400).json({ error: 'invalid signature' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object;
        if (s.customer) {
          const sub = s.subscription
            ? await stripe.subscriptions.retrieve(s.subscription)
            : null;
          await setPlanByCustomer(stripe, s.customer, 'pro', sub);
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const active = ['active', 'trialing'].includes(sub.status);
        await setPlanByCustomer(stripe, sub.customer, active ? 'pro' : 'free', sub);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await setPlanByCustomer(stripe, sub.customer, 'free', sub);
        break;
      }
      default:
        break;
    }
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[stripe] webhook handler failed', err?.message);
    return res.status(500).json({ error: 'webhook handler error' });
  }
}
