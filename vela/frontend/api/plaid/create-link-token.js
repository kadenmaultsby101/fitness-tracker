import { getUser } from '../_lib/auth.js';
import { plaid, Products, CountryCode, plaidErrorMessage } from '../_lib/plaid.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const { data } = await plaid.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: 'Vela',
      // Production gates Auth and Investments separately — Vela only needs
      // Transactions (covers account list, balances, transaction history).
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    });

    res.status(200).json({ link_token: data.link_token, expiration: data.expiration });
  } catch (err) {
    console.error('[plaid] create-link-token failed', plaidErrorMessage(err));
    res.status(500).json({ error: plaidErrorMessage(err) });
  }
}
