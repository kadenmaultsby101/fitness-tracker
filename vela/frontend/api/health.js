export default function handler(_req, res) {
  res.status(200).json({
    status: 'Vela API on Vercel Functions',
    plaid_env: process.env.PLAID_ENV || 'sandbox',
    has_plaid: Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET),
    has_supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY),
    has_anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    same_origin: true,
  });
}
