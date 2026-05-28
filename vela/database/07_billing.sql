-- ============================================
-- Migration 07: billing / Pro plan
-- ============================================
-- Adds subscription state to profiles. `plan` is 'free' or 'pro'.
-- Updated server-side by the Stripe webhook (service role). Safe to re-run.

alter table public.profiles
  add column if not exists plan text default 'free',
  add column if not exists stripe_customer_id text,
  add column if not exists subscription_status text,
  add column if not exists current_period_end timestamp with time zone;
