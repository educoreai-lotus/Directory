# Skills Engine Raw Data Format - Compatibility Guide

## Skills Engine Payload Format

The Skills Engine accepts a `raw_data` object and extracts data from whatever keys are present. As long as the overall request structure matches, Skills Engine will process all sources.

## Expected Skills Engine Payload Format

```json
{
  "user_id": "uuid",
  "user_name": "string",
  "company_id": "uuid",
  "company_name": "string",
  "employee_type": "regular" | "trainer",
  "path_career": "string" | null,
  "preferred_language": "string",
  "raw_data": {
    "github": { ... },
    "linkedin": { ... },
    "pdf": { ... },
    "manual": { ... }
  }
}
```

## What We Store and Send

### Storage (employees table)
We store **4 sources** in separate JSONB columns:
- `employees.linkedin_data` - LinkedIn OAuth data
- `employees.github_data` - GitHub OAuth data
- `employees.pdf_data` - Extracted CV/PDF data
- `employees.manual_data` - Manually entered form data

### Transmission (to Skills Engine)
We send **ALL 4 sources** to Skills Engine:
- `raw_data.linkedin` - From `employees.linkedin_data`
- `raw_data.github` - From `employees.github_data`
- `raw_data.pdf` - From `employees.pdf_data`
- `raw_data.manual` - From `employees.manual_data`

**Why?** Skills Engine extracts data from the `raw_data` JSON object regardless of which keys are present. It doesn't matter where the data comes from as long as the overall request structure matches.

## Code Location

**File:** `backend/src/presentation/EmployeeProfileApprovalController.js`

**Lines:** 146-170

```javascript
// Skills Engine extracts data from raw_data JSON - accepts any keys
const rawData = {
  linkedin: linkedinData || {},
  github: githubData || {},
  pdf: pdfData || {},
  manual: manualData || {}
};
```

## Important Notes

1. **Request Structure**: The overall payload structure (user_id, user_name, company_id, etc.) must match exactly
2. **Raw Data Flexibility**: Skills Engine processes whatever keys are in `raw_data` - it's flexible
3. **Coordinator Compatibility**: As long as the envelope structure matches, Coordinator will forward the payload correctly

## Verification

To verify the payload format:
1. Check backend logs: `[EmployeeProfileApprovalController] Payload:`
2. Verify `raw_data` contains all available sources (linkedin, github, pdf, manual)
3. Check Coordinator logs to ensure payload is forwarded correctly
4. Check Skills Engine logs to verify it processes all sources

## Benefits

- **More Data**: Skills Engine gets all available enrichment data
- **Better Skills Detection**: PDF and manual data can improve skills inference
- **Consistent Storage**: All raw data stored the same way (in employees table)
- **Future-Proof**: Easy to add more sources in the future

