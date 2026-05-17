// API base URL.
//
// Vela's backend now lives as Vercel Serverless Functions inside the SAME
// frontend project at /api/*. Same origin as the app — no CORS, no
// cross-domain anything. So the default base is empty (relative).
//
// VITE_API_URL env var still wins if set, in case someone wants to point at
// an external backend during local dev or a custom deploy.

export const API = import.meta.env.VITE_API_URL || '';

if (typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.info('[vela] API base', {
    using: API || '(same-origin /api)',
    from_env: Boolean(import.meta.env.VITE_API_URL),
  });
}
