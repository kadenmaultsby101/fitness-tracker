# CLAUDE.md — Vela

Auto-loaded every session. Read `vela/STATE.md` for the full picture; this file
is the quick orientation + working conventions.

## What this is
**Vela** — a premium, mobile-first personal-finance PWA. Positioning: "an AI
financial advisor, not another dashboard." Differentiator = **Sage** (Anthropic
Claude coach with proactive briefings + Sunday recap). Live at **velaos.app**.
Solo-built by Kaden, in friends-and-family testing.

## Where the code is
- App lives in **`vela/frontend/`** (Vite + React 19).
- Backend = **Vercel Serverless Functions** in `vela/frontend/api/*`.
- Supabase (Postgres + Auth + RLS) for data; Plaid Production for bank data;
  Anthropic Claude Haiku 4.5 for Sage. Auth: email/password + Google OAuth.
- Full feature list, data model, env vars, pricing → **`vela/STATE.md`**.

## Working conventions (important)
- **Always work on a branch, build, push, open a PR, then merge** — never commit
  straight to main. Branch names like `claude/<short-topic>`.
- **Always run `npm run build` in `vela/frontend` before committing** — it must pass.
- **DB migrations** live in `vela/database/NN_*.sql` and must be run by Kaden in
  the Supabase SQL Editor. If new code reads a new column, the app shows
  "column X does not exist" until the migration is run — flag this clearly and
  hand over the exact SQL. Migrations 01–07 exist (07 = billing).
- **External setup is Kaden's** (he can't be done by Claude): Plaid, Google
  OAuth, Stripe, Vercel env vars. Provide click-by-click steps.
- Prefer editing existing files; match the dark editorial design system
  (Cormorant serif headlines + Inter UI + periwinkle `--accent`; tokens in
  `src/index.css`, components styled with `styles/app.css` + inline styles).

## Billing state
- Paid-only model: no free tier; 7-day free trial via Stripe, then $9.99/mo or
  $79/yr. Paywall is **LIVE** (`PAYWALL_ENABLED = true` in `src/lib/plan.js` and
  `api/_lib/billing.js`).
- Stripe currently in **test mode**; going live needs live keys/prices/webhook
  swapped into Vercel env vars.
- **Comp codes** (`VELA_COMP_CODES` env, e.g. `NORTHSTAR`) give testers free Pro
  via the in-app "Have an access code?" box — no card.

## How Kaden works
- Strategy/pricing/marketing → regular claude.ai (with STATE.md in a Project).
- Building → Claude Code, one task per session; `/clear` between tasks.
- After notable changes, update `vela/STATE.md`.
