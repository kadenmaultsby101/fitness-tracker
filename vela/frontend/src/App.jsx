import { useEffect, useState, useCallback } from 'react';
import { supabase } from './lib/supabase';
import AuthScreen from './components/AuthScreen';
import Onboarding from './components/Onboarding';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (s) => {
    if (!s) {
      setProfile(null);
      return;
    }
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
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      await loadProfile(data.session);
      if (mounted) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (!mounted) return;
      setSession(s);
      await loadProfile(s);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  if (loading) return <CenteredLabel text="Loading" />;

  if (!session) return <AuthScreen />;

  // First-time users: profile may not be ready yet, or onboarding incomplete.
  if (!profile || !profile.onboarding_completed_at) {
    return (
      <Onboarding
        session={session}
        onDone={() => loadProfile(session)}
      />
    );
  }

  return <SignedInPlaceholder session={session} profile={profile} />;
}

function CenteredLabel({ text }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      color: 'var(--t3)',
      fontFamily: 'var(--mono)',
      fontSize: 10,
      letterSpacing: 3,
      textTransform: 'uppercase',
    }}>
      {text}
    </div>
  );
}

function SignedInPlaceholder({ session, profile }) {
  const signOut = () => supabase.auth.signOut();
  const name =
    profile?.name ||
    session.user?.user_metadata?.name ||
    session.user?.email ||
    'there';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      color: 'var(--t1)',
      fontFamily: 'var(--mono)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 28,
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: 'var(--serif)',
        fontSize: 56,
        fontWeight: 300,
        letterSpacing: -2,
        lineHeight: 1,
      }}>
        Vela
      </div>
      <div style={{
        fontSize: 9,
        letterSpacing: 3,
        textTransform: 'uppercase',
        color: 'var(--t3)',
        marginTop: 12,
        marginBottom: 36,
      }}>
        Signed in · Onboarded
      </div>
      <div style={{
        background: 'var(--c1)',
        border: '1px solid var(--b1)',
        padding: '20px 24px',
        maxWidth: 360,
        width: '100%',
        fontSize: 11,
        lineHeight: 1.8,
        color: 'var(--t2)',
      }}>
        Welcome back, <strong style={{ color: 'var(--t1)' }}>{name}</strong>.
        <br /><br />
        Auth + onboarding complete. The dashboard, Plaid connections, and
        Sage land in the next phases.
      </div>
      <button
        type="button"
        onClick={signOut}
        style={{
          marginTop: 24,
          background: 'transparent',
          border: '1px solid var(--b2)',
          color: 'var(--t2)',
          padding: '11px 22px',
          fontFamily: 'var(--mono)',
          fontSize: 10,
          letterSpacing: 3,
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        Sign Out
      </button>
    </div>
  );
}
