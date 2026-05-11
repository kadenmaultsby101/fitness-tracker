import { useEffect, useState, useCallback } from 'react';
import { supabase } from './lib/supabase';
import AuthScreen from './components/AuthScreen';
import Onboarding from './components/Onboarding';
import MainApp from './components/main/MainApp';

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
  if (!profile || !profile.onboarding_completed_at) {
    return <Onboarding session={session} onDone={() => loadProfile(session)} />;
  }
  return <MainApp session={session} />;
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
