import { useMemo, useState } from 'react';
import { money, moneyAbs, relDate, displayAccountName } from './format';
import { colorFor } from './categoryColors';
import TxnIcon from './TxnIcon';

// A transaction is a "transfer" (not a real expense or income) when it
// represents money moving between your own accounts — paying down a credit
// card, paying a loan, transferring between checking and savings. Plaid sends
// these as paired transactions on both sides; without filtering they double-
// count and a credit-card paydown looks like income.
function isTransferOrPaydown(t, account) {
  if (!account) return false;
  const amt = Number(t.amount);
  // On credit/loan accounts, a negative amount is a payment received or a
  // refund — never income.
  if ((account.type === 'credit' || account.type === 'loan') && amt < 0) return true;
  // Name-based detection for the depository side of a credit-card payment.
  const name = `${t.merchant_name || ''} ${t.name || ''}`.toLowerCase();
  if (/(\bpayment\b|\bpmt\b|autopay|e-?pay).*(card|credit|amex|chase|discover|visa|capital one|citi)/.test(name)) return true;
  if (/(amex|chase|discover|visa|capital one|citi).*(payment|pmt|autopay)/.test(name)) return true;
  return false;
}

// Quick-filter chips shown above the list when in 'all' / 'search' mode.
// Each entry tests a (transaction, account) pair. 'all' is the default no-op.
const QUICK_FILTERS = [
  { id: 'all',        label: 'All',          test: () => true },
  { id: 'expenses',   label: 'Expenses',     test: (t, a) => Number(t.amount) > 0 && !isTransferOrPaydown(t, a) },
  { id: 'income',     label: 'Income',       test: (t, a) => Number(t.amount) < 0 && !isTransferOrPaydown(t, a) },
  { id: 'this_month', label: 'This month',   test: (t) => sameMonth(t.date, new Date()) },
  { id: 'last_30',    label: 'Last 30 days', test: (t) => withinDays(t.date, 30) },
];

