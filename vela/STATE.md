# Vela — Handoff State

> Paste this into a new Claude Code chat to pick up where the previous session left off.
> Last updated: backend migrated to Vercel Serverless Functions (see ARCHITECTURE SHIFT below).

## ARCHITECTURE SHIFT (most recent change)

**Old:** Frontend on Vercel (velaos.app) → Backend on Render (vela-backend-w8q8.onrender.com)
**New:** Frontend on Vercel (velaos.app) → Backend ALSO on Vercel as Serverless Functions in `vela/frontend/api/*.js`

Why: Cross-origin Plaid flow was silently failing — exchange-token fetch never reached Render after Plaid Link closed. Moving the backend onto the same domain (velaos.app/api/...) eliminates CORS entirely and makes that whole class of bug impossible.

Render is still online but unused. Once Vercel Functions are verified working, **cancel Render Starter ($7/mo saved)**.

## What Vela is

Premium personal finance app for Kaden (and eventually his friends, eventually public). Black-and-white editorial aesthetic (Cormorant Garamond + DM Mono). Five-tab mobile-first PWA: Home, Budget, Goals, Sage (AI coach), More.

## Where everything lives

| Asset | URL |
|---|---|
| Code | https://github.com/kadenmaultsby101/fitness-tracker |
| Live app | https://vela-kadenmaultsby101s-projects.vercel.app |
| Frontend deploy | https://vercel.com/kadenmaultsby101s-projects/vela |
| Backend deploy | https://dashboard.render.com (service `vela-backend`, URL `https://vela-backend-w8q8.onrender.com`) |
| Database | https://supabase.com/dashboard/project/nbpwgkifcjwmfjvedmzp |
| Plaid dashboard | https://dashboard.plaid.com |
| Anthropic console | https://console.anthropic.com |

Project structure on disk:
```
fitness-tracker/                ← monorepo (also hosts pulse + trace apps)
└── vela/
    ├── frontend/               ← Vite + React 19 (deployed to Vercel)
    │   └── src/
    │       ├── App.jsx
    │       ├── lib/supabase.js
    │       ├── lib/withTimeout.js
    │       ├── hooks/useFinancialData.js
    │       ├── components/
    │       │   ├── AuthScreen.jsx
    │       │   ├── Onboarding.jsx (8 steps)
    │       │   ├── PlaidLinkButton.jsx
    │       │   └── main/
    │       │       ├── MainApp.jsx
    │       │       ├── HomePage.jsx
    │       │       ├── BudgetPage.jsx
    │       │       ├── GoalsPage.jsx
    │       │       ├── SagePage.jsx
    │       │       ├── MorePage.jsx
    │       │       ├── AddAccountModal.jsx
    │       │       ├── AddTransactionModal.jsx
    │       │       ├── GoalModal.jsx
    │       │       ├── BudgetModal.jsx
    │       │       ├── AnimatedNumber.jsx
    │       │       └── format.js
    │       └── styles/app.css   ← extracted from 04_EXISTING_APP.jsx
    ├── backend/
    │   ├── server.js            ← Express + Plaid + Anthropic + Supabase admin
    │   └── render.yaml          ← blueprint
    ├── database/
    │   ├── schema.sql           ← 8 tables + RLS
    │   ├── 01_onboarding_settings.sql  ← monthly_income, settings toggles
    │   ├── 02_user_writes.sql           ← user-write RLS for accounts + transactions
    │   └── 03_onboarding_data.sql       ← jsonb personalization column
    └── render.yaml              ← root copy for Blueprint auto-discovery
```

## What ships and works

- Sign up / sign in / email confirmation
- 8-step personalized onboarding (welcome → about you → discovery → motivations → goal interests → income → budget → meet Sage)
- 5-tab navigation (Home, Budget, Goals, Sage, More)
- Manual add / edit / delete: accounts, transactions, goals
- Budgets (per-category, per-month) with assistive "Sage's suggestions" modal
- Settings toggles persisted to profile
- Account deletion (Danger Zone in More)
- Plaid Sandbox connection (`user_good` / `pass_good`)
- Auto-sync on app open (background, non-blocking)
- 50-msg/day per-user rate limit on Sage
- Credit cards + loans correctly SUBTRACT from net worth
- PWA — Add to Home Screen on iPhone
- Capped width on desktop (480px column)
- localStorage flag prevents onboarding loops
- Hard timeouts (6–10s) on every Supabase call so nothing can hang silently

## Paid infrastructure currently active

| Service | Plan | Cost |
|---|---|---|
| Vercel | Pro | $20/mo |
| Render | Starter | $7/mo |
| Anthropic | Pay-as-you-go, $25 credits + $25/mo cap | $25 max |
| Supabase | Free | $0 |
| Plaid | Sandbox / pending Production review | $0 |

Total monthly: $27 fixed + up to $25 Anthropic = max $52/mo.

## Key environment variables

