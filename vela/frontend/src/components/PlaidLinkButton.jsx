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

// Race a fetch against a timeout via AbortController. If the backend doesn't
// respond within ms, abort and throw a clean error so the button never traps.
async function fetchWithTimeout(url, options, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
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
        console.info('[vela] PlaidLinkButton: requesting link_token from', API);
        const res = await fetchWithTimeout(`${API}/api/plaid/create-link-token`, {
          method: 'POST',
          headers: await authHeaders(),
        }, 15000);
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
        console.info('[vela] PlaidLinkButton: got link_token');
        if (!cancelled) setLinkToken(body.link_token);
      } catch (e) {
        console.error('[vela] PlaidLinkButton: link_token fetch failed', e);
        const msg = e?.name === 'AbortError'
          ? 'Backend didn\'t respond in 15s — wake it up at https://vela-backend-w8q8.onrender.com'
          : e?.message || 'Failed to reach backend.';
        if (!cancelled) setError(msg);
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
      console.info('[vela] PlaidLinkButton: Plaid Link succeeded, exchanging…');
      try {
        const res = await fetchWithTimeout(`${API}/api/plaid/exchange-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(await authHeaders()),
          },
          body: JSON.stringify({
            public_token,
            institution: metadata.institution,
          }),
        }, 30000);
        const body = await res.json();
        console.info('[vela] PlaidLinkButton: exchange response', { status: res.status, body });
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
        onConnected?.(body);
      } catch (e) {
        console.error('[vela] PlaidLinkButton: exchange failed', e);
        const msg = e?.name === 'AbortError'
          ? 'Backend didn\'t respond in 30s — try Sync now or refresh; accounts may still have saved.'
          : e?.message || 'Could not connect the bank. Try again.';
        setError(msg);
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
