import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log loudly on init so we can see in the browser console whether the
// client was constructed with valid env values. Sensitive: only the first
// 40 chars of the URL are logged, never the key.
if (typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.info('[vela] Supabase init', {
    has_url: Boolean(url),
    url_prefix: url ? url.slice(0, 40) + '…' : null,
    has_key: Boolean(key),
    key_format: key ? (key.startsWith('sb_publishable_') ? 'new-publishable' : key.startsWith('eyJ') ? 'legacy-jwt' : 'unknown') : null,
  });
}

if (!url || !key) {
  throw new Error(
    'Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel → Settings → Environment Variables.'
  );
}

// Default flowType (pkce) + detectSessionInUrl true is the right combo for
// email/password + email confirmation links. Don't override unless you have
// a specific reason — PR #14's flowType: 'implicit' broke session restore
// for tokens issued under the default flow.
export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