**Vercel (vela project):**
- `VITE_SUPABASE_URL=https://nbpwgkifcjwmfjvedmzp.supabase.co`
- `VITE_SUPABASE_ANON_KEY=sb_publishable_kOkBBH2dMK5_W45G8eZSEg_6AgBkQBb`
- `VITE_API_URL=https://vela-backend-w8q8.onrender.com`

**Render (vela-backend):**
- `PORT=10000`
- `PLAID_CLIENT_ID=6a018958ef2ece000e243f52`
- `PLAID_SECRET=<sandbox secret>`
- `PLAID_ENV=sandbox`
- `SUPABASE_URL=https://nbpwgkifcjwmfjvedmzp.supabase.co`
- `SUPABASE_SERVICE_KEY=<sb_secret_... user has this>`
- `GEMINI_API_KEY=<set but no longer used; Sage moved to Anthropic>`
- `CORS_ORIGINS=https://vela-kadenmaultsby101s-projects.vercel.app`
- **`ANTHROPIC_API_KEY` — NOT YET SET** ← see open blockers

## Open blockers

### 1. ANTHROPIC_API_KEY not on Render yet
- User has the key (`sk-ant-api03-…`) but the Environment page on Render doesn't have a row for `ANTHROPIC_API_KEY` saved
- Until added: `has_anthropic: false` on health check, Sage returns "unexpected error"
- Fix: Render → vela-backend → Environment → + Add Environment Variable → `ANTHROPIC_API_KEY` + paste key → **Save Changes** (bottom of page)

### 2. Plaid Production application in review
- User accidentally applied for Plaid Production (which has compliance review, days-to-weeks)
- They have access to Sandbox today
- Plaid **Development** tier is also available right now (one dashboard toggle, no review, free up to 100 connections) — gives real bank data
- User is waiting on Production to clear before friend testing, but **doesn't need to** — Development would unblock immediately

## Decisions made along the way

- Pricing model: **$7/mo subscription** ($60/year), Sage gated behind paid tier (10 free Sage chats/mo for free tier)
- Sage model: **Claude Haiku 4.5** (~$0.005/chat), with $25/mo hard cap on Anthropic dashboard
- Gemini SDK retained but unused (left in code as fallback option)
- Friend testing plan: Phase 1 = 3-5 close friends × 3-5 days → Phase 2 = 10 friends × 1-2 weeks on Plaid Development → Phase 3 = open beta 20-50 × 3-4 weeks → public launch (~6-8 weeks total)
- App Store: deferred until 2-3 months from now (need Plaid Production, native shell via Capacitor, App Store review)

## Costs to expect at scale

| Stage | Users | Monthly cost | Monthly revenue ($7/mo, 5% conversion) | Net |
|---|---|---|---|---|
| Now (testing) | 1-10 | $30-50 | $0 | -$30-50 |
| 1,000 users | 50 paid | ~$200 | $350 | +$150 |
| 10,000 users | 500 paid | ~$2,500 | $3,500 | +$1,000 |
| 50,000 users | 2,500 paid | ~$10,000 | $17,500 | +$7,500 |

Variable cost per paying user: ~$3.50-4.50 (Plaid + Anthropic + share of infra). Gross margin ~35-50%.

## Immediate next steps in priority order

1. **Add `ANTHROPIC_API_KEY` to Render** → unblocks Sage. ~30 sec.
2. **Test Sage end-to-end** → tap a chip, get a real reply.
3. **Decide Plaid timing**: wait for Production review OR flip to Development now for instant unblock.
4. **Lock signup**: Supabase → Auth → Email provider → toggle "Enable signup" OFF.
5. **Invite 3-5 close friends** via Supabase Auth → Users → Invite. Phase 1 testing begins.
6. **Watch + collect feedback** for 3-5 days before opening to wider pool.

## Conventions established

- Tone: sharp, direct, no fluff (matches Sage's persona which mirrors Kaden's preferences)
- All Supabase calls wrapped in `withTimeout` (6s for auth, 8s for writes, 10s for parallel reads)
- All modal saves chain `.select()` so RLS-blocked inserts surface "no row returned" errors instead of silent no-ops
- Design system rules: no rounded corners, no purple/blue, no system fonts, no drop shadows, no rounded everything, no Tailwind-look. Editorial.
- Manual `plaid_account_id` / `plaid_transaction_id` for non-Plaid rows: `manual_<userId-prefix>_<ts>_<random>`
- All deletes confirm via native `confirm()` dialog
- `vela:onboarded:<userId>` localStorage flag bypasses onboarding even if DB write was slow

## Out of scope for current phase

- Insights tab (Prompt 9 — AI-generated weekly summary cards)
- Sunday recap from Sage (scheduled job)
- Custom domain (vela.app)
- Native iOS shell via Capacitor (App Store path)
- Stripe / Lemon Squeezy / RevenueCat billing integration
- Public marketing site
