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

async function fetchWithTimeout(url, options, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Steps surfaced visually in the UI so we don't need DevTools to see which
// part of the exchange flow is hanging.
const STEPS = [
  'Building auth headers…',
  'Preparing request…',
  'Sending to backend…',
  'Waiting for backend response…',
  'Reading response…',
  'Saving account…',
];

export default function PlaidLinkButton({ onConnected, variant = 'primary' }) {
  const [linkToken, setLinkToken] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0); // 0 = idle, 1..6 = active step

  // Fetch a fresh link token on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError('');
        const res = await fetchWithTimeout(`${API}/api/plaid/create-link-token`, {
          method: 'POST',
          headers: await authHeaders(),
        }, 15000);
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
        if (!cancelled) setLinkToken(body.link_token);
      } catch (e) {
        const msg = e?.name === 'AbortError'
          ? 'Backend not responding (15s). Refresh.'
          : e?.message || 'Failed to reach backend.';
        if (!cancelled) setError(msg);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const onSuccess = useCallback(
    (public_token, metadata) => {
      setBusy(true);
      setError('');
      setStep(1);

      setTimeout(async () => {
        try {
          setStep(1);
          const headers = await authHeaders();
          headers['Content-Type'] = 'application/json';

          setStep(2);
          const body = JSON.stringify({
            public_token,
            institution: metadata.institution,
          });

          setStep(3);
          const url = `${API}/api/plaid/exchange-token`;

          setStep(4);
          const res = await fetchWithTimeout(url, { method: 'POST', headers, body }, 60000);

          setStep(5);
          const resBody = await res.json();

          if (!res.ok) throw new Error(resBody.error || `HTTP ${res.status}`);

          setStep(6);
          onConnected?.(resBody);
        } catch (e) {
          const msg = e?.name === 'AbortError'
            ? 'Backend didn\'t respond in 60s. Your bank may already be connected — refresh to check.'
            : e?.message || 'Could not connect the bank. Try again.';
          setError(msg);
        } finally {
          setBusy(false);
          setStep(0);
        }
      }, 200);
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
    ? `Connecting… (${step}/6)`
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
      {busy && step > 0 && (
        <div style={{
          fontSize: 10,
          letterSpacing: 1.5,
          color: 'var(--t2)',
          textAlign: 'center',
          lineHeight: 1.5,
        }}>
          {STEPS[step - 1] || 'Working…'}
        </div>
      )}
      {!linkToken && !error && !busy && (
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
