import { useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import './Onboarding.css';

// 7 default budget categories with rule-of-thumb percentages.
const DEFAULT_CATEGORIES = [
  { key: 'Housing',        pct: 0.30, tip: '25–30% is the gold standard. Above 35% squeezes everything else.' },
  { key: 'Food & Dining',  pct: 0.12, tip: 'Groceries + restaurants combined. Easiest line to slash.' },
  { key: 'Transport',      pct: 0.10, tip: 'Gas, transit, parking, rideshare. Insurance counts here.' },
  { key: 'Shopping',       pct: 0.08, tip: 'Clothes, gear, anything that isn\'t essentials.' },
  { key: 'Subscriptions',  pct: 0.03, tip: 'Spotify, Netflix, ChatGPT — audit quarterly.' },
  { key: 'Entertainment',  pct: 0.05, tip: 'Concerts, events, going out.' },
  { key: 'Bills',          pct: 0.07, tip: 'Utilities, phone, internet. Mostly fixed.' },
];

// Multi-select — pick all that apply.
const SITUATION_OPTIONS = [
  { id: 'student',   label: 'Student' },
  { id: 'working',   label: 'Employed full-time' },
  { id: 'parttime',  label: 'Working part-time' },
  { id: 'freelance', label: 'Self-employed / Freelance' },
  { id: 'founder',   label: 'Building a company' },
  { id: 'investor',  label: 'Actively investing' },
  { id: 'between',   label: 'Between jobs' },
];

// Single-select — primary discovery source.
const DISCOVERY_OPTIONS = [
  { id: 'word_of_mouth', label: 'A friend or family member' },
  { id: 'social',        label: 'Social media (TikTok, Instagram, X)' },
  { id: 'search',        label: 'Search engine' },
  { id: 'press',         label: 'Article, podcast, or newsletter' },
  { id: 'app_store',     label: 'App Store / Play Store' },
  { id: 'organic',       label: 'Stumbled onto it' },
  { id: 'other',         label: 'Other' },
];

const MOTIVATIONS = [
  { id: 'spending',  label: 'Track my spending' },
  { id: 'save',      label: 'Save for something specific' },
  { id: 'wealth',    label: 'Build long-term wealth' },
  { id: 'debt',      label: 'Get out of debt' },
  { id: 'organize',  label: 'See everything in one place' },
  { id: 'learn',     label: 'Learn how money works' },
  { id: 'invest',    label: 'Start (or grow) investing' },
];

// Each interest seeds a real goal in the goals table on finish.
const GOAL_INTERESTS = [
  { id: 'emergency', emoji: '🛡️', label: 'Emergency Fund',     target: 15000, monthly: 500,  description: '3–6 months of expenses' },
  { id: 'roth',      emoji: '🌱', label: 'Max Roth IRA',        target: 7000,  monthly: 583,  description: '2026 contribution limit' },
  { id: 'house',     emoji: '🏠', label: 'House Down Payment',  target: 50000, monthly: 1000, description: 'FHA 3.5% on ~$1.4M' },
  { id: 'debt',      emoji: '💳', label: 'Pay Off Credit Cards', target: 5000, monthly: 400,  description: 'Aggressive payoff' },
  { id: 'invest',    emoji: '📊', label: 'Brokerage Growth',     target: 50000, monthly: 600,  description: 'Long-horizon investing' },
  { id: 'travel',    emoji: '✈️', label: 'Travel Fund',           target: 5000,  monthly: 250,  description: 'Annual trip budget' },
  { id: 'car',       emoji: '🚗', label: 'New Car',               target: 20000, monthly: 500,  description: 'Down payment + buffer' },
  { id: 'freedom',   emoji: '🗽', label: 'Financial Freedom',     target: 100000, monthly: 1000, description: '12 months of runway' },
];

const currentMonthYear = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const STEP_COUNT = 8;

export default function Onboarding({ session, onDone }) {
  const [step, setStep] = useState(0);

  const [age, setAge] = useState('');
  const [situations, setSituations] = useState([]); // multi-select
  const [discovery, setDiscovery] = useState('');   // single-select
  const [motivations, setMotivations] = useState([]);
  const [goalIds, setGoalIds] = useState([]);

  const [income, setIncome] = useState('');
  const [budgets, setBudgets] = useState({});

  const [busy, setBusy] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState('');

  const name = (session.user?.user_metadata?.name || '').trim() || 'there';
  const userId = session.user.id;

  const numericIncome = useMemo(() => {
    const n = Number(String(income).replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [income]);

  const numericAge = useMemo(() => {
    const n = Number(String(age).replace(/[^0-9]/g, ''));
    return Number.isFinite(n) && n > 0 && n < 130 ? n : 0;
  }, [age]);

  const suggestion = (cat) => {
    if (!numericIncome) return '';
    return String(Math.round(numericIncome * cat.pct));
  };

  const next = () => {
    setError('');
    setStep((s) => s + 1);
  };

  const toggleMulti = (state, setState, id) => {
    setState(state.includes(id) ? state.filter((x) => x !== id) : [...state, id]);
  };

  const finishOnboarding = async () => {
    if (busy) return;
    setBusy(true);
    setError('');

    const my = currentMonthYear();

    try {
      // 1. Critical write: mark onboarding done + save income (definitely
      //    existing columns). This is what gates the routing in App.jsx.
      const baseUpdate = { onboarding_completed_at: new Date().toISOString() };
      if (numericIncome > 0) baseUpdate.monthly_income = numericIncome;

      const { error: pe } = await supabase
        .from('profiles')
        .update(baseUpdate)
        .eq('id', userId);
      if (pe) throw pe;

      // 2. Nice-to-have: personalization payload. Lives in the
      //    onboarding_data jsonb column. If migration 03 hasn't been run
      //    yet, this update fails with 'column does not exist' — we
      //    swallow that specific case so the user can still get into the
      //    app and the data only gets lost, not the whole flow.
      try {
        const personalization = {
          age: numericAge || null,
          situations,
          discovered_via: discovery || null,
          motivations,
          goal_interests: goalIds,
        };
        const { error: oe } = await supabase
          .from('profiles')
          .update({ onboarding_data: personalization })
          .eq('id', userId);
        if (oe) console.warn('[vela] onboarding_data write skipped:', oe.message);
      } catch (oe) {
        console.warn('[vela] onboarding_data write threw:', oe?.message || oe);
      }

      // 3. Budget rows the user actually filled in.
      const budgetRows = DEFAULT_CATEGORIES
        .map((c) => {
          const raw = budgets[c.key];
          const v = Number(String(raw ?? '').replace(/[^0-9.]/g, ''));
          return { category: c.key, monthly_limit: Number.isFinite(v) && v > 0 ? v : 0 };
        })
        .filter((r) => r.monthly_limit > 0)
        .map((r) => ({ user_id: userId, month_year: my, ...r }));
      if (budgetRows.length > 0) {
        const { error: be } = await supabase
          .from('budgets')
          .upsert(budgetRows, { onConflict: 'user_id,category,month_year' });
        if (be) throw be;
      }

      // 4. Auto-create goals from selected interests.
      const goalRows = GOAL_INTERESTS
        .filter((g) => goalIds.includes(g.id))
        .map((g) => ({
          user_id: userId,
          name: g.label,
          emoji: g.emoji,
          description: g.description,
          current_amount: 0,
          target_amount: g.target,
          monthly_contribution: g.monthly,
        }));
      if (goalRows.length > 0) {
        const { error: ge } = await supabase.from('goals').insert(goalRows);
        if (ge) throw ge;
      }

      // Smooth handoff: brief celebration frame, then call onDone.
      setFinishing(true);
      setTimeout(() => onDone(), 600);
    } catch (err) {
      console.error('[vela] finishOnboarding failed', err);
      setError(err?.message || String(err) || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const skipAll = () => finishOnboarding();

  // While the final writes happen, swap to a clean "welcoming you in" frame
  // so the user knows progress is being made, not stuck.
  if (finishing) {
    return (
      <div className="ob ob-finishing">
        <div className="ob-finish-wordmark">Vela</div>
        <div className="ob-finish-msg">
          Welcome aboard, {name}.
        </div>
        <div className="ob-finish-sub">Setting things up…</div>
      </div>
    );
  }

  return (
    <div className="ob">
      <div className="ob-steps">
        {Array.from({ length: STEP_COUNT }).map((_, i) => (
          <div
            key={i}
            className={`ob-dot ${i === step ? 'on' : i < step ? 'done' : ''}`}
          />
        ))}
      </div>

      {/* Step 1 — Welcome */}
      {step === 0 && (
        <div className="ob-card">
          <div className="ob-eyebrow">Step 1 of {STEP_COUNT}</div>
          <div className="ob-title">Welcome to Vela, {name}.</div>
          <div className="ob-sub">
            Quick setup — about 90 seconds. Tell Sage who you are and what
            you want from your money. The more I know, the sharper the
            advice gets.
          </div>
          {error && <div className="ob-error">{error}</div>}
          <button type="button" className="ob-primary" onClick={next}>
            Get Started →
          </button>
        </div>
      )}

      {/* Step 2 — About you (age + multi-select situations) */}
      {step === 1 && (
        <div className="ob-card">
          <div className="ob-eyebrow">Step 2 of {STEP_COUNT}</div>
          <div className="ob-title">A bit about you.</div>
          <div className="ob-sub">
            Sage uses these to calibrate advice. Optional.
          </div>
          {error && <div className="ob-error">{error}</div>}

          <div className="ob-field">
            <label className="ob-label" htmlFor="ob-age">Age</label>
            <input
              id="ob-age"
              className="ob-input"
              type="text"
              inputMode="numeric"
              maxLength={3}
              value={age}
              onChange={(e) => setAge(e.target.value.replace(/\D/g, '').slice(0, 3))}
              placeholder="—"
              autoFocus
            />
          </div>

          <div className="ob-field">
            <label className="ob-label">
              What describes you · Pick all that apply
            </label>
            <div className="ob-chip-grid">
              {SITUATION_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  className={`ob-chip ${situations.includes(opt.id) ? 'on' : ''}`}
                  onClick={() => toggleMulti(situations, setSituations, opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button type="button" className="ob-primary" onClick={next}>
            Continue →
          </button>
          <button type="button" className="ob-skip" onClick={next}>
            Skip this step
          </button>
        </div>
      )}

      {/* Step 3 — How did you find Vela (NEW) */}
      {step === 2 && (
        <div className="ob-card">
          <div className="ob-eyebrow">Step 3 of {STEP_COUNT}</div>
          <div className="ob-title">How did you find Vela?</div>
          <div className="ob-sub">
            Pick the closest one — helps us know what's working.
          </div>
          {error && <div className="ob-error">{error}</div>}

          <div className="ob-chip-grid">
            {DISCOVERY_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.id}
                className={`ob-chip ${discovery === opt.id ? 'on' : ''}`}
                onClick={() => setDiscovery(discovery === opt.id ? '' : opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button type="button" className="ob-primary" onClick={next}>
            Continue →
          </button>
          <button type="button" className="ob-skip" onClick={next}>
            Skip this step
          </button>
        </div>
      )}

      {/* Step 4 — Why Vela */}
      {step === 3 && (
        <div className="ob-card">
          <div className="ob-eyebrow">Step 4 of {STEP_COUNT}</div>
          <div className="ob-title">What brings you here?</div>
          <div className="ob-sub">
            Pick everything that fits. Sage will tune its tone and priorities
            to match — no judgment, just direction.
          </div>
          {error && <div className="ob-error">{error}</div>}

          <div className="ob-chip-grid">
            {MOTIVATIONS.map((m) => (
              <button
                type="button"
                key={m.id}
                className={`ob-chip ${motivations.includes(m.id) ? 'on' : ''}`}
                onClick={() => toggleMulti(motivations, setMotivations, m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>

          <button type="button" className="ob-primary" onClick={next}>
            Continue →
          </button>
          <button type="button" className="ob-skip" onClick={next}>
            Skip this step
          </button>
        </div>
      )}

      {/* Step 5 — Goal interests */}
      {step === 4 && (
        <div className="ob-card">
          <div className="ob-eyebrow">Step 5 of {STEP_COUNT}</div>
          <div className="ob-title">Which goals matter?</div>
          <div className="ob-sub">
            Pick any — each becomes a real, tracked goal with sensible
            starting numbers. Edit later in the Goals tab.
          </div>
          {error && <div className="ob-error">{error}</div>}

          <div className="ob-goal-grid">
            {GOAL_INTERESTS.map((g) => {
              const on = goalIds.includes(g.id);
              return (
                <button
                  type="button"
                  key={g.id}
                  className={`ob-goal-tile ${on ? 'on' : ''}`}
                  onClick={() => toggleMulti(goalIds, setGoalIds, g.id)}
                >
                  <div className="ob-goal-em">{g.emoji}</div>
                  <div className="ob-goal-nm">{g.label}</div>
                  <div className="ob-goal-ds">{g.description}</div>
                </button>
              );
            })}
          </div>

          <button type="button" className="ob-primary" onClick={next}>
            Continue →
          </button>
          <button type="button" className="ob-skip" onClick={next}>
            Skip this step
          </button>
        </div>
      )}

      {/* Step 6 — Income */}
      {step === 5 && (
        <div className="ob-card">
          <div className="ob-eyebrow">Step 6 of {STEP_COUNT}</div>
          <div className="ob-title">What's your monthly income?</div>
          <div className="ob-sub">
            Pre-tax, all sources combined. Sage uses this for the percentage
            math and the budget suggestions on the next step. Change it any
            time in Settings.
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
          <button type="button" className="ob-primary" onClick={next}>
            Continue →
          </button>
          <button type="button" className="ob-skip" onClick={next}>
            Skip for now
          </button>
        </div>
      )}

      {/* Step 7 — Budget */}
      {step === 6 && (
        <div className="ob-card">
          <div className="ob-eyebrow">Step 7 of {STEP_COUNT}</div>
          <div className="ob-title">Build a monthly budget.</div>
          <div className="ob-sub">
            {numericIncome
              ? <>I pre-filled suggestions based on your <strong style={{ color: 'var(--t1)' }}>${numericIncome.toLocaleString()}</strong>/mo. Override anything, or leave a row blank to skip.</>
              : 'Set a monthly limit per category, or leave any blank. Helper notes show common rules of thumb.'}
          </div>
          {error && <div className="ob-error">{error}</div>}

          <div className="ob-budget-list">
            {DEFAULT_CATEGORIES.map((c) => (
              <div key={c.key} className="ob-budget-row">
                <div className="ob-budget-meta">
                  <div className="ob-budget-cat">{c.key}</div>
                  <div className="ob-budget-tip">{c.tip}</div>
                </div>
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

          <button type="button" className="ob-primary" onClick={next}>
            Continue →
          </button>
          <button type="button" className="ob-skip" onClick={next}>
            Skip this step
          </button>
        </div>
      )}

      {/* Step 8 — Meet Sage */}
      {step === 7 && (
        <div className="ob-card">
          <div className="ob-eyebrow">Step 8 of {STEP_COUNT}</div>
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
            and what to do this week. Sharp, direct, specific. No fluff.
            {goalIds.length > 0 && (
              <>
                <br /><br />
                Tapping below also seeds <strong>{goalIds.length} goal{goalIds.length === 1 ? '' : 's'}</strong> in the Goals tab.
              </>
            )}
          </div>
          {error && <div className="ob-error">{error}</div>}
          <button type="button" className="ob-primary" disabled={busy} onClick={finishOnboarding}>
            {busy ? 'Saving…' : 'Enter Vela →'}
          </button>
        </div>
      )}

      {step < STEP_COUNT - 1 && (
        <button
          type="button"
          className="ob-skip"
          onClick={skipAll}
          style={{ maxWidth: 420 }}
          disabled={busy}
        >
          {busy ? 'Saving…' : 'Skip entire setup'}
        </button>
      )}
    </div>
  );
}
