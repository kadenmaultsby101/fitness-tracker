import { supabaseAdmin } from './auth.js';

export const money = (n) =>
  '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

// Pulls a user's full financial context once and returns both the raw data
// and the prompt-ready pieces shared by Sage (api/sage.js) and the proactive
// insights endpoint (api/insights.js). Single source of truth so both stay
// in sync. Plaid convention: transaction amount > 0 = outflow (spending).
export async function buildUserContext(userId) {
  const [profileRes, accountsRes, txnsRes, goalsRes, budgetsRes] = await Promise.all([
    supabaseAdmin.from('profiles')
      .select('name, monthly_income, onboarding_data')
      .eq('id', userId).maybeSingle(),
    supabaseAdmin.from('accounts')
      .select('name, type, subtype, balance_current, mask')
      .eq('user_id', userId),
    supabaseAdmin.from('transactions')
      .select('name, merchant_name, amount, category, subcategory, date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(300),
    supabaseAdmin.from('goals')
      .select('name, current_amount, target_amount, monthly_contribution')
      .eq('user_id', userId),
    supabaseAdmin.from('budgets')
      .select('category, monthly_limit, month_year')
      .eq('user_id', userId)
      .order('month_year', { ascending: false })
      .limit(20),
  ]);

  const profile = profileRes.data || {};
  const accounts = accountsRes.data || [];
  const transactions = txnsRes.data || [];
  const goals = goalsRes.data || [];
  const budgets = budgetsRes.data || [];

  const netWorth = accounts.reduce((s, a) => {
    const bal = Number(a.balance_current) || 0;
    const isDebt = a.type === 'credit' || a.type === 'loan';
    return s + (isDebt ? -bal : bal);
  }, 0);

  const firstName = (profile.name || '').split(' ')[0] || 'there';
  const ob = profile.onboarding_data || {};

  const catTotals = {};
  for (const t of transactions) {
    const amt = Number(t.amount) || 0;
    if (amt <= 0) continue;
    const cat = t.category || 'Other';
    if (!catTotals[cat]) catTotals[cat] = { total: 0, count: 0 };
    catTotals[cat].total += amt;
    catTotals[cat].count += 1;
  }
  const categorySummary = Object.entries(catTotals)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([cat, v]) => `- ${cat}: ${money(v.total)} across ${v.count} txn${v.count === 1 ? '' : 's'}`)
    .join('\n');

  // The shared, prompt-ready financial snapshot block.
  const contextBlock = `USER CONTEXT
- Name: ${profile.name || 'Unknown'}
- Net worth: ${money(netWorth)} across ${accounts.length} ${accounts.length === 1 ? 'account' : 'accounts'}
- Self-reported monthly income: ${profile.monthly_income ? money(profile.monthly_income) : 'not set'}${ob.age ? `\n- Age: ${ob.age}` : ''}${ob.situations?.length ? `\n- Life situation: ${ob.situations.join(', ')}` : ''}${ob.motivations?.length ? `\n- Why they use Vela: ${ob.motivations.join(', ')}` : ''}

ACCOUNTS (${accounts.length})
${accounts.length ? accounts.map((a) => `- ${a.name} (${a.subtype || a.type}): ${money(a.balance_current)}`).join('\n') : '- (none connected yet)'}

SPENDING BY CATEGORY (derived from the last ${transactions.length} transactions — authoritative pattern data)
${categorySummary || '- (no spending yet)'}

RECENT TRANSACTIONS (latest ${Math.min(transactions.length, 100)} line items)
${transactions.length ? transactions.slice(0, 100).map((t) => `- ${t.date} | ${t.merchant_name || t.name} | ${money(t.amount)} | ${t.category || 'Other'}`).join('\n') : '- (none logged yet)'}

GOALS (${goals.length})
${goals.length ? goals.map((g) => {
  const pct = g.target_amount ? Math.round(((g.current_amount || 0) / g.target_amount) * 100) : 0;
  return `- ${g.name}: ${money(g.current_amount)} / ${money(g.target_amount)} (${pct}%) at ${money(g.monthly_contribution)}/mo`;
}).join('\n') : '- (none yet)'}

BUDGETS (${budgets.length} categories tracked)
${budgets.length ? budgets.map((b) => `- ${b.category}: ${money(b.monthly_limit)}/mo (${b.month_year})`).join('\n') : '- (no budget set)'}`;

  return {
    profile, accounts, transactions, goals, budgets,
    netWorth, firstName, categorySummary, contextBlock,
    hasData: accounts.length > 0 || transactions.length > 0,
  };
}
