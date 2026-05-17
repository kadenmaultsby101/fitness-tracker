// API base URL.
//
// Backend now lives as Vercel Serverless Functions in the SAME project at
// /api/*. Same origin as the frontend — no CORS, no cross-domain.
//
// VITE_API_URL env var only wins if it's BOTH set AND not the stale Render
// URL we abandoned. (Old Vercel env vars that still point at
// vela-backend-w8q8.onrender.com would otherwise route us back to the dead
// backend that's been the source of every Plaid bug today.)

const envApi = (import.meta.env.VITE_API_URL || '').trim();
const stale = /onrender\.com$/i.test(new URL(envApi || 'http://x/', 'http://x').hostname);

export const API = envApi && !stale ? envApi : '';

// Always true when running in the browser — same-origin /api/* is always
// available as long as Vela is served from Vercel.
export const BACKEND_AVAILABLE = true;

if (typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.info('[vela] API base', {
    using: API || '(same-origin /api)',
    from_env: Boolean(envApi),
    env_was_stale: stale,
  });
}
