import { useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import './Onboarding.css';

const DEFAULT_CATEGORIES = [
  { key: 'Housing', pct: 0.30 },
  { key: 'Food & Dining', pct: 0.12 },
  { key: 'Transport', pct: 0.10 },
  { key: 'Shopping', pct: 0.08 },
  { key: 'Subscriptions', pct: 0.03 },
  { key: 'Entertainment', pct: 0.05 },
  { key: 'Bills', pct: 0.07 },
];

const currentMonthYear = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function Onboarding({ session, onDone }) {
  const [step, setStep] = useState(0);
  const [income, setIncome] = useState('');
  const [budgets, setBudgets] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const name = (session.user?.user_metadata?.name || '').trim() || 'there';
  const userId = session.user.id;

  const numericIncome = useMemo(() => {
    const n = Number(String(income).replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [income]);

  const suggestion = (cat) => {
    if (!numericIncome) return '';
    return String(Math.round(numericIncome * cat.pct));
  };

  const next = () => {
    setError('');
    setStep((s) => s + 1);
  };

  const markComplete = async () => {
    setBusy(true);
    setError('');
    const { error: e } = await supabase
      .from('profiles')
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq('id', userId);
    setBusy(false);
    if (e) {
      setError(e.message);
      return;
    }
    onDone();
  };

  const saveIncomeAndNext = async () => {
    if (busy) return;
    if (!numericIncome) {
      next();
      return;
    }
    setBusy(true);
    setError('');
    const { error: e } = await supabase
      .from('profiles')
      .update({ monthly_income: numericIncome })
      .eq('id', userId);
    setBusy(false);
    if (e) {
      setError(e.message);
      return;
    }
    next();
  };

  const saveBudgetsAndNext = async () => {
    if (busy) return;
    const my = currentMonthYear();
    const rows = DEFAULT_CATEGORIES
      .map((c) => {
        const raw = budgets[c.key];
        const v = Number(String(raw ?? '').replace(/[^0-9.]/g, ''));
        return { category: c.key, monthly_limit: Number.isFinite(v) && v > 0 ? v : 0 };
      })
      .filter((r) => r.monthly_limit > 0)
      .map((r) => ({ user_id: userId, month_year: my, ...r }));

    if (rows.length === 0) {
      next();
      return;
    }
    setBusy(true);
    setError('');
    const { error: e } = await supabase
      .from('budgets')
      .upsert(rows, { onConflict: 'user_id,category,month_year' });
    setBusy(false);
    if (e) {
      setError(e.message);
      return;
    }
    next();
  };

  const skipAll = () => markComplete();

  return (
    <div className="ob">
      <div className="ob-steps">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`ob-dot ${i === step ? 'on' : i < step ? 'done' : ''}`}
          />
        ))}
      </div>

      {step === 0 && (
        <div className="ob-card">
          <div className="ob-eyebrow">Step 1 of 5</div>
          <div className="ob-title">Welcome to Vela, {name}.</div>
          <div className="ob-sub">
            Let's set up your financial OS in 90 seconds. Income, budget,
            accounts, and a quick intro to Sage — your AI coach.
          </div>
          {error && <div className="ob-error">{error}</div>}
          <button type="button" className="ob-primary" onClick={next}>
            Get Started →
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="ob-card">
          <div className="ob-eyebrow">Step 2 of 5</div>
          <div className="ob-title">What's your monthly income?</div>
          <div className="ob-sub">
            Pre-tax, all sources. Used to suggest realistic budget limits and
            personalize Sage's advice. You can change this anytime in Settings.
          </div>
          {error && <div className="ob-error">{error}</div>}
          <div className="ob-field">
            <label className="ob-label" htmlFor="ob-income">Monthly Income (USD)</label>
            <input
              id="ob-income"
              className="ob-input amt"
              type="text"
              inputMode="decimal"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="$0"
              autoFocus
            />
          </div>
          <button type="button" className="ob-primary" disabled={busy} onClick={saveIncomeAndNext}>
            {busy ? '…' : 'Continue →'}
          </button>
          <button type="button" className="ob-skip" onClick={next}>
            Skip for now
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="ob-card">
          <div className="ob-eyebrow">Step 3 of 5</div>
          <div className="ob-title">Set your monthly budget.</div>
          <div className="ob-sub">
            {numericIncome
              ? <>Sage suggested limits based on your <strong style={{ color: 'var(--t1)' }}>${numericIncome.toLocaleString()}</strong>/mo income. Adjust freely or leave blank to skip a category.</>
              : 'Set a monthly limit for each category, or leave any blank.'}
          </div>
          {error && <div className="ob-error">{error}</div>}
          <div className="ob-rows">
            {DEFAULT_CATEGORIES.map((c) => (
              <div key={c.key} className="ob-row">
                <div className="ob-row-cat">{c.key}</div>
                <input
                  className="ob-row-input"
                  type="text"
                  inputMode="decimal"
                  value={budgets[c.key] ?? ''}
                  onChange={(e) =>
                    setBudgets((b) => ({ ...b, [c.key]: e.target.value }))
                  }
                  placeholder={suggestion(c) ? `$${suggestion(c)}` : '$0'}
                />
              </div>
            ))}
          </div>
          <button type="button" className="ob-primary" disabled={busy} onClick={saveBudgetsAndNext}>
            {busy ? '…' : 'Continue →'}
          </button>
          <button type="button" className="ob-skip" onClick={next}>
            Skip for now
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="ob-card">
          <div className="ob-eyebrow">Step 4 of 5</div>
          <div className="ob-title">Connect your first account.</div>
          <div className="ob-sub">
            Vela uses Plaid to pull real-time balances and transactions —
            read-only, never stores credentials. Wired up in the next phase.
          </div>
          {error && <div className="ob-error">{error}</div>}
          <div className="ob-plaid-stub">
            Plaid Link · Coming next phase
          </div>
          <button type="button" className="ob-primary" onClick={next}>
            Continue →
          </button>
          <button type="button" className="ob-skip" onClick={next}>
            Skip for now — I'll connect later
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="ob-card">
          <div className="ob-eyebrow">Step 5 of 5</div>
          <div className="ob-title">Meet Sage.</div>
          <div className="ob-sage">
            <div className="ob-sage-av">✦</div>
            <div className="ob-sage-meta">
              <div className="ob-sage-nm">Sage</div>
              <div className="ob-sage-st">
                <span className="ob-dot-live" />
                AI Financial Coach
              </div>
            </div>
          </div>
          <div className="ob-note">
            Sage reads your real accounts, transactions, and goals — then
            tells you, with <strong>actual numbers</strong>, where you stand
            and what to do next. Sharp, direct, specific. No fluff.
          </div>
          {error && <div className="ob-error">{error}</div>}
          <button type="button" className="ob-primary" disabled={busy} onClick={markComplete}>
            {busy ? '…' : 'Enter Vela →'}
          </button>
        </div>
      )}

      {step < 4 && (
        <button type="button" className="ob-skip" onClick={skipAll} style={{ maxWidth: 420 }}>
          Skip entire setup
        </button>
      )}
    </div>
  );
}
