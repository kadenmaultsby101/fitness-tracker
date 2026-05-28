// Single source of truth for Pro-plan gating on the frontend.
//
// PAYWALL_ENABLED is the master switch. While false (friends-and-family
// testing) everyone is treated as Pro so nothing is blocked. Flip to true
// — and set the Stripe env vars on the backend — to start charging.
export const PAYWALL_ENABLED = true;

export const PRO_PRICE_LABEL = '$9.99/mo or $79/yr';

export function isPro(profile) {
  if (!PAYWALL_ENABLED) return true;
  // Dev-only preview override: lets you see the non-Pro / paywall experience
  // without touching the database. In the browser console run
  //   localStorage.setItem('vela:forceFree', '1')   // then refresh
  // and to restore Pro:
  //   localStorage.removeItem('vela:forceFree')      // then refresh
  if (import.meta.env.DEV) {
    try {
      if (localStorage.getItem('vela:forceFree') === '1') return false;
    } catch { /* private mode — ignore */ }
  }
  return profile?.plan === 'pro';
}