// Filtered transaction view. Three modes:
//   filter = { kind: 'category', value: 'Food & Dining' }
//   filter = { kind: 'merchant', value: 'Chipotle Mexican Grill' }
//   filter = { kind: 'search' }  — live text input, matches name/merchant/category
//   filter = { kind: 'all' }     — main Transactions tab
export default function TransactionsView({ data, filter, onBack, onOpenMerchant, onEditTxn }) {
  const { transactions, accounts } = data;
  const isSearch = filter?.kind === 'search';
  const isAll = filter?.kind === 'all';
  const hasSearchBox = isSearch || isAll;
  const showChips = isSearch || isAll;
  const [query, setQuery] = useState(filter?.value || '');
  const [quick, setQuick] = useState('all');
  const accountsById = useMemo(
    () => Object.fromEntries((accounts || []).map((a) => [a.id, a])),
    [accounts]
  );

  const matches = useMemo(() => {
    if (!filter) return [];
    if (filter.kind === 'category') {
      return transactions.filter((t) => (t.category || 'Other') === filter.value);
    }
    if (filter.kind === 'search' || filter.kind === 'all') {
      const q = query.trim().toLowerCase();
      if (!q) return filter.kind === 'all' ? transactions : [];
      return transactions.filter((t) => {
        const hay = `${t.merchant_name || ''} ${t.name || ''} ${t.category || ''} ${t.subcategory || ''}`.toLowerCase();
        return hay.includes(q);
      });
    }
    return transactions.filter(
      (t) => (t.merchant_name || t.name || '').trim() === filter.value
    );
  }, [transactions, filter, query]);

  // Apply the quick-filter chip on top of the kind-of-filter matches.
  const quickFn = (QUICK_FILTERS.find((f) => f.id === quick) || QUICK_FILTERS[0]).test;
  const filtered = useMemo(
    () => (showChips ? matches.filter((t) => quickFn(t, accountsById[t.account_id])) : matches),
    [matches, showChips, quickFn, accountsById]
  );

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.date.localeCompare(a.date)),
    [filtered]
  );

  // Group sorted txns by date string for day-grouped rendering.
  // dayTotal excludes transfers/paydowns so a credit-card payment doesn't
  // wreck the day's "net spend" number.
  const groupedByDay = useMemo(() => {
    const groups = [];
    let current = null;
    for (const t of sorted) {
      if (!current || current.date !== t.date) {
        current = { date: t.date, txns: [], dayTotal: 0 };
        groups.push(current);
      }
      current.txns.push(t);
      if (!isTransferOrPaydown(t, accountsById[t.account_id])) {
        current.dayTotal += Number(t.amount) || 0;
      }
    }
    return groups;
  }, [sorted, accountsById]);

  // Header summary numbers — only real expenses count toward "spent."
  const spent = filtered.reduce((s, t) => {
    if (isTransferOrPaydown(t, accountsById[t.account_id])) return s;
    return s + (Number(t.amount) > 0 ? Number(t.amount) : 0);
  }, 0);
  const count = filtered.length;

  // For category mode: group by merchant for a tappable breakdown.
  const merchantBreakdown = useMemo(() => {
    if (filter?.kind !== 'category') return [];
    const map = {};
    for (const t of matches) {
      if (Number(t.amount) <= 0) continue;
      const name = (t.merchant_name || t.name || 'Unknown').trim();
      (map[name] ||= { name, total: 0, count: 0, sample: t });
      map[name].total += Number(t.amount);
      map[name].count += 1;
    }
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [matches, filter]);

  const title = filter?.value || 'Transactions';
  const accent = filter?.kind === 'category' ? colorFor(filter.value) : 'var(--accent)';

  return (
    <>
      <header className="ph">
        <div className="ph-l">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                background: 'none', border: 'none', color: 'var(--t2)',
                fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 6,
              }}
            >
              ← Back
            </button>
          )}
          {isAll && (
            <div className="ph-t" style={{ marginBottom: 8 }}>Transactions</div>
          )}
          {hasSearchBox ? (
            <input
              className="finp"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search merchant, category…"
              autoFocus={isSearch}
              style={{ marginBottom: 6, marginTop: 2 }}
            />
          ) : (
            <div className="ph-t" style={{ fontSize: 30, display: 'flex', alignItems: 'center', gap: 10 }}>
              {filter?.kind === 'category' && (
                <span style={{ width: 12, height: 12, borderRadius: 4, background: accent, display: 'inline-block' }} />
              )}
              {title}
            </div>
          )}
          <div className="ph-s">
            {isSearch && !query.trim()
              ? 'Type to search your transactions'
              : `${count} transaction${count === 1 ? '' : 's'} · ${money(spent)} spent`}
          </div>
        </div>
      </header>

      {showChips && (
        <div
          style={{
            display: 'flex', gap: 6, padding: '0 14px 12px', overflowX: 'auto',
            WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
          }}
        >
          {QUICK_FILTERS.map((f) => {
            const active = quick === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setQuick(f.id)}
                style={{
                  flex: 'none',
                  fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase',
                  padding: '6px 12px', borderRadius: 20, cursor: 'pointer',
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--b2)'}`,
                  background: active ? 'var(--accent-soft)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--t2)',
                  whiteSpace: 'nowrap',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      )}

      {filter?.kind === 'category' && merchantBreakdown.length > 0 && (
        <div className="card">
          <div className="ctitle">Top Merchants</div>
          {merchantBreakdown.map((m) => (
            <div
              key={m.name}
              className="txn"
              role="button"
              tabIndex={0}
              onClick={() => onOpenMerchant?.(m.name)}
              style={{ cursor: 'pointer' }}
            >
              <TxnIcon txn={m.sample} />
              <div className="txn-bd">
                <div className="txn-nm">{m.name}</div>
                <div className="txn-ct">{m.count} visit{m.count === 1 ? '' : 's'}</div>
              </div>
              <div className="txn-r">
                <div className="txn-amt">{money(m.total)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: '14px 0 6px' }}>
        {groupedByDay.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.7, padding: '4px 16px' }}>
            {isSearch
              ? (query.trim() ? `No transactions match "${query.trim()}".` : 'Start typing to find transactions.')
              : quick !== 'all'
                ? 'Nothing matches that filter yet.'
                : 'No transactions here.'}
          </div>
        ) : (
          groupedByDay.map((g) => (
            <div key={g.date} style={{ marginBottom: 4 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                padding: '14px 16px 6px',
                borderTop: '1px solid var(--b1)',
              }}>
                <div style={{
                  fontFamily: 'var(--serif)', fontSize: 21, fontWeight: 400,
                  color: 'var(--t1)', letterSpacing: '-0.3px',
                }}>
                  {relDate(g.date)}
                </div>
                <div style={{
                  fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase',
                  fontWeight: 500,
                  color: g.dayTotal > 0 ? 'var(--t2)' : 'var(--pos, #7ec39a)',
                }}>
                  {g.dayTotal > 0 ? `−${moneyAbs(g.dayTotal)}` : g.dayTotal < 0 ? `+${moneyAbs(g.dayTotal)}` : '—'}
                </div>
              </div>
              {g.txns.map((t) => {
                const cat = t.category || 'Other';
                const acc = accountsById[t.account_id];
                return (
                  <div
                    key={t.id}
                    className="txn"
                    onClick={() => onEditTxn?.(t)}
                    role="button"
                    tabIndex={0}
                    style={{ cursor: onEditTxn ? 'pointer' : 'default' }}
                  >
                    <TxnIcon txn={t} />
                    <div className="txn-bd">
                      <div className="txn-nm">{t.merchant_name || t.name}</div>
                      <div className="txn-ct" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: colorFor(cat), display: 'inline-block', flexShrink: 0,
                        }} />
                        <span style={{ color: 'var(--t2)' }}>{cat}</span>
                        {acc && (
                          <span style={{
                            fontSize: 9, letterSpacing: 1, textTransform: 'uppercase',
                            color: 'var(--t3)', padding: '2px 6px', borderRadius: 4,
                            border: '1px solid var(--b1)', marginLeft: 'auto',
                          }}>
                            {displayAccountName(acc)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="txn-r">
                      <div className={`txn-amt ${t.amount < 0 ? 'pos' : ''}`}>
                        {t.amount < 0 ? '+' : '−'}{moneyAbs(t.amount)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </>
  );
}

// --- helpers ---

function sameMonth(iso, now) {
  if (!iso) return false;
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function withinDays(iso, days) {
  if (!iso) return false;
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return d >= cutoff;
}
