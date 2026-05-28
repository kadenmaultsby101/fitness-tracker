import Anthropic from '@anthropic-ai/sdk';
import { getUser, supabaseAdmin } from './_lib/auth.js';
import { buildUserContext } from './_lib/financialContext.js';

const MODEL = 'claude-haiku-4-5';
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const config = { maxDuration: 30 };

// ISO week key like "2026-W22" — used so the weekly recap regenerates once
// per calendar week.
function isoWeekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// Strip code fences / prose and parse the first JSON value found.
function parseJson(text) {
  if (!text) return null;
  let s = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(s);
  } catch {
    const match = s.match(/[[{][\s\S]*[\]}]/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fall through */ }
    }
    return null;
  }
}

async function generateBriefing(ctx) {
  const system = `You are Sage, the proactive AI financial coach inside Vela. Generate 2-3 SHORT proactive insight cards for ${ctx.firstName} based on the data below. Each insight must cite a real number and, where relevant, tie to the user's stated motivations/life situation.

${ctx.contextBlock}

Respond ONLY with a JSON array, no prose, no code fences. Each item:
{"tone": "positive" | "watch" | "neutral", "title": "<=6 words", "body": "1 sentence, specific, with a real number"}
- "positive" = something going well. "watch" = something to keep an eye on / overspending. "neutral" = a neutral observation or suggestion.
- Plaid convention: positive transaction amounts = spending, negative = income.
- No fluff, no disclaimers. If there's barely any data, return a single neutral item encouraging them to connect more or log activity.`;

  const resp = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 600,
    system,
    messages: [{ role: 'user', content: 'Generate my insight cards.' }],
  });
  const text = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const parsed = parseJson(text);
  if (Array.isArray(parsed) && parsed.length) {
    return parsed
      .filter((i) => i && i.title && i.body)
      .slice(0, 3)
      .map((i) => ({
        tone: ['positive', 'watch', 'neutral'].includes(i.tone) ? i.tone : 'neutral',
        title: String(i.title).slice(0, 60),
        body: String(i.body).slice(0, 240),
      }));
  }
  return [{ tone: 'neutral', title: 'Sage is warming up', body: 'Connect a bank or log a few transactions and Sage will start spotting patterns.' }];
}

async function generateWeekly(ctx) {
  const system = `You are Sage, the AI financial coach inside Vela. Write ${ctx.firstName}'s weekly money recap based on the data below.

${ctx.contextBlock}

Respond ONLY with a JSON object, no prose, no code fences:
{"headline": "<=8 words, warm", "win": "1 sentence — something that went well this week, with a number", "watch": "1 sentence — one thing to keep an eye on next week, with a number", "summary": "1-2 sentences tying it to their goals/motivations"}
- Plaid: positive amounts = spending, negative = income. Use real numbers only.`;

  const resp = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 600,
    system,
    messages: [{ role: 'user', content: 'Write my weekly recap.' }],
  });
  const text = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const parsed = parseJson(text);
  if (parsed && parsed.headline) {
    return {
      headline: String(parsed.headline).slice(0, 80),
      win: String(parsed.win || '').slice(0, 240),
      watch: String(parsed.watch || '').slice(0, 240),
      summary: String(parsed.summary || '').slice(0, 320),
    };
  }
  return { headline: 'Your week in money', win: '', watch: '', summary: 'Not enough activity yet this week — check back after a few transactions.' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'Insights not configured.' });
    }

    const type = req.body?.type === 'weekly' ? 'weekly' : 'briefing';
    const force = Boolean(req.body?.force);

    const { data: row } = await supabaseAdmin
      .from('insights_cache')
      .select('insights')
      .eq('user_id', user.id)
      .maybeSingle();
    const cached = row?.insights || {};

    const today = todayKey();
    const week = isoWeekKey();

    // Serve from cache when fresh.
    if (!force) {
      if (type === 'briefing' && cached.briefings && cached.briefings_date === today) {
        return res.status(200).json({ type, briefings: cached.briefings, cached: true });
      }
      if (type === 'weekly' && cached.weekly && cached.weekly_week === week) {
        return res.status(200).json({ type, weekly: cached.weekly, cached: true });
      }
    }

    const ctx = await buildUserContext(user.id);

    let next = { ...cached };
    let payload;
    if (type === 'briefing') {
      const briefings = await generateBriefing(ctx);
      next = { ...next, briefings, briefings_date: today };
      payload = { type, briefings };
    } else {
      const weekly = await generateWeekly(ctx);
      next = { ...next, weekly, weekly_week: week };
      payload = { type, weekly };
    }

    await supabaseAdmin
      .from('insights_cache')
      .upsert({ user_id: user.id, insights: next, generated_at: new Date().toISOString() }, { onConflict: 'user_id' });

    return res.status(200).json({ ...payload, cached: false });
  } catch (err) {
    console.error('[insights] failed', { message: err?.message, status: err?.status });
    const raw = err?.message || '';
    let clean = 'Could not generate insights right now.';
    if (/api[_ ]?key|authentication/i.test(raw)) clean = 'Insights auth failed — check ANTHROPIC_API_KEY.';
    else if (/credit|balance|payment/i.test(raw)) clean = 'Insights paused — Anthropic credits exhausted.';
    return res.status(500).json({ error: clean });
  }
}
