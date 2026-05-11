-- VELA — Migration 02: allow users to write their own accounts + transactions
-- Run this in the Supabase SQL Editor AFTER schema.sql + 01_onboarding_settings.sql.
--
-- The original schema gave users SELECT-only access to accounts and
-- transactions, on the assumption that the Plaid backend (using the service
-- role key) would handle all inserts/updates. The manual-entry flow needs
-- the frontend to insert/update/delete on behalf of the signed-in user —
-- still scoped to their own rows via auth.uid().
--
-- Plaid endpoints continue to use the service role key, which bypasses RLS
-- entirely; these policies do not affect that path.

-- ============================================
-- ACCOUNTS (write policies for the signed-in user's own rows)
-- ============================================
create policy "Users can insert own accounts" on public.accounts
  for insert with check (auth.uid() = user_id);

create policy "Users can update own accounts" on public.accounts
  for update using (auth.uid() = user_id);

create policy "Users can delete own accounts" on public.accounts
  for delete using (auth.uid() = user_id);

-- ============================================
-- TRANSACTIONS (write policies for the signed-in user's own rows)
-- ============================================
create policy "Users can insert own transactions" on public.transactions
  for insert with check (auth.uid() = user_id);

create policy "Users can update own transactions" on public.transactions
  for update using (auth.uid() = user_id);

create policy "Users can delete own transactions" on public.transactions
  for delete using (auth.uid() = user_id);
