import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { displayAccountName } from './format';
import { CATEGORIES } from '../../hooks/useFinancialData';

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AddTransactionModal({ accounts, onClose, onSaved }) {
  const [direction, setDirection] = useState('expense'); // 'expense' | 'income'
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food & Dining');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [date, setDate] = useState(todayIso());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    if (!name.trim()) return setError('Name is required.');
    const amt = Number(String(amount).replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(amt) || amt <= 0) return setError('Enter a positive amount.');
    if (!accountId) return setError('Pick an account, or add one from Home first.');

    setBusy(true);
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user?.id;
    if (!userId) {
      setBusy(false);
      return setError('Not signed in.');
    }

    // Plaid convention: outflows positive, inflows negative.
    const signedAmount = direction === 'income' ? -amt : amt;
    const ts = Date.now();
    const random = Math.random().toString(36).slice(2, 10);

    const { error: e } = await supabase.from('transactions').insert({
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
    });

    setBusy(false);
    if (e) return setError(e.message);
    onSaved();
  };

  return (
    <div className="moverlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="mcl" onClick={onClose} aria-label="Close">×</button>
        <div className="mtitle">Log a transaction</div>
        <div className="msub">Manual entry — no bank needed</div>

        {error && <div className="merr">{error}</div>}

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            className={direction === 'expense' ? 'bpri' : 'bsec'}
            style={{ flex: 1 }}
            onClick={() => setDirection('expense')}
          >
            − Expense
          </button>
          <button
            type="button"
            className={direction === 'income' ? 'bpri' : 'bsec'}
            style={{ flex: 1 }}
            onClick={() => setDirection('income')}
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
          autoFocus
        />

        <div className="fl">Amount (USD)</div>
        <input
          className="finp"
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
        />

        <div className="fl">Account</div>
        <select
          className="fselect"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
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
        />

        <div className="mbtns">
          <button type="button" className="bsec" onClick={onClose}>Cancel</button>
          <button type="button" className="bpri" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save →'}
          </button>
        </div>
      </div>
    </div>
  );
}
