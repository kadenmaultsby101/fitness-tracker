-- VELA — Migration 01: onboarding fields + settings toggles
-- Adds columns to the existing public.profiles table.
-- Run this in the Supabase SQL Editor AFTER schema.sql.
-- Safe to re-run (uses IF NOT EXISTS).

-- ============================================
-- ONBOARDING
-- ============================================

-- Monthly income captured during onboarding Step 2.
-- Nullable: users can skip the step and fill in later from Settings.
alter table public.profiles
  add column if not exists monthly_income numeric(12,2);

-- Timestamp set when the user finishes (or explicitly skips out of) the
-- onboarding flow. NULL means "show onboarding on next login".
alter table public.profiles
  add column if not exists onboarding_completed_at timestamp with time zone;

-- ============================================
-- SETTINGS TOGGLES
-- ============================================
-- Backs the Settings page in the brief (Section 8).
-- Defaults match what a new user should reasonably opt into.

alter table public.profiles
  add column if not exists notify_transactions boolean default true;

alter table public.profiles
  add column if not exists notify_weekly_summary boolean default true;

alter table public.profiles
  add column if not exists notify_ai_insights boolean default true;

alter table public.profiles
  add column if not exists two_factor_enabled boolean default false;

-- ============================================
-- RLS NOTE
-- ============================================
-- No new policies needed. The existing policies on public.profiles already
-- cover all columns on the user's own row:
--   "Users can view own profile"   (SELECT, auth.uid() = id)
--   "Users can update own profile" (UPDATE, auth.uid() = id)
--   "Users can insert own profile" (INSERT, auth.uid() = id)
