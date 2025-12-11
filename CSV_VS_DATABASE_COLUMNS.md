# CSV Columns vs Database Schema Comparison

## Your CSV File Has 26 Columns

### Company Columns (Row 1):
1. ✅ `company_name` → `companies.company_name`
2. ✅ `industry` → `companies.industry`
3. ✅ `logo_url` → `companies.logo_url`
4. ✅ `approval_policy` → `companies.approval_policy`
5. ✅ `kpis` → `companies.kpis`
6. ✅ `passing_grade` → `companies.passing_grade`
7. ✅ `max_attempts` → `companies.max_attempts`
8. ✅ `exercises_limited` → `companies.exercises_limited`
9. ✅ `num_of_exercises` → `companies.num_of_exercises`
10. ✅ `learning_path_approval` → `companies.approval_policy` (backward compatibility)

### Employee Columns (Rows 2+):
11. ✅ `employee_id` → `employees.employee_id`
12. ✅ `full_name` → `employees.full_name`
13. ✅ `email` → `employees.email`
14. ✅ `role_type` → `employee_roles.role_type` (parsed and split by '+')
15. ✅ `department_id` → `departments.department_id`
16. ✅ `department_name` → `departments.department_name`
17. ✅ `team_id` → `teams.team_id`
18. ✅ `team_name` → `teams.team_name`
19. ✅ `manager_id` → `employee_managers.manager_id` (relationship)
20. ✅ `password` → `employees.password_hash` (hashed automatically)
21. ✅ `current_role_in_company` → `employees.current_role_in_company`
22. ✅ `target_role_in_company` → `employees.target_role_in_company`
23. ✅ `preferred_language` → `employees.preferred_language`
24. ✅ `status` → `employees.status`
25. ✅ `ai_enabled` → `trainer_settings.ai_enabled` (for trainers only)
26. ✅ `public_publish_enable` → `trainer_settings.public_publish_enable` (for trainers only)

---

## Database Columns NOT in CSV (Auto-Generated or Optional)

### Companies Table - Missing from CSV:
- ✅ `id` - Auto-generated UUID (not needed in CSV)
- ✅ `domain` - Set during company registration (not in CSV)
- ✅ `hr_contact_name` - Set during company registration (not in CSV)
- ✅ `hr_contact_email` - Set during company registration (not in CSV)
- ✅ `hr_contact_role` - Set during company registration (not in CSV)
- ✅ `verification_status` - Auto-set to 'pending' (not in CSV)
- ✅ `created_at` - Auto-generated (not in CSV)
- ✅ `updated_at` - Auto-generated (not in CSV)

### Employees Table - Missing from CSV (Optional/Enrichment Fields):
- ✅ `id` - Auto-generated UUID (not needed in CSV)
- ✅ `company_id` - From URL parameter (not in CSV)
- ✅ `bio` - Optional, added via enrichment (not in CSV)
- ✅ `profile_photo_url` - Optional, added via enrichment (not in CSV)
- ✅ `linkedin_url` - Optional, added via OAuth (not in CSV)
- ✅ `github_url` - Optional, added via OAuth (not in CSV)
- ✅ `linkedin_data` - Optional, added via OAuth (not in CSV)
- ✅ `github_data` - Optional, added via OAuth (not in CSV)
- ✅ `enrichment_completed` - Auto-set (not in CSV)
- ✅ `enrichment_completed_at` - Auto-set (not in CSV)
- ✅ `profile_status` - Auto-set to 'basic' (not in CSV)
- ✅ `value_proposition` - Optional, AI-generated (not in CSV)
- ✅ `created_at` - Auto-generated (not in CSV)
- ✅ `updated_at` - Auto-generated (not in CSV)

### Other Tables - Not in CSV (Relationship Tables):
- ✅ `employee_roles` - Created from `role_type` column (parsed automatically)
- ✅ `employee_teams` - Created from `team_id` column (relationship)
- ✅ `employee_managers` - Created from `manager_id` column (relationship)
- ✅ `trainer_settings` - Created from `ai_enabled` and `public_publish_enable` (for trainers)

---

## Summary

### ✅ All CSV Columns Are Supported
**Your CSV file has ALL the columns needed to create a complete company structure:**
- Company information ✅
- Company settings ✅
- Departments ✅
- Teams ✅
- Employees ✅
- Employee roles ✅
- Manager relationships ✅
- Trainer settings ✅

### ✅ Missing Columns Are Intentional
The columns NOT in your CSV are:
1. **Auto-generated** (id, created_at, updated_at)
2. **Set during registration** (domain, hr_contact_*)
3. **Optional/enrichment fields** (bio, profile_photo_url, linkedin_data, etc.)
4. **Relationship tables** (created automatically from CSV data)

### ✅ Your CSV Structure is Complete
Your CSV file structure is **perfect** and contains all necessary columns to:
- Create a company with all settings
- Create departments and teams
- Create employees with all required fields
- Set up roles and relationships
- Configure trainer settings

**The 500 error is NOT due to missing columns - it's a data processing issue (likely email conflicts or constraint violations).**

