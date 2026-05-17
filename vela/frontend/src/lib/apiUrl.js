// Single source of truth for the backend URL.
//
// Reads VITE_API_URL from the env at build time (set on Vercel). Falls back
// to the production Render URL so that if a deployment is missing the env
// var (e.g. a new Vercel project pointed at a custom domain that wasn't
// configured yet), the app STILL works instead of silently calling an empty
// host.
//
// Update PROD_API_URL only if the Render service URL ever changes.
const PROD_API_URL = 'https://vela-backend-w8q8.onrender.com';

export const API = (
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:4000'
    : PROD_API_URL)
);

// One-time log so we can see in the browser console which URL the app
// chose, and whether it came from env or fallback.
if (typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.info('[vela] API base', {
    using: API,
    from_env: Boolean(import.meta.env.VITE_API_URL),
  });
}
