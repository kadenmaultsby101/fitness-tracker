// Single source of truth for Pro-plan gating on the frontend.
//
// PAYWALL_ENABLED is the master switch. While false (friends-and-family
// testing) everyone is treated as Pro so nothing is blocked. Flip to true
// — and set the Stripe env vars on the backend — to start charging.
export const PAYWALL_ENABLED = false;

export const PRO_PRICE_LABEL = '$7.99/mo';

export function isPro(profile) {
  if (!PAYWALL_ENABLED) return true;
  return profile?.plan === 'pro';
}
