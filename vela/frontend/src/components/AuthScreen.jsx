import { useState } from 'react';
import { supabase } from '../lib/supabase';
import './AuthScreen.css';

export default function AuthScreen() {
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  const isSignup = mode === 'signup';

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setInfo('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setInfo('');

    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    if (isSignup && !name.trim()) {
      setError('Name is required to sign up.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setBusy(true);
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: name.trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          // Email confirmation required — show a dedicated "check inbox" state.
          setPendingEmail(email);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    if (busy) return;
    setError('');
    setInfo('');
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      // Success redirects away — no need to clear busy.
    } catch (err) {
      setError(err.message || 'Could not start Google sign-in.');
      setBusy(false);
    }
  };

  const resendConfirmation = async () => {
    if (busy || !pendingEmail) return;
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: pendingEmail });
      if (error) throw error;
      setInfo('Sent again — check your inbox.');
    } catch (err) {
      setError(err.message || 'Could not resend. Try again in a minute.');
    } finally {
      setBusy(false);
    }
  };

  const sendPasswordReset = async () => {
    if (busy) return;
    setError('');
    setInfo('');
    if (!email) {
      setError('Enter your email above first, then tap "Forgot password".');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) throw error;
      setInfo(`Reset link sent to ${email}. Check your inbox.`);
    } catch (err) {
      setError(err.message || 'Could not send reset link.');
    } finally {
      setBusy(false);
    }
  };

  if (pendingEmail) {
    return (
      <div className="auth-screen">
        <div className="auth-brand">
          <div className="auth-wordmark">Vela</div>
          <div className="auth-tagline">Financial OS</div>
        </div>
        <div className="auth-card">
          <div style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 500, marginBottom: 8 }}>
            Check your inbox
          </div>
          <div className="auth-note" style={{ marginBottom: 14 }}>
            We sent a confirmation link to <strong>{pendingEmail}</strong>. Click it to
            activate your account, then come back and sign in.
          </div>
          {error && <div className="auth-error">{error}</div>}
          {info && <div className="auth-note">{info}</div>}
          <button type="button" className="auth-submit" onClick={resendConfirmation} disabled={busy}>
            {busy ? '…' : 'Resend email'}
          </button>
          <button
            type="button"
            onClick={() => { setPendingEmail(''); setMode('signin'); setError(''); setInfo(''); }}
            style={{
              background: 'none', border: 'none', color: 'var(--t2)',
              fontSize: 11, letterSpacing: 1, textTransform: 'uppercase',
              cursor: 'pointer', padding: '12px 0 0', width: '100%',
            }}
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <div className="auth-brand">
        <div className="auth-wordmark">Vela</div>
        <div className="auth-tagline">Financial OS</div>
      </div>

      <form className="auth-card" onSubmit={submit}>
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${!isSignup ? 'on' : ''}`}
            onClick={() => switchMode('signin')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${isSignup ? 'on' : ''}`}
            onClick={() => switchMode('signup')}
          >
            Sign Up
          </button>
        </div>

        <button type="button" className="auth-google" onClick={signInWithGoogle} disabled={busy}>
          <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18Z"/>
            <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34Z"/>
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58Z"/>
          </svg>
          Continue with Google
        </button>

        <div className="auth-divider"><span>or</span></div>

        {error && <div className="auth-error">{error}</div>}
        {info && <div className="auth-note">{info}</div>}

        {isSignup && (
          <div className="auth-field">
            <label className="auth-label" htmlFor="auth-name">Name</label>
            <input
              id="auth-name"
              className="auth-input"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First name"
            />
          </div>
        )}

        <div className="auth-field">
          <label className="auth-label" htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            className="auth-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className="auth-field">
          <div className="auth-label-row">
            <label className="auth-label" htmlFor="auth-password">Password</label>
            <button
              type="button"
              className="auth-pw-toggle"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
          <input
            id="auth-password"
            className="auth-input"
            type={showPw ? 'text' : 'password'}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isSignup ? 'At least 6 characters' : 'Your password'}
          />
          {isSignup && (
            <div className="auth-hint">
              {password.length === 0
                ? <>At least 6 characters. Use <strong>Show</strong> if you want to double-check what you typed.</>
                : password.length < 6
                  ? <span style={{ color: 'var(--red)' }}>{6 - password.length} more character{password.length === 5 ? '' : 's'} to go</span>
                  : <span style={{ color: 'var(--green)' }}>Looks good</span>}
            </div>
          )}
        </div>

        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? '…' : isSignup ? 'Create Account →' : 'Sign In →'}
        </button>

        {!isSignup && (
          <button
            type="button"
            onClick={sendPasswordReset}
            disabled={busy}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--t2)',
              fontSize: 10,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              cursor: 'pointer',
              padding: '10px 0 4px',
              width: '100%',
              textAlign: 'center',
            }}
          >
            Forgot password?
          </button>
        )}

        {isSignup && (
          <div style={{
            fontSize: 10,
            color: 'var(--t3)',
            lineHeight: 1.55,
            padding: '12px 4px 0',
            textAlign: 'center',
          }}>
            Vela connects via <strong style={{ color: 'var(--t2)' }}>Plaid (read-only)</strong> — no bank passwords stored. <strong style={{ color: 'var(--t2)' }}>Sage AI</strong> sees your financial data to give advice. Currently in private beta — your data is visible to the Vela admin.
          </div>
        )}

        <div className="auth-footer">
          {isSignup ? 'Already have an account?' : "Don't have one yet?"}{' '}
          <button
            type="button"
            onClick={() => switchMode(isSignup ? 'signin' : 'signup')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--t1)',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              fontSize: '8px',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {isSignup ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </form>
    </div>
  );
}
