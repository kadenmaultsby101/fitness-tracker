import { useState } from 'react';
import { supabase } from '../../lib/supabase';
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

  return (
    <div className="app">
      <div className="pages">
        <div className={`page ${page === 'home' ? 'on' : ''}`}>
          <HomePage
            data={data}
            session={session}
            onAddTxn={() => setModal('txn')}
            onAddAccount={() => setModal('account')}
            onGoTo={setPage}
          />
        </div>

        <div className={`page ${page === 'budget' ? 'on' : ''}`}>
          <BudgetPage
            data={data}
            onEditBudgets={() => setModal('budget')}
            onAddTxn={() => setModal('txn')}
          />
        </div>

        <div className={`page ${page === 'goals' ? 'on' : ''}`}>
          <GoalsPage
            data={data}
            onAddGoal={() => setModal({ kind: 'goal' })}
            onEditGoal={(g) => setModal({ kind: 'goal', goal: g })}
          />
        </div>

        <div className={`page coach-page ${page === 'coach' ? 'on' : ''}`}>
          <SagePage data={data} session={session} />
        </div>

        <div className={`page ${page === 'more' ? 'on' : ''}`}>
          <MorePage
            data={data}
            session={session}
            onSignOut={() => supabase.auth.signOut()}
          />
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
        />
      )}
      {modal === 'account' && (
        <AddAccountModal
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
