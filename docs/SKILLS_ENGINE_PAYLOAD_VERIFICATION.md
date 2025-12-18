# Skills Engine Payload Verification

## Expected Structure (from Skills Engine)

```json
{
  "user_id": "550e8000-e29b-41d4-a716-446655440000",
  "user_name": "Alice ",
  "company_id": "company_001",
  "company_name": "Acme Corp",
  "employee_type": "trainer",
  "path_career": "Full Stack Developer",
  "preferred_language": "en",
  "raw_data": {
    "github": { ... },
    "linkedin": { ... }
  }
}
```

## What We're Currently Sending

**Location:** `backend/src/infrastructure/MicroserviceClient.js` → `getEmployeeSkills()`

```javascript
const payload = {
  user_id: userId,                    // ✅ UUID string
  user_name: userName,                 // ✅ String
  company_id: companyId,               // ✅ UUID string (toString())
  company_name: companyName,           // ✅ String
  employee_type: employeeType,         // ✅ "regular" or "trainer"
  path_career: pathCareer || null,     // ⚠️ Can be null
  preferred_language: preferredLanguage || 'en', // ✅ String, defaults to 'en'
  raw_data: rawData || {}              // ✅ Object with github/linkedin
};
```

**Raw Data Structure:**
```javascript
const rawData = {
  linkedin: linkedinData || {},  // ✅ Object
  github: githubData || {}       // ✅ Object
};
```

## Field-by-Field Comparison

| Field | Expected | Our Code | Status |
|-------|----------|----------|--------|
| `user_id` | UUID string | `userId` (UUID) | ✅ Match |
| `user_name` | String | `userName` (string) | ✅ Match |
| `company_id` | String | `companyId.toString()` | ✅ Match |
| `company_name` | String | `companyName` (string) | ✅ Match |
| `employee_type` | "regular" or "trainer" | Mapped from roleType | ✅ Match |
| `path_career` | String or null | `pathCareer || null` | ✅ Match |
| `preferred_language` | String (e.g., "en") | `preferredLanguage || 'en'` | ✅ Match |
| `raw_data` | Object | `rawData` object | ✅ Match |
| `raw_data.github` | Object | `githubData` object | ✅ Match |
| `raw_data.linkedin` | Object | `linkedinData` object | ✅ Match |

## Verification Result

✅ **All fields match correctly!**

The payload structure we're sending matches exactly what Skills Engine expects.

## Notes

1. **Field Order**: JSON object field order doesn't matter, but our order matches the example.

2. **Null Values**: 
   - `path_career` can be `null` if employee has no target role - this is acceptable
   - `preferred_language` defaults to `'en'` if not set - this is acceptable

3. **Raw Data Structure**:
   - We send `{ linkedin: {...}, github: {...} }`
   - Skills Engine example shows `{ github: {...}, linkedin: {...} }`
   - Order doesn't matter in JSON objects ✅

4. **Coordinator Envelope**:
   - We wrap the payload in a Coordinator envelope with `action` and `target_service`
   - The Coordinator should strip these before forwarding to Skills Engine
   - Skills Engine should only receive the payload fields above

## Testing

To verify the exact payload being sent:

1. **Check Backend Logs** (Railway):
   ```
   [EmployeeProfileApprovalController] Payload: { ... }
   ```

2. **Check Coordinator Logs**:
   - Look for the payload being forwarded to Skills Engine
   - Verify `action` and `target_service` are removed

3. **Use Test Script**:
   ```bash
   node backend/scripts/test-skills-engine-request.js
   ```

4. **Use Postman**:
   - Import `backend/scripts/postman-skills-engine-template.json`
   - Send request and verify payload structure

## Potential Issues

1. **Coordinator Adding Extra Fields**: If Coordinator is adding `action` or `target_service` to the payload that Skills Engine receives, those should be removed by Coordinator.

2. **Null vs Undefined**: We use `null` for `path_career` when not set. Skills Engine should handle this.

3. **Empty Raw Data**: If both `linkedin` and `github` are empty objects, we still send `raw_data: { linkedin: {}, github: {} }`. This should be fine.

