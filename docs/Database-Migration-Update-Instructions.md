# Database Migration Update Instructions

## Critical: Run Migration for Existing Databases

If you're getting the error `column "approval_policy" of relation "companies" does not exist`, you need to run the migration script to update your database schema.

---

## Option 1: Run via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **"New query"**
4. Open the file: `database/migrations/003_update_company_fields.sql`
5. Copy the entire contents
6. Paste into the SQL Editor
7. Click **"Run"** (or press Ctrl+Enter)
8. The migration will:
   - Rename `learning_path_approval` to `approval_policy` (if exists)
   - Rename `primary_kpis` to `kpis` (if exists)
   - Add `approval_policy` and `kpis` columns if they don't exist
   - Make `kpis` NOT NULL
   - Add company settings columns: `passing_grade`, `max_attempts`, `exercises_limited`, `num_of_exercises`

---

## Option 2: Run Full Initial Schema (For New Databases)

If you're setting up a new database, run the complete initial schema:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **"New query"**
4. Open the file: `database/migrations/001_initial_schema.sql`
5. Copy the entire contents
6. Paste into the SQL Editor
7. Click **"Run"**

This will create all tables with the correct column names from the start.

---

## Verification

After running the migration, verify in Supabase:

1. Go to **Table Editor**
2. Select the `companies` table
3. You should see these columns:
   - ✅ `approval_policy` (not `learning_path_approval`)
   - ✅ `kpis` (not `primary_kpis`)
   - ✅ `passing_grade`
   - ✅ `max_attempts`
   - ✅ `exercises_limited`
   - ✅ `num_of_exercises`
   - ✅ `logo_url`

---

## Important Notes

- The migration uses `IF EXISTS` and `IF NOT EXISTS` checks, so it's safe to run multiple times
- If you have existing data, the migration will preserve it
- The `kpis` column will be set to 'Not specified' for any NULL values before making it NOT NULL

