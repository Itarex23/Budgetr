/*
# Create recurring_bills table (single-tenant, no auth)

1. New Tables
- `recurring_bills`: user-defined recurring bill reminders
  - `id` (text, primary key) — client-generated unique id
  - `name` (text, not null) — bill name e.g. "Rent", "Netflix"
  - `amount` (numeric, not null) — dollar amount due
  - `due_date` (date, not null) — next due date
  - `repeat_interval` (text, not null) — 'weekly', 'monthly', 'yearly'
  - `reminder_enabled` (boolean, default true) — whether reminder is active
  - `last_paid_date` (date, nullable) — last time this bill was marked paid
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

2. Security
- Single-tenant app with no sign-in screen.
- RLS enabled on recurring_bills.
- All policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)` because the data is intentionally shared (no multi-user isolation needed).

3. Important Notes
- `due_date` is a DATE type (not timestamptz) since bills are due on a calendar day, not a specific moment.
- `repeat_interval` is a text enum: 'weekly', 'monthly', or 'yearly'.
- `last_paid_date` tracks when the user last marked the bill as paid, used to compute next due date.
- `reminder_enabled` lets users mute individual bill reminders without deleting the bill.
*/

CREATE TABLE IF NOT EXISTS recurring_bills (
  id text PRIMARY KEY,
  name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  repeat_interval text NOT NULL DEFAULT 'monthly',
  reminder_enabled boolean NOT NULL DEFAULT true,
  last_paid_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE recurring_bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_recurring_bills" ON recurring_bills;
CREATE POLICY "anon_select_recurring_bills" ON recurring_bills FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_recurring_bills" ON recurring_bills;
CREATE POLICY "anon_insert_recurring_bills" ON recurring_bills FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_recurring_bills" ON recurring_bills;
CREATE POLICY "anon_update_recurring_bills" ON recurring_bills FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_recurring_bills" ON recurring_bills;
CREATE POLICY "anon_delete_recurring_bills" ON recurring_bills FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_recurring_bills_due_date ON recurring_bills (due_date);
