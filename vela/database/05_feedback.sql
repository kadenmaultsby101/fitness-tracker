-- ============================================
-- Migration 05: feedback inbox for friends-and-family testing
-- ============================================
-- A simple table where testers can submit free-form feedback from
-- inside the app. RLS lets anyone who is signed in INSERT their own
-- row; only the service_role can read all of them.
-- Owner (Kaden) reads via Supabase Table Editor → feedback.

create table if not exists public.feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete set null,
  user_email text,
  message text not null,
  page text,
  user_agent text,
  created_at timestamp with time zone default now()
);

alter table public.feedback enable row level security;

-- Anyone signed in can leave feedback (tied to their auth.uid)
create policy "Signed-in users can submit feedback"
  on public.feedback for insert
  with check (auth.uid() = user_id or user_id is null);

-- Read access is service-role-only by default. (No SELECT policy =
-- no SELECT for anyone but service_role.) Owner reads via the Supabase
-- Table Editor which uses service_role.

create index feedback_created_at_idx on public.feedback (created_at desc);
