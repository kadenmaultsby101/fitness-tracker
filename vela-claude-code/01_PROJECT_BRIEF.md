# VELA — PROJECT BRIEF

## What Vela is

Vela is a premium personal finance app for an 18-year-old entrepreneur (Kaden) in Oakland, CA. It's a black-and-white, editorial-feeling "Financial OS" that unifies bank accounts, brokerage accounts, budgets, goals, and an AI financial coach into one beautiful mobile experience.

The app is being built first for personal use, with the option to launch publicly later. The aesthetic is luxury minimalism — think *Aēsop meets Bloomberg Terminal meets a private wealth dashboard*.

---

## Core Features

### 1. Authentication
- Real email + password signup/signin via Supabase
- Persistent sessions
- A welcoming auth screen that matches the app's aesthetic

### 2. Bank & Brokerage Connections (the big one)
- Real connections via **Plaid** to: Chase, Bank of America, Wells Fargo, Charles Schwab, Fidelity, Robinhood, SoFi, Ally, Capital One, American Express, Coinbase, Vanguard, and the ~12,000 other institutions Plaid supports
- Users tap a bank → Plaid Link opens → secure auth → accounts pulled in → transactions flow automatically
- Read-only access, never stores credentials
- A manual sync button to refresh data on demand

### 3. Dashboard (Home)
- **Net Worth Hero** — large serif number showing total across all accounts, with monthly change
- **AI Insight Banner** — a live, contextual nudge from Sage (the AI coach)
- **Account Cards** — horizontal scroll of all connected accounts with balances
- **Recent Transactions** — last 5 transactions with merchant, category, amount, date

### 4. Budget
- **Monthly Summary** — Income, Spent, Invested, Remaining, Savings Rate (all calculated from real transactions)
- **Spending vs. Budget** — category bars (Housing, Food, Transport, Shopping, Subscriptions, Entertainment, Bills) that turn red when over budget
- **All Transactions** — full scrollable list with categories and amounts

### 5. Goals
- User-created goals (e.g., Emergency Fund, Roth IRA, FHA Down Payment, Brokerage Growth)
- Each shows: current/target amount, percent complete, monthly contribution, estimated months remaining
- Visual progress bars

### 6. Sage — AI Financial Coach
- Powered by Anthropic's Claude API
- Has access to the user's **real financial data** (accounts, balances, transactions, goals) as system context
- Personality: sharp, direct, specific, uses actual numbers, formats key points with **bold**
- Chat interface with quick-prompt chips ("How should I allocate my internship income?", "Am I on track to max my Roth IRA?", etc.)
- Persists chat history per user

### 7. Insights (under "More")
- AI-generated cards showing patterns: Savings Rate analysis, over-budget categories, HYSA opportunities, etc.
- Each insight has a value, description, and action tag (Excellent / Action Needed / Optimize)

### 8. Settings
- Toggle notifications (transaction alerts, weekly summary, AI insights)
- Two-factor auth toggle
- Profile info display
- Sign out

---

## The Aesthetic (don't compromise on this)

### Colors
- Background: near-black (#070707)
- Surfaces: #0e0e0e, #161616, #1f1f1f (three layered shades)
- Borders: rgba(255,255,255,0.06) → 0.20 (subtle)
- Text: #f0f0f0 primary, #888 secondary, #444 tertiary
- Accents:
  - Green for gains: #9febb8
  - Red for losses/over-budget: #eb9f9f
  - Gold for investment highlights: #ebd49f

### Typography
- **Display font:** Cormorant Garamond (serif, weight 300) — for hero numbers, page titles, big amounts
- **Body font:** DM Mono (monospace) — for everything else
- Heavy use of tracked-out small caps (letter-spacing 2-3px) for labels
- Numbers in the serif font feel editorial and expensive

### Layout
- Mobile-first, fills the entire viewport
- Fixed bottom navigation (5 tabs: Home, Budget, Goals, Sage, More)
- Sticky page headers
- Cards have subtle 1px borders, no shadows, slight inner padding
- Single column, generous breathing room
- Radial gradient accent in top-right of net worth hero (very subtle)

### Motion
- Page transitions: 0.22s opacity + translateY fade
- Message animations: 0.28s slide up
- Pulse animation on the AI "live" indicator dot
- Progress bars animate to fill on mount (0.8-0.9s ease)
- Typing dots while Sage is thinking

### What it should NOT feel like
- Not a generic fintech app (no purple gradients, no friendly cartoon mascots, no rounded everything)
- Not Mint, not YNAB, not Monarch
- It should feel like a private banking app for someone who takes their wealth seriously

---

## Tech Stack

### Frontend
- **React** (Vite for dev)
- **Supabase JS client** for auth
- **react-plaid-link** for bank connection UI
- Plain CSS (already designed, see existing app)

### Backend
- **Node.js + Express**
- **Plaid SDK** — `plaid` npm package
- **Anthropic SDK** — `@anthropic-ai/sdk`
- **Supabase JS client** — server-side admin access

### Database
- **Supabase Postgres**
- Tables: `profiles`, `plaid_items`, `accounts`, `transactions`, `goals`, `budgets`, `chat_messages`
- Row Level Security enforced on every table

### External Services
1. **Plaid** (sandbox → development → production)
2. **Supabase** (free tier covers personal use)
3. **Anthropic API** (Claude Sonnet 4.5 for Sage)

### Hosting (when ready)
- Frontend: **Vercel**
- Backend: **Render** or **Railway**

---

## User Context (matters for AI tone)

The primary user is Kaden, an 18-year-old entrepreneur in Oakland, CA. He:
- Works at his uncle's law firm
- Has a high-paying summer internship coming
- Runs a fintech startup called Seed Swipe
- Plans to start overnight valet work
- Has financial goals: max Roth IRA, save for FHA loan on Oakland fourplex, retire at 45
- Already runs a structured 50-book reading roadmap
- Prefers aggressive, organized financial strategies with quantified projections

Sage (the AI) should be aware of this context but never patronizing. Treat the user as a sophisticated investor, not a beginner.

---

## What's already built

A working visual prototype exists in React. It has:
- Full mobile UI with bottom navigation
- All 5 main pages (Home, Budget, Goals, Sage, More)
- Sage AI integration (currently calls Anthropic API directly — needs to move to backend)
- All visual components: net worth hero, account cards, transaction lists, budget bars, goal cards, insight cards, settings toggles
- Bank connection modal flow (currently mock — needs to swap to real Plaid Link)

The CSS and component structure are dialed in. **Don't rebuild the design — reuse it.**

---

## Build order (recommended)

1. **Supabase setup** → auth + database schema
2. **Auth screens** → sign up, sign in
3. **Backend boilerplate** → Express server with Plaid + Supabase + Anthropic clients
4. **Plaid integration** → Create Link Token, exchange, fetch accounts/transactions
5. **Replace mock data with live data** in the frontend
6. **Wire Sage to the backend** so it gets real financial context
7. **Goals + Budgets CRUD** → let user create/edit
8. **Insights generation** → backend endpoint that calls Claude to generate insights from real data
9. **Polish + deploy** to Vercel + Render

---

## Out of scope for now

- App Store submission
- Push notifications (add later via OneSignal)
- React Native conversion (web app first)
- Stripe payments
- Public marketing site
