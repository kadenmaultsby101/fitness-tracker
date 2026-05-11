# Vela

A premium personal finance app — bank/brokerage aggregation, budgets, goals, and Sage (an AI financial coach powered by Claude).

> Status: Phase 1 of 10 — project scaffold only. No feature code yet. See `../vela-claude-code/00_CLAUDE_CODE_PROMPTS.md` for the build plan.

## Project structure

```
vela/
├── frontend/     Vite + React PWA (the app)
├── backend/      Node + Express API (Plaid, Supabase admin, Sage)
└── database/     schema.sql — run this in the Supabase SQL editor
```

Reference docs live one level up in `../vela-claude-code/`:
- `01_PROJECT_BRIEF.md` — full spec
- `02_DESIGN_SYSTEM.md` — visual language (do not deviate)
- `03_DATABASE_SCHEMA.sql` — Supabase schema (mirrored in `database/schema.sql`)
- `04_EXISTING_APP.jsx` — visual prototype to reuse

## Prerequisites

- Node.js ≥ 20 (tested on 22.x)
- A Supabase project ([supabase.com](https://supabase.com), free tier)
- A Plaid account ([dashboard.plaid.com](https://dashboard.plaid.com), sandbox first)
- An Anthropic API key ([console.anthropic.com](https://console.anthropic.com))

## First-time setup

### 1. Database (Supabase)

1. Create a new Supabase project.
2. Open the SQL Editor and paste `database/schema.sql`. Run it.
3. From **Project Settings → API**, copy:
   - Project URL
   - `anon` public key (frontend)
   - `service_role` key (backend — keep secret)

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill in Plaid, Supabase, Anthropic keys
npm install      # already run if you cloned with lockfile
npm run dev      # nodemon-style watch via node --watch
```

The server runs on `http://localhost:4000` by default.

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
npm install
npm run dev
```

Vite serves the app on `http://localhost:5173`.

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | frontend | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | frontend | Supabase public anon key |
| `VITE_API_URL` | frontend | Backend base URL |
| `PORT` | backend | HTTP port (default 4000) |
| `PLAID_CLIENT_ID` | backend | Plaid client ID |
| `PLAID_SECRET` | backend | Plaid secret (per env) |
| `PLAID_ENV` | backend | `sandbox` \| `development` \| `production` |
| `SUPABASE_URL` | backend | Same as frontend |
| `SUPABASE_SERVICE_KEY` | backend | Service role key — bypasses RLS, server-only |
| `ANTHROPIC_API_KEY` | backend | Claude API key |
| `CORS_ORIGINS` | backend | Comma-separated allowed origins |

## Security rules (non-negotiable)

- **Never** put `PLAID_SECRET`, `SUPABASE_SERVICE_KEY`, or `ANTHROPIC_API_KEY` in frontend code. Vite inlines anything prefixed with `VITE_`.
- Frontend authenticates to the backend with the Supabase JWT as a `Authorization: Bearer <token>` header.
- Backend verifies the JWT with `supabase.auth.getUser(token)` and uses the service key for trusted server operations.
- `.env*` files are gitignored — see `vela/.gitignore`.

## Deployment (later, see Prompt 10)

- Frontend → Vercel (root: `vela/frontend`)
- Backend → Render (root: `vela/backend`)
- Database → Supabase (already hosted)
