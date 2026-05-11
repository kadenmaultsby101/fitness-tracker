import { useEffect, useState, useCallback } from 'react';
import { supabase } from './lib/supabase';
import AuthScreen from './components/AuthScreen';
import Onboarding from './components/Onboarding';
import MainApp from './components/main/MainApp';

// If boot takes longer than this, surface what failed instead of hanging on
// the splash forever. Supabase requests usually complete in <500ms.
const BOOT_TIMEOUT_MS = 8000;

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState('');

  const loadProfile = useCallback(async (s) => {
    if (!s) {
      setProfile(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, monthly_income, onboarding_completed_at')
        .eq('id', s.user.id)
        .maybeSingle();
      if (error) {
        console.error('profile fetch error', error);
        setProfile(null);
        return;
      }
      setProfile(data);
    } catch (err) {
      console.error('profile fetch threw', err);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Safety: if the boot sequence stalls, render whatever we have so the
    // user isn't stuck on the splash forever.
    const safety = setTimeout(() => {
      if (!mounted) return;
      console.warn('[vela] boot timeout — rendering with current state');
      setBootError('Boot took longer than expected. Continuing anyway.');
      setLoading(false);
    }, BOOT_TIMEOUT_MS);

    supabase.auth
      .getSession()
      .then(async ({ data, error }) => {
        if (!mounted) return;
        if (error) {
          console.error('getSession error', error);
          setBootError(`Auth: ${error.message}`);
        }
        setSession(data?.session ?? null);
        await loadProfile(data?.session ?? null);
      })
      .catch((err) => {
        console.error('Vela boot threw', err);
        if (mounted) setBootError(`Boot: ${err?.message || err}`);
      })
      .finally(() => {
        if (mounted) {
          clearTimeout(safety);
          setLoading(false);
        }
      });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (!mounted) return;
      setSession(s);
      await loadProfile(s);
    });

    return () => {
      mounted = false;
      clearTimeout(safety);
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  if (loading) return <CenteredLabel text="Loading" />;

  // Surface a boot error banner above the rest of the app so the user can
  // see what failed without opening dev tools.
  const banner = bootError ? <BootErrorBanner message={bootError} /> : null;

  if (!session) {
    return (
      <>
        {banner}
        <AuthScreen />
      </>
    );
  }

  // Treat the user as onboarded if EITHER the profile row says so OR the
  // browser has a localStorage flag set during a previous successful run
  // of the Onboarding finishing handler. The flag survives the page reload
  // that follows onboarding, so a slow Supabase write can't trap the user
  // in an onboarding loop.
  let locallyOnboarded = false;
  try {
    locallyOnboarded = localStorage.getItem(`vela:onboarded:${session.user.id}`) === '1';
  } catch { /* private mode — non-fatal */ }

  if (!profile?.onboarding_completed_at && !locallyOnboarded) {
    return (
      <>
        {banner}
        <Onboarding session={session} onDone={() => loadProfile(session)} />
      </>
    );
  }
  return (
    <>
      {banner}
      <MainApp session={session} />
    </>
  );
}

function CenteredLabel({ text }) {
  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      gap: 14,
    }}>
      <div style={{
        fontFamily: 'var(--serif)',
        fontSize: 56,
        fontWeight: 300,
        letterSpacing: -2,
        color: 'var(--t1)',
        opacity: 0.92,
        animation: 'velaPulse 2.2s ease-in-out infinite',
      }}>
        Vela
      </div>
      <div style={{
        fontSize: 8,
        letterSpacing: 3,
        textTransform: 'uppercase',
        color: 'var(--t3)',
      }}>
        {text}
      </div>
      <style>{`
        @keyframes velaPulse {
          0%, 100% { opacity: 0.92; transform: translateY(0); }
          50%      { opacity: 0.55; transform: translateY(-1px); }
        }
      `}</style>
    </div>
  );
}

function BootErrorBanner({ message }) {
  return (
    <div style={{
      background: 'rgba(235,159,159,0.10)',
      borderBottom: '1px solid rgba(235,159,159,0.30)',
      color: 'var(--red)',
      fontFamily: 'var(--mono)',
      fontSize: 10,
      letterSpacing: 1,
      padding: '8px 14px',
      textAlign: 'center',
      lineHeight: 1.5,
    }}>
      {message}
    </div>
  );
}
