# Vela — Launch & Marketing

## Positioning
**"An AI financial advisor, not another dashboard."**

Origin, Monarch, and Rocket Money show you charts and make you interpret them.
Vela's AI coach (Sage) reads your accounts every day and tells you what
actually matters — proactively, in plain English, tied to your goals.

One-liner: *Vela is the money app that thinks for you.*

## Landing page copy

**Hero**
> # Your money, finally explained.
> Vela connects your accounts and gives you an AI financial advisor that
> watches your spending, flags what matters, and tells you exactly what to do
> next — not just another dashboard.
> **[ Get started — free ]**

**Feature blocks**
1. **Sage, your AI coach.** Ask anything — "Am I overspending?", "Where should
   my next paycheck go?" Sage answers with *your* real numbers, not generic tips.
2. **Insights that come to you.** Every day Sage surfaces what changed — "Dining's
   up 38% this month", "You're 2 months ahead on your emergency fund." A Sunday
   recap lands every week.
3. **See everything, automatically.** Bank-synced via Plaid: balances,
   transactions, budgets, recurring charges, net worth — categorized and
   beautiful, zero spreadsheets.

**Trust line**
> Bank connections are **read-only** through Plaid — Vela never sees your
> password and can't move money. Your data is encrypted and never sold.

**Pricing**
> Free to track everything. **Vela Pro — $7.99/mo** for unlimited Sage,
> proactive insights, and your weekly recap.

## 30-second demo script
1. (0–5s) Open Vela — clean dark dashboard, net worth front and center.
2. (5–12s) Tap "Connect a bank" → Plaid → accounts appear with logos in seconds.
3. (12–22s) Cut to Sage already showing a briefing: *"You spent $480 on dining
   this month — 38% above your average. Want a limit?"*
4. (22–28s) Ask Sage "where should I put my next $1,000?" → sharp, numbered
   answer using real balances.
5. (28–30s) Card: **Vela — an AI advisor, not a dashboard. velaos.app**

## Build-in-public posts
- **X/Twitter:** "I got tired of finance apps that just show me charts. So I
  built one with an AI advisor that actually tells me what to do with my money.
  Connect a bank, ask it anything. Here's a 30s demo 👇 [video] velaos.app"
- **TikTok/Reels:** screen-record connecting a bank → Sage instantly roasts your
  spending → text overlay: "my finance app has opinions now." End on the recap.
- **Reddit (value-first, no spam):** in r/ynab / r/MonarchMoney threads asking
  about alternatives — "I built a small AI-first one, free to try, would love
  brutal feedback" (only where self-promo is allowed).

**Shareable hook:** Sage's proactive one-liners + (future) a "money personality"
people screenshot.

## Pricing table
| | Free | Pro ($7.99/mo) |
|---|---|---|
| Accounts, transactions, budget, cash flow | ✓ | ✓ |
| Recurring detection, reports | ✓ | ✓ |
| Sage AI chat | 5 / day | Unlimited |
| Proactive briefings + Sunday recap | — | ✓ |

## Objection handling
- *"Why trust a small app with my bank?"* → Plaid read-only, never stores
  credentials, can't move money; data encrypted, never sold; you can disconnect
  any time.
- *"How is this different from Monarch/Mint?"* → They're dashboards you have to
  read. Vela's AI does the reading and tells you what to do.
- *"Is the AI actually useful?"* → It only uses your real numbers and says "I
  don't see that yet" instead of guessing. Try one question free.

## Launch checklist
- [ ] Rotate all API keys (Plaid, Anthropic, Supabase, Google) before public.
- [ ] Set Anthropic spend cap (~$25/mo).
- [ ] Flip `PAYWALL_ENABLED` + add Stripe envs when ready to charge.
- [ ] Waitlist / referral link.
- [ ] Record the 30s demo.
