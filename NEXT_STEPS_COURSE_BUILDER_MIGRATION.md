# Next Steps: Course Builder Migration Upload

## Current Status

✅ **Course Builder migration file created** with enrollment capabilities  
✅ **Upload script created** and ready to use  
✅ **Helper scripts created** for service ID discovery  

⚠️ **Blocked**: Need Course Builder service ID from Coordinator to proceed

---

## The Problem

The Coordinator is routing `enroll_employees_career_path` requests to `managementreporting-service` instead of `course-builder-service` because Course Builder's migration file doesn't explicitly declare enrollment capabilities.

## The Solution

We've created a Course Builder migration file (`backend/migrations/course-builder-migration.json`) that:
- ✅ Declares 10 enrollment-related capabilities
- ✅ Maps the `enroll_employees_career_path` action to Course Builder
- ✅ Follows the same structure as Directory's migration

**However**, we cannot upload it without Course Builder's service ID from Coordinator.

---

## How to Get Course Builder Service ID

### Option 1: Check Course Builder Registration Logs (Recommended)
When Course Builder first registered with Coordinator, it received a service ID. Check:
- Course Builder's Railway logs from initial registration
- Course Builder's environment variables (`COORDINATOR_SERVICE_ID` or similar)
- Course Builder's registration script output

### Option 2: Query Coordinator Database
If you have access to Coordinator's database:
```sql
SELECT id, service_name, endpoint 
FROM services 
WHERE service_name = 'course-builder-service' 
   OR service_name LIKE '%course%builder%';
```

### Option 3: Contact Course Builder Team
Ask the Course Builder team for their Coordinator service ID. They should have it from when they registered.

### Option 4: Check Coordinator Admin Dashboard
If Coordinator has an admin interface, check the service registry there.

---

## Once You Have the Service ID

### Step 1: Set Environment Variable
```bash
export COURSE_BUILDER_SERVICE_ID="<actual-service-id>"
```

Or add to `.env`:
```
COURSE_BUILDER_SERVICE_ID=<actual-service-id>
```

### Step 2: Upload Migration
```bash
node backend/scripts/upload-course-builder-migration.js
```

**Expected Output:**
```
✅ Migration upload successful
Service ID: <service-id>
Service Name: course-builder-service
Migration Version: 1.0.0
```

### Step 3: Verify Knowledge Graph
After upload, verify Coordinator's Knowledge Graph shows:
- ✅ `enroll_employees_career_path` action maps to `course-builder-service`
- ✅ Course Builder capabilities include enrollment keywords
- ✅ Routing preference updated

**How to verify:**
- Check Coordinator logs after upload
- Test enrollment flow and check routing logs
- Verify Course Builder receives requests

### Step 4: Test Enrollment Flow
1. Go to Directory frontend
2. Select employees for Career-Path-Driven enrollment
3. Click "Enroll Selected Employees"
4. Check Coordinator logs - should route to `course-builder-service`
5. Check Course Builder logs - should receive enrollment request
6. Verify success response with `enrollment_batch_id`

---

## Migration File Details

**Location:** `backend/migrations/course-builder-migration.json`

**Key Features:**
- **Service Name:** `course-builder-service`
- **Endpoint:** `https://coursebuilderfs-production.up.railway.app/api/fill-content-metrics`
- **Version:** `1.0.0`

**Capabilities (10 total):**
1. `employee learning enrollment`
2. `career-path enrollment`
3. `assign employees to courses`
4. `process enrollment actions`
5. `learning-flow-driven enrollment`
6. `course generation`
7. `personalized learning paths`
8. `career-path-driven learning`
9. `skill-driven learning`
10. `trainer-led learning`

**Action Mapping:**
```json
{
  "name": "enroll_employees_career_path",
  "target_service": "course-builder-service",
  "description": "Enroll one or more employees into personalized learning flow based on AI career paths..."
}
```

---

## Files Created

| File | Purpose | Status |
|------|---------|--------|
| `backend/migrations/course-builder-migration.json` | Course Builder migration with enrollment capabilities | ✅ Ready |
| `backend/scripts/upload-course-builder-migration.js` | Upload script | ✅ Ready |
| `backend/scripts/get-course-builder-service-id.js` | Attempt to get service ID via registration | ⚠️ Needs manual service ID |
| `backend/scripts/query-coordinator-services.js` | Query Coordinator for services | ⚠️ Coordinator doesn't expose list endpoint |
| `COURSE_BUILDER_MIGRATION_SETUP.md` | Full documentation | ✅ Complete |
| `NEXT_STEPS_COURSE_BUILDER_MIGRATION.md` | This file | ✅ Complete |

---

## Troubleshooting

### Error: "Service ID not found"
- **Cause:** Service ID is incorrect or Course Builder not registered
- **Fix:** Verify service ID, or register Course Builder first

### Error: "Migration upload failed: 400"
- **Cause:** Migration file format invalid
- **Fix:** Validate JSON syntax, check required fields

### Error: "Migration upload failed: 401/403"
- **Cause:** Signature validation failed
- **Fix:** Ensure `PRIVATE_KEY` is set correctly

### Routing Still Goes to Wrong Service
- **Cause:** Knowledge Graph not updated yet
- **Fix:** 
  1. Wait a few minutes for Knowledge Graph refresh
  2. Verify migration upload was successful
  3. Check Coordinator logs for Knowledge Graph update
  4. Verify capabilities match enrollment keywords

---

## Summary

**What's Done:**
- ✅ Migration file created with enrollment capabilities
- ✅ Upload scripts created
- ✅ Documentation complete

**What's Needed:**
- ⚠️ Course Builder service ID from Coordinator
- ⚠️ Upload migration to Coordinator
- ⚠️ Verify Knowledge Graph update
- ⚠️ Test enrollment flow

**Next Action:**
Get Course Builder service ID using one of the methods above, then run the upload script.

---

**Created:** $(date)  
**Status:** Ready for upload once service ID is obtained


