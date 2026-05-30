import { useState } from 'react';
import { useInsights } from '../../hooks/useInsights';

const TONE = {
  positive: { dot: 'var(--green)', label: 'ON TRACK' },
  watch: { dot: 'var(--red)', label: 'WATCH' },
  neutral: { dot: 'var(--accent)', label: 'SAGE' },
};

// Proactive Sage insight cards on Home. Collapsed by default to keep Home
// scannable — each briefing shows title only; tap to expand the body.
// Falls back to nothing (caller shows its static insight) if disabled or
// the fetch fails.
export default function SageBriefings({ enabled, onGoTo, fallback }) {
  const { data, loading } = useInsights('briefing', enabled);
  const briefings = data?.briefings || [];
  const [openIdx, setOpenIdx] = useState(null);

  if (!enabled || (!loading && briefings.length === 0)) {
    return fallback || null;
  }

  return (
    <div className="aib" style={{ display: 'block' }}>
      <div className="ai-pill"><span className="ai-dot" />Sage · Briefing</div>
      {loading && briefings.length === 0 ? (
        <div className="ai-txt" style={{ color: 'var(--t3)' }}>Sage is reading your week…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {briefings.map((b, i) => {
            const tone = TONE[b.tone] || TONE.neutral;
            const open = openIdx === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setOpenIdx(open ? null : i)}
                style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left', padding: '10px 0',
                  borderBottom: i < briefings.length - 1 ? '1px solid var(--b1)' : 'none',
                  width: '100%', color: 'inherit', fontFamily: 'inherit',
                }}
              >
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', background: tone.dot,
                  flexShrink: 0, marginTop: 7,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', flex: 1 }}>
                      {b.title}
                    </div>
                    <span style={{
                      color: 'var(--t3)', fontSize: 11, transform: open ? 'rotate(90deg)' : 'none',
                      transition: 'transform .15s ease', flexShrink: 0,
                    }}>›</span>
                  </div>
                  {open && (
                    <div style={{
                      fontSize: 12, color: 'var(--t2)', lineHeight: 1.55, marginTop: 6,
                    }}>
                      {b.body}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
      <button type="button" className="ai-more" onClick={() => onGoTo?.('coach')}>
        Ask Sage →
      </button>
    </div>
  );
}
