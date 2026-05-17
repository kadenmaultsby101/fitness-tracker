import { getUser, supabaseAdmin } from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (error) throw error;

    console.info('[account-delete] deleted user', user.id);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[account-delete] failed', err);
    res.status(500).json({ error: err?.message || 'Failed to delete account.' });
  }
}
