# Raw Data Consolidation Summary

## Overview
All raw data sources are now stored in the `employees` table instead of a separate `employee_raw_data` table. This consolidates all employee data in one place for easier fetching and management.

## Database Changes

### Migration: `004_add_pdf_manual_data_to_employees.sql`
- Added `pdf_data` JSONB column to `employees` table
- Added `manual_data` JSONB column to `employees` table
- All 4 raw data sources now in `employees` table:
  - `linkedin_data` (existing)
  - `github_data` (existing)
  - `pdf_data` (new)
  - `manual_data` (new)

### Schema Update: `database/schema.sql`
- Updated to include `pdf_data` and `manual_data` columns

## Code Changes

### Backend - Infrastructure Layer

#### `EmployeeRepository.js`
- ✅ Added `updatePdfData(employeeId, pdfData, client)` method
- ✅ Added `updateManualData(employeeId, manualData, client)` method
- ✅ Added `hasValidEnrichmentSource(employeeId, client)` method (checks `github_data` OR `pdf_data`)

### Backend - Application Layer

#### `UploadCVUseCase.js`
- ✅ Removed dependency on `EmployeeRawDataRepository`
- ✅ Now saves PDF data to `employees.pdf_data` column via `EmployeeRepository.updatePdfData()`

#### `SaveManualDataUseCase.js`
- ✅ Removed dependency on `EmployeeRawDataRepository`
- ✅ Now saves manual data to `employees.manual_data` column via `EmployeeRepository.updateManualData()`
- ✅ Uses `EmployeeRepository.hasValidEnrichmentSource()` for validation

#### `MergeRawDataUseCase.js`
- ✅ Removed dependency on `EmployeeRawDataRepository`
- ✅ Now reads directly from `employees` table columns:
  - `employees.linkedin_data`
  - `employees.github_data`
  - `employees.pdf_data`
  - `employees.manual_data`
- ✅ Merges all 4 sources on-the-fly (no longer saves merged data to database)

#### `EnrichProfileUseCase.js`
- ✅ Updated `isReadyForEnrichment()` to check `employees` table columns directly:
  - Checks `github_data` (valid source)
  - Checks `pdf_data` (valid source)
  - Checks `manual_data` (valid source if has content)
  - LinkedIn is NOT a valid enrichment source

### Backend - Presentation Layer

#### `EmployeeProfileApprovalController.js`
- ✅ Updated Skills Engine payload to include all 4 sources:
  ```javascript
  rawData: {
    linkedin: linkedinData || {},
    github: githubData || {},
    pdf: pdfData || {},
    manual: manualData || {}
  }
  ```
- ✅ Reads all 4 sources from `employees` table columns

#### `ManualDataController.js`
- ✅ Updated to use `EmployeeRepository.hasValidEnrichmentSource()` instead of `EmployeeRawDataRepository`

#### `OAuthController.js`
- ✅ Removed dual-write code that saved to `employee_raw_data` table
- ✅ OAuth data is already saved to `employees.linkedin_data` and `employees.github_data` via existing methods

## Skills Engine Payload

The Skills Engine now receives all 4 raw data sources:

```javascript
{
  user_id: "...",
  user_name: "...",
  company_id: "...",
  company_name: "...",
  employee_type: "...",
  path_career: "...",
  preferred_language: "en",
  raw_data: {
    linkedin: { ... },  // From employees.linkedin_data
    github: { ... },    // From employees.github_data
    pdf: { ... },       // From employees.pdf_data
    manual: { ... }    // From employees.manual_data
  }
}
```

## Coordinator Migration Update Required

The Coordinator migration JSON needs to be updated to reflect the new `employees` table schema:

### Current Schema (in Coordinator):
```json
{
  "name": "employees",
  "schema": {
    "linkedin_data": "jsonb",
    "github_data": "jsonb"
    // Missing: pdf_data, manual_data
  }
}
```

### Updated Schema (to be added):
```json
{
  "name": "employees",
  "schema": {
    "linkedin_data": "jsonb",
    "github_data": "jsonb",
    "pdf_data": "jsonb",      // NEW
    "manual_data": "jsonb"   // NEW
  }
}
```

## Deprecated

- ❌ `employee_raw_data` table (no longer used)
- ❌ `EmployeeRawDataRepository` class (still exists but not used)
- ❌ Migration `002_add_employee_raw_data.sql` (can be rolled back if needed)

## Benefits

1. **Single Source of Truth**: All employee data (including raw enrichment data) is in one table
2. **Easier Queries**: No joins needed to get all employee data
3. **Simpler Code**: No need to check multiple tables
4. **Better Performance**: Fewer database queries
5. **Consistent Data**: All raw data sources stored the same way (JSONB columns)

## Migration Steps

1. ✅ Run migration `004_add_pdf_manual_data_to_employees.sql`
2. ✅ Deploy updated backend code
3. ⏳ Update Coordinator migration JSON (waiting for user to provide file)
4. ⏳ Optional: Migrate existing data from `employee_raw_data` table to `employees` table (if any exists)
5. ⏳ Optional: Drop `employee_raw_data` table after migration (future cleanup)

## Testing Checklist

- [ ] PDF upload saves to `employees.pdf_data`
- [ ] Manual form saves to `employees.manual_data`
- [ ] LinkedIn OAuth saves to `employees.linkedin_data`
- [ ] GitHub OAuth saves to `employees.github_data`
- [ ] Skills Engine receives all 4 sources in payload
- [ ] Enrichment works with any combination of sources
- [ ] Validation logic works correctly (manual form optional if GitHub/PDF exists)

