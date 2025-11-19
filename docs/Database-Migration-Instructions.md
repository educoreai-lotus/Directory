# Database Migration Instructions

## Quick Fix: Add Missing Tables/Columns

If you're getting errors like `relation "employee_profile_approvals" does not exist`, you need to run the migration.

### Option 1: Run via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **"New query"**
4. Open the file: `database/migrations/001_initial_schema.sql`
5. Copy the entire contents
6. Paste into the SQL Editor
7. Click **"Run"** (or press Ctrl+Enter)
8. The migration uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`, so it's safe to run multiple times
9. You should see all tables created, including:
   - ✅ employee_profile_approvals table
   - ✅ profile_status column in employees table
   - ✅ logo_url column in companies table
   - ✅ profile_photo_url column in employees table

### Option 2: Using Railway CLI (If configured)

```bash
# Connect to Railway database
railway connect

# Run migration
psql $DATABASE_URL -f database/migrations/001_initial_schema.sql
```

### Verification

After running the migration, verify in Supabase:
1. Go to **Table Editor**
2. You should see `employee_profile_approvals` table
3. Check `employees` table - it should have `profile_status` column

---

## What This Migration Adds

1. **`profile_status` column** to `employees` table
   - Values: 'basic', 'enriched', 'approved', 'rejected'
   - Default: 'basic'

2. **`profile_photo_url` column** to `employees` table
   - Stores profile photo URL from LinkedIn/GitHub OAuth
   - Optional field (VARCHAR 500)

3. **`logo_url` column** to `companies` table
   - Stores company logo URL from CSV upload
   - Optional field (VARCHAR 500)

4. **`employee_profile_approvals` table**
   - Tracks HR approval requests for enriched profiles
   - Links employees to their approval status

5. **Indexes** for performance
   - Index on `employees.profile_status`
   - Indexes on `employee_profile_approvals` for company and employee lookups

