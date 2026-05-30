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
    key_format: key
      ? (key.startsWith('sb_publishable_')
          ? 'new-publishable'
          : key.startsWith('eyJ')
            ? 'legacy-jwt'
            : 'unknown')
      : null,
  });
}

if (!url || !key) {
  throw new Error(
    'Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel → Settings → Environment Variables.'
  );
}

// Supabase JS v2 uses Web Locks API for cross-tab session sync by default.
// Multiple users have reported it deadlocking or hanging — symptom is
// auth.getSession() never resolving, which matches what we saw in
// production. Passing a no-op lock disables the cross-tab sync (acceptable
// for a personal app) and guarantees getSession() returns promptly.
const noopLock = async (_name, _acquireTimeout, fn) => fn();

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: noopLock,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

// Robust sign-out. The default global sign-out makes a server round-trip to
// revoke the session; if that request fails (offline, already-expired token,
// 403) supabase-js can throw and leave the local session in place, so the
// user appears "stuck" signed in. Scope 'local' clears the stored session
// without that dependency, and we hard-redirect in `finally` so the UI always
// resets to the auth screen no matter what.
export async function signOut() {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch (err) {
    console.error('[vela] signOut failed; clearing session locally anyway', err);
  } finally {
    if (typeof window !== 'undefined') window.location.replace('/');
  }
}
