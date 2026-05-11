import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { withTimeout } from '../../lib/withTimeout';

const PRESETS = [
  { emoji: '🛡️', name: 'Emergency Fund' },
  { emoji: '🌱', name: 'Roth IRA' },
  { emoji: '🏠', name: 'FHA Down Payment' },
  { emoji: '📊', name: 'Brokerage Growth' },
  { emoji: '✈️', name: 'Travel Fund' },
  { emoji: '🚗', name: 'New Car' },
];

export default function GoalModal({ goal, onClose, onSaved }) {
  const editing = Boolean(goal);
  const [emoji, setEmoji]       = useState(goal?.emoji || '🛡️');
  const [name, setName]         = useState(goal?.name || '');
  const [description, setDesc]  = useState(goal?.description || '');
  const [current, setCurrent]   = useState(goal?.current_amount?.toString() || '');
  const [target, setTarget]     = useState(goal?.target_amount?.toString() || '');
  const [monthly, setMonthly]   = useState(goal?.monthly_contribution?.toString() || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const num = (s) => {
    const n = Number(String(s).replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };

  const save = async () => {
    setError('');
    if (!name.trim()) return setError('Goal name is required.');
    const tgt = num(target);
    if (tgt <= 0) return setError('Target amount must be > 0.');

    setBusy(true);
    try {
      const { data: sess } = await withTimeout(supabase.auth.getSession(), 6000);
      const userId = sess.session?.user?.id;
      if (!userId) throw new Error('Not signed in.');

      const payload = {
        user_id: userId,
        name: name.trim(),
        emoji,
        description: description.trim() || null,
        current_amount: num(current),
        target_amount: tgt,
        monthly_contribution: num(monthly),
      };

      console.info('[vela] GoalModal save: sending', payload);

      // Chain .select() so the insert returns the new row — proves the
      // write actually landed and gives us the new id to verify.
      const op = editing
        ? supabase.from('goals').update(payload).eq('id', goal.id).select()
        : supabase.from('goals').insert(payload).select();

      const { data: returned, error: e } = await withTimeout(op, 8000);
      console.info('[vela] GoalModal save: response', { returned, error: e });

      if (e) throw e;
      if (!returned || returned.length === 0) {
        throw new Error('Insert returned no row — likely an RLS / auth.uid() mismatch. Check Supabase Auth → Users to confirm your session matches a real user.');
      }
      onSaved();
    } catch (err) {
      console.error('[vela] GoalModal save failed', err);
      setError(err?.message || 'Save failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!editing) return;
    if (!confirm('Delete this goal? This cannot be undone.')) return;
    setBusy(true);
    try {
      const { error: e } = await withTimeout(
        supabase.from('goals').delete().eq('id', goal.id),
        8000
      );
      if (e) throw e;
      onSaved();
    } catch (err) {
      setError(err?.message || 'Delete failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const usePreset = (p) => {
    setEmoji(p.emoji);
    if (!name) setName(p.name);
  };

  return (
    <div className="moverlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="mcl" onClick={onClose}>×</button>
        <div className="mtitle">{editing ? 'Edit goal' : 'New goal'}</div>
        <div className="msub">{editing ? 'Update progress or change targets' : 'Pick a preset or start fresh'}</div>

        {error && <div className="merr">{error}</div>}

        {!editing && (
          <>
            <div className="fl">Quick presets</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  className="bsec"
                  style={{ padding: '8px 10px', flex: '0 0 auto', fontSize: 9 }}
                  onClick={() => usePreset(p)}
                >
                  {p.emoji} {p.name}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="fl">Emoji</div>
        <input
          className="finp"
          type="text"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
          placeholder="🛡️"
        />

        <div className="fl">Name</div>
        <input
          className="finp"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Emergency Fund"
        />

        <div className="fl">Description (optional)</div>
        <input
          className="finp"
          type="text"
          value={description}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="6 months of expenses"
        />

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div className="fl">Current</div>
            <input
              className="finp"
              type="text"
              inputMode="decimal"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="0"
            />
          </div>
          <div style={{ flex: 1 }}>
            <div className="fl">Target</div>
            <input
              className="finp"
              type="text"
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="15000"
            />
          </div>
        </div>

        <div className="fl">Monthly contribution</div>
        <input
          className="finp"
          type="text"
          inputMode="decimal"
          value={monthly}
          onChange={(e) => setMonthly(e.target.value)}
          placeholder="500"
        />

        <div className="mbtns">
          <button type="button" className="bsec" onClick={onClose}>Cancel</button>
          <button type="button" className="bpri" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Update →' : 'Add goal →'}
          </button>
        </div>

        {editing && (
          <button type="button" className="bdel" onClick={remove} disabled={busy}>
            Delete goal
          </button>
        )}
      </div>
    </div>
  );
}
