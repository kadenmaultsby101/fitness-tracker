import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
} from 'plaid';
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

// ─── HELPERS ────────────────────────────────────────────────────────────────

function isoDateOffset(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function plaidErrorMessage(err) {
  return (
    err?.response?.data?.error_message ||
    err?.response?.data?.error_code ||
    err?.message ||
    'Unknown Plaid error'
  );
}

// Map Plaid's account.account_id → our accounts.id (UUID).
async function mapPlaidAccountIds(userId, plaidAccountIds) {
  if (plaidAccountIds.length === 0) return {};
  const { data, error } = await supabase
    .from('accounts')
    .select('id, plaid_account_id')
    .eq('user_id', userId)
    .in('plaid_account_id', plaidAccountIds);
  if (error) throw error;
  return Object.fromEntries(data.map((r) => [r.plaid_account_id, r.id]));
}

// Fetch up to ~500 transactions from Plaid across the given date range.
async function fetchAllTransactions(accessToken, startDate, endDate) {
  const pageSize = 500;
  const out = [];
  let offset = 0;
  while (true) {
    const { data } = await plaid.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: { count: pageSize, offset },
    });
    out.push(...data.transactions);
    if (out.length >= data.total_transactions) break;
    offset += pageSize;
    if (offset > 5000) break; // safety
  }
  return out;
}

async function upsertAccountsFromPlaid(userId, plaidItemRowId, plaidAccounts) {
  if (plaidAccounts.length === 0) return [];
  const rows = plaidAccounts.map((a) => ({
    user_id: userId,
    plaid_item_id: plaidItemRowId,
    plaid_account_id: a.account_id,
    name: a.name,
    official_name: a.official_name,
    type: a.type,
    subtype: a.subtype,
    balance_current: a.balances?.current ?? null,
    balance_available: a.balances?.available ?? null,
    currency: a.balances?.iso_currency_code || 'USD',
    mask: a.mask,
    updated_at: new Date().toISOString(),
  }));
  const { data, error } = await supabase
    .from('accounts')
    .upsert(rows, { onConflict: 'plaid_account_id' })
    .select('id, plaid_account_id');
  if (error) throw error;
  return data;
}

async function upsertTransactionsFromPlaid(userId, plaidTxns) {
  if (plaidTxns.length === 0) return 0;
  const plaidAccountIds = [...new Set(plaidTxns.map((t) => t.account_id))];
  const accountIdMap = await mapPlaidAccountIds(userId, plaidAccountIds);

  const rows = plaidTxns
    .map((t) => {
      const accountId = accountIdMap[t.account_id];
      if (!accountId) return null;
      const [primary, secondary] = t.category || [];
      return {
        user_id: userId,
        account_id: accountId,
        plaid_transaction_id: t.transaction_id,
        name: t.name,
        merchant_name: t.merchant_name,
        amount: t.amount,
        category: primary || null,
        subcategory: secondary || null,
        date: t.date,
        pending: Boolean(t.pending),
      };
    })
    .filter(Boolean);

  if (rows.length === 0) return 0;

  const { error } = await supabase
    .from('transactions')
    .upsert(rows, { onConflict: 'plaid_transaction_id' });
  if (error) throw error;
  return rows.length;
}

// ─── PLAID ENDPOINTS (Prompt 5) ─────────────────────────────────────────────

app.post('/api/plaid/create-link-token', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const { data } = await plaid.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: 'Vela',
      products: [Products.Auth, Products.Transactions, Products.Investments],
      country_codes: [CountryCode.Us],
      language: 'en',
    });

    res.json({ link_token: data.link_token, expiration: data.expiration });
  } catch (err) {
    console.error('[plaid] create-link-token failed', plaidErrorMessage(err));
    res.status(500).json({ error: plaidErrorMessage(err) });
  }
});

app.post('/api/plaid/exchange-token', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const { public_token, institution } = req.body || {};
    if (!public_token) return res.status(400).json({ error: 'public_token required' });

    // 1. Exchange public → access token
    const { data: exch } = await plaid.itemPublicTokenExchange({ public_token });
    const accessToken = exch.access_token;
    const plaidItemId = exch.item_id;

    // 2. Save the plaid_item row
    const { data: itemRow, error: itemErr } = await supabase
      .from('plaid_items')
      .insert({
        user_id: user.id,
        plaid_item_id: plaidItemId,
        plaid_access_token: accessToken,
        institution_name: institution?.name || 'Unknown',
        institution_id: institution?.institution_id || null,
      })
      .select('id')
      .single();
    if (itemErr) throw itemErr;

    // 3. Pull accounts and save them
    const { data: acc } = await plaid.accountsGet({ access_token: accessToken });
    await upsertAccountsFromPlaid(user.id, itemRow.id, acc.accounts);

    // 4. Pull last 30 days of transactions and save them
    const start = isoDateOffset(-30);
    const end = isoDateOffset(0);
    let txnCount = 0;
    try {
      const txns = await fetchAllTransactions(accessToken, start, end);
      txnCount = await upsertTransactionsFromPlaid(user.id, txns);
    } catch (txErr) {
      // Plaid sometimes returns PRODUCT_NOT_READY for fresh sandbox items —
      // accounts are saved; transactions will fill in on first /api/sync.
      console.warn('[plaid] transactionsGet (initial) failed', plaidErrorMessage(txErr));
    }

    res.json({
      success: true,
      institution: institution?.name || 'Unknown',
      accounts: acc.accounts.length,
      transactions: txnCount,
    });
  } catch (err) {
    console.error('[plaid] exchange-token failed', plaidErrorMessage(err));
    res.status(500).json({ error: plaidErrorMessage(err) });
  }
});

app.post('/api/sync', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const { data: items, error: itemsErr } = await supabase
      .from('plaid_items')
      .select('id, plaid_access_token, institution_name')
      .eq('user_id', user.id);
    if (itemsErr) throw itemsErr;

    if (!items || items.length === 0) {
      return res.json({ success: true, new_transactions: 0, items: 0 });
    }

    const start = isoDateOffset(-7);
    const end = isoDateOffset(0);
    let newTxns = 0;

    for (const item of items) {
      try {
        // Refresh balances
        const { data: acc } = await plaid.accountsGet({
          access_token: item.plaid_access_token,
        });
        await upsertAccountsFromPlaid(user.id, item.id, acc.accounts);

        // Pull recent transactions
        const txns = await fetchAllTransactions(item.plaid_access_token, start, end);
        newTxns += await upsertTransactionsFromPlaid(user.id, txns);
      } catch (itemErr) {
        console.warn(
          `[plaid] sync failed for item ${item.id} (${item.institution_name})`,
          plaidErrorMessage(itemErr)
        );
      }
    }

    res.json({ success: true, new_transactions: newTxns, items: items.length });
  } catch (err) {
    console.error('[plaid] sync failed', plaidErrorMessage(err));
    res.status(500).json({ error: plaidErrorMessage(err) });
  }
});

// ─── START ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[vela] backend listening on :${PORT} (plaid_env=${PLAID_ENV})`);
});

export default app;
