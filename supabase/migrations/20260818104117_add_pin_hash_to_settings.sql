/*
# Add PIN hash column to settings table

1. Modified Tables
- `settings`: adds `pin_hash` (text, nullable) column
  - Stores a simple hash of the user's 4-digit PIN
  - NULL means no PIN is set (lock disabled)
  - When app_lock_enabled is true, pin_hash must be non-null

2. Security
- No RLS changes — existing policies already cover UPDATE on settings table.
- The anon/authenticated UPDATE policy already allows writing all columns.

3. Important Notes
- This is a lightweight client-side hash (not bcrypt) since the app is single-tenant with no auth.
- The PIN is a 4-digit code stored as a simple hash to avoid plaintext storage.
- On native mobile, this would use expo-local-authentication for biometrics; on web, PIN-only.
*/

ALTER TABLE settings ADD COLUMN IF NOT EXISTS pin_hash text;
