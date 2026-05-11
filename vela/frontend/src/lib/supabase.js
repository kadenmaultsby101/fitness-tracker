import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    'Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in vela/frontend/.env.local'
  );
}

// detectSessionInUrl: true is REQUIRED for email-confirmation links to log
// users in. When the user clicks the link in their confirmation email,
// they land back on the app with the access+refresh tokens in the URL
// fragment; the client extracts and persists them automatically.
export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
  },
});
