// Server-side Supabase admin client + Bearer-JWT user verifier.
// Shared across all Vercel Functions in /api. Uses the SERVICE_ROLE key
// which bypasses RLS for trusted server operations.

import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || 'placeholder',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export async function getUser(req) {
  const auth = req.headers.authorization || req.headers.Authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}
