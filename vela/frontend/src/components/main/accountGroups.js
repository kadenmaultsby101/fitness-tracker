// Bucket an account into a display group based on Plaid type/subtype.
export function accountGroup(a) {
  const type = (a.type || '').toLowerCase();
  const sub = (a.subtype || '').toLowerCase();
  if (type === 'credit') return 'Credit Cards';
  if (type === 'loan') return 'Loans';
  if (type === 'investment' || type === 'brokerage') return 'Investments';
  if (sub === 'savings') return 'Savings';
  if (sub === 'cash' || String(a.plaid_account_id || '').includes('_cash_')) return 'Cash';
  if (type === 'depository') return 'Checking';
  return 'Other';
}

export const GROUP_ORDER = ['Checking', 'Savings', 'Cash', 'Credit Cards', 'Loans', 'Investments', 'Other'];

export function isDebtGroup(group) {
  return group === 'Credit Cards' || group === 'Loans';
}

export function groupAccounts(accounts) {
  const groups = {};
  for (const a of accounts) {
    const g = accountGroup(a);
    (groups[g] ||= []).push(a);
  }
  return GROUP_ORDER
    .filter((g) => groups[g]?.length)
    .map((g) => {
      const isDebt = isDebtGroup(g);
      const subtotal = groups[g].reduce((s, a) => {
        const bal = Number(a.balance_current) || 0;
        return s + (isDebt ? -bal : bal);
      }, 0);
      return { group: g, accounts: groups[g], subtotal, isDebt };
    });
}
