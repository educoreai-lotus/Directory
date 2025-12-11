# Troubleshooting: Duplicate Domain Error

## The Error

```
ERROR: 23505: duplicate key value violates unique constraint "companies_domain_key"
DETAIL: Key (domain)=(testcompany.com) already exists.
```

## What This Means

This error indicates that you already have a company with the domain `testcompany.com` in your database. The `companies` table has a UNIQUE constraint on the `domain` column, so you can't have two companies with the same domain.

**Important:** This error is NOT from the fix script itself. The fix script doesn't insert any data. This error is happening because:
1. You already have a company with this domain in your database, OR
2. You're trying to register a new company while the script is running

## Solution Steps

### Step 1: Check for Duplicate Domains

Run this query in Supabase SQL Editor:

```sql
-- Check for duplicate domains
SELECT 
    domain, 
    COUNT(*) as count,
    array_agg(id::text) as company_ids,
    array_agg(company_name) as company_names,
    array_agg(created_at::text) as created_dates
FROM companies
GROUP BY domain
HAVING COUNT(*) > 1;
```

Or use the script: `database/scripts/check_duplicate_domains.sql`

### Step 2: Clean Up Duplicates

If you find duplicates, you have a few options:

#### Option A: Delete the Duplicate Company

If you have a test company you don't need:

```sql
-- Find the company ID
SELECT id, company_name, domain, created_at 
FROM companies 
WHERE domain = 'testcompany.com';

-- Delete it (replace COMPANY_ID with the actual UUID)
DELETE FROM companies WHERE id = 'COMPANY_ID';
```

#### Option B: Use a Different Domain

When registering a new company, use a different domain name (e.g., `testcompany2.com`).

#### Option C: Keep One, Delete Others

If you have multiple companies with the same domain and want to keep only the oldest one, use:
`database/scripts/fix_duplicate_domains.sql`

### Step 3: Continue with Schema Fix

After cleaning up duplicates, the schema fix script should complete successfully. The error you saw was just a warning about existing data - the schema changes should still have been applied.

## Verify Schema Fix Worked

Even if you got the duplicate error, check if the schema was fixed:

```sql
-- Check companies table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'companies' 
ORDER BY ordinal_position;
```

You should see:
- ✅ `approval_policy` (not `learning_path_approval`)
- ✅ `kpis` (not `primary_kpis`)
- ✅ `logo_url`, `passing_grade`, `max_attempts`, `exercises_limited`, `num_of_exercises`

## Next Steps

1. **Clean up duplicate domains** (if any)
2. **Verify the schema is fixed** (columns renamed correctly)
3. **Try registering a company again** with a unique domain

The duplicate domain error is a data issue, not a schema issue. Once you clean up the duplicates, company registration should work fine!

