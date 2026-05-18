// Renders a bank's logo (base64 PNG from Plaid) at a given size.
// Falls back to a clean monogram circle tinted with the bank's brand
// color when no logo is available (manual accounts, Plaid metadata gap).
export default function BankLogo({ item, size = 28, fallbackName }) {
  const logo = item?.institution_logo;
  const color = item?.institution_color;
  const name = item?.institution_name || fallbackName || '?';
  const letter = name.trim().charAt(0).toUpperCase() || '?';

  const dim = { width: size, height: size, borderRadius: size * 0.22 };

  if (logo) {
    return (
      <img
        src={`data:image/png;base64,${logo}`}
        alt={name}
        style={{
          ...dim,
          objectFit: 'cover',
          background: color || 'var(--c3)',
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      aria-label={name}
      style={{
        ...dim,
        background: color || 'var(--c3)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--serif)',
        fontSize: size * 0.42,
        fontWeight: 500,
        letterSpacing: 0,
        flexShrink: 0,
      }}
    >
      {letter}
    </div>
  );
}
