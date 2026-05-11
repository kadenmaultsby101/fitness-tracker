# START HERE — How to use these files with Claude Code

Read this first. Total time to get rolling: **15 minutes**.

---

## Step 1: Sign up for the three services you'll need (10 min)

You'll need API keys from these three before Claude Code can wire anything up. Sign up in parallel while you're reading:

### 🟢 Plaid (bank connections)
1. Go to **https://dashboard.plaid.com/signup**
2. Sign up — use case = "Personal finance"
3. Go to **Team Settings → Keys**
4. Save these three values to a notes app:
   - `client_id`
   - `Sandbox secret`
   - Environment = `sandbox`

### 🟢 Supabase (auth + database)
1. Go to **https://supabase.com**
2. Sign in with GitHub
3. Click **New Project**, name it `vela`, pick West US region
4. Wait ~2 min for it to provision
5. Go to **Project Settings → API**
6. Save these:
   - `Project URL`
   - `anon public` key
   - `service_role` key (this is secret, keep it safe)

### 🟢 Anthropic (Claude API for Sage)
1. Go to **https://console.anthropic.com**
2. Go to **API Keys → Create Key**
3. Save the key

---

## Step 2: Set up Claude Code (5 min)

1. Install Claude Code if you haven't: **https://docs.claude.com/en/docs/claude-code**
2. Create a new folder on your computer called `vela`
3. Open that folder in your terminal
4. Copy these 5 files from this download into the folder:
   - `00_CLAUDE_CODE_PROMPTS.md`
   - `01_PROJECT_BRIEF.md`
   - `02_DESIGN_SYSTEM.md`
   - `03_DATABASE_SCHEMA.sql`
   - `04_EXISTING_APP.jsx`
5. Start Claude Code: `claude` in your terminal

---

## Step 3: Build the app (use the prompts)

Open `00_CLAUDE_CODE_PROMPTS.md`. There are 10 prompts. **Copy/paste them into Claude Code one at a time, in order.**

After each prompt finishes:
- Read what Claude Code built
- Ask follow-up questions if anything is unclear
- Test what was added before moving to the next prompt

The full build will take 1–3 sessions depending on how much you want to do at once.

---

## Step 4: Run the database setup (after Prompt 2 succeeds)

When Claude Code confirms the schema is good:

1. Open your Supabase project
2. Go to **SQL Editor**
3. Open `03_DATABASE_SCHEMA.sql` from your folder
4. Copy/paste the entire contents into the SQL Editor
5. Click **Run**

You should see "Success. No rows returned." — that means all your tables and security policies are set up.

---

## Step 5: Drop in your API keys

After Claude Code creates the `.env.example` files, copy them to `.env` and fill in:

### `backend/.env`
```
PLAID_CLIENT_ID=<from Plaid>
PLAID_SECRET=<sandbox secret from Plaid>
PLAID_ENV=sandbox
ANTHROPIC_API_KEY=<from Anthropic>
SUPABASE_URL=<from Supabase>
SUPABASE_SERVICE_KEY=<service_role key from Supabase>
PORT=4000
```

### `frontend/.env`
```
VITE_SUPABASE_URL=<same Supabase URL>
VITE_SUPABASE_ANON_KEY=<anon key from Supabase>
VITE_API_URL=http://localhost:4000
```

**Do not share these keys with anyone or commit them to GitHub.** Claude Code will set up a `.gitignore` to prevent that.

---

## Step 6: Run it

After Prompt 5 (Plaid integration) is done:

In one terminal:
```
cd backend
npm install
npm run dev
```

In another terminal:
```
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — you're using the real app. Sign up, then in the More tab, hit Connect and use Plaid sandbox credentials:
- Username: `user_good`
- Password: `pass_good`

Fake-but-realistic accounts will flow in. Sage will start analyzing them. You're live.

---

## What's in each file

| File | What it is |
|---|---|
| `00_CLAUDE_CODE_PROMPTS.md` | The 10 prompts to paste into Claude Code, one at a time |
| `01_PROJECT_BRIEF.md` | What Vela is, all features, tech stack — the master spec |
| `02_DESIGN_SYSTEM.md` | Colors, fonts, spacing — keeps the aesthetic consistent |
| `03_DATABASE_SCHEMA.sql` | The Supabase database setup (run once) |
| `04_EXISTING_APP.jsx` | The current working visual prototype — Claude Code reuses this |

---

## When you want real bank data (not sandbox)

After everything works in sandbox:

1. In Plaid dashboard, request **Development** access (free, instant approval)
2. Change `PLAID_ENV=sandbox` to `PLAID_ENV=development` in your backend `.env`
3. Restart the backend
4. Connect your real Chase, Schwab, Fidelity, Robinhood

You can have up to 100 real connections free in development. That's way more than enough for personal use + testing with friends.

---

## When you want to put it on your phone

After everything works locally:

Frontend → Vercel (free):
1. Push your `vela` folder to GitHub
2. Sign up at vercel.com, import the repo
3. Pick the `frontend` folder, add the env vars

Backend → Render (free tier works):
1. Sign up at render.com
2. New Web Service → connect your repo → `backend` folder
3. Add the env vars

Update `VITE_API_URL` in Vercel to point to your Render URL. You're now usable from your phone via the Vercel URL.

Add to home screen on iOS/Android → it works like a native app.

---

## Costs to run (just for you)

| Service | Cost |
|---|---|
| Plaid (sandbox + development) | $0 |
| Supabase | $0 |
| Anthropic API | ~$1–3/month for personal use |
| Vercel hosting | $0 |
| Render hosting | $0 |
| **TOTAL** | **~$2/month** |

---

## When you're ready to launch publicly

That's a separate conversation — production Plaid approval, Apple Developer account, App Store submission, marketing. Get the personal version working perfectly first. Make sure Sage's recommendations are sharp. Use it for a few months. Then we scale.

You've got this. 🎯
