import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import AuthScreen from './components/AuthScreen';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) {
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
        Loading
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  return <SignedInPlaceholder session={session} />;
}

function SignedInPlaceholder({ session }) {
  const signOut = () => supabase.auth.signOut();
  const name =
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
        Signed in
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
        Welcome, <strong style={{ color: 'var(--t1)' }}>{name}</strong>.
        <br /><br />
        Auth is working. The rest of Vela (onboarding, dashboard, Plaid,
        Sage) lands in the next phases.
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
