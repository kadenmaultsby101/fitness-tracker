-- ============================================
-- Migration 08: daily net-worth snapshots
-- ============================================
-- One row per user per day capturing their net worth and a breakdown by
-- account type. Written by the daily Vercel cron (/api/snapshot/run) using
-- the service role. RLS lets each user read only their own history.
--
-- Powers: Net Worth Time Machine (scrub through last N months),
-- Year-in-Review story, weekly Sage Letters.
--
-- Safe to re-run. Composite unique key on (user_id, captured_on) means a
-- second run on the same day is a no-op via ON CONFLICT DO NOTHING.

create table if not exists public.net_worth_snapshots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  captured_on date not null,
  net_worth numeric(14,2) not null,
  by_type jsonb,            -- { cash: 5708, investments: 12340, debt: 4200 }
  created_at timestamp with time zone default now()
);

create unique index if not exists net_worth_snapshots_user_day_uq
  on public.net_worth_snapshots (user_id, captured_on);

create index if not exists net_worth_snapshots_user_date_idx
  on public.net_worth_snapshots (user_id, captured_on desc);

alter table public.net_worth_snapshots enable row level security;

drop policy if exists "snapshots: read own" on public.net_worth_snapshots;
create policy "snapshots: read own"
  on public.net_worth_snapshots
  for select
  using (auth.uid() = user_id);

-- No insert/update/delete policies — writes only happen via the service-role
-- cron endpoint, which bypasses RLS.
