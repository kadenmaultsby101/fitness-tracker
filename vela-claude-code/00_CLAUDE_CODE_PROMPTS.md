# VELA — CLAUDE CODE PROMPTS

Copy/paste these in order. Each prompt does one phase. **Wait for Claude Code to finish each one before pasting the next.**

Before you start: have `01_PROJECT_BRIEF.md`, `02_DESIGN_SYSTEM.md`, `03_DATABASE_SCHEMA.sql`, and `04_EXISTING_APP.jsx` in your project folder so Claude Code can reference them.

---

## PROMPT 1 — Project setup

```
I'm building "Vela" — a premium personal finance app. Read 01_PROJECT_BRIEF.md and 02_DESIGN_SYSTEM.md in this folder for full context. The existing visual prototype is in 04_EXISTING_APP.jsx — reuse all of its CSS and component structure, do not redesign anything.

Set up the project structure:

vela/
├── frontend/   (Vite + React)
├── backend/    (Node + Express)
└── database/   (just contains schema.sql)

For the frontend, init a Vite + React project, install:
- @supabase/supabase-js
- react-plaid-link

For the backend, init a Node project with "type": "module" and install:
- express
- cors
- dotenv
- plaid
- @anthropic-ai/sdk
- @supabase/supabase-js

Create a .env.example in both folders with all the keys I'll need (Plaid, Supabase, Anthropic). Create a top-level README.md that explains how to install and run both.

Don't write any feature code yet — just the structure and dependencies.
```

---

## PROMPT 2 — Database

```
Read 03_DATABASE_SCHEMA.sql in this folder. I've signed up for Supabase and created a project. 

1. Confirm the schema looks complete for the features described in 01_PROJECT_BRIEF.md (profiles, plaid_items, accounts, transactions, goals, budgets, chat_messages)
2. Verify Row Level Security policies are correct so users can only access their own data
3. Tell me the exact steps to run this in the Supabase SQL Editor
4. If anything is missing for the feature set, suggest additions

Do not change anything I haven't approved.
```

---

## PROMPT 3 — Auth screens

```
Build the authentication flow in the frontend. Reference the design in 02_DESIGN_SYSTEM.md and the existing styles in 04_EXISTING_APP.jsx.

Create:
1. src/lib/supabase.js — initializes the Supabase client from VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
2. src/components/AuthScreen.jsx — sign in / sign up toggle, matches the Vela aesthetic (Cormorant Garamond display font, DM Mono body, dark background, big "Vela" wordmark at top)
3. src/App.jsx — checks for an active Supabase session; if no session, shows AuthScreen; if session, shows the main app placeholder

The auth screen should have:
- "Vela" logo (Cormorant Garamond, 56px, weight 300, letter-spacing -2px)
- "Financial OS" tagline below in tracked-out caps
- A single card with Sign In / Sign Up toggle
- Email + password fields (plus name field on signup)
- Primary button that says "Sign In →" or "Create Account →"
- Error states styled in the red accent color

Use the existing CSS variables (--bg, --c1, --t1, etc.) from 04_EXISTING_APP.jsx.
```

---

## PROMPT 4 — Backend boilerplate

```
Build the backend Express server (backend/server.js). It should:

1. Load environment variables from .env via dotenv
2. Use CORS and express.json middleware
3. Initialize three clients at the top:
   - Plaid client (PlaidApi from 'plaid', using PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV)
   - Anthropic client (from @anthropic-ai/sdk, using ANTHROPIC_API_KEY)
   - Supabase admin client (from @supabase/supabase-js, using SUPABASE_URL and SUPABASE_SERVICE_KEY)
4. Helper function `getUser(req)` that reads the Authorization Bearer token from request headers, verifies it with `supabase.auth.getUser(token)`, returns the user or null
5. A GET / health-check endpoint that returns `{ status: "Vela backend running", plaid_env: process.env.PLAID_ENV }`
6. Start on PORT from env (default 4000) with a console log

Don't add Plaid or Sage endpoints yet — just the foundation.
```

