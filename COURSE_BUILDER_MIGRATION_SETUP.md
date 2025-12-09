# Course Builder Migration Setup - Enrollment Routing Fix

## Problem
The Coordinator is routing `enroll_employees_career_path` requests to `managementreporting-service` instead of `course-builder-service` because Course Builder's migration file doesn't explicitly declare enrollment capabilities.

## Solution
Created Course Builder migration file with explicit enrollment capabilities and action mapping.

---

## Files Created

### 1. `backend/migrations/course-builder-migration.json`
**Purpose**: Course Builder service migration file with enrollment capabilities

**Key Features**:
- ✅ **Capabilities Array**: Explicitly declares enrollment-related capabilities:
  - `employee learning enrollment`
  - `career-path enrollment`
  - `assign employees to courses`
  - `process enrollment actions`
  - `learning-flow-driven enrollment`
  - `course generation`
  - `personalized learning paths`
  - `career-path-driven learning`
  - `skill-driven learning`
  - `trainer-led learning`

- ✅ **Action Mapping**: Declares `enroll_employees_career_path` action:
  ```json
  {
    "name": "enroll_employees_career_path",
    "target_service": "course-builder-service",
    "description": "Enroll one or more employees into personalized learning flow based on AI career paths..."
  }
  ```

- ✅ **Service Metadata**:
  - Service Name: `course-builder-service`
  - Endpoint: `https://coursebuilderfs-production.up.railway.app/api/fill-content-metrics`
  - Version: `1.0.0`

### 2. `backend/scripts/upload-course-builder-migration.js`
**Purpose**: Script to upload Course Builder migration to Coordinator

**Usage**:
```bash
# Set Course Builder service ID first
export COURSE_BUILDER_SERVICE_ID="<service-id-from-coordinator>"

# Or update the SERVICE_ID constant in the script

# Run upload
node backend/scripts/upload-course-builder-migration.js
```

**Requirements**:
- `COORDINATOR_URL` environment variable (or in `.env`)
- `COURSE_BUILDER_SERVICE_ID` environment variable (or update script)
- `PRIVATE_KEY` (optional, for signed requests)

### 3. `backend/scripts/query-coordinator-services.js`
**Purpose**: Helper script to query Coordinator for registered services and find Course Builder service ID

**Usage**:
```bash
node backend/scripts/query-coordinator-services.js
```

**What it does**:
- Attempts to query Coordinator API for service registry
- Searches for Course Builder service
- Displays service ID if found
- Provides alternative methods if query fails

---

## Steps to Fix Routing

### Step 1: Get Course Builder Service ID

**Option A - Query Coordinator**:
```bash
node backend/scripts/query-coordinator-services.js
```

**Option B - Check Course Builder Registration Logs**:
- When Course Builder first registered with Coordinator, it received a service ID
- Check Course Builder's registration logs or environment variables

**Option C - Check Coordinator Database**:
- If you have access to Coordinator's database, query the services table

**Option D - Contact Course Builder Team**:
- Ask for their Coordinator service ID

### Step 2: Upload Course Builder Migration

```bash
# Set the service ID
export COURSE_BUILDER_SERVICE_ID="<actual-service-id>"

# Upload migration
node backend/scripts/upload-course-builder-migration.js
```

**Expected Output**:
```
✅ Migration upload successful
Service ID: <service-id>
Service Name: course-builder-service
Migration Version: 1.0.0
```

### Step 3: Verify Coordinator Knowledge Graph

After upload, verify that Coordinator's Knowledge Graph shows:
- ✅ `enroll_employees_career_path` action maps to `course-builder-service`
- ✅ Course Builder is the preferred routing target for enrollment requests
- ✅ Capabilities include enrollment-related keywords

**How to Verify**:
- Check Coordinator logs after upload
- Query Coordinator's Knowledge Graph endpoint (if available)
- Test enrollment flow and check Coordinator routing logs

### Step 4: Test Enrollment Flow

1. **Trigger Enrollment from Directory**:
   - Go to Directory frontend
   - Select employees for Career-Path-Driven enrollment
   - Click "Enroll Selected Employees"

2. **Check Coordinator Logs**:
   - Verify request is received
   - Verify routing decision shows `course-builder-service` as target
   - Verify request is forwarded to Course Builder

3. **Check Course Builder Logs**:
   - Verify enrollment request is received
   - Verify learners array is processed correctly
   - Verify response is returned to Coordinator

4. **Check Directory Response**:
   - Verify frontend receives success response
   - Verify `enrollment_batch_id` is returned
   - Verify no routing errors

---

## Migration File Structure

The Course Builder migration follows the same structure as Directory migration:

```json
{
  "service_name": "course-builder-service",
  "serviceName": "course-builder-service",
  "version": "1.0.0",
  "description": "...",
  "endpoint": "https://coursebuilderfs-production.up.railway.app/api/fill-content-metrics",
  "capabilities": [...],
  "schemas": {
    "database": [...],
    "endpoints": [...],
    "actions": [...],
    "events": [],
    "env": [...]
  }
}
```

---

## Important Notes

1. **Service ID Required**: You MUST have Course Builder's service ID from Coordinator before uploading. The upload script will fail if service ID is not set.

2. **Migration Version**: The migration file uses version `1.0.0`. If Course Builder already has a migration, you may need to increment the version.

3. **Capabilities Matching**: Coordinator's AI router uses capabilities to match actions. The explicit enrollment capabilities ensure proper routing.

4. **Action Name**: The action name `enroll_employees_career_path` must match exactly what Directory sends in the payload.

5. **Directory Migration**: Directory's migration does NOT need updates - Directory is the requester, not the target service.

---

## Troubleshooting

### Error: "Service ID not found"
- **Cause**: Course Builder service ID is incorrect or service not registered
- **Fix**: Verify service ID, or register Course Builder first

### Error: "Migration upload failed: 400"
- **Cause**: Migration file format is invalid
- **Fix**: Validate JSON syntax, check required fields

### Error: "Migration upload failed: 401/403"
- **Cause**: Signature validation failed or missing PRIVATE_KEY
- **Fix**: Ensure PRIVATE_KEY is set correctly, or check Coordinator signature requirements

### Routing Still Goes to Wrong Service
- **Cause**: Coordinator Knowledge Graph not updated, or capabilities don't match
- **Fix**: 
  1. Verify migration upload was successful
  2. Check Coordinator logs for Knowledge Graph update
  3. Verify capabilities include enrollment keywords
  4. Wait a few minutes for Knowledge Graph to refresh

---

## Next Steps After Fix

1. ✅ Upload Course Builder migration
2. ✅ Verify Knowledge Graph update
3. ✅ Test enrollment flow end-to-end
4. ✅ Monitor Coordinator routing logs
5. ✅ Confirm Course Builder receives enrollment requests
6. ✅ Verify successful enrollment responses

---

## Files Summary

| File | Purpose | Status |
|------|---------|--------|
| `backend/migrations/course-builder-migration.json` | Course Builder migration with enrollment capabilities | ✅ Created |
| `backend/scripts/upload-course-builder-migration.js` | Upload script for Course Builder migration | ✅ Created |
| `backend/scripts/query-coordinator-services.js` | Helper to find service IDs | ✅ Created |

---

**Created**: $(date)
**Purpose**: Fix Coordinator routing for Career-Path-Driven enrollment


