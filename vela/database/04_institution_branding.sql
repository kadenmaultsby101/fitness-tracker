-- ============================================
-- Migration 04: institution branding (logo + primary color)
-- ============================================
-- Adds the bank's logo (base64-encoded PNG) and brand color (hex string)
-- to plaid_items so we can render real bank branding on the Connected
-- Accounts list and Home accounts strip. Both come from Plaid's
-- /institutions/get_by_id endpoint and are stored once at link time
-- (not refetched on every page load).

alter table public.plaid_items
  add column if not exists institution_logo text,
  add column if not exists institution_color text;

-- Optional backfill helper note: existing rows will be null until the
-- user reconnects OR a one-time backfill job fetches /institutions/get_by_id
-- for each institution_id and updates the row.
