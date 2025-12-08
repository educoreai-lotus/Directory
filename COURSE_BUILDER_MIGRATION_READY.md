# Course Builder Migration - Ready for Upload

## ✅ Migration File Updated

The Course Builder migration file has been prepared with the required enrollment capabilities and action mapping.

**Location:** `backend/migrations/course-builder-migration.json` (reference file in Directory repo)

---

## ✅ Required Capabilities Added

The migration file includes these 4 required capabilities:

1. ✅ `"employee learning enrollment"`
2. ✅ `"career-path enrollment"`
3. ✅ `"assign employees to courses"`
4. ✅ `"process enrollment actions"`

Plus additional related capabilities for comprehensive routing.

---

## ✅ Action Mapping Added

The migration file includes the action mapping in the requested format:

```json
"actions": {
  "enroll_employees_career_path": {
    "description": "Enroll employees into a personalized learning flow using career-path logic"
  }
}
```

---

## 📋 Next Steps (Course Builder Team)

### 1. Update Course Builder's Migration File
- Copy the capabilities and action mapping from the reference file
- Add to Course Builder's own migration file
- Increment version number (e.g., `1.0.0` → `1.0.1`)

### 2. Upload Migration to Coordinator
Course Builder must upload its migration using its own service ID:

```bash
POST https://coordinator-production-e0a0.up.railway.app/register/<course-builder-service-id>/migration
Content-Type: multipart/form-data
Field: migration
File: course-builder-migration.json
```

### 3. Verify Knowledge Graph
After upload, verify Coordinator routes `enroll_employees_career_path` to `course-builder-service`.

---

## ✅ Directory Service Status

**Directory integration is CORRECT:**
- ✅ Envelope format is correct
- ✅ POST request to Coordinator is correct
- ✅ No changes needed to Directory code
- ✅ Directory does NOT upload Course Builder migration

---

## 🎯 Expected Result

After Course Builder uploads the updated migration:

1. Directory sends enrollment request → Coordinator
2. Coordinator routes to `course-builder-service` (not `managementreporting-service`)
3. Course Builder receives and processes enrollment
4. Success response returned to Directory

---

**Status:** Migration file ready. Course Builder team needs to upload it.


