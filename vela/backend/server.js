import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// ─── ENV ────────────────────────────────────────────────────────────────────
const {
  PORT = 4000,
  PLAID_CLIENT_ID,
  PLAID_SECRET,
  PLAID_ENV = 'sandbox',
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  ANTHROPIC_API_KEY,
  CORS_ORIGINS = 'http://localhost:5173',
} = process.env;

const warnIfMissing = (name, value) => {
  if (!value) console.warn(`[vela] ${name} is not set — related endpoints will fail until provided.`);
};
warnIfMissing('PLAID_CLIENT_ID', PLAID_CLIENT_ID);
warnIfMissing('PLAID_SECRET', PLAID_SECRET);
warnIfMissing('SUPABASE_URL', SUPABASE_URL);
warnIfMissing('SUPABASE_SERVICE_KEY', SUPABASE_SERVICE_KEY);
warnIfMissing('ANTHROPIC_API_KEY', ANTHROPIC_API_KEY);

// ─── CLIENTS ────────────────────────────────────────────────────────────────
export const plaid = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[PLAID_ENV] ?? PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
        'PLAID-SECRET': PLAID_SECRET,
      },
    },
  })
);

export const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// Fall back to placeholders so missing env vars don't crash the process at
// import time — endpoints that touch Supabase will fail at request time with
// a clearer error (caught in getUser / route handlers).
export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_SERVICE_KEY || 'placeholder',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// ─── APP ────────────────────────────────────────────────────────────────────
const app = express();

const allowedOrigins = CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin/no-origin (curl, server-to-server) and any allowed origin.
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      // Allow any *.vercel.app preview URL so preview deployments can hit the API.
      if (/\.vercel\.app$/.test(new URL(origin).hostname)) return cb(null, true);
      return cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: false,
  })
);
app.use(express.json({ limit: '1mb' }));

// ─── AUTH HELPER ────────────────────────────────────────────────────────────
/**
 * Reads the `Authorization: Bearer <jwt>` header, asks Supabase to verify it,
 * and returns the user object — or null if missing/invalid.
 */
export async function getUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

// ─── HEALTH CHECK ───────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    status: 'Vela backend running',
    plaid_env: PLAID_ENV,
    has_plaid: Boolean(PLAID_CLIENT_ID && PLAID_SECRET),
    has_supabase: Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY),
    has_anthropic: Boolean(ANTHROPIC_API_KEY),
  });
});

// ─── START ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[vela] backend listening on :${PORT} (plaid_env=${PLAID_ENV})`);
});

export default app;
