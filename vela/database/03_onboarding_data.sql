-- VELA — Migration 03: onboarding personalization payload
-- Adds a single jsonb column to public.profiles that stores everything
-- Sage will use to personalize advice — age, situation, motivations,
-- goal interests, etc. Using jsonb instead of a wave of new columns
-- so future personalization fields don't require another migration.
--
-- Run this in the Supabase SQL Editor AFTER 02_user_writes.sql.
-- Safe to re-run (IF NOT EXISTS).

alter table public.profiles
  add column if not exists onboarding_data jsonb default '{}'::jsonb;

-- No new RLS policy needed — the existing 'Users can update own profile'
-- policy covers all columns on the user's own row.
