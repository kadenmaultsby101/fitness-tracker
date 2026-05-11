import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { withTimeout } from '../../lib/withTimeout';
import { currentMonthYear } from '../../hooks/useFinancialData';

const DEFAULT_CATEGORIES = [
  'Housing',
  'Food & Dining',
  'Transport',
  'Shopping',
  'Subscriptions',
  'Entertainment',
  'Bills',
];

export default function BudgetModal({ existing, income, onClose, onSaved }) {
  const existingMap = Object.fromEntries(existing.map((b) => [b.category, b]));
  const allCats = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...existing.map((b) => b.category)])
  );

  const initial = {};
  for (const c of allCats) {
    const v = existingMap[c]?.monthly_limit;
    initial[c] = v != null ? String(v) : '';
  }
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const num = (s) => {
    const n = Number(String(s).replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : 0;
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
      setError(err?.message || 'Save failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="moverlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="mcl" onClick={onClose}>×</button>
        <div className="mtitle">Edit Budget</div>
        <div className="msub">
          {income
            ? `Monthly income: $${Number(income).toLocaleString()}`
            : 'Set monthly limits — leave blank to skip a category'}
        </div>

        {error && <div className="merr">{error}</div>}

        {allCats.map((cat) => (
          <div key={cat} style={{ marginBottom: 12 }}>
            <div className="fl" style={{ marginBottom: 5 }}>{cat}</div>
            <input
              className="finp"
              style={{ marginBottom: 0 }}
              type="text"
              inputMode="decimal"
              value={values[cat]}
              onChange={(e) => setValues((v) => ({ ...v, [cat]: e.target.value }))}
              placeholder="$0"
            />
          </div>
        ))}

        <div className="mbtns">
          <button type="button" className="bsec" onClick={onClose}>Cancel</button>
          <button type="button" className="bpri" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save →'}
          </button>
        </div>
      </div>
    </div>
  );
}
