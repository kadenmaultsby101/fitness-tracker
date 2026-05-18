import { getUser } from '../_lib/auth.js';
import { plaid, Products, CountryCode, plaidErrorMessage } from '../_lib/plaid.js';

// Vercel's default function timeout is 10s — Plaid linkTokenCreate on a
// cold Lambda can occasionally exceed that. 30s gives us comfortable
// headroom without ever feeling slow to the user.
export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const t0 = Date.now();
    const { data } = await plaid.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: 'Vela',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    });
    console.info(`[plaid] linkTokenCreate ok in ${Date.now() - t0}ms`);

    res.status(200).json({ link_token: data.link_token, expiration: data.expiration });
  } catch (err) {
    console.error('[plaid] create-link-token failed', plaidErrorMessage(err));
    res.status(500).json({ error: plaidErrorMessage(err) });
  }
}
