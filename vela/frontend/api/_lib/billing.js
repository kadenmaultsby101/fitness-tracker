import { supabaseAdmin } from './auth.js';

// Master switch, mirrors src/lib/plan.js. While false, everyone is Pro
// (no charging, nothing gated) — friends-and-family testing. Flip to true
// (and set STRIPE_* env vars) to enforce the paywall at launch.
export const PAYWALL_ENABLED = true;

// Sage daily message caps by plan.
export const SAGE_LIMITS = { free: 5, pro: 50 };

// Returns the effective plan for a user: 'pro' when the paywall is off or
// the profile is on the pro plan, else 'free'.
export async function getUserPlan(userId) {
  if (!PAYWALL_ENABLED) return 'pro';
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .maybeSingle();
  return data?.plan === 'pro' ? 'pro' : 'free';
}
