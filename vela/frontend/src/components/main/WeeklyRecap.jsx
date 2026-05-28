import { useState } from 'react';
import { useInsights } from '../../hooks/useInsights';

function isoWeekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// Signature weekly ritual: a once-per-week Sage recap card at the top of Home.
// Shown once per ISO week (first app open of the week), dismissible, gated by
// the notify_weekly_summary preference. Seen-state persists in localStorage.
export default function WeeklyRecap({ enabled, onGoTo }) {
  const week = isoWeekKey();
  const seenKey = `vela:weekly-seen:${week}`;
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(seenKey) === '1'; } catch { return false; }
  });

  const shouldShow = enabled && !dismissed;
  const { data, loading } = useInsights('weekly', shouldShow);
  const recap = data?.weekly;

  if (!shouldShow || (!loading && !recap)) return null;

  const dismiss = () => {
    try { localStorage.setItem(seenKey, '1'); } catch { /* private mode */ }
    setDismissed(true);
  };

  return (
    <div className="card" style={{
      background: 'linear-gradient(150deg, rgba(139,147,255,0.12) 0%, var(--c1) 60%)',
      borderColor: 'rgba(139,147,255,0.25)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div className="ai-pill" style={{ margin: 0 }}><span className="ai-dot" />Sunday Recap</div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: 0 }}
        >
          ×
        </button>
      </div>

      {loading && !recap ? (
        <div style={{ fontSize: 12, color: 'var(--t3)' }}>Sage is writing your recap…</div>
      ) : (
        <>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 500, letterSpacing: '-0.4px', marginBottom: 12, lineHeight: 1.15 }}>
            {recap.headline}
          </div>
          {recap.win && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', flexShrink: 0, marginTop: 5 }} />
              <div style={{ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.55 }}>{recap.win}</div>
            </div>
          )}
          {recap.watch && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red)', flexShrink: 0, marginTop: 5 }} />
              <div style={{ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.55 }}>{recap.watch}</div>
            </div>
          )}
          {recap.summary && (
            <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.6, marginTop: 4 }}>{recap.summary}</div>
          )}
          <button type="button" className="ai-more" onClick={() => onGoTo?.('coach')}>Ask Sage →</button>
        </>
      )}
    </div>
  );
}
