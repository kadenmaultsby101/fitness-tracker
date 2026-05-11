import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const currentMonthYear = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const monthBounds = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
};

/**
 * Pulls everything we need to render the main app from Supabase.
 * Returns: { profile, accounts, transactions, goals, budgets, derived, loading, refresh }
 *
 * `derived` includes:
 *   - netWorth          sum of account.balance_current
 *   - monthIncome       sum of transactions with amount < 0 in current month
 *                       (Plaid convention: outflows positive, inflows negative)
 *   - monthSpent        sum of transactions with amount > 0 in current month
 *                       excluding investment-buy categories
 *   - monthInvested     sum of transactions categorized as investment in current month
 *   - byCategory        { category: spent } for current month
 */
export function useFinancialData() {
  const [profile, setProfile] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    const my = currentMonthYear();

    const [
      profileRes,
      accountsRes,
      txnsRes,
      goalsRes,
      budgetsRes,
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, name, monthly_income, onboarding_completed_at, notify_transactions, notify_weekly_summary, notify_ai_insights, two_factor_enabled')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('accounts')
        .select('id, plaid_account_id, plaid_item_id, name, official_name, type, subtype, balance_current, balance_available, currency, mask, updated_at')
        .eq('user_id', userId)
        .order('balance_current', { ascending: false, nullsFirst: false }),
      supabase
        .from('transactions')
        .select('id, account_id, plaid_transaction_id, name, merchant_name, amount, category, subcategory, date, pending')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(200),
      supabase
        .from('goals')
        .select('id, name, emoji, description, current_amount, target_amount, monthly_contribution, target_date, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),
      supabase
        .from('budgets')
        .select('id, category, monthly_limit, month_year')
        .eq('user_id', userId)
        .eq('month_year', my),
    ]);

    const firstError =
      profileRes.error || accountsRes.error || txnsRes.error || goalsRes.error || budgetsRes.error;
    if (firstError) {
      console.error('useFinancialData error', firstError);
      setError(firstError.message);
    }

    setProfile(profileRes.data || null);
    setAccounts(accountsRes.data || []);
    setTransactions(txnsRes.data || []);
    setGoals(goalsRes.data || []);
    setBudgets(budgetsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const derived = derive({ accounts, transactions });

  return {
    profile,
    accounts,
    transactions,
    goals,
    budgets,
    derived,
    loading,
    error,
    refresh: load,
  };
}

function derive({ accounts, transactions }) {
  const netWorth = accounts.reduce((s, a) => s + (Number(a.balance_current) || 0), 0);

  const { start, end } = monthBounds();
  const inMonth = transactions.filter((t) => t.date >= start && t.date < end);

  const isInvestment = (t) => {
    const cat = (t.category || '').toLowerCase();
    const sub = (t.subcategory || '').toLowerCase();
    return cat.includes('invest') || cat.includes('transfer') || sub.includes('deposit');
  };

  let monthIncome = 0;
  let monthSpent = 0;
  let monthInvested = 0;
  const byCategory = {};

  for (const t of inMonth) {
    const amt = Number(t.amount) || 0;
    if (amt < 0) {
      monthIncome += Math.abs(amt);
      continue;
    }
    if (isInvestment(t)) {
      monthInvested += amt;
      continue;
    }
    monthSpent += amt;
    const cat = t.category || 'Other';
    byCategory[cat] = (byCategory[cat] || 0) + amt;
  }

  return {
    netWorth,
    monthIncome,
    monthSpent,
    monthInvested,
    monthRemaining: monthIncome - monthSpent - monthInvested,
    savingsRate: monthIncome > 0
      ? Math.max(0, Math.round(((monthIncome - monthSpent) / monthIncome) * 100))
      : 0,
    byCategory,
  };
}

export const CATEGORIES = [
  'Housing',
  'Food & Dining',
  'Transport',
  'Shopping',
  'Subscriptions',
  'Entertainment',
  'Bills',
  'Income',
  'Investment',
  'Other',
];

export { currentMonthYear };
