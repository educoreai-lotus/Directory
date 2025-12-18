# Pre-Migration Safety Check Report

## ⚠️ CRITICAL: Migration Order Matters

### Migration 004 MUST Run BEFORE Code Deployment

**Why:** The new code (`updatePdfData()`, `updateManualData()`, `hasValidEnrichmentSource()`) will **FAIL** if `pdf_data` and `manual_data` columns don't exist yet.

---

## ✅ Code Analysis Results

### 1. **No Active References to Old Table**
- ✅ **No imports**: `EmployeeRawDataRepository` is NOT imported anywhere
- ✅ **No SQL queries**: No direct SQL references to `employee_raw_data` table (only in the unused repository file)
- ✅ **All code updated**: All code now uses `EmployeeRepository` methods

### 2. **New Code Dependencies**
These methods will **FAIL** if columns don't exist:

| Method | File | Will Fail If Column Missing |
|--------|------|----------------------------|
| `updatePdfData()` | `EmployeeRepository.js:726` | ✅ Yes - queries `pdf_data` column |
| `updateManualData()` | `EmployeeRepository.js:749` | ✅ Yes - queries `manual_data` column |
| `hasValidEnrichmentSource()` | `EmployeeRepository.js:772` | ✅ Yes - queries `pdf_data` column |

**Error that will occur:**
```
ERROR: column "pdf_data" does not exist
ERROR: column "manual_data" does not exist
```

### 3. **API Endpoints Status**
All endpoints are updated and will work **AFTER** migration:

| Endpoint | Status | Risk Level |
|----------|--------|------------|
| `POST /api/v1/employees/:id/upload-cv` | ✅ Updated | ⚠️ **Will fail if columns don't exist** |
| `POST /api/v1/employees/:id/manual-data` | ✅ Updated | ⚠️ **Will fail if columns don't exist** |
| `POST /api/v1/employees/:employeeId/enrich` | ✅ Updated | ✅ Safe (reads columns, handles NULL) |
| `GET /api/v1/employees/:employeeId/enrichment-status` | ✅ Updated | ✅ Safe (reads columns, handles NULL) |
| `POST /api/v1/companies/:id/profile-approvals/:approvalId/approve` | ✅ Updated | ✅ Safe (reads columns, handles NULL) |

### 4. **Frontend Status**
- ✅ **No direct database access**: Frontend only uses API endpoints
- ✅ **No breaking changes**: All API calls remain the same
- ✅ **UI/UX unchanged**: No visual changes to existing features

---

## ⚠️ Critical Migration Order

### ✅ CORRECT Order:
1. **Run Migration 004** (adds columns) ← **MUST BE FIRST**
2. **Deploy updated code** ← **MUST BE SECOND**
3. Test everything
4. (Optional) Run Migration 005 (migrate existing data)
5. (Optional) Run Migration 006 (drop old table)

### ❌ WRONG Order (Will Break):
1. Deploy code first → **WILL FAIL** (columns don't exist)
2. Run migration → Too late, errors already occurred

---

## Migration Safety Analysis

### Migration 004: ✅ **SAFE** (but must run first)

**What it does:**
```sql
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS pdf_data JSONB;

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS manual_data JSONB;
```

**Safety features:**
- ✅ Uses `IF NOT EXISTS` - won't fail if columns already exist
- ✅ Only ADDS columns - doesn't remove or modify existing ones
- ✅ No data loss - doesn't touch existing data
- ✅ No constraints - columns are nullable
- ✅ No indexes - no performance impact

**Impact on existing code:**
- ✅ **No breaking changes**: Existing columns (`linkedin_data`, `github_data`) unchanged
- ✅ **Backward compatible**: New columns default to NULL
- ✅ **Existing queries work**: All existing SELECT/UPDATE queries continue to work

---

## What Will Break If Migration Not Run First

### Scenario: Code deployed before migration

**Error examples:**
```
[PDFUploadController] Error: column "pdf_data" does not exist
[SaveManualDataUseCase] Error: column "manual_data" does not exist
[ManualDataController] Error: column "pdf_data" does not exist
```

**Affected endpoints:**
- ❌ `POST /api/v1/employees/:id/upload-cv` → 500 error
- ❌ `POST /api/v1/employees/:id/manual-data` → 500 error

**Not affected (safe):**
- ✅ `POST /api/v1/employees/:employeeId/enrich` → Works (reads columns, handles NULL)
- ✅ `GET /api/v1/employees/:employeeId/enrichment-status` → Works (reads columns, handles NULL)
- ✅ All other endpoints → Work fine

---

## Verification Checklist

Before running migration, verify:

- [x] ✅ No code imports `EmployeeRawDataRepository`
- [x] ✅ All code uses `EmployeeRepository` methods
- [x] ✅ API endpoints are updated
- [x] ✅ Frontend uses API endpoints (not direct DB)
- [x] ✅ Migration uses `IF NOT EXISTS` (safe to re-run)
- [ ] ⚠️ **Check if you have existing data in `employee_raw_data` table**

**Check for existing data:**
```sql
SELECT source, COUNT(*) 
FROM employee_raw_data 
WHERE source IN ('pdf', 'manual')
GROUP BY source;
```

If you have data, you'll need Migration 005 later.

---

## Recommended Action Plan

### Step 1: Run Migration 004 (REQUIRED)
```bash
psql -d your_database_name -f database/migrations/004_add_pdf_manual_data_to_employees.sql
```

**Verify it worked:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'employees' 
  AND column_name IN ('pdf_data', 'manual_data');
```

### Step 2: Deploy Code
Deploy your updated backend code (it will now use the new columns)

### Step 3: Test Critical Endpoints
- ✅ Test PDF upload: `POST /api/v1/employees/:id/upload-cv`
- ✅ Test manual data: `POST /api/v1/employees/:id/manual-data`
- ✅ Test enrichment: `POST /api/v1/employees/:employeeId/enrich`

### Step 4: (Optional) Migrate Existing Data
Only if you have data in `employee_raw_data` table:
```bash
psql -d your_database_name -f database/migrations/005_migrate_raw_data_to_employees.sql
```

### Step 5: (Optional) Drop Old Table
Only after thorough testing:
```bash
psql -d your_database_name -f database/migrations/006_drop_employee_raw_data_table.sql
```

---

## Summary

**✅ Migration 004 is SAFE to run:**
- Only adds new columns
- Doesn't modify existing data
- Doesn't break existing code
- Uses `IF NOT EXISTS` for safety

**⚠️ CRITICAL REQUIREMENT:**
- **Migration MUST run BEFORE code deployment**
- If code is deployed first, PDF upload and manual data endpoints will fail
- All other endpoints will continue to work

**✅ No Breaking Changes:**
- Existing API endpoints unchanged
- Frontend unchanged
- Existing data unchanged
- Only new functionality added