---

## PROMPT 5 — Plaid integration

```
Add Plaid bank connection endpoints to backend/server.js.

Endpoint 1: POST /api/plaid/create-link-token
- Verify user with getUser()
- Call plaidClient.linkTokenCreate with:
  - user: { client_user_id: user.id }
  - client_name: "Vela"
  - products: [Auth, Transactions, Investments]
  - country_codes: [Us]
  - language: "en"
- Return { link_token }

Endpoint 2: POST /api/plaid/exchange-token
- Body: { public_token, institution }
- Exchange public_token for access_token via plaidClient.itemPublicTokenExchange
- Save to plaid_items table (user_id, plaid_item_id, plaid_access_token, institution_name, institution_id)
- Fetch accounts via plaidClient.accountsGet, save each to accounts table
- Fetch last 30 days of transactions via plaidClient.transactionsGet, save to transactions table (map plaid account_ids to our DB account ids via lookup)
- Return { success: true, institution: institution.name }

Endpoint 3: POST /api/sync
- For each plaid_item belonging to user, refresh balances (accountsGet) and pull last 7 days of transactions (upsert by plaid_transaction_id)
- Return { success: true, new_transactions: count }

Now in the frontend, build a `PlaidLinkButton` component using `react-plaid-link`:
- On click, call POST /api/plaid/create-link-token to get a link_token
- Pass it to usePlaidLink() and call open() when ready
- On success, post the public_token + metadata.institution to /api/plaid/exchange-token
- Then trigger a refresh callback

Add this button to a new "Connect" section in the More tab of the existing app. Use sandbox credentials (user_good / pass_good) to test.
```

---

## PROMPT 6 — Replace mock data with live data

```
The existing app in 04_EXISTING_APP.jsx uses hardcoded arrays (ACCOUNTS, TXNS, BUDGET, GOALS). Replace them with live data from Supabase.

In the frontend:
1. Create src/hooks/useFinancialData.js that returns { accounts, transactions, goals, loading, refresh }
2. On mount, query Supabase for the current user's data from the accounts, transactions, and goals tables
3. Compute derived values (net worth = sum of account balances; monthly summary from transactions filtered to current month)
4. Refactor the Home, Budget, and Goals pages to consume this hook instead of the static arrays

Keep all existing visual styles. If a user has no accounts connected yet, show an empty state with a centered prompt to "Connect your first account" and a button that opens Plaid Link.

For transactions, group by month and show real merchant names + Plaid categories. For account display names, use the institution name + account subtype (e.g., "Chase Checking").
```

---

## PROMPT 7 — Wire Sage to the backend

```
Move the Sage AI integration from the frontend (where it currently calls Anthropic directly with an exposed key) to the backend.

Backend endpoint: POST /api/sage
- Body: { message, history }
- Verify user with getUser()
- Pull user's real financial data in parallel:
  - All accounts
  - Last 50 transactions
  - All goals
  - Profile (for name)
- Compute net worth
- Build a system prompt that includes:
  - User's name
  - Net worth
  - Account list with balances
  - Recent transactions (last 20, formatted as date | name | amount | category)
  - Goals (current/target with %)
  - Instructions: be sharp, specific, use REAL numbers from the data, format key points with **bold**, keep responses to 2-3 short paragraphs, don't invent numbers
- Call claude.messages.create with model "claude-sonnet-4-5", max_tokens 1024, the system prompt, and the conversation history + new message
- Save both the user message and the reply to chat_messages table
- Return { reply }

Frontend:
- Update the Sage chat to call /api/sage instead of api.anthropic.com directly
- Pull recent chat_messages from Supabase on mount to restore conversation history
- Remove any direct Anthropic API calls from the frontend
```

---

## PROMPT 8 — Goals and Budgets CRUD

