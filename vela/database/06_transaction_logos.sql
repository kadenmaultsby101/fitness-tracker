-- ============================================
-- Migration 06: store Plaid's enriched merchant logo + website
-- ============================================
-- Plaid returns a high-quality logo_url (and website) on each transaction,
-- plus counterparties[].logo_url. This is the same merchant-logo source
-- Monarch / Origin / Copilot use. Storing it lets the transaction rows
-- render real brand logos for virtually every major merchant without a
-- third-party favicon service.

alter table public.transactions
  add column if not exists logo_url text,
  add column if not exists merchant_website text;
