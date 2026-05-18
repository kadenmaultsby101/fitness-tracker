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
          setInfo('Check your email to confirm your account, then sign in.');
          setMode('signin');
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
              placeholder="Kaden"
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
