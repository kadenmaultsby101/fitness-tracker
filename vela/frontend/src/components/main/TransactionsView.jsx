import { useMemo, useState } from 'react';
import { money, moneyAbs, relDate, displayAccountName } from './format';
import { colorFor } from './categoryColors';
import TxnIcon from './TxnIcon';

// Filtered transaction view. Three modes:
//   filter = { kind: 'category', value: 'Food & Dining' }
//   filter = { kind: 'merchant', value: 'Chipotle Mexican Grill' }
//   filter = { kind: 'search' }  — live text input, matches name/merchant/category
export default function TransactionsView({ data, filter, onBack, onOpenMerchant, onEditTxn }) {
  const { transactions, accounts } = data;
  const isSearch = filter?.kind === 'search';
  const [query, setQuery] = useState(filter?.value || '');
  const accountsById = useMemo(
    () => Object.fromEntries((accounts || []).map((a) => [a.id, a])),
    [accounts]
  );

  const matches = useMemo(() => {
    if (!filter) return [];
    if (filter.kind === 'category') {
      return transactions.filter((t) => (t.category || 'Other') === filter.value);
    }
    if (filter.kind === 'search') {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      return transactions.filter((t) => {
        const hay = `${t.merchant_name || ''} ${t.name || ''} ${t.category || ''} ${t.subcategory || ''}`.toLowerCase();
        return hay.includes(q);
      });
    }
    return transactions.filter(
      (t) => (t.merchant_name || t.name || '').trim() === filter.value
    );
  }, [transactions, filter, query]);

  const sorted = useMemo(
    () => [...matches].sort((a, b) => b.date.localeCompare(a.date)),
    [matches]
  );

  // Totals (spending = positive amounts in Plaid convention).
  const spent = matches.reduce((s, t) => s + (Number(t.amount) > 0 ? Number(t.amount) : 0), 0);
  const count = matches.length;

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
          {isSearch ? (
            <input
              className="finp"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search merchant, category…"
              autoFocus
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

      <div className="card">
        <div className="ctitle">{isSearch ? 'Results' : 'All'} ({count})</div>
        {sorted.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.7, padding: '4px 0' }}>
            {isSearch
              ? (query.trim() ? `No transactions match "${query.trim()}".` : 'Start typing to find transactions.')
              : 'No transactions here.'}
          </div>
        ) : (
          sorted.map((t) => {
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
                  <div className="txn-ct">
                    <span style={{ color: colorFor(cat) }}>{cat}</span>
                    {acc && <span style={{ color: 'var(--t3)' }}>{' · '}{displayAccountName(acc)}</span>}
                  </div>
                </div>
                <div className="txn-r">
                  <div className={`txn-amt ${t.amount < 0 ? 'pos' : ''}`}>
                    {t.amount < 0 ? '+' : '−'}{moneyAbs(t.amount)}
                  </div>
                  <div className="txn-dt">{relDate(t.date)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
