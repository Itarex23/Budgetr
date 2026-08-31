/*
# Create core tables for Daily Money budgeting app (single-tenant, no auth)

1. New Tables
- `categories`: user-defined and default spending categories
  - `id` (text, primary key) — stable slug id ("food", "transport", or uuid for custom)
  - `name` (text, not null) — display name
  - `color` (text, not null) — hex color string
  - `icon` (text, not null) — lucide icon name
  - `is_default` (boolean, default false) — whether it's a pre-seeded default
  - `sort_order` (integer, default 0) — manual ordering
  - `created_at` (timestamptz)
- `expenses`: individual expense entries
  - `id` (text, primary key)
  - `amount` (numeric, not null) — dollar amount
  - `category_id` (text, not null) — references categories(id) ON DELETE SET NULL
  - `note` (text, nullable)
  - `created_at` (timestamptz)
- `budget`: single-row budget config
  - `id` (text, primary key, always 'singleton')
  - `monthly` (numeric, default 0)
  - `rollover` (boolean, default false)
  - `anchor_date` (timestamptz)
  - `updated_at` (timestamptz)
- `settings`: single-row app settings
  - `id` (text, primary key, always 'singleton')
  - `currency` (text, default 'USD')
  - `reminder_enabled` (boolean, default false)
  - `reminder_hour` (integer, default 20)
  - `reminder_minute` (integer, default 0)
  - `app_lock_enabled` (boolean, default false)
  - `updated_at` (timestamptz)

2. Security
- Single-tenant app with no sign-in screen.
- RLS enabled on all tables.
- All policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)` because the data is intentionally shared (no multi-user isolation needed).

3. Important Notes
- Categories use text PKs so default categories keep stable slugs ("food", "transport", etc.).
- Custom categories get uuid-based text PKs generated client-side.
- `sort_order` integer column supports manual reordering.
- Expenses reference categories with ON DELETE SET NULL so deleting a category doesn't lose expense history.
- Budget and settings are singleton rows (id = 'singleton').
*/

CREATE TABLE IF NOT EXISTS categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  color text NOT NULL,
  icon text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id text PRIMARY KEY,
  amount numeric NOT NULL,
  category_id text REFERENCES categories(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS budget (
  id text PRIMARY KEY DEFAULT 'singleton',
  monthly numeric NOT NULL DEFAULT 0,
  rollover boolean NOT NULL DEFAULT false,
  anchor_date timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  id text PRIMARY KEY DEFAULT 'singleton',
  currency text NOT NULL DEFAULT 'USD',
  reminder_enabled boolean NOT NULL DEFAULT false,
  reminder_hour integer NOT NULL DEFAULT 20,
  reminder_minute integer NOT NULL DEFAULT 0,
  app_lock_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Categories policies
DROP POLICY IF EXISTS "anon_select_categories" ON categories;
CREATE POLICY "anon_select_categories" ON categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_categories" ON categories;
CREATE POLICY "anon_insert_categories" ON categories FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_categories" ON categories;
CREATE POLICY "anon_update_categories" ON categories FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_categories" ON categories;
CREATE POLICY "anon_delete_categories" ON categories FOR DELETE
  TO anon, authenticated USING (true);

-- Expenses policies
DROP POLICY IF EXISTS "anon_select_expenses" ON expenses;
CREATE POLICY "anon_select_expenses" ON expenses FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_expenses" ON expenses;
CREATE POLICY "anon_insert_expenses" ON expenses FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_expenses" ON expenses;
CREATE POLICY "anon_update_expenses" ON expenses FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_expenses" ON expenses;
CREATE POLICY "anon_delete_expenses" ON expenses FOR DELETE
  TO anon, authenticated USING (true);

-- Budget policies
DROP POLICY IF EXISTS "anon_select_budget" ON budget;
CREATE POLICY "anon_select_budget" ON budget FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_budget" ON budget;
CREATE POLICY "anon_insert_budget" ON budget FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_budget" ON budget;
CREATE POLICY "anon_update_budget" ON budget FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_budget" ON budget;
CREATE POLICY "anon_delete_budget" ON budget FOR DELETE
  TO anon, authenticated USING (true);

-- Settings policies
DROP POLICY IF EXISTS "anon_select_settings" ON settings;
CREATE POLICY "anon_select_settings" ON settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_settings" ON settings;
CREATE POLICY "anon_insert_settings" ON settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_settings" ON settings;
CREATE POLICY "anon_update_settings" ON settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_settings" ON settings;
CREATE POLICY "anon_delete_settings" ON settings FOR DELETE
  TO anon, authenticated USING (true);

-- Index for expense queries by date
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses (category_id);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories (sort_order);
