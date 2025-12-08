# Course Builder Migration Update Instructions

## Problem
Coordinator is routing `enroll_employees_career_path` requests to `managementreporting-service` instead of `course-builder-service` because Course Builder's migration file doesn't explicitly declare enrollment capabilities.

## Solution
Course Builder needs to update its migration file with enrollment capabilities and action mapping, then re-upload it to Coordinator.

---

## Migration File Location

**File:** `backend/migrations/course-builder-migration.json`

This file has been prepared in the Directory repository for reference, but **Course Builder must use its own migration file** and upload it from the Course Builder service.

---

## Required Changes to Course Builder Migration

### 1. Add Enrollment Capabilities

Add these capabilities to the `capabilities` array in Course Builder's migration file:

```json
"capabilities": [
  "employee learning enrollment",
  "career-path enrollment",
  "assign employees to courses",
  "process enrollment actions",
  // ... any other existing capabilities
]
```

### 2. Add Action Mapping

Add the `enroll_employees_career_path` action to the `actions` object:

```json
"actions": {
  "enroll_employees_career_path": {
    "description": "Enroll employees into a personalized learning flow using career-path logic"
  }
}
```

**Note:** If Course Builder's migration uses an array format for actions (like Directory does), convert it to object format for this action, or add it in the format that Coordinator expects.

---

## Complete Migration File Structure

The migration file should include:

```json
{
  "service_name": "course-builder-service",
  "serviceName": "course-builder-service",
  "version": "1.0.0",  // Increment version if updating existing migration
  "description": "Manages course creation, employee enrollment, learning flows...",
  "endpoint": "https://coursebuilderfs-production.up.railway.app/api/fill-content-metrics",
  "capabilities": [
    "employee learning enrollment",
    "career-path enrollment",
    "assign employees to courses",
    "process enrollment actions",
    // ... other capabilities
  ],
  "schemas": {
    "database": [...],
    "endpoints": [...],
    "actions": {
      "enroll_employees_career_path": {
        "description": "Enroll employees into a personalized learning flow using career-path logic"
      }
    },
    "events": [],
    "env": [...]
  }
}
```

---

## Steps for Course Builder Team

### Step 1: Update Migration File
1. Open Course Builder's migration file
2. Add the 4 enrollment capabilities listed above
3. Add the `enroll_employees_career_path` action mapping
4. Increment the version number (e.g., from `1.0.0` to `1.0.1`)

### Step 2: Upload Migration to Coordinator
Use Course Builder's existing upload script or Coordinator client:

```bash
# Example (adjust to Course Builder's actual script)
node scripts/upload-migration.js
```

Or use Coordinator's API directly:
```bash
POST https://coordinator-production-e0a0.up.railway.app/register/<service-id>/migration
Content-Type: multipart/form-data
Field name: migration
File: course-builder-migration.json
```

### Step 3: Verify Knowledge Graph
After upload, verify in Coordinator logs that:
- ✅ `enroll_employees_career_path` action maps to `course-builder-service`
- ✅ Course Builder capabilities include enrollment keywords
- ✅ Routing preference updated

### Step 4: Test Enrollment Flow
1. Directory sends enrollment request to Coordinator
2. Coordinator routes to `course-builder-service` (not `managementreporting-service`)
3. Course Builder receives and processes enrollment
4. Success response returned to Directory

---

## Reference Migration File

A complete reference migration file has been created at:
- `backend/migrations/course-builder-migration.json` (in Directory repository)

**This is for reference only.** Course Builder should use its own migration file structure and update it accordingly.

---

## Important Notes

1. **Directory Does NOT Upload Course Builder Migration**
   - Directory only sends POST requests to Coordinator
   - Course Builder is responsible for uploading its own migration
   - Directory's envelope format is already correct

2. **Version Increment**
   - If Course Builder already has a migration, increment the version
   - Coordinator uses version to track migration updates

3. **Action Format**
   - The action format may vary based on Coordinator's expectations
   - Verify with Coordinator documentation if object vs array format is required

4. **Capabilities Matching**
   - Coordinator's AI router uses capabilities to match actions
   - The explicit enrollment capabilities ensure proper routing

---

## Verification Checklist

After Course Builder uploads the migration:

- [ ] Migration file includes all 4 enrollment capabilities
- [ ] Migration file includes `enroll_employees_career_path` action
- [ ] Migration uploaded successfully to Coordinator
- [ ] Coordinator Knowledge Graph updated
- [ ] Test enrollment request routes to Course Builder (not Management Reporting)
- [ ] Course Builder receives enrollment requests correctly
- [ ] Enrollment flow completes successfully end-to-end

---

**Created:** For Course Builder team reference  
**Status:** Ready for Course Builder to implement and upload


