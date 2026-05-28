# Vela — Project State (living doc)

> Paste this whole file into a claude.ai Project (as Project Knowledge) or a
> fresh chat to give "regular Claude" full context on Vela for strategy /
> planning conversations. Keep it updated as things change. Build work happens
> in Claude Code; thinking/strategy happens in claude.ai with this doc loaded.

## What Vela is
A premium, mobile-first personal-finance PWA. Positioning: **"An AI financial
advisor, not another dashboard."** The differentiator is **Sage**, an AI coach
(Anthropic Claude) that proactively advises around the user's real goals —
versus Origin / Monarch / Rocket Money, which are mostly dashboards.

- Live at **velaos.app** (custom domain via Vercel; also the *.vercel.app URL).
- Solo-built by Kaden Maultsby. Currently in friends-and-family testing.
- Aesthetic: dark, editorial. Cormorant Garamond serif for headlines + money,
  Inter for UI, soft periwinkle accent (#8b93ff).

## Tech stack
- **Frontend:** Vite + React 19, deployed on Vercel.
- **Backend:** Vercel Serverless Functions in `vela/frontend/api/*` (same-origin
  `/api/*`, no CORS).
- **DB/Auth:** Supabase (Postgres + Auth, Row Level Security). Project ref
  `nbpwgkifcjwmfjvedmzp`.
- **Bank data:** Plaid **Production** (Transactions product only; ~$0.30/item/mo).
- **AI:** Anthropic **Claude Haiku 4.5** (`claude-haiku-4-5`).
- **Auth:** Supabase email/password (+ confirmation) and **Google OAuth**.

## Features (all live)
- **Navigation:** bottom nav (Home · Transactions · Budget · Sage · Menu) +
  a Monarch-style slide-out **Drawer** with every section.
- **Home/Dashboard:** net worth + allocation bar (cash/investments/debt),
  proactive **Sage briefings**, **Sunday recap** card, accounts grouped by type,
  this-week transactions, search.
- **Accounts:** grouped by type (Checking/Savings/Cash/Credit/Loans/Investments)
  with subtotals; tap → account detail (full history, edit name, disconnect).
- **Transactions:** full searchable list; category & merchant drill-downs.
- **Budget:** month switcher, spending donut, weekly trend, budget-vs-spending.
- **Cash Flow:** month switcher + in/out/net + category breakdown. (Sankey flow
  diagram deferred to the future desktop website.)
- **Reports (Insights):** spend vs last month, top categories, top merchants,
  recurring summary.
- **Recurring (Subscriptions):** strict auto-detection (same merchant + exact
  amount + 3+ charges at a consistent cadence) → list with $/mo.
- **Goals:** create/track goals.
- **Investments:** brokerage/investment account balances.
- **Sage (Advice):** AI chat with full financial context (300 txns + category
  summary), proactive briefings + Sunday recap, history in `chat_messages`.
- **Merchant logos:** Plaid `logo_url` (normalized per merchant) on dark tiles.
- **Settings (More):** profile, connected accounts, sync, notification toggles,
  feedback inbox, delete account, sign out, (Pro billing when enabled).

## Data model (Supabase tables)
`profiles` (id, name, monthly_income, onboarding_data {age, situations,
motivations}, notify_* toggles, two_factor_enabled, **plan / stripe_customer_id
/ subscription_status / current_period_end**), `plaid_items` (incl.
institution_logo/color), `accounts`, `transactions` (incl. logo_url,
merchant_website), `goals`, `budgets`, `chat_messages`, `feedback`,
`insights_cache`. All RLS-scoped by user_id.

## Migrations (run in Supabase SQL Editor, in order)
`schema.sql` → `01_onboarding_settings` → `02_user_writes` →
`03_onboarding_data` → `04_institution_branding` → `05_feedback` →
`06_transaction_logos` → `07_billing`.

## Env vars (Vercel)
Set: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`,
`ANTHROPIC_API_KEY`. For launch (paywall): `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`.

## Pricing / business
- Plan: **Free** (full tracking + Sage 5 msgs/day) vs **Pro $7.99/mo** (unlimited
  Sage + proactive briefings + Sunday recap + deep reports).
- Paywall code is **built but DORMANT** (`src/lib/plan.js` + `api/_lib/billing.js`
  `PAYWALL_ENABLED = false` → everyone treated as Pro, nobody charged). Flip both
  to `true` + set Stripe envs to go live.
- Market comps: Monarch $14.99/mo, Copilot $13/mo, YNAB $14.99/mo, Origin ~$13/mo.

## Roadmap / parked
- Net-worth-over-time chart (needs daily balance snapshots — start capturing soon).
- Weekly recap **email** (needs Resend + DNS verification).
- **Desktop website** layout (real left sidebar + the Cash Flow Sankey).
- Plaid Investments product (holdings detail), swipe-to-recategorize.
- Money-personality (shareable), referral/waitlist.

## Known constraints
- API keys were pasted in chat during the build → **rotate before public launch**.
- Subscriptions detection is intentionally strict (misses some vs false positives).
- Search/insights operate on the most recent 500 loaded transactions.

## How to use this doc
In claude.ai: make a Project called "Vela", add this file as Project Knowledge,
and chat there for pricing/marketing/product strategy. When a concrete build
task emerges, bring it to Claude Code. Update this file after notable changes.
