import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { API, BACKEND_AVAILABLE } from '../../lib/apiUrl';
import { useFinancialData } from '../../hooks/useFinancialData';
import HomePage from './HomePage';
import BudgetPage from './BudgetPage';
import GoalsPage from './GoalsPage';
import SagePage from './SagePage';
import MorePage from './MorePage';
import AddTransactionModal from './AddTransactionModal';
import AddAccountModal from './AddAccountModal';
import GoalModal from './GoalModal';
import BudgetModal from './BudgetModal';
import '../../styles/app.css';

const NAV = [
  { id: 'home',   ic: '◈', lbl: 'Home' },
  { id: 'budget', ic: '◎', lbl: 'Budget' },
  { id: 'goals',  ic: '◇', lbl: 'Goals' },
  { id: 'coach',  ic: '✦', lbl: 'Sage' },
  { id: 'more',   ic: '⊙', lbl: 'More' },
];

export default function MainApp({ session }) {
  const [page, setPage] = useState('home');
  const [modal, setModal] = useState(null); // 'txn' | 'account' | { kind: 'goal', goal? } | 'budget'
  const data = useFinancialData();

  const closeModal = () => setModal(null);

  // Auto-sync Plaid accounts in the background on app open. Fire-and-forget:
  // we don't block the UI on it, and we don't show errors. The Plaid endpoint
  // pulls the last 7 days of transactions per item, idempotently — so even
  // if the user just synced, this is a cheap no-op.
  // Only runs once per mount, only if the backend is configured.
  const autoSyncedRef = useRef(false);
  useEffect(() => {
    if (autoSyncedRef.current) return;
    if (!BACKEND_AVAILABLE) return;
    autoSyncedRef.current = true;

    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        if (!token) return;
        const res = await fetch(`${API}/api/sync`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
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
        // Background sync failure is non-fatal — user can still tap Sync now manually
        console.warn('[vela] auto-sync failed', err);
      }
    })();
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
        onAddAccount={() => setModal('account')}
        onEditAccount={(a) => setModal({ kind: 'editAccount', account: a })}
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
  } else if (page === 'coach') {
    activePage = <SagePage data={data} session={session} />;
  } else if (page === 'more') {
    activePage = (
      <MorePage
        data={data}
        session={session}
        onSignOut={() => supabase.auth.signOut()}
      />
    );
  }

  return (
    <div className="app">
      <div className="pages">
        <div className={`page on ${page === 'coach' ? 'coach-page' : ''}`} key={page}>
          {activePage}
        </div>
      </div>

      <nav className="bnav" role="navigation">
        {NAV.map((n) => (
          <button
            key={n.id}
            type="button"
            className={`bn ${page === n.id ? 'on' : ''}`}
            onClick={() => setPage(n.id)}
          >
            <span className="bn-ic">{n.ic}</span>
            <span className="bn-lbl">{n.lbl}</span>
          </button>
        ))}
      </nav>

      {modal === 'txn' && (
        <AddTransactionModal
          accounts={data.accounts}
          onClose={closeModal}
          onSaved={() => { closeModal(); data.refresh(); }}
          onSwitchToAddAccount={() => setModal('account')}
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
      {modal === 'account' && (
        <AddAccountModal
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
