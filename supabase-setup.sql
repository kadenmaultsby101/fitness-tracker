-- Run this in your Supabase SQL Editor
-- Go to: Supabase Dashboard → SQL Editor → New Query → paste this → Run

create table if not exists daily_logs (
  id uuid default gen_random_uuid() primary key,
  date date unique not null,
  calories integer default 0,
  protein integer default 0,
  water integer default 0,
  weight numeric(5,1),
  food_log jsonb default '[]'::jsonb,
  completed_workouts jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Allow public access (your app is personal use only)
alter table daily_logs enable row level security;

create policy "Allow all" on daily_logs
  for all using (true) with check (true);
