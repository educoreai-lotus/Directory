# Database Migration Guide - Fixing Schema Mismatch

## Problem
After copying your old Supabase project to a new one, you're getting errors when trying to register a company. This is because the old `database/schema.sql` file has outdated column names that don't match what the application code expects.

## Root Cause
The `database/schema.sql` file was outdated. The application code expects:
- `approval_policy` (not `learning_path_approval`)
- `kpis` (not `primary_kpis`)
- Additional columns: `logo_url`, `passing_grade`, `max_attempts`, `exercises_limited`, `num_of_exercises`

## Solution

### Option 1: Fix Existing Database (Recommended if you already have data)

1. **Go to your Supabase Dashboard** → Your Project → SQL Editor

2. **Run the fix script:**
   - Open `database/scripts/fix_schema_mismatch.sql`
   - Copy the entire contents
   - Paste into Supabase SQL Editor
   - Click "Run" (or press Ctrl+Enter)

3. **Verify the fix worked:**
   ```sql
   -- Check companies table structure
   SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'companies' 
   ORDER BY ordinal_position;
   ```
   
   You should see:
   - `approval_policy` (not `learning_path_approval`)
   - `kpis` (not `primary_kpis`)
   - `logo_url`, `passing_grade`, `max_attempts`, `exercises_limited`, `num_of_exercises`

### Option 2: Start Fresh (If you don't have important data)

1. **Drop all tables** in Supabase SQL Editor:
   ```sql
   DROP TABLE IF EXISTS employee_raw_data CASCADE;
   DROP TABLE IF EXISTS employee_project_summaries CASCADE;
   DROP TABLE IF EXISTS employee_teams CASCADE;
   DROP TABLE IF EXISTS employee_managers CASCADE;
   DROP TABLE IF EXISTS employee_roles CASCADE;
   DROP TABLE IF EXISTS employee_profile_approvals CASCADE;
   DROP TABLE IF EXISTS employee_requests CASCADE;
   DROP TABLE IF EXISTS trainer_settings CASCADE;
   DROP TABLE IF EXISTS employees CASCADE;
   DROP TABLE IF EXISTS teams CASCADE;
   DROP TABLE IF EXISTS departments CASCADE;
   DROP TABLE IF EXISTS audit_logs CASCADE;
   DROP TABLE IF EXISTS company_registration_requests CASCADE;
   DROP TABLE IF EXISTS companies CASCADE;
   DROP TABLE IF EXISTS directory_admins CASCADE;
   ```

2. **Run the correct schema:**
   - Open `database/migrations/001_initial_schema.sql` (NOT `database/schema.sql`)
   - Copy the entire contents
   - Paste into Supabase SQL Editor
   - Click "Run"

3. **Import your data:**
   - Use the SQL files you provided (they're already in the correct format)
   - Run them in this order:
     1. `companies_rows (1).sql` or `companies_rows (2).sql`
     2. `directory_admins_rows.sql`
     3. `departments_rows.sql`
     4. `teams_rows.sql`
     5. `employees_rows (1).sql`
     6. `employee_roles_rows.sql`
     7. `employee_teams_rows.sql`
     8. `employee_managers_rows.sql`
     9. `employee_project_summaries_rows.sql`
     10. `employee_profile_approvals_rows.sql`
     11. `trainer_settings_rows.sql`
     12. `employee_raw_data_rows.sql` (if this table exists)

## Verification

After running the fix, test company registration:

1. Try registering a new company through your frontend
2. Check Railway logs for any database errors
3. If you still get errors, check:
   - Railway environment variables are set correctly
   - Database connection is working
   - All required columns exist

## Important Notes

- **Always use `database/migrations/001_initial_schema.sql`** for new databases, NOT `database/schema.sql`
- The `database/schema.sql` file has been updated to match the migration, but the migration file is the source of truth
- Your data files (CSV/SQL) are already in the correct format and should work after the schema is fixed

## If You Still Get Errors

1. Check Railway backend logs for the exact error message
2. Verify your Supabase connection string in Railway environment variables
3. Make sure all tables were created successfully
4. Check that foreign key relationships are correct (company_id references, etc.)

