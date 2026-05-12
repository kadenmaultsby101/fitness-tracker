import { useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { withTimeout } from '../../lib/withTimeout';
import { currentMonthYear } from '../../hooks/useFinancialData';
import { money } from './format';

// Default 7-category framework with rule-of-thumb % of income + educational
// tip line. Same template used in onboarding Step 6 so the math is consistent.
const DEFAULT_CATEGORIES = [
  { key: 'Housing',        pct: 0.30, tip: '25–30% recommended. Above 35% squeezes everything else.' },
  { key: 'Food & Dining',  pct: 0.12, tip: 'Groceries + restaurants combined. Easiest line to cut.' },
  { key: 'Transport',      pct: 0.10, tip: 'Gas, transit, parking, rideshare, insurance.' },
  { key: 'Shopping',       pct: 0.08, tip: 'Clothes, gear, anything that isn\'t essentials.' },
  { key: 'Subscriptions',  pct: 0.03, tip: 'Spotify, Netflix, etc. Audit quarterly.' },
  { key: 'Entertainment',  pct: 0.05, tip: 'Concerts, events, nights out.' },
  { key: 'Bills',          pct: 0.07, tip: 'Utilities, phone, internet. Mostly fixed.' },
];

const num = (s) => {
  const n = Number(String(s ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

export default function BudgetModal({ existing, income, onClose, onSaved }) {
  const monthlyIncome = Number(income) || 0;

  const existingMap = useMemo(
    () => Object.fromEntries(existing.map((b) => [b.category, b])),
    [existing]
  );
  const allCats = useMemo(
    () => Array.from(new Set([
      ...DEFAULT_CATEGORIES.map((c) => c.key),
      ...existing.map((b) => b.category),
    ])),
    [existing]
  );

  const initial = useMemo(() => {
    const o = {};
    for (const c of allCats) {
      const v = existingMap[c]?.monthly_limit;
      o[c] = v != null ? String(v) : '';
    }
    return o;
  }, [allCats, existingMap]);

  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Live totals — drives the footer feedback strip.
  const totalBudgeted = useMemo(
    () => allCats.reduce((s, c) => s + num(values[c]), 0),
    [allCats, values]
  );
  const remaining = monthlyIncome - totalBudgeted;
  const overBudget = monthlyIncome > 0 && totalBudgeted > monthlyIncome;

  const useSageSuggestions = () => {
    const filled = {};
    for (const c of DEFAULT_CATEGORIES) {
      filled[c.key] = monthlyIncome > 0 ? String(Math.round(monthlyIncome * c.pct)) : '';
    }
    // Keep any custom non-default categories the user already had
    for (const c of allCats) {
      if (!(c in filled)) filled[c] = values[c] ?? '';
    }
    setValues(filled);
  };

  const clearAll = () => {
    const cleared = {};
    for (const c of allCats) cleared[c] = '';
    setValues(cleared);
  };

  const save = async () => {
    setError('');
    setBusy(true);
    try {
      const { data: sess } = await withTimeout(supabase.auth.getSession(), 6000);
      const userId = sess.session?.user?.id;
      if (!userId) throw new Error('Not signed in.');

      const my = currentMonthYear();
      const toUpsert = [];
      const toDelete = [];

      for (const cat of allCats) {
        const n = num(values[cat]);
        if (n > 0) {
          toUpsert.push({ user_id: userId, category: cat, monthly_limit: n, month_year: my });
        } else if (existingMap[cat]) {
          toDelete.push(existingMap[cat].id);
        }
      }

      if (toUpsert.length > 0) {
        const { error: e } = await withTimeout(
          supabase
            .from('budgets')
            .upsert(toUpsert, { onConflict: 'user_id,category,month_year' }),
          8000
        );
        if (e) throw e;
      }

      if (toDelete.length > 0) {
        const { error: e } = await withTimeout(
          supabase.from('budgets').delete().in('id', toDelete),
          8000
        );
        if (e) throw e;
      }

      onSaved();
    } catch (err) {
      console.error('[vela] BudgetModal save failed', err);
      setError(err?.message || 'Save failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="moverlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="mcl" onClick={onClose}>×</button>
        <div className="mtitle">Build your budget</div>
        <div className="msub">
          {monthlyIncome > 0
            ? `Monthly income on file: ${money(monthlyIncome)}`
            : 'Set Income in More → Profile for Sage to suggest amounts'}
        </div>

        {error && <div className="merr">{error}</div>}

        {monthlyIncome > 0 && (
          <div className="mnote" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>✦</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'var(--t1)', fontSize: 11, marginBottom: 2 }}>
                Sage's suggested split
              </div>
              <div style={{ color: 'var(--t3)', fontSize: 10, lineHeight: 1.5 }}>
                Standard ratios calibrated to your income. Override anything.
              </div>
            </div>
            <button
              type="button"
              onClick={useSageSuggestions}
              style={{
                background: 'transparent',
                border: '1px solid var(--b2)',
                color: 'var(--t1)',
                fontFamily: 'var(--mono)',
                fontSize: 9,
                letterSpacing: 2,
                textTransform: 'uppercase',
                padding: '8px 12px',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Use →
            </button>
          </div>
        )}

        <div className="ob-budget-list" style={{ marginBottom: 18 }}>
          {allCats.map((cat) => {
            const def = DEFAULT_CATEGORIES.find((d) => d.key === cat);
            const placeholder = monthlyIncome > 0 && def
              ? `$${Math.round(monthlyIncome * def.pct)}`
              : '$0';
            return (
              <div key={cat} className="ob-budget-row">
                <div className="ob-budget-meta">
                  <div className="ob-budget-cat">{cat}</div>
                  {def && <div className="ob-budget-tip">{def.tip}</div>}
                </div>
                <input
                  className="ob-row-input"
                  type="text"
                  inputMode="decimal"
                  value={values[cat] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [cat]: e.target.value }))}
                  placeholder={placeholder}
                />
              </div>
            );
          })}
        </div>

        {(totalBudgeted > 0 || monthlyIncome > 0) && (
          <div style={{
            background: 'var(--c2)',
            border: '1px solid var(--b1)',
            padding: '12px 14px',
            marginBottom: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 11,
          }}>
            <div>
              <div style={{ fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--t3)' }}>
                Total budgeted
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 300, marginTop: 2 }}>
                {money(totalBudgeted)}
              </div>
            </div>
            {monthlyIncome > 0 && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--t3)' }}>
                  {overBudget ? 'Over income by' : 'Income remaining'}
                </div>
                <div
                  className={overBudget ? 'neg' : 'pos'}
                  style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 300, marginTop: 2 }}
                >
                  {money(Math.abs(remaining))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mbtns">
          <button type="button" className="bsec" onClick={onClose}>Cancel</button>
          <button type="button" className="bpri" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save budget →'}
          </button>
        </div>

        {Object.values(values).some((v) => num(v) > 0) && (
          <button
            type="button"
            onClick={clearAll}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--t3)',
              fontFamily: 'var(--mono)',
              fontSize: 9,
              letterSpacing: 2,
              textTransform: 'uppercase',
              cursor: 'pointer',
              padding: '12px 0 0',
              width: '100%',
              textAlign: 'center',
            }}
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
