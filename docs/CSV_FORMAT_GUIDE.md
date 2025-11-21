# CSV Format Guide for Company Upload

## Critical Formatting Rules

### Column Structure
The CSV has **26 columns total** in this exact order:

**Company Columns (1-10):**
1. company_name
2. industry
3. logo_url
4. approval_policy
5. kpis
6. passing_grade
7. max_attempts
8. exercises_limited
9. num_of_exercises
10. learning_path_approval

**Employee Columns (11-26):**
11. employee_id
12. full_name
13. email
14. role_type
15. department_id
16. department_name
17. team_id
18. team_name
19. manager_id
20. password
21. current_role_in_company
22. target_role_in_company
23. preferred_language
24. status
25. ai_enabled
26. public_publish_enable

---

## Row Formatting

### Row 1: Header
Contains all 26 column names exactly as listed above.

### Row 2: Company Data
- **Fields 1-10:** Fill with company data
- **Fields 11-26:** Leave EMPTY (16 empty fields)
- **Format:** `company_name,industry,logo_url,approval_policy,kpis,passing_grade,max_attempts,exercises_limited,num_of_exercises,learning_path_approval,,,,,,,,,,,,,`

**Example:**
```csv
LOTUS_TECHHUB,High-Tech / Technology,https://example.com/logo.png,manual,Innovation Rate;Team Productivity,75,3,true,15,manual,,,,,,,,,,,,,
```

### Row 3+: Employee Data
- **Fields 1-10:** Leave EMPTY (10 empty fields - exactly 10 commas)
- **Fields 11-26:** Fill with employee data
- **Format:** `,,,,,,,,,,employee_id,full_name,email,role_type,department_id,department_name,team_id,team_name,manager_id,password,current_role_in_company,target_role_in_company,preferred_language,status,ai_enabled,public_publish_enable`

**Example:**
```csv
,,,,,,,,,,HR001,Rola Hassoun,rola.hassoun@company.com,REGULAR_EMPLOYEE + HR_MANAGER,DEPT004,Human Resources,TEAM004,HR Management,,SecurePass123,HR Manager,HR Manager,en,active,false,false
```

---

## Critical Points

1. **Exactly 10 empty fields** at the start of each employee row (rows 3+)
2. **Exactly 16 empty fields** at the end of the company row (row 2)
3. **All rows must have 26 columns total** (matching the header)
4. **No missing commas** - every field position must be accounted for

---

## Field Requirements

### Company Row (Row 2) - Required Fields:
- `approval_policy`: `manual` or `auto`
- `kpis`: Semicolon-separated (e.g., `"KPI1;KPI2;KPI3"`)
- `passing_grade`: Number 0-100
- `max_attempts`: Number
- `exercises_limited`: `true` or `false`
- `num_of_exercises`: Number (required if `exercises_limited = true`)

### Employee Rows (Row 3+) - Required Fields:
- `employee_id`: Unique identifier
- `full_name`: Employee full name
- `email`: Unique email (cannot be `admin@educore.io`)
- `role_type`: Must include `REGULAR_EMPLOYEE` or `TRAINER` as base role
- `department_id`, `department_name`
- `team_id`, `team_name`
- `manager_id`: Can be empty (use empty string `""`)
- `password`: Employee password
- `current_role_in_company`: Job title
- `target_role_in_company`: Target job title
- `preferred_language`: Language code (e.g., `en`, `English`)
- `status`: `active` or `inactive`
- `ai_enabled`: `true` or `false` (only for TRAINERs)
- `public_publish_enable`: `true` or `false` (only for TRAINERs)

---

## Role Type Rules

### Valid Formats:
- `REGULAR_EMPLOYEE`
- `TRAINER`
- `REGULAR_EMPLOYEE + TEAM_MANAGER`
- `REGULAR_EMPLOYEE + DEPARTMENT_MANAGER`
- `REGULAR_EMPLOYEE + DECISION_MAKER`
- `TRAINER + TEAM_MANAGER`
- `TRAINER + DEPARTMENT_MANAGER`
- `REGULAR_EMPLOYEE + DEPARTMENT_MANAGER + DECISION_MAKER`

### Invalid Formats:
- `TEAM_MANAGER` (missing base role)
- `DEPARTMENT_MANAGER` (missing base role)
- `DEPARTMENT_MANAGER + DECISION_MAKER` (missing base role)

### Important:
- Only **ONE** `DECISION_MAKER` per company
- If `approval_policy = manual`, must have one `DECISION_MAKER`

---

## Complete Example

```csv
company_name,industry,logo_url,approval_policy,kpis,passing_grade,max_attempts,exercises_limited,num_of_exercises,learning_path_approval,employee_id,full_name,email,role_type,department_id,department_name,team_id,team_name,manager_id,password,current_role_in_company,target_role_in_company,preferred_language,status,ai_enabled,public_publish_enable
COMPANY_NAME,Industry,https://logo.url,manual,KPI1;KPI2;KPI3,75,3,true,15,manual,,,,,,,,,,,,,
,,,,,,,,,,EMP001,John Doe,john.doe@company.com,REGULAR_EMPLOYEE + DECISION_MAKER,DEPT001,Engineering,TEAM001,Dev Team,,SecurePass123,CEO,CEO,en,active,false,false
,,,,,,,,,,EMP002,Jane Smith,jane.smith@company.com,REGULAR_EMPLOYEE + HR_MANAGER,DEPT002,HR,TEAM002,HR Team,,SecurePass123,HR Manager,HR Director,en,active,false,false
```

---

## Common Mistakes to Avoid

1. ❌ Missing commas in employee rows (must have exactly 10 empty fields)
2. ❌ Adding company fields in employee rows
3. ❌ Adding employee fields in company row
4. ❌ Missing base role in role_type
5. ❌ Multiple DECISION_MAKERs
6. ❌ Using `admin@educore.io` as employee email
7. ❌ Missing required fields
8. ❌ Wrong number of columns (must be exactly 26)

---

*Last Updated: 2025-11-21*

