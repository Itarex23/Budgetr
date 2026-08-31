/*
# Add real user accounts and per-user data isolation

This app previously had no sign-in screen: every table was readable and
writable by anyone (`anon` and `authenticated`, `USING (true)`), so all
installs of the app shared one global set of expenses/budget/settings.
This migration switches the app to real per-user data using Supabase Auth.

1. Modified Tables
- `expenses`, `categories`, `recurring_bills`: add `user_id uuid` referencing
  `auth.users(id)`, defaulting to `auth.uid()` so existing client inserts
  don't need code changes.
- `budget`, `settings`: converted from a single shared "singleton" row
  (`id = 'singleton'`) to one row per user, keyed by `user_id` instead of
  the old `id` column.

2. Security
- RLS policies are rewritten to scope every operation to
  `auth.uid() = user_id`, and restricted to the `authenticated` role only
  (the `anon` role can no longer read or write any of this data).
- Any pre-existing rows with no owner (from the old shared-data era) are
  removed, since they can't be safely attributed to a specific user.

3. Important Notes
- This is a breaking change for any existing installs: users must now
  sign up / sign in, and old shared data is not migrated to a specific
  account (there was no way to know who it belonged to).
- Run this only after wiring up the sign-in screen in the app, since
  writes will fail RLS checks without a valid session.
*/

-- ── Expenses: add ownership ────────────────────────────────────────────
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
DELETE FROM expenses WHERE user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses (user_id);

DROP POLICY IF EXISTS "anon_select_expenses" ON expenses;
DROP POLICY IF EXISTS "anon_insert_expenses" ON expenses;
DROP POLICY IF EXISTS "anon_update_expenses" ON expenses;
DROP POLICY IF EXISTS "anon_delete_expenses" ON expenses;

CREATE POLICY "own_select_expenses" ON expenses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_insert_expenses" ON expenses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update_expenses" ON expenses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_delete_expenses" ON expenses FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ── Categories: add ownership ───────────────────────────────────────────
ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
DELETE FROM categories WHERE user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories (user_id);

DROP POLICY IF EXISTS "anon_select_categories" ON categories;
DROP POLICY IF EXISTS "anon_insert_categories" ON categories;
DROP POLICY IF EXISTS "anon_update_categories" ON categories;
DROP POLICY IF EXISTS "anon_delete_categories" ON categories;

CREATE POLICY "own_select_categories" ON categories FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_insert_categories" ON categories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update_categories" ON categories FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_delete_categories" ON categories FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ── Recurring bills: add ownership ──────────────────────────────────────
ALTER TABLE recurring_bills ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
DELETE FROM recurring_bills WHERE user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_recurring_bills_user_id ON recurring_bills (user_id);

DROP POLICY IF EXISTS "anon_select_recurring_bills" ON recurring_bills;
DROP POLICY IF EXISTS "anon_insert_recurring_bills" ON recurring_bills;
DROP POLICY IF EXISTS "anon_update_recurring_bills" ON recurring_bills;
DROP POLICY IF EXISTS "anon_delete_recurring_bills" ON recurring_bills;

CREATE POLICY "own_select_recurring_bills" ON recurring_bills FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_insert_recurring_bills" ON recurring_bills FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update_recurring_bills" ON recurring_bills FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_delete_recurring_bills" ON recurring_bills FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ── Budget: convert singleton row → one row per user ────────────────────
ALTER TABLE budget ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
DELETE FROM budget WHERE user_id IS NULL;
ALTER TABLE budget DROP CONSTRAINT IF EXISTS budget_pkey;
ALTER TABLE budget DROP COLUMN IF EXISTS id;
ALTER TABLE budget ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE budget ADD PRIMARY KEY (user_id);

DROP POLICY IF EXISTS "anon_select_budget" ON budget;
DROP POLICY IF EXISTS "anon_insert_budget" ON budget;
DROP POLICY IF EXISTS "anon_update_budget" ON budget;
DROP POLICY IF EXISTS "anon_delete_budget" ON budget;

CREATE POLICY "own_select_budget" ON budget FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_insert_budget" ON budget FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update_budget" ON budget FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_delete_budget" ON budget FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ── Settings: convert singleton row → one row per user ──────────────────
ALTER TABLE settings ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
DELETE FROM settings WHERE user_id IS NULL;
ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_pkey;
ALTER TABLE settings DROP COLUMN IF EXISTS id;
ALTER TABLE settings ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE settings ADD PRIMARY KEY (user_id);

DROP POLICY IF EXISTS "anon_select_settings" ON settings;
DROP POLICY IF EXISTS "anon_insert_settings" ON settings;
DROP POLICY IF EXISTS "anon_update_settings" ON settings;
DROP POLICY IF EXISTS "anon_delete_settings" ON settings;

CREATE POLICY "own_select_settings" ON settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_insert_settings" ON settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update_settings" ON settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_delete_settings" ON settings FOR DELETE TO authenticated USING (auth.uid() = user_id);
