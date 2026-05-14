-- VELA DATABASE SCHEMA
-- Run this in your Supabase SQL Editor after creating a new project
-- This sets up all tables, indexes, RLS policies, and the auto-profile trigger

-- ============================================
-- PROFILES (linked to auth.users automatically)
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  name text,
  location text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ============================================
-- PLAID ITEMS (one per connected institution)
-- ============================================
create table public.plaid_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  plaid_item_id text unique not null,
  plaid_access_token text not null,
  institution_name text not null,
  institution_id text,
  created_at timestamp with time zone default now()
);

-- ============================================
-- ACCOUNTS (bank, brokerage, credit card, etc.)
-- ============================================
create table public.accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  plaid_item_id uuid references public.plaid_items on delete cascade,
  plaid_account_id text unique not null,
  name text not null,
  official_name text,
  type text not null,           -- depository, investment, credit, loan
  subtype text,                 -- checking, savings, 401k, brokerage, etc.
  balance_current numeric(12,2),
  balance_available numeric(12,2),
  currency text default 'USD',
  mask text,                    -- last 4 digits
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ============================================
-- TRANSACTIONS
-- ============================================
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  account_id uuid references public.accounts on delete cascade not null,
  plaid_transaction_id text unique not null,
  name text not null,
  merchant_name text,
  amount numeric(12,2) not null,   -- positive = outflow, negative = inflow (Plaid convention)
  category text,
  subcategory text,
  date date not null,
  pending boolean default false,
  created_at timestamp with time zone default now()
);

create index transactions_user_date_idx on public.transactions(user_id, date desc);

-- ============================================
-- GOALS
-- ============================================
create table public.goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  emoji text,
  description text,
  current_amount numeric(12,2) default 0,
  target_amount numeric(12,2) not null,
  monthly_contribution numeric(12,2) default 0,
  target_date date,
  created_at timestamp with time zone default now()
);

-- ============================================
-- BUDGETS (per category, per month)
-- ============================================
create table public.budgets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  category text not null,
  monthly_limit numeric(12,2) not null,
  month_year text not null,   -- "2026-05"
  created_at timestamp with time zone default now(),
  unique(user_id, category, month_year)
);

-- ============================================
-- CHAT HISTORY with Sage
-- ============================================
create table public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  role text not null,          -- 'user' or 'assistant'
  content text not null,
  created_at timestamp with time zone default now()
);

create index chat_messages_user_time_idx on public.chat_messages(user_id, created_at);

-- ============================================
-- INSIGHTS CACHE (24h cache to avoid re-running Claude)
-- ============================================
create table public.insights_cache (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null unique,
  insights jsonb not null,
  generated_at timestamp with time zone default now()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
alter table public.profiles enable row level security;
alter table public.plaid_items enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.goals enable row level security;
alter table public.budgets enable row level security;
alter table public.chat_messages enable row level security;
alter table public.insights_cache enable row level security;

-- Profiles
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Plaid items (server-only via service key — RLS for safety)
create policy "Users can view own plaid items" on public.plaid_items
  for select using (auth.uid() = user_id);

-- Accounts
create policy "Users can view own accounts" on public.accounts
  for select using (auth.uid() = user_id);

-- Transactions
create policy "Users can view own transactions" on public.transactions
  for select using (auth.uid() = user_id);

-- Goals (full CRUD)
create policy "Users can view own goals" on public.goals
  for select using (auth.uid() = user_id);
create policy "Users can insert own goals" on public.goals
  for insert with check (auth.uid() = user_id);
create policy "Users can update own goals" on public.goals
  for update using (auth.uid() = user_id);
create policy "Users can delete own goals" on public.goals
  for delete using (auth.uid() = user_id);

-- Budgets (full CRUD)
create policy "Users can view own budgets" on public.budgets
  for select using (auth.uid() = user_id);
create policy "Users can insert own budgets" on public.budgets
  for insert with check (auth.uid() = user_id);
create policy "Users can update own budgets" on public.budgets
  for update using (auth.uid() = user_id);
create policy "Users can delete own budgets" on public.budgets
  for delete using (auth.uid() = user_id);

-- Chat
create policy "Users can view own chat" on public.chat_messages
  for select using (auth.uid() = user_id);
create policy "Users can insert own chat" on public.chat_messages
  for insert with check (auth.uid() = user_id);

-- Insights cache
create policy "Users can view own insights" on public.insights_cache
  for select using (auth.uid() = user_id);

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
