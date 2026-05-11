import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { withTimeout } from '../../lib/withTimeout';

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

// Manual-only edit/delete. Plaid-connected accounts (plaid_account_id
// without 'manual_' prefix) are deleted via Plaid disconnect flow, not
// from this modal.
function isManualAccount(a) {
  return !a?.plaid_account_id || String(a.plaid_account_id).startsWith('manual_');
}

export default function AddAccountModal({ account, onClose, onSaved }) {
  const editing = Boolean(account);
  const fromPlaid = editing && !isManualAccount(account);

  const [name, setName] = useState(account?.name || '');
  const [type, setType] = useState(account?.type || 'depository');
  const [subtype, setSubtype] = useState(account?.subtype || 'checking');
  const [balance, setBalance] = useState(
    account?.balance_current != null ? String(account.balance_current) : ''
  );
  const [mask, setMask] = useState(account?.mask || '');
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
    if (!Number.isFinite(bal)) return setError('Enter a current balance (any number, including 0).');

    setBusy(true);
    try {
      const { data: sess } = await withTimeout(supabase.auth.getSession(), 6000);
      const userId = sess.session?.user?.id;
      if (!userId) throw new Error('Not signed in.');

      if (editing) {
        // Update — only mutable fields (don't touch plaid_account_id, user_id)
        const update = {
          name: name.trim(),
          type,
          subtype,
          balance_current: bal,
          balance_available: type === 'credit' || type === 'loan' ? null : bal,
          mask: mask.trim() || null,
          updated_at: new Date().toISOString(),
        };
        console.info('[vela] AddAccountModal update: sending', update);

        const { data: returned, error: e } = await withTimeout(
          supabase.from('accounts').update(update).eq('id', account.id).select(),
          8000
        );
        console.info('[vela] AddAccountModal update: response', { returned, error: e });
        if (e) throw e;
        if (!returned || returned.length === 0) {
          throw new Error('Update returned no row — RLS or auth mismatch.');
        }
      } else {
        const ts = Date.now();
        const random = Math.random().toString(36).slice(2, 10);
        const payload = {
          user_id: userId,
          plaid_account_id: `manual_${userId.slice(0, 8)}_${ts}_${random}`,
          name: name.trim(),
          type,
          subtype,
          balance_current: bal,
          balance_available: type === 'credit' || type === 'loan' ? null : bal,
          currency: 'USD',
          mask: mask.trim() || null,
        };
        console.info('[vela] AddAccountModal insert: sending', payload);

        const { data: returned, error: e } = await withTimeout(
          supabase.from('accounts').insert(payload).select(),
          8000
        );
        console.info('[vela] AddAccountModal insert: response', { returned, error: e });
        if (e) throw e;
        if (!returned || returned.length === 0) {
          throw new Error('Insert returned no row — RLS or auth mismatch.');
        }
      }

      onSaved();
    } catch (err) {
      console.error('[vela] AddAccountModal failed', err);
      setError(err?.message || 'Save failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!editing) return;
    if (fromPlaid) {
      return setError('This account came from Plaid. Disconnect it from More → Connect a Bank instead of deleting here.');
    }
    // eslint-disable-next-line no-alert
    if (!confirm(`Delete "${account.name}"? Transactions linked to this account will also be removed. This cannot be undone.`)) return;

    setBusy(true);
    setError('');
    try {
      const { error: e } = await withTimeout(
        supabase.from('accounts').delete().eq('id', account.id),
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
        <button type="button" className="mcl" onClick={onClose}>×</button>
        <div className="mtitle">{editing ? 'Edit account' : 'Add an account'}</div>
        <div className="msub">
          {editing
            ? (fromPlaid ? 'Read-only — synced from Plaid' : 'Update name, type, or balance')
            : 'Track manually — update balance anytime'}
        </div>

        {error && <div className="merr">{error}</div>}

        <div className="fl">Account Name</div>
        <input
          className="finp"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Chase Checking"
          disabled={fromPlaid}
          autoFocus={!editing}
        />

        <div className="fl">Type</div>
        <select className="fselect" value={type} onChange={(e) => onTypeChange(e.target.value)} disabled={fromPlaid}>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <div className="fl">Subtype</div>
        <select className="fselect" value={subtype} onChange={(e) => setSubtype(e.target.value)} disabled={fromPlaid}>
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
          disabled={fromPlaid}
        />

        <div className="fl">Last 4 digits (optional)</div>
        <input
          className="finp"
          type="text"
          maxLength={4}
          value={mask}
          onChange={(e) => setMask(e.target.value.replace(/\D/g, ''))}
          placeholder="1234"
          disabled={fromPlaid}
        />

        <div className="mbtns">
          <button type="button" className="bsec" onClick={onClose}>{fromPlaid ? 'Close' : 'Cancel'}</button>
          {!fromPlaid && (
            <button type="button" className="bpri" onClick={save} disabled={busy}>
              {busy ? 'Saving…' : editing ? 'Update →' : 'Add account →'}
            </button>
          )}
        </div>

        {editing && !fromPlaid && (
          <button type="button" className="bdel" onClick={remove} disabled={busy}>
            Delete account
          </button>
        )}
      </div>
    </div>
  );
}
