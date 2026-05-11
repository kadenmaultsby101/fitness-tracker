import { useState } from 'react';
import { supabase } from '../../lib/supabase';

const TYPES = [
  { value: 'depository', label: 'Checking / Savings (Bank)' },
  { value: 'investment', label: 'Brokerage / Retirement' },
  { value: 'credit',     label: 'Credit Card' },
  { value: 'loan',       label: 'Loan' },
];

const SUBTYPES = {
  depository: ['checking', 'savings', 'cd', 'money market'],
  investment: ['brokerage', '401k', 'roth', 'ira', 'hsa', 'crypto'],
  credit:     ['credit card'],
  loan:       ['mortgage', 'student', 'auto', 'personal'],
};

export default function AddAccountModal({ onClose, onSaved }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('depository');
  const [subtype, setSubtype] = useState('checking');
  const [balance, setBalance] = useState('');
  const [mask, setMask] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onTypeChange = (v) => {
    setType(v);
    setSubtype(SUBTYPES[v][0]);
  };

  const save = async () => {
    setError('');
    if (!name.trim()) return setError('Account name is required.');
    const bal = Number(String(balance).replace(/[^0-9.-]/g, ''));
    if (!Number.isFinite(bal)) return setError('Enter a current balance.');

    setBusy(true);
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user?.id;
    if (!userId) {
      setBusy(false);
      return setError('Not signed in.');
    }

    const ts = Date.now();
    const random = Math.random().toString(36).slice(2, 10);

    const { error: e } = await supabase.from('accounts').insert({
      user_id: userId,
      plaid_account_id: `manual_${userId.slice(0, 8)}_${ts}_${random}`,
      name: name.trim(),
      type,
      subtype,
      balance_current: bal,
      balance_available: type === 'credit' || type === 'loan' ? null : bal,
      currency: 'USD',
      mask: mask.trim() || null,
    });

    setBusy(false);
    if (e) return setError(e.message);
    onSaved();
  };

  return (
    <div className="moverlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="mcl" onClick={onClose}>×</button>
        <div className="mtitle">Add an account</div>
        <div className="msub">Track manually — update balance anytime</div>

        {error && <div className="merr">{error}</div>}

        <div className="fl">Account Name</div>
        <input
          className="finp"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Chase Checking"
          autoFocus
        />

        <div className="fl">Type</div>
        <select className="fselect" value={type} onChange={(e) => onTypeChange(e.target.value)}>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <div className="fl">Subtype</div>
        <select className="fselect" value={subtype} onChange={(e) => setSubtype(e.target.value)}>
          {SUBTYPES[type].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <div className="fl">Current Balance (USD)</div>
        <input
          className="finp"
          type="text"
          inputMode="decimal"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="0.00"
        />

        <div className="fl">Last 4 digits (optional)</div>
        <input
          className="finp"
          type="text"
          maxLength={4}
          value={mask}
          onChange={(e) => setMask(e.target.value.replace(/\D/g, ''))}
          placeholder="1234"
        />

        <div className="mbtns">
          <button type="button" className="bsec" onClick={onClose}>Cancel</button>
          <button type="button" className="bpri" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Add account →'}
          </button>
        </div>
      </div>
    </div>
  );
}
