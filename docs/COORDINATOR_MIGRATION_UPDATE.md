# Coordinator Migration Update - Changes Summary

## Changes Made to Coordinator Migration JSON

### 1. ✅ Updated `employees` Table Schema

**Added 2 new columns:**
- `pdf_data`: "jsonb" - Stores extracted raw data from uploaded PDF CV
- `manual_data`: "jsonb" - Stores manually entered profile data

**Updated schema:**
```json
{
  "name": "employees",
  "schema": {
    // ... existing fields ...
    "linkedin_data": "jsonb",
    "github_data": "jsonb",
    "pdf_data": "jsonb",      // ← NEW
    "manual_data": "jsonb",   // ← NEW
    // ... rest of fields ...
  }
}
```

### 2. ✅ Removed `employee_raw_data` Table

**Removed from tables array:**
- The `employee_raw_data` table entry has been removed
- All raw data is now stored in `employees` table columns

**Reason:**
- We consolidated all raw data sources into the `employees` table
- No longer need a separate table for raw data
- Simpler schema, easier queries

---

## Updated File

**File:** `coordinator_migration_final.json`

**Changes:**
1. ✅ Added `pdf_data` and `manual_data` to `employees` table schema
2. ✅ Removed `employee_raw_data` table entry

---

## How to Update Coordinator Database

1. **Copy the updated JSON** from `coordinator_migration_final.json`
2. **Update your Coordinator database migration** with the new JSON
3. **Verify** that the `employees` table schema includes:
   - `linkedin_data` (existing)
   - `github_data` (existing)
   - `pdf_data` (new)
   - `manual_data` (new)
4. **Verify** that `employee_raw_data` table is removed

---

## Verification

After updating Coordinator, verify:

```sql
-- Check employees table has all 4 raw data columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'employees' 
  AND column_name IN ('linkedin_data', 'github_data', 'pdf_data', 'manual_data')
ORDER BY column_name;
```

Expected: 4 rows (all columns present)

