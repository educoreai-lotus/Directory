# Skills Engine Duplicate Request Fix

## Problem
When an employee profile was approved, a request was sent to Skills Engine via Coordinator. However, when the employee logged in and viewed their profile, **another request was sent to Skills Engine**, causing duplicate processing and unnecessary load.

## Solution
1. **Store Skills Engine Response**: When a profile is approved, the Skills Engine response is now stored in the `employee_skills` table.
2. **Fetch from Database**: When viewing the profile, skills are fetched from the database instead of calling Skills Engine again.
3. **Fallback**: If no stored skills are found (shouldn't happen normally), the system will call Skills Engine as a fallback and store the result.

## Database Changes

### New Table: `employee_skills`
```sql
CREATE TABLE employee_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    competencies JSONB NOT NULL,
    relevance_score NUMERIC DEFAULT 0,
    gap JSONB,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id)
);
```

**Migration**: Run `database/migrations/003_add_employee_skills_table.sql`

## Code Changes

### 1. New Repository: `EmployeeSkillsRepository`
- `saveOrUpdate(employeeId, skillsData)` - Store/update skills data
- `findByEmployeeId(employeeId)` - Retrieve stored skills
- `deleteByEmployeeId(employeeId)` - Delete skills (cascade on employee delete)

### 2. Updated: `EmployeeProfileApprovalController`
- After approval, stores Skills Engine response in database
- Non-blocking: If storage fails, approval still succeeds (logged as warning)

### 3. Updated: `GetEmployeeSkillsUseCase`
- **First**: Checks database for stored skills (fast, no external call)
- **Fallback**: If not found, calls Skills Engine and stores result
- Logs indicate which path was taken

## Testing Tools

### 1. Test Script: `backend/scripts/test-skills-engine-request.js`

**Usage:**
```bash
node backend/scripts/test-skills-engine-request.js
```

**What it does:**
- Shows exact payload sent to Skills Engine
- Displays full response from Skills Engine
- Generates Postman-ready template with signature

**Environment Variables:**
- `COORDINATOR_URL` (default: https://coordinator-production-6004.up.railway.app)
- `PRIVATE_KEY` (required for signature)
- `SERVICE_NAME` (default: directory-service)

**Before running:**
1. Update `employeeData` object in the script with real employee/company UUIDs
2. Ensure `PRIVATE_KEY` is set or file exists at `backend/src/security/directory-private-key.pem`

### 2. Postman Template: `backend/scripts/postman-skills-engine-template.json`

**Import to Postman:**
1. Open Postman
2. Click "Import"
3. Select `backend/scripts/postman-skills-engine-template.json`
4. Update collection variables:
   - `employee_uuid`: Employee UUID from database
   - `employee_name`: Employee full name
   - `company_uuid`: Company UUID from database
   - `company_name`: Company name
   - `employee_type`: 'regular' or 'trainer'
   - `target_role`: Target role in company
   - `preferred_language`: Language code (e.g., 'en', 'ar')
   - `signature`: Generate using `generate-signature-for-request.js` script

**Generate Signature:**
```bash
# Update requestBody in generate-signature-for-request.js with your data
node backend/scripts/generate-signature-for-request.js
# Copy the signature to Postman variable
```

## Request Payload Structure

**Sent to Coordinator:**
```json
{
  "requester_service": "directory-service",
  "payload": {
    "action": "get_employee_skills_for_directory_profile",
    "target_service": "skills-engine-service",
    "user_id": "employee-uuid",
    "user_name": "Employee Name",
    "company_id": "company-uuid",
    "company_name": "Company Name",
    "employee_type": "regular",  // or "trainer"
    "path_career": "Target Role",
    "preferred_language": "en",
    "raw_data": {
      "linkedin": {},
      "github": {}
    }
  },
  "response": {
    "user_id": null,
    "competencies": [],
    "relevance_score": 0
  }
}
```

## Response Structure

**From Skills Engine (via Coordinator):**
```json
{
  "success": true,
  "data": {
    "response": {
      "user_id": "employee-uuid",
      "competencies": [
        {
          "name": "Skill Name",
          "category": "Category",
          "verified": true,  // or false
          "children": []  // Nested skills
        }
      ],
      "relevance_score": 85,
      "gap": {}  // Missing skills
    }
  }
}
```

## Verification

After deploying:
1. Approve an employee profile
2. Check logs: Should see "✅ Skills data stored in database"
3. Employee logs in and views profile
4. Check logs: Should see "✅ Found stored skills in database, returning cached data"
5. **No duplicate Skills Engine request should occur**

## Notes

- Skills are stored when profile is approved (one-time processing)
- Skills are fetched from database when viewing profile (fast, no external call)
- If Skills Engine response format changes, update `EmployeeSkillsRepository.saveOrUpdate()` accordingly
- Skills are automatically deleted when employee is deleted (CASCADE)

