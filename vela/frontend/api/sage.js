import Anthropic from '@anthropic-ai/sdk';
import { getUser, supabaseAdmin } from './_lib/auth.js';

const SAGE_MODEL = 'claude-haiku-4-5';
const SAGE_DAILY_LIMIT = 50;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'Sage not configured — set ANTHROPIC_API_KEY on the backend.' });
    }

    const { message, history = [] } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message required' });
    }

    // Per-user daily rate limit — count user's outgoing messages today (UTC)
    const todayUtcStart = new Date();
    todayUtcStart.setUTCHours(0, 0, 0, 0);
    const { count: todayCount, error: countErr } = await supabaseAdmin
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('role', 'user')
      .gte('created_at', todayUtcStart.toISOString());
    if (countErr) {
      console.warn('[sage] rate-limit check failed, allowing through', countErr);
    } else if ((todayCount || 0) >= SAGE_DAILY_LIMIT) {
      return res.status(429).json({
        error: `You've hit today's Sage limit (${SAGE_DAILY_LIMIT} messages). Resets at midnight UTC.`,
      });
    }

    // Pull financial context in parallel
    const [profileRes, accountsRes, txnsRes, goalsRes, budgetsRes] = await Promise.all([
      supabaseAdmin.from('profiles')
        .select('name, monthly_income, onboarding_data')
        .eq('id', user.id).maybeSingle(),
      supabaseAdmin.from('accounts')
        .select('name, type, subtype, balance_current, mask')
        .eq('user_id', user.id),
      supabaseAdmin.from('transactions')
        .select('name, merchant_name, amount, category, date')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(50),
      supabaseAdmin.from('goals')
        .select('name, current_amount, target_amount, monthly_contribution')
        .eq('user_id', user.id),
      supabaseAdmin.from('budgets')
        .select('category, monthly_limit, month_year')
        .eq('user_id', user.id)
        .order('month_year', { ascending: false })
        .limit(20),
    ]);

    const profile = profileRes.data || {};
    const accounts = accountsRes.data || [];
    const transactions = txnsRes.data || [];
    const goals = goalsRes.data || [];
    const budgets = budgetsRes.data || [];

    const netWorth = accounts.reduce((s, a) => {
      const bal = Number(a.balance_current) || 0;
      const isDebt = a.type === 'credit' || a.type === 'loan';
      return s + (isDebt ? -bal : bal);
    }, 0);

    const firstName = (profile.name || '').split(' ')[0] || 'there';
    const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
    const ob = profile.onboarding_data || {};

    const systemPrompt = `You are Sage, the AI financial coach inside Vela — a premium personal finance app. You're talking with ${firstName}.

USER CONTEXT
- Name: ${profile.name || 'Unknown'}
- Net worth: ${fmt(netWorth)} across ${accounts.length} ${accounts.length === 1 ? 'account' : 'accounts'}
- Self-reported monthly income: ${profile.monthly_income ? fmt(profile.monthly_income) : 'not set'}${ob.age ? `\n- Age: ${ob.age}` : ''}${ob.situations?.length ? `\n- Life situation: ${ob.situations.join(', ')}` : ''}${ob.motivations?.length ? `\n- Why they use Vela: ${ob.motivations.join(', ')}` : ''}

ACCOUNTS (${accounts.length})
${accounts.length ? accounts.map((a) => `- ${a.name} (${a.subtype || a.type}): ${fmt(a.balance_current)}`).join('\n') : '- (none connected yet)'}

RECENT TRANSACTIONS (last ${Math.min(transactions.length, 20)})
${transactions.length ? transactions.slice(0, 20).map((t) => `- ${t.date} | ${t.merchant_name || t.name} | ${fmt(t.amount)} | ${t.category || 'Other'}`).join('\n') : '- (none logged yet)'}

GOALS (${goals.length})
${goals.length ? goals.map((g) => {
  const pct = g.target_amount ? Math.round(((g.current_amount || 0) / g.target_amount) * 100) : 0;
  return `- ${g.name}: ${fmt(g.current_amount)} / ${fmt(g.target_amount)} (${pct}%) at ${fmt(g.monthly_contribution)}/mo`;
}).join('\n') : '- (none yet)'}

BUDGETS (${budgets.length} categories tracked)
${budgets.length ? budgets.map((b) => `- ${b.category}: ${fmt(b.monthly_limit)}/mo (${b.month_year})`).join('\n') : '- (no budget set)'}

STYLE
- Sharp, direct, specific. Use ACTUAL numbers from above — don't invent.
- Format key amounts and recommendations with **double asterisks** for bold.
- 2–3 short paragraphs max. No fluff, no disclaimers, no "consult a financial advisor."
- Talk like a sharp friend who knows finance, not a chatbot.
- If a number isn't in the data, say "I don't see that yet" instead of guessing.
- Plaid convention: in transactions, positive amounts = outflows (spending), negative = inflows (income).`;

    const trimmedHistory = (Array.isArray(history) ? history : []).slice(-20);
    const messages = [
      ...trimmedHistory
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
        .map((m) => ({ role: m.role, content: String(m.content || '') })),
      { role: 'user', content: message },
    ];

    const response = await anthropic.messages.create({
      model: SAGE_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const reply = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    if (!reply) throw new Error('Empty reply from Claude.');

    // Persist conversation — best-effort
    try {
      await supabaseAdmin.from('chat_messages').insert([
        { user_id: user.id, role: 'user', content: message },
        { user_id: user.id, role: 'assistant', content: reply },
      ]);
    } catch (persistErr) {
      console.warn('[sage] history persist failed', persistErr);
    }

    res.status(200).json({ reply });
  } catch (err) {
    console.error('[sage] failed', {
      message: err?.message,
      status: err?.status || err?.statusCode,
      type: err?.error?.type,
    });
    const raw = err?.message || 'Sage hit an error.';
    let clean = raw;
    if (/api[_ ]?key|invalid_api_key|authentication/i.test(raw)) {
      clean = 'Sage authentication failed. Check ANTHROPIC_API_KEY on the backend.';
    } else if (/quota|rate.?limit|429/i.test(raw)) {
      clean = 'Sage hit a rate limit. Try again in a minute.';
    } else if (/credit|balance|payment/i.test(raw)) {
      clean = 'Sage ran out of credits. Top up at console.anthropic.com.';
    } else if (raw.length > 200) {
      clean = 'Sage hit an unexpected error. Try again — refresh if it persists.';
    }
    res.status(500).json({ error: clean });
  }
}
