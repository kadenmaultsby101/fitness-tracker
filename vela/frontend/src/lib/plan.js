// Single source of truth for Pro-plan gating on the frontend.
//
// PAYWALL_ENABLED is the master switch. While false (friends-and-family
// testing) everyone is treated as Pro so nothing is blocked. Flip to true
// — and set the Stripe env vars on the backend — to start charging.
export const PAYWALL_ENABLED = true;

export const PRO_PRICE_LABEL = '$9.99/mo or $79/yr';

// Admin email — sees admin-only previews (e.g. "Preview Free view" button)
// in the More page. Not a security boundary; it just hides operator-only UI
// from customers.
export const ADMIN_EMAIL = 'kaden.maultsby101@gmail.com';

export function isPro(profile) {
  if (!PAYWALL_ENABLED) return true;
  // Preview override: lets the operator (or anyone running locally) see the
  // non-Pro / paywall view without touching the database. Set via the
  // admin-only "Preview Free view" button on the More page, or manually:
  //   localStorage.setItem('vela:forceFree', '1')   // then refresh
  //   localStorage.removeItem('vela:forceFree')     // then refresh
  // The flag is per-browser, so it can't affect real customers.
  try {
    if (localStorage.getItem('vela:forceFree') === '1') return false;
  } catch { /* private mode — ignore */ }
  return profile?.plan === 'pro';
}
