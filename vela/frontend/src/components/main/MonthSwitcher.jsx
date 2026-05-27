// Prev/next month selector with a clear current-period label. offset 0 =
// this month; negative = past months. Can't go into the future.
export default function MonthSwitcher({ offset, setOffset, label }) {
  const atCurrent = offset >= 0;
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '4px 0 2px',
    }}>
      <button
        type="button"
        onClick={() => setOffset(offset - 1)}
        aria-label="Previous month"
        style={arrowStyle}
      >
        ‹
      </button>
      <div style={{ textAlign: 'center', flex: 1 }}>
        <div style={{
          fontFamily: 'var(--serif)',
          fontSize: 19,
          fontWeight: 500,
          letterSpacing: '-0.3px',
          lineHeight: 1.1,
        }}>
          {label}
        </div>
        {atCurrent && (
          <div style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--accent)', marginTop: 2 }}>
            This month
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => !atCurrent && setOffset(offset + 1)}
        aria-label="Next month"
        disabled={atCurrent}
        style={{ ...arrowStyle, opacity: atCurrent ? 0.25 : 1, cursor: atCurrent ? 'default' : 'pointer' }}
      >
        ›
      </button>
    </div>
  );
}

const arrowStyle = {
  width: 34,
  height: 34,
  borderRadius: '50%',
  border: '1px solid var(--b1)',
  background: 'var(--c2)',
  color: 'var(--t1)',
  fontSize: 18,
  lineHeight: 1,
  cursor: 'pointer',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
