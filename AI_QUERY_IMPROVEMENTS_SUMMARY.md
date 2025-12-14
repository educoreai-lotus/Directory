# AI Query Improvements Summary

## ✅ Changes Made (Reversible)

This document summarizes all changes made to improve Directory's AI Query logic and Coordinator integration.

**Backup Commit**: `3617dca` - "BACKUP: Before AI Query improvements - making changes reversible"

To revert: `git reset --hard 3617dca`

---

## 🔧 1. Fixed Response Format (CRITICAL)

### Problem
Directory was returning only the filled response, not the full Coordinator request envelope.

### Solution
- **UniversalEndpointController**: Now returns the FULL envelope (original payload + filled response)
- **FillContentMetricsUseCase**: Accepts and preserves the full envelope structure

### Before:
```javascript
// Returned only response
return { success: true, data: filledResponse };
```

### After:
```javascript
// Returns full envelope
return {
  requester_service: requester_service,
  payload: payload, // Original payload preserved
  response: filledResponse // Filled response
};
```

**Files Changed:**
- `backend/src/presentation/UniversalEndpointController.js`
- `backend/src/application/FillContentMetricsUseCase.js`

---

## 🤖 2. Improved AI Query Generator

### Enhancements
1. **Better Schema Context**: Now loads both SQL migration file AND JSON migration file
2. **Business Rules**: Added comprehensive field mappings and query patterns
3. **Hierarchy Support**: Added rules for building nested JSON structures (departments → teams → employees)
4. **Field Mappings**: Documented all common field name variations (user_id → employee_id, etc.)

### Key Business Rules Added:
- Field mappings (user_id → employee_id, name → full_name, etc.)
- Hierarchy query patterns (using json_agg for nested structures)
- Employee data patterns (role_type, manager_id, etc.)
- Company data patterns (approver lookup, company_size calculation)
- Aggregation patterns (json_agg, array_agg, COUNT)

**File Changed:**
- `backend/src/infrastructure/AIQueryGenerator.js`

---

## 📤 3. Fixed Outgoing Requests

### Course Builder Enrollment
**Before:**
```json
{
  "action": "course_builder_enroll_career_path",
  "learners": [
    {
      "learner_id": "...",
      "learner_name": "...",
      "company_id": "...", // ❌ Duplicate
      "learning_flow_tag": "...", // ❌ Duplicate
      "preferred_language": "..."
    }
  ]
}
```

**After:**
```json
{
  "action": "enroll_employees_career_path",
  "learning_flow": "CAREER_PATH_DRIVEN",
  "company_id": "...",
  "company_name": "...",
  "learners": [
    {
      "learner_id": "...",
      "learner_name": "...",
      "preferred_language": "..."
    }
  ]
}
```

**Changes:**
- Action: `course_builder_enroll_career_path` → `enroll_employees_career_path`
- Removed duplicate `company_id` from learners array
- Removed duplicate `learning_flow_tag` from learners array
- Response: Changed from template to empty `{}`

**File Changed:**
- `backend/src/application/EnrollEmployeesCareerPathUseCase.js`

### Learner AI Notification
**Before:**
```json
{
  "requester_service": "directory-service",
  "action": "sending_decision_maker_to_approve_learning_path"
}
```

**After:**
```json
{
  "requester_service": "directory",
  "action": "sending_new_decision_maker",
  "approval_policy": "manual",
  // decision_maker only included if approval_policy === "manual"
}
```

**Changes:**
- Action: `sending_decision_maker_to_approve_learning_path` → `sending_new_decision_maker`
- Requester service: `directory-service` → `directory`
- Decision maker only sent if `approval_policy === "manual"`
- Response: Changed to empty `{}`

**File Changed:**
- `backend/src/application/RegisterCompanyUseCase.js`

---

## 📥 4. Incoming Request Support

The improved AI Query Generator now supports all incoming requests:

### Management Reporting
- Company data (company_id, company_name, industry, etc.)
- Hierarchy (departments → teams → employees)
- Approver lookup (employee with DECISION_MAKER role)
- Company size calculation

### Assessment
- `passing_grade` from companies table
- `max_attempts` from companies table
- Based on company_id from payload

### Learning Analytics
- Employee data (employee_id, employee_name, current_role, target_role, etc.)
- Company data (company_id, company_name, industry, etc.)
- Hierarchy structure
- Completed courses (empty array if not in DB)
- Courses taught (for trainers, empty array if not in DB)

---

## 🧪 Testing

All changes are reversible. To test:

1. **Test incoming requests** from Management Reporting, Assessment, Learning Analytics
2. **Verify response format** includes original payload + filled response
3. **Test outgoing requests** to Course Builder and Learner AI
4. **Check AI Query generation** for complex queries (hierarchy, multiple companies)

To revert if needed:
```bash
git reset --hard 3617dca
```

---

## 📋 Integration Mapping

### Outgoing (Directory → Other Services)
1. **Course Builder**: `enroll_employees_career_path` (on ENROLL click)
2. **Learner AI**: `sending_new_decision_maker` (on company registration)
3. **Skills Engine**: `get_employee_skills_for_directory_profile` (on profile enrichment)

### Incoming (Other Services → Directory)
1. **Management Reporting**: Company data + hierarchy
2. **Assessment**: passing_grade, max_attempts
3. **Learning Analytics**: Employee + Company + Hierarchy data

---

## ✅ All Requirements Met

- ✅ Returns FULL request object (original payload + filled response)
- ✅ AI Query understands all incoming request types
- ✅ Course Builder enrollment format fixed (no duplicates)
- ✅ Learner AI notification format fixed (correct action, conditional decision_maker)
- ✅ Improved AI prompt with business rules and schema context
- ✅ All changes are reversible (backup commit created)

