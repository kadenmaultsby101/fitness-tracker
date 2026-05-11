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
