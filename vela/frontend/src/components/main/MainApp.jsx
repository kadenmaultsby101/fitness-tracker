import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { API, BACKEND_AVAILABLE } from '../../lib/apiUrl';
import { useFinancialData } from '../../hooks/useFinancialData';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import HomePage from './HomePage';
import BudgetPage from './BudgetPage';
import GoalsPage from './GoalsPage';
import SagePage from './SagePage';
import MorePage from './MorePage';
import InsightsPage from './InsightsPage';
import SubscriptionsPage from './SubscriptionsPage';
import AccountDetailPage from './AccountDetailPage';
import TransactionsView from './TransactionsView';
import AddTransactionModal from './AddTransactionModal';
import AddAccountModal from './AddAccountModal';
import GoalModal from './GoalModal';
import BudgetModal from './BudgetModal';
import { NAV_ICON } from './NavIcons';
import '../../styles/app.css';

const NAV = [
  { id: 'home',     lbl: 'Home' },
  { id: 'budget',   lbl: 'Budget' },
  { id: 'insights', lbl: 'Insights' },
  { id: 'goals',    lbl: 'Goals' },
  { id: 'coach',    lbl: 'Sage' },
  { id: 'more',     lbl: 'More' },
];

export default function MainApp({ session }) {
  const [page, setPage] = useState('home');
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [txnFilter, setTxnFilter] = useState(null); // { kind: 'category'|'merchant', value }
  const [modal, setModal] = useState(null); // 'txn' | { kind: 'editAccount', account } | { kind: 'editTxn', txn } | { kind: 'goal', goal? } | 'budget'
  const data = useFinancialData();

  const openAccount = (a) => {
    setSelectedAccountId(a.id);
    setPage('account');
  };
  const openCategory = (value) => {
    setTxnFilter({ kind: 'category', value });
    setPage('txnview');
  };
  const openMerchant = (value) => {
    setTxnFilter({ kind: 'merchant', value });
    setPage('txnview');
  };
  const openSearch = () => {
    setTxnFilter({ kind: 'search', value: '' });
    setPage('txnview');
  };
  const openSubscriptions = () => setPage('subscriptions');

  const closeModal = () => setModal(null);

  // Auto-sync Plaid accounts in the background on app open. Fire-and-forget:
  // we don't block the UI on it, and we don't show errors. The Plaid endpoint
  // pulls the last 90 days of transactions per item, idempotently.
  // Only runs once per mount, only if the backend is configured.
  const autoSyncedRef = useRef(false);
  const lastSyncRef = useRef(0);

  const runBackgroundSync = async ({ controllerOpts } = {}) => {
    if (!BACKEND_AVAILABLE) return;
    // Don't double-fire if a sync ran in the last 60s (e.g. tab focus
    // immediately after the periodic timer).
    const now = Date.now();
    if (now - lastSyncRef.current < 60_000) return;
    lastSyncRef.current = now;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90000);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) return;
      const res = await fetch(`${API}/api/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
        ...(controllerOpts || {}),
      });
      if (!res.ok) {
        console.warn('[vela] auto-sync skipped:', res.status);
        return;
      }
      const body = await res.json();
      console.info('[vela] auto-sync result', body);
      if (body.new_transactions > 0 || body.items > 0) {
        data.refresh();
      }
    } catch (err) {
      console.warn('[vela] auto-sync failed', err?.message);
    } finally {
      clearTimeout(timer);
    }
  };

  // Initial sync on mount
  useEffect(() => {
    if (autoSyncedRef.current) return;
    autoSyncedRef.current = true;
    runBackgroundSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periodic sync every 10 minutes while the app is open, plus a sync on
  // tab focus (when the user comes back to Vela from another tab). The
  // 60s debounce in runBackgroundSync prevents double-firing.
  useEffect(() => {
    if (!BACKEND_AVAILABLE) return;
    const onFocus = () => {
      if (document.visibilityState === 'visible') runBackgroundSync();
    };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    const interval = setInterval(runBackgroundSync, 10 * 60 * 1000);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render only the active page. Previously all 5 were rendered with CSS
  // opacity:0 hiding the inactive ones — robust visually but copy/paste,
  // accessibility readers, and any CSS regression would expose them all.
  // Single active page eliminates the whole class of 'why am I seeing
  // everything stacked' bugs.
  let activePage;
  if (page === 'home') {
    activePage = (
      <HomePage
        data={data}
        session={session}
        onAddTxn={() => setModal('txn')}
        onOpenAccount={openAccount}
        onOpenSearch={openSearch}
        onEditTxn={(t) => setModal({ kind: 'editTxn', txn: t })}
        onGoTo={setPage}
      />
    );
  } else if (page === 'budget') {
    activePage = (
      <BudgetPage
        data={data}
        onEditBudgets={() => setModal('budget')}
        onAddTxn={() => setModal('txn')}
        onEditTxn={(t) => setModal({ kind: 'editTxn', txn: t })}
        onOpenCategory={openCategory}
        onOpenSearch={openSearch}
      />
    );
  } else if (page === 'goals') {
    activePage = (
      <GoalsPage
        data={data}
        onAddGoal={() => setModal({ kind: 'goal' })}
        onEditGoal={(g) => setModal({ kind: 'goal', goal: g })}
      />
    );
  } else if (page === 'insights') {
    activePage = (
      <InsightsPage
        data={data}
        onOpenCategory={openCategory}
        onOpenMerchant={openMerchant}
        onOpenSubscriptions={openSubscriptions}
      />
    );
  } else if (page === 'coach') {
    activePage = <SagePage data={data} session={session} />;
  } else if (page === 'more') {
    activePage = (
      <MorePage
        data={data}
        session={session}
        onSignOut={() => supabase.auth.signOut()}
        onOpenAccount={openAccount}
      />
    );
  } else if (page === 'account') {
    activePage = (
      <AccountDetailPage
        data={data}
        accountId={selectedAccountId}
        onBack={() => { setSelectedAccountId(null); setPage('home'); }}
        onEditAccount={(a) => setModal({ kind: 'editAccount', account: a })}
        onEditTxn={(t) => setModal({ kind: 'editTxn', txn: t })}
      />
    );
  } else if (page === 'subscriptions') {
    activePage = (
      <SubscriptionsPage
        data={data}
        onBack={() => setPage('insights')}
        onOpenMerchant={openMerchant}
      />
    );
  } else if (page === 'txnview') {
    activePage = (
      <TransactionsView
        data={data}
        filter={txnFilter}
        onBack={() => { setTxnFilter(null); setPage('home'); }}
        onOpenMerchant={openMerchant}
        onEditTxn={(t) => setModal({ kind: 'editTxn', txn: t })}
      />
    );
  }

  const pageRef = useRef(null);
  const { pull, refreshing } = usePullToRefresh(
    pageRef,
    async () => {
      lastSyncRef.current = 0; // bypass the 60s debounce for an explicit pull
      await runBackgroundSync();
      data.refresh();
    },
    { resetKey: page }
  );

  return (
    <div className="app">
      <div className="pages">
        {(pull > 0 || refreshing) && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: pull,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            letterSpacing: 1,
            color: 'var(--t2)',
            zIndex: 6,
            pointerEvents: 'none',
          }}>
            {refreshing ? 'Syncing…' : pull >= 70 ? 'Release to sync' : 'Pull to sync'}
          </div>
        )}
        <div
          ref={pageRef}
          className={`page on ${page === 'coach' ? 'coach-page' : ''}`}
          key={page}
          style={{ transform: pull > 0 ? `translateY(${pull}px)` : undefined }}
        >
          {activePage}
        </div>
      </div>

      <nav className="bnav" role="navigation">
        {NAV.map((n) => {
          const Icon = NAV_ICON[n.id];
          const active = page === n.id
            || (n.id === 'home' && page === 'account')
            || (n.id === 'insights' && page === 'subscriptions');
          return (
            <button
              key={n.id}
              type="button"
              className={`bn ${active ? 'on' : ''}`}
              onClick={() => setPage(n.id)}
            >
              <span className="bn-ic">{Icon ? <Icon /> : null}</span>
              <span className="bn-lbl">{n.lbl}</span>
            </button>
          );
        })}
      </nav>

      {modal === 'txn' && (
        <AddTransactionModal
          accounts={data.accounts}
          onClose={closeModal}
          onSaved={() => { closeModal(); data.refresh(); }}
        />
      )}
      {modal?.kind === 'editTxn' && (
        <AddTransactionModal
          transaction={modal.txn}
          accounts={data.accounts}
          onClose={closeModal}
          onSaved={() => { closeModal(); data.refresh(); }}
        />
      )}
      {modal?.kind === 'editAccount' && (
        <AddAccountModal
          account={modal.account}
          onClose={closeModal}
          onSaved={() => { closeModal(); data.refresh(); }}
        />
      )}
      {modal?.kind === 'goal' && (
        <GoalModal
          goal={modal.goal}
          onClose={closeModal}
          onSaved={() => { closeModal(); data.refresh(); }}
        />
      )}
      {modal === 'budget' && (
        <BudgetModal
          existing={data.budgets}
          income={data.profile?.monthly_income}
          onClose={closeModal}
          onSaved={() => { closeModal(); data.refresh(); }}
        />
      )}
    </div>
  );
}
