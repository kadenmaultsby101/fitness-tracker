import { useCallback, useEffect, useRef, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { supabase } from '../lib/supabase';
import { API } from '../lib/apiUrl';
import './PlaidLinkButton.css';

async function fetchWithTimeout(url, options, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const STEPS = [
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
  const [step, setStep] = useState(0);
  const [fetchingToken, setFetchingToken] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [tokenAttempt, setTokenAttempt] = useState(0);
  const tokenRef = useRef(null);

  // Tick a visible elapsed-seconds counter while we're waiting for a link
  // token — gives the user concrete feedback that something is happening
  // and a clear threshold for "this is broken, retry."
  useEffect(() => {
    if (!fetchingToken) {
      setElapsed(0);
      return;
    }
    const t0 = Date.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 250);
    return () => clearInterval(id);
  }, [fetchingToken]);

  useEffect(() => {
    let cancelled = false;
    setFetchingToken(true);
    setError('');
    setLinkToken(null);
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error('Not signed in.');
        tokenRef.current = token;

        const res = await fetchWithTimeout(`${API}/api/plaid/create-link-token`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }, 30000);
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
        if (!cancelled) setLinkToken(body.link_token);
      } catch (e) {
        const msg = e?.name === 'AbortError'
          ? 'Backend timed out (30s).'
          : e?.message || 'Failed to reach backend.';
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setFetchingToken(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tokenAttempt]);

  const retry = () => {
    setError('');
    setTokenAttempt((n) => n + 1);
  };

  const onSuccess = useCallback(
    (public_token, metadata) => {
      setBusy(true);
      setError('');
      setStep(1);

      setTimeout(async () => {
        try {
          const token = tokenRef.current;
          if (!token) throw new Error('Session expired — refresh and try again.');

          setStep(1);
          const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          };
          const body = JSON.stringify({
            public_token,
            institution: metadata.institution,
          });

          setStep(2);
          const url = `${API}/api/plaid/exchange-token`;

          setStep(3);
          const res = await fetchWithTimeout(url, { method: 'POST', headers, body }, 60000);

          setStep(4);
          const resBody = await res.json();

          if (!res.ok) throw new Error(resBody.error || `HTTP ${res.status}`);

          setStep(5);
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
    ? `Connecting… (${step}/5)`
    : !linkToken && !error
      ? `Preparing… (${elapsed}s)`
      : 'Connect a bank →';

  return (
    <div className="plk-wrap">
      {error && (
        <>
          <div className="plk-error">{error}</div>
          <button
            type="button"
            className="bsec"
            style={{ width: '100%', marginBottom: 10 }}
            onClick={retry}
          >
            Try again
          </button>
        </>
      )}
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
          {elapsed > 20
            ? 'Plaid is slow — give it another few seconds or hit Retry'
            : 'Asking Plaid for a link token…'}
        </div>
      )}
    </div>
  );
}
