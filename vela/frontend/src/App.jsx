import { useEffect, useState, useCallback } from 'react';
import { supabase } from './lib/supabase';
import AuthScreen from './components/AuthScreen';
import Onboarding from './components/Onboarding';
import PlaidLinkButton from './components/PlaidLinkButton';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

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

function money(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n || 0);
}

function SignedInPlaceholder({ session, profile }) {
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState('');

  const name =
    profile?.name ||
    session.user?.user_metadata?.name ||
    session.user?.email ||
    'there';

  const loadAccounts = useCallback(async () => {
    setAccountsLoading(true);
    const { data, error } = await supabase
      .from('accounts')
      .select('id, name, official_name, type, subtype, balance_current, mask, plaid_item_id')
      .eq('user_id', session.user.id)
      .order('balance_current', { ascending: false, nullsFirst: false });
    setAccountsLoading(false);
    if (error) {
      console.error('accounts fetch error', error);
      return;
    }
    setAccounts(data || []);
  }, [session.user.id]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const netWorth = accounts.reduce(
    (s, a) => s + (Number(a.balance_current) || 0),
    0
  );

  const handleConnected = async () => {
    setSyncResult('Account connected.');
    await loadAccounts();
    setTimeout(() => setSyncResult(''), 4000);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult('');
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch(`${API}/api/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setSyncResult(
        `Synced ${body.items} item${body.items === 1 ? '' : 's'} · ${body.new_transactions} new txn${body.new_transactions === 1 ? '' : 's'}.`
      );
      await loadAccounts();
    } catch (e) {
      setSyncResult(`Sync failed: ${e.message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncResult(''), 5000);
    }
  };

  const signOut = () => supabase.auth.signOut();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      color: 'var(--t1)',
      fontFamily: 'var(--mono)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '36px 22px 60px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 30 }}>
        <div style={{
          fontFamily: 'var(--serif)',
          fontSize: 48,
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
          marginTop: 10,
        }}>
          Welcome back, {name}
        </div>
      </div>

      <div style={{
        background: 'var(--c1)',
        border: '1px solid var(--b1)',
        padding: '22px 20px',
        width: '100%',
        maxWidth: 420,
        marginBottom: 14,
      }}>
        <div style={{
          fontSize: 8,
          letterSpacing: 3,
          textTransform: 'uppercase',
          color: 'var(--t3)',
          marginBottom: 8,
        }}>
          Total Net Worth
        </div>
        <div style={{
          fontFamily: 'var(--serif)',
          fontSize: 44,
          fontWeight: 300,
          letterSpacing: -2,
          lineHeight: 1,
        }}>
          {money(netWorth)}
        </div>
        <div style={{
          fontSize: 9,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: 'var(--t3)',
          marginTop: 6,
        }}>
          Across {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
        </div>
      </div>

      {accountsLoading ? (
        <div style={{
          fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
          color: 'var(--t3)', padding: 14,
        }}>
          Loading accounts…
        </div>
      ) : accounts.length === 0 ? (
        <div style={{
          background: 'var(--c1)',
          border: '1px dashed var(--b2)',
          padding: 18,
          width: '100%',
          maxWidth: 420,
          marginBottom: 14,
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--t2)',
          lineHeight: 1.7,
        }}>
          No accounts connected yet.
          <br />
          Use the button below to connect your first one.
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: 420, marginBottom: 14 }}>
          {accounts.map((a) => (
            <div key={a.id} style={{
              background: 'var(--c1)',
              border: '1px solid var(--b1)',
              padding: '14px 16px',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--t1)' }}>
                  {a.name}
                  {a.mask && (
                    <span style={{ color: 'var(--t3)', marginLeft: 8 }}>
                      ··{a.mask}
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: 8,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  color: 'var(--t3)',
                  marginTop: 3,
                }}>
                  {a.subtype || a.type}
                </div>
              </div>
              <div style={{
                fontFamily: 'var(--serif)',
                fontSize: 18,
                fontWeight: 300,
                letterSpacing: -0.5,
                flexShrink: 0,
              }}>
                {money(a.balance_current)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PlaidLinkButton onConnected={handleConnected} />

        {accounts.length > 0 && (
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            style={{
              padding: 14,
              background: 'transparent',
              border: '1px solid var(--b2)',
              color: 'var(--t2)',
              fontFamily: 'var(--mono)',
              fontSize: 10,
              letterSpacing: 3,
              textTransform: 'uppercase',
              cursor: syncing ? 'not-allowed' : 'pointer',
              opacity: syncing ? 0.4 : 1,
            }}
          >
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        )}

        {syncResult && (
          <div style={{
            fontSize: 10,
            letterSpacing: 1.5,
            textAlign: 'center',
            color: syncResult.startsWith('Sync failed') ? 'var(--red)' : 'var(--green)',
            padding: '4px 0',
          }}>
            {syncResult}
          </div>
        )}

        <button
          type="button"
          onClick={signOut}
          style={{
            marginTop: 8,
            background: 'transparent',
            border: 'none',
            color: 'var(--t3)',
            fontFamily: 'var(--mono)',
            fontSize: 9,
            letterSpacing: 2,
            textTransform: 'uppercase',
            cursor: 'pointer',
            padding: 8,
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
