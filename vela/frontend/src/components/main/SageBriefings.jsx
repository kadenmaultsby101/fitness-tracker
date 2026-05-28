import { useInsights } from '../../hooks/useInsights';

const TONE = {
  positive: { dot: 'var(--green)', label: 'ON TRACK' },
  watch: { dot: 'var(--red)', label: 'WATCH' },
  neutral: { dot: 'var(--accent)', label: 'SAGE' },
};

// Proactive Sage insight cards on Home. Falls back to nothing (caller shows
// its static insight) if disabled or the fetch fails.
export default function SageBriefings({ enabled, onGoTo, fallback }) {
  const { data, loading } = useInsights('briefing', enabled);
  const briefings = data?.briefings || [];

  if (!enabled || (!loading && briefings.length === 0)) {
    return fallback || null;
  }

  return (
    <div className="aib" style={{ display: 'block' }}>
      <div className="ai-pill"><span className="ai-dot" />Sage · Briefing</div>
      {loading && briefings.length === 0 ? (
        <div className="ai-txt" style={{ color: 'var(--t3)' }}>Sage is reading your week…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {briefings.map((b, i) => {
            const tone = TONE[b.tone] || TONE.neutral;
            return (
              <div key={i} style={{ display: 'flex', gap: 10 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', background: tone.dot,
                  flexShrink: 0, marginTop: 5,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--t1)', marginBottom: 2 }}>
                    {b.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.55 }}>{b.body}</div>
                </div>
              </div>
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
