# Database Migration Guide - Raw Data Consolidation

## Overview

This guide explains the database changes needed to consolidate all raw data sources into the `employees` table.

## Migration Steps

### Step 1: Add New Columns (REQUIRED)

**File:** `database/migrations/004_add_pdf_manual_data_to_employees.sql`

**What it does:**
- Adds `pdf_data` JSONB column to `employees` table
- Adds `manual_data` JSONB column to `employees` table

**How to run:**
```sql
-- Connect to your database and run:
\i database/migrations/004_add_pdf_manual_data_to_employees.sql
```

**Or via psql:**
```bash
psql -d your_database_name -f database/migrations/004_add_pdf_manual_data_to_employees.sql
```

**Verification:**
```sql
-- Check that columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'employees' 
  AND column_name IN ('pdf_data', 'manual_data');
```

---

### Step 2: Migrate Existing Data (OPTIONAL)

**File:** `database/migrations/005_migrate_raw_data_to_employees.sql`

**What it does:**
- Migrates any existing PDF data from `employee_raw_data` table to `employees.pdf_data`
- Migrates any existing manual data from `employee_raw_data` table to `employees.manual_data`

**When to run:**
- Only if you have existing data in `employee_raw_data` table
- Only AFTER Step 1 is complete

**How to check if you need this:**
```sql
-- Check if employee_raw_data table has any data
SELECT source, COUNT(*) 
FROM employee_raw_data 
WHERE source IN ('pdf', 'manual')
GROUP BY source;
```

**How to run:**
```bash
psql -d your_database_name -f database/migrations/005_migrate_raw_data_to_employees.sql
```

**Verification:**
```sql
-- Check migrated data
SELECT 
  COUNT(*) FILTER (WHERE pdf_data IS NOT NULL) as employees_with_pdf,
  COUNT(*) FILTER (WHERE manual_data IS NOT NULL) as employees_with_manual
FROM employees;
```

---

### Step 3: Drop Old Table (OPTIONAL - Future Cleanup)

**File:** `database/migrations/006_drop_employee_raw_data_table.sql`

**What it does:**
- Drops the `employee_raw_data` table
- Drops the `raw_data_source` enum type

**⚠️  WARNING: Only run this AFTER:**
1. ✅ Migration 004 is complete
2. ✅ Migration 005 is complete (if needed)
3. ✅ All code has been deployed
4. ✅ You've tested the application thoroughly
5. ✅ You've verified no code references `employee_raw_data` table

**How to verify before dropping:**
```sql
-- Check if table is still being used
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT employee_id) as unique_employees
FROM employee_raw_data;
```

**How to run (ONLY when ready):**
```bash
psql -d your_database_name -f database/migrations/006_drop_employee_raw_data_table.sql
```

---

## Quick Start (Recommended Order)

### For New Deployments:
```bash
# 1. Add new columns
psql -d your_database -f database/migrations/004_add_pdf_manual_data_to_employees.sql

# 2. Deploy code
# (deploy your updated backend code)

# 3. Test everything works

# 4. Later (optional): Drop old table
# psql -d your_database -f database/migrations/006_drop_employee_raw_data_table.sql
```

### For Existing Deployments with Data:
```bash
# 1. Add new columns
psql -d your_database -f database/migrations/004_add_pdf_manual_data_to_employees.sql

# 2. Migrate existing data
psql -d your_database -f database/migrations/005_migrate_raw_data_to_employees.sql

# 3. Deploy code
# (deploy your updated backend code)

# 4. Test everything works

# 5. Later (optional): Drop old table
# psql -d your_database -f database/migrations/006_drop_employee_raw_data_table.sql
```

---

## Rollback Instructions

### Rollback Step 1 (Remove new columns):
```sql
ALTER TABLE employees DROP COLUMN IF EXISTS pdf_data;
ALTER TABLE employees DROP COLUMN IF EXISTS manual_data;
```

### Rollback Step 2 (Cannot rollback data migration):
- Data migration is one-way
- If you need to rollback, you'll need to restore from backup

### Rollback Step 3 (Recreate old table):
```sql
-- Recreate enum
CREATE TYPE raw_data_source AS ENUM ('pdf', 'manual', 'linkedin', 'github', 'merged');

-- Recreate table
CREATE TABLE employee_raw_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    source raw_data_source NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, source)
);

-- Recreate indexes
CREATE INDEX idx_employee_raw_data_employee_id ON employee_raw_data(employee_id);
CREATE INDEX idx_employee_raw_data_source ON employee_raw_data(source);
CREATE INDEX idx_employee_raw_data_employee_source ON employee_raw_data(employee_id, source);
```

---

## Verification Queries

### Check new columns exist:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'employees' 
  AND column_name IN ('linkedin_data', 'github_data', 'pdf_data', 'manual_data')
ORDER BY column_name;
```

### Check data in new columns:
```sql
SELECT 
  id,
  full_name,
  CASE WHEN linkedin_data IS NOT NULL THEN 'Yes' ELSE 'No' END as has_linkedin,
  CASE WHEN github_data IS NOT NULL THEN 'Yes' ELSE 'No' END as has_github,
  CASE WHEN pdf_data IS NOT NULL THEN 'Yes' ELSE 'No' END as has_pdf,
  CASE WHEN manual_data IS NOT NULL THEN 'Yes' ELSE 'No' END as has_manual
FROM employees
LIMIT 10;
```

### Check old table status:
```sql
-- Check if old table still exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'employee_raw_data'
) as table_exists;

-- If exists, check data count
SELECT source, COUNT(*) 
FROM employee_raw_data 
GROUP BY source;
```

---

## Summary

**Required:**
- ✅ Run migration 004 (adds `pdf_data` and `manual_data` columns)

**Optional:**
- ⚠️ Run migration 005 (only if you have existing data in `employee_raw_data` table)
- ⚠️ Run migration 006 (only after thorough testing and verification)

**After migrations:**
- All raw data is stored in `employees` table columns
- Code reads from and writes to `employees` table
- `employee_raw_data` table is no longer used (but can remain for now)

