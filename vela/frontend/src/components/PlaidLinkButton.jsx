import { useCallback, useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { supabase } from '../lib/supabase';
import { API } from '../lib/apiUrl';
import './PlaidLinkButton.css';

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function PlaidLinkButton({ onConnected, variant = 'primary' }) {
  const [linkToken, setLinkToken] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Fetch a fresh link token whenever the component mounts.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError('');
        const res = await fetch(`${API}/api/plaid/create-link-token`, {
          method: 'POST',
          headers: await authHeaders(),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
        if (!cancelled) setLinkToken(body.link_token);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSuccess = useCallback(
    async (public_token, metadata) => {
      setBusy(true);
      setError('');
      try {
        const res = await fetch(`${API}/api/plaid/exchange-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(await authHeaders()),
          },
          body: JSON.stringify({
            public_token,
            institution: metadata.institution,
          }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
        onConnected?.(body);
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(false);
      }
    },
    [onConnected]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: (err) => {
      if (err) setError(err.error_message || err.display_message || 'Plaid exited');
    },
  });

  const disabled = !ready || busy || !linkToken;
  const label = busy
    ? 'Connecting…'
    : !linkToken && !error
      ? 'Preparing…'
      : 'Connect a bank →';

  return (
    <div className="plk-wrap">
      {error && <div className="plk-error">{error}</div>}
      <button
        type="button"
        className={`plk-btn ${variant === 'secondary' ? 'plk-sec' : 'plk-pri'}`}
        onClick={() => open()}
        disabled={disabled}
      >
        {label}
      </button>
      {!linkToken && !error && (
        <div style={{
          fontSize: 9,
          letterSpacing: 1.5,
          color: 'var(--t3)',
          textAlign: 'center',
          lineHeight: 1.5,
        }}>
          Waking the backend up — first use of the day takes 30–50 sec.
        </div>
      )}
    </div>
  );
}
