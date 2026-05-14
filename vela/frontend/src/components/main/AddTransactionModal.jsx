import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { withTimeout } from '../../lib/withTimeout';
import { displayAccountName } from './format';
import { CATEGORIES } from '../../hooks/useFinancialData';

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isManualTxn(t) {
  return !t?.plaid_transaction_id || String(t.plaid_transaction_id).startsWith('manual_');
}

export default function AddTransactionModal({ transaction, accounts, onClose, onSaved, onSwitchToAddAccount }) {
  const editing = Boolean(transaction);
  const fromPlaid = editing && !isManualTxn(transaction);

  // For an edit, derive direction from the sign of the existing amount.
  const initialDirection = editing && Number(transaction.amount) < 0 ? 'income' : 'expense';

  const [direction, setDirection] = useState(initialDirection);
  const [name, setName] = useState(transaction?.merchant_name || transaction?.name || '');
  const [amount, setAmount] = useState(
    editing ? String(Math.abs(Number(transaction.amount) || 0)) : ''
  );
  const [category, setCategory] = useState(
    editing && transaction.category && transaction.category !== 'Income'
      ? transaction.category
      : 'Food & Dining'
  );
  const [accountId, setAccountId] = useState(
    transaction?.account_id || accounts[0]?.id || ''
  );
  const [date, setDate] = useState(transaction?.date || todayIso());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // No accounts at all — prompt user to add one (only when adding, not editing).
  if (!editing && accounts.length === 0) {
    return (
      <div className="moverlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="mcl" onClick={onClose} aria-label="Close">×</button>
          <div className="mtitle">No accounts yet</div>
          <div className="msub">Add one first — transactions need to live somewhere</div>
          <div className="mnote">
            Drop in your <strong>Chase Checking</strong>, <strong>Robinhood</strong>, or whatever
            you've got. Update the balance any time. Or connect a bank later from <strong>More</strong>.
          </div>
          <div className="mbtns">
            <button type="button" className="bsec" onClick={onClose}>Not now</button>
            <button
              type="button"
              className="bpri"
              onClick={() => { onClose(); onSwitchToAddAccount?.(); }}
            >
              Add an account →
            </button>
          </div>
        </div>
      </div>
    );
  }

  const save = async () => {
    setError('');
    if (!name.trim()) return setError('Name is required.');
    const amt = Number(String(amount).replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(amt) || amt <= 0) return setError('Enter a positive amount.');
    if (!accountId) return setError('Pick an account, or add one from Home first.');

    setBusy(true);
    try {
      const { data: sess } = await withTimeout(supabase.auth.getSession(), 6000);
      const userId = sess.session?.user?.id;
      if (!userId) throw new Error('Not signed in.');

      // Plaid convention: outflows positive, inflows negative.
      const signedAmount = direction === 'income' ? -amt : amt;

      if (editing) {
        const update = {
          account_id: accountId,
          name: name.trim(),
          merchant_name: name.trim(),
          amount: signedAmount,
          category: direction === 'income' ? 'Income' : category,
          date,
        };
        console.info('[vela] AddTransactionModal update: sending', update);

        const { data: returned, error: e } = await withTimeout(
          supabase.from('transactions').update(update).eq('id', transaction.id).select(),
          8000
        );
        console.info('[vela] AddTransactionModal update: response', { returned, error: e });
        if (e) throw e;
        if (!returned || returned.length === 0) {
          throw new Error('Update returned no row — RLS or auth mismatch.');
        }
      } else {
        const ts = Date.now();
        const random = Math.random().toString(36).slice(2, 10);
        const payload = {
          user_id: userId,
          account_id: accountId,
          plaid_transaction_id: `manual_${userId.slice(0, 8)}_${ts}_${random}`,
          name: name.trim(),
          merchant_name: name.trim(),
          amount: signedAmount,
          category: direction === 'income' ? 'Income' : category,
          subcategory: 'manual',
          date,
          pending: false,
        };
        console.info('[vela] AddTransactionModal insert: sending', payload);

        const { data: returned, error: e } = await withTimeout(
          supabase.from('transactions').insert(payload).select(),
          8000
        );
        console.info('[vela] AddTransactionModal insert: response', { returned, error: e });
        if (e) throw e;
        if (!returned || returned.length === 0) {
          throw new Error('Insert returned no row — RLS or auth mismatch.');
        }
      }

      onSaved();
    } catch (err) {
      console.error('[vela] AddTransactionModal failed', err);
      setError(err?.message || 'Save failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!editing) return;
    if (fromPlaid) {
      return setError('This transaction came from Plaid. Disconnect the bank or hit Sync to refresh — Plaid transactions are not deletable here.');
    }
    // eslint-disable-next-line no-alert
    if (!confirm(`Delete this transaction (${name})? This cannot be undone.`)) return;

    setBusy(true);
    setError('');
    try {
      const { error: e } = await withTimeout(
        supabase.from('transactions').delete().eq('id', transaction.id),
        8000
      );
      if (e) throw e;
      onSaved();
    } catch (err) {
      setError(err?.message || 'Delete failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="moverlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="mcl" onClick={onClose} aria-label="Close">×</button>
        <div className="mtitle">{editing ? 'Edit transaction' : 'Log a transaction'}</div>
        <div className="msub">
          {editing
            ? (fromPlaid ? 'Read-only — synced from Plaid' : 'Update details or delete')
            : 'Manual entry — no bank needed'}
        </div>

        {error && <div className="merr">{error}</div>}

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            className={direction === 'expense' ? 'bpri' : 'bsec'}
            style={{ flex: 1 }}
            onClick={() => !fromPlaid && setDirection('expense')}
            disabled={fromPlaid}
          >
            − Expense
          </button>
          <button
            type="button"
            className={direction === 'income' ? 'bpri' : 'bsec'}
            style={{ flex: 1 }}
            onClick={() => !fromPlaid && setDirection('income')}
            disabled={fromPlaid}
          >
            + Income
          </button>
        </div>

        <div className="fl">Name / Merchant</div>
        <input
          className="finp"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={direction === 'income' ? 'Internship paycheck' : 'Whole Foods'}
          autoFocus={!editing}
          disabled={fromPlaid}
        />

        <div className="fl">Amount (USD)</div>
        <input
          className="finp"
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          disabled={fromPlaid}
        />

        <div className="fl">Account</div>
        <select
          className="fselect"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          disabled={fromPlaid}
        >
          {accounts.length === 0 && <option value="">— No accounts yet —</option>}
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {displayAccountName(a)}{a.mask ? ` ··${a.mask}` : ''}
            </option>
          ))}
        </select>

        {direction === 'expense' && (
          <>
            <div className="fl">Category</div>
            <select
              className="fselect"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={fromPlaid}
            >
              {CATEGORIES.filter((c) => c !== 'Income').map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </>
        )}

        <div className="fl">Date</div>
        <input
          className="finp"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={fromPlaid}
        />

        <div className="mbtns">
          <button type="button" className="bsec" onClick={onClose}>{fromPlaid ? 'Close' : 'Cancel'}</button>
          {!fromPlaid && (
            <button type="button" className="bpri" onClick={save} disabled={busy}>
              {busy ? 'Saving…' : editing ? 'Update →' : 'Save →'}
            </button>
          )}
        </div>

        {editing && !fromPlaid && (
          <button type="button" className="bdel" onClick={remove} disabled={busy}>
            Delete transaction
          </button>
        )}
      </div>
    </div>
  );
}