```
Add the ability to create, edit, and delete goals and budgets.

Frontend:
1. Goals page: add a "+" button in the page header that opens a modal to create a new goal (name, emoji, target amount, monthly contribution)
2. Tapping an existing goal opens an edit modal with the same fields plus a Delete button
3. Goal data persists to the `goals` table in Supabase (RLS already restricts to the user's own rows)

Budget page:
1. Add an "Edit Budget" button that opens a modal listing all categories
2. Let user set monthly_limit for each category
3. Persists to the `budgets` table with month_year = current "YYYY-MM"
4. The Spending vs. Budget bars read from the user's budgets table, not hardcoded limits

Keep all modal styling consistent with the existing slide-up modal pattern in 04_EXISTING_APP.jsx.
```

---

## PROMPT 9 — Insights generation

```
Build the AI Insights feature on the More tab.

Backend endpoint: POST /api/insights
- Verify user
- Pull accounts, transactions (last 60 days), goals, budgets
- Compute basic metrics: savings rate, over-budget categories, cash totals, investment totals
- Call Claude with a system prompt asking it to return a JSON array of 4-6 insight objects:
  [{ val: "45%", label: "Savings Rate", emoji: "📈", description: "...", tag: "Excellent"|"Action needed"|"Optimize" }]
- Parse the JSON, return to frontend
- Cache result for 24 hours per user (store in a new `insights_cache` table or use Redis later)

Frontend:
- Insights section in the More tab calls /api/insights on mount
- Display each insight using the existing .ic / .ic-top / .ic-val pattern
- Tag colors: "Excellent" → green, "Action needed" → red, "Optimize" → gold
- Show a "Refresh insights" button that bypasses cache
```

---

## PROMPT 10 — Polish and deploy

```
Final polish pass before deployment:

1. Add a manual sync button to the Home page that calls /api/sync and shows a brief "Synced ✓" toast
2. Add loading states (skeleton cards) for the first data fetch on each page
3. Add error boundaries so a single component error doesn't crash the whole app
4. Confirm all environment variables are documented in .env.example
5. Verify the app works as a PWA — add a manifest.json (name "Vela", theme color #070707, icons)
6. Test the full user flow end-to-end: sign up → connect bank (sandbox) → see data → chat with Sage → create a goal

Then prepare for deployment:

Frontend (Vercel):
- Create vercel.json if needed
- Document VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL env vars

Backend (Render):
- Create a render.yaml or just document the deploy steps
- Document all env vars
- Ensure CORS is set to accept the Vercel frontend URL

Write a DEPLOY.md with the exact steps to:
1. Push to GitHub
2. Connect Vercel to the repo (frontend folder)
3. Connect Render to the repo (backend folder)
4. Set environment variables on both
5. Update VITE_API_URL to point to the Render backend URL
6. Test the deployed version

Don't deploy yet — just prepare everything.
```

---

## Bonus prompts (use as needed)

### If you want to add more banks visible by default
```
Update the Connect section in the More tab to show a grid of popular institutions (Chase, BofA, Wells Fargo, Schwab, Fidelity, Robinhood, SoFi, Ally, Capital One, Amex, Coinbase, Vanguard) as visual tiles. Tapping any tile opens Plaid Link pre-filtered to that institution if possible, otherwise opens the full Plaid Link search.
```

### If sandbox isn't enough and you want real data
```
Walk me through requesting Plaid Development access from my dashboard, then update PLAID_ENV in the backend .env from "sandbox" to "development", restart, and test connecting my real Chase account.
```

### If you want to add Turo income tracking (since Kaden plans a Turo business)
```
Add a manual "income source" feature where the user can log non-bank income (Turo rentals, Seed Swipe revenue, reselling profits) with category, amount, and date. Display these alongside Plaid transactions but with a "manual" badge.
```

### If you want a weekly Sunday recap
```
Add a scheduled job (Render cron or a Supabase Edge Function) that runs every Sunday morning, calls /api/insights for each active user, and saves the result to a "weekly_recap" table. Add a Sunday Recap card to the Home page that displays the latest recap.
```
