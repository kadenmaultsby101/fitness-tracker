import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
} from 'plaid';

const PLAID_ENV = process.env.PLAID_ENV || 'sandbox';

export const plaid = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[PLAID_ENV] ?? PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
        'PLAID-SECRET': process.env.PLAID_SECRET,
      },
    },
  })
);

export { Products, CountryCode };

export function plaidErrorMessage(err) {
  return (
    err?.response?.data?.error_message ||
    err?.response?.data?.error_code ||
    err?.message ||
    'Unknown Plaid error'
  );
}

// Translate Plaid's transaction category (either the legacy "category" array
// or the newer personal_finance_category) into Vela's canonical category set.
// Vela categories: Housing, Food & Dining, Transport, Shopping, Subscriptions,
// Entertainment, Bills, Income, Investment, Other.
//
// We also pattern-match the merchant/name as a fallback for transactions
// where Plaid returns no category (common with debit card swipes).
const SUBSCRIPTION_MERCHANTS = /(netflix|hulu|spotify|apple\.com\/bill|youtube|disney|hbo|paramount|peacock|prime video|chatgpt|openai|claude|github|notion|figma|dropbox|icloud)/i;
const FOOD_MERCHANTS = /(starbucks|chipotle|chick-fil-a|mcdonald|wendy|burger king|taco bell|subway|domino|pizza|panera|sweetgreen|shake shack|cava|five guys|kfc|in.?n.?out|whataburger|dunkin|peet|blue bottle|cafe|coffee|restaurant|grill|kitchen|deli|bistro|brewery|bar |tavern|diner|eatery)/i;
const TRANSPORT_MERCHANTS = /(uber|lyft|chevron|shell|exxon|mobil|bp |speedway|sunoco|costco gas|wawa|7.eleven gas|valero|ampm|amtrak|delta air|united air|american air|southwest|jetblue|alaska air|spirit|frontier|airbnb|hotel|marriott|hilton|hyatt|holiday inn|sheraton|tesla supercharge|parking|toll|metro|transit|caltrain|bart)/i;
const SHOPPING_MERCHANTS = /(amazon|walmart|target|costco|best buy|home depot|lowe|ikea|macy|nordstrom|kohl|tj maxx|marshalls|ross|sephora|ulta|nike|adidas|lululemon|gap |old navy|h&m|zara|uniqlo|shein|temu|etsy)/i;
const HOUSING_MERCHANTS = /(rent|mortgage|hoa |property mgmt|landlord|leasing)/i;
const BILLS_MERCHANTS = /(verizon|t.mobile|at&t|sprint|xfinity|comcast|spectrum|att fiber|google fiber|pg&e|coned|duke energy|insurance|aetna|cigna|kaiser|unitedhealth|blue cross|blue shield|geico|allstate|state farm|progressive|hospital|clinic|pharmacy|cvs|walgreens|rite aid)/i;
const INVESTMENT_MERCHANTS = /(robinhood|fidelity|vanguard|schwab|coinbase|kraken|binance|wealthfront|betterment|m1 finance|public\.com)/i;

export function mapToVelaCategory(plaidPrimary, _plaidSecondary, name, merchantName) {
  const merchant = (merchantName || name || '').toLowerCase();

  // Merchant-name overrides win when present — Plaid's category buckets are
  // coarse and miss obvious things like "Starbucks → Food".
  if (FOOD_MERCHANTS.test(merchant)) return 'Food & Dining';
  if (SUBSCRIPTION_MERCHANTS.test(merchant)) return 'Subscriptions';
  if (TRANSPORT_MERCHANTS.test(merchant)) return 'Transport';
  if (HOUSING_MERCHANTS.test(merchant)) return 'Housing';
  if (BILLS_MERCHANTS.test(merchant)) return 'Bills';
  if (INVESTMENT_MERCHANTS.test(merchant)) return 'Investment';
  if (SHOPPING_MERCHANTS.test(merchant)) return 'Shopping';

  if (!plaidPrimary) return 'Other';
  const p = plaidPrimary.toLowerCase();
  if (p.includes('food') || p.includes('drink') || p.includes('restaurant')) return 'Food & Dining';
  if (p.includes('travel') || p.includes('transport')) return 'Transport';
  if (p.includes('shop') || p.includes('merchandise')) return 'Shopping';
  if (p.includes('recreation') || p.includes('entertainment')) return 'Entertainment';
  if (p.includes('rent') || p.includes('utilities') || p.includes('home_improvement')) return 'Housing';
  if (p.includes('service') || p.includes('payment') || p.includes('fees') ||
      p.includes('medical') || p.includes('healthcare') || p.includes('government')) return 'Bills';
  if (p.includes('transfer') || p.includes('loan_payment')) return 'Investment';
  if (p.includes('income') || p.includes('payroll')) return 'Income';
  return 'Other';
}

export function isoDateOffset(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function mapPlaidAccountIds(supabase, userId, plaidAccountIds) {
  if (plaidAccountIds.length === 0) return {};
  const { data, error } = await supabase
    .from('accounts')
    .select('id, plaid_account_id')
    .eq('user_id', userId)
    .in('plaid_account_id', plaidAccountIds);
  if (error) throw error;
  return Object.fromEntries(data.map((r) => [r.plaid_account_id, r.id]));
}

export async function fetchAllTransactions(accessToken, startDate, endDate) {
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
    if (offset > 5000) break;
  }
  return out;
}

export async function upsertAccountsFromPlaid(supabase, userId, plaidItemRowId, plaidAccounts) {
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

export async function upsertTransactionsFromPlaid(supabase, userId, plaidTxns) {
  if (plaidTxns.length === 0) return 0;
  const plaidAccountIds = [...new Set(plaidTxns.map((t) => t.account_id))];
  const accountIdMap = await mapPlaidAccountIds(supabase, userId, plaidAccountIds);

  const rows = plaidTxns
    .map((t) => {
      const accountId = accountIdMap[t.account_id];
      if (!accountId) return null;
      const [primary, secondary] = t.category || [];
      const velaCategory = mapToVelaCategory(primary, secondary, t.name, t.merchant_name);
      return {
        user_id: userId,
        account_id: accountId,
        plaid_transaction_id: t.transaction_id,
        name: t.name,
        merchant_name: t.merchant_name,
        amount: t.amount,
        category: velaCategory,
        subcategory: secondary || primary || null,
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
