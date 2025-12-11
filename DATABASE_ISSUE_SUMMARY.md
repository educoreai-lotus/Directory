# Database Schema Issue Summary

## The Problem

When you try to register a company, you're getting an error because your new Supabase database was created with an **outdated schema** that doesn't match what the application code expects.

## What Went Wrong

1. **You copied an old Supabase project** to a new account
2. **The old project used `database/schema.sql`** which had outdated column names:
   - `primary_kpis` instead of `kpis`
   - `learning_path_approval` instead of `approval_policy`
   - Missing columns: `logo_url`, `passing_grade`, `max_attempts`, `exercises_limited`, `num_of_exercises`

3. **The application code expects** the newer schema from `database/migrations/001_initial_schema.sql`

## The Error

When you try to register a company, the code in `backend/src/infrastructure/CompanyRepository.js` tries to insert into:
```sql
INSERT INTO companies (..., kpis, ...)
```

But your database has `primary_kpis` instead, causing a PostgreSQL error like:
```
column "kpis" does not exist
```

## The Solution

You have two options:

### ✅ Option 1: Fix Your Existing Database (Recommended)

Run the fix script in your Supabase SQL Editor:
1. Open `database/scripts/fix_schema_mismatch.sql`
2. Copy and paste into Supabase SQL Editor
3. Run it
4. This will rename columns and add missing ones

### ✅ Option 2: Start Fresh

1. Drop all tables in your new Supabase project
2. Run `database/migrations/001_initial_schema.sql` (NOT `database/schema.sql`)
3. Import your data using the SQL files you provided

## Your Data Files Are Correct ✅

Good news: Your CSV and SQL export files are already in the correct format! They use:
- `approval_policy` (correct)
- `kpis` (correct)
- All the right column names

So once you fix the schema, you can import your data directly.

## Files to Use

**✅ DO USE:**
- `database/migrations/001_initial_schema.sql` - This is the correct schema
- `database/scripts/fix_schema_mismatch.sql` - This fixes existing databases

**❌ DON'T USE (outdated):**
- `database/schema.sql` - This was outdated (but has now been updated)

## Next Steps

1. **Run the fix script** (`database/scripts/fix_schema_mismatch.sql`) in Supabase
2. **Verify** the schema is correct (see verification queries in the fix script)
3. **Test** company registration again
4. **Import your data** if needed using the SQL files you provided

## Still Having Issues?

If you still get errors after running the fix:
1. Check Railway backend logs for the exact error
2. Verify your Supabase connection string in Railway environment variables
3. Make sure all tables were created successfully
4. Check that foreign key relationships are correct

