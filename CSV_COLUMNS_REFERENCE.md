# CSV File Columns Reference

## Your CSV File Structure

Your CSV file (`test_company_lotus_techhub.csv`) has **26 columns**:

### Company Columns (Row 1 only)
1. `company_name` - Company name
2. `industry` - Industry type
3. `logo_url` - Company logo URL
4. `approval_policy` - ✅ **Current column name** (manual/auto)
5. `kpis` - Key Performance Indicators
6. `passing_grade` - Passing grade for exams
7. `max_attempts` - Maximum exam attempts
8. `exercises_limited` - Boolean (true/false)
9. `num_of_exercises` - Number of exercises
10. `learning_path_approval` - ⚠️ **Old column name** (still supported for backward compatibility)

### Employee Columns (Rows 2+)
11. `employee_id` - Unique employee ID within company
12. `full_name` - Employee full name
13. `email` - Employee email (must be unique globally)
14. `role_type` - Employee roles (can combine: "REGULAR_EMPLOYEE + DEPARTMENT_MANAGER")
15. `department_id` - Department identifier
16. `department_name` - Department name
17. `team_id` - Team identifier
18. `team_name` - Team name
19. `manager_id` - Manager's employee_id (optional)
20. `password` - Employee password (will be hashed)
21. `current_role_in_company` - Current job title
22. `target_role_in_company` - Target/desired job title
23. `preferred_language` - Language code (e.g., "en")
24. `status` - Employee status (active/inactive)
25. `ai_enabled` - Boolean for trainers (true/false)
26. `public_publish_enable` - Boolean for trainers (true/false)

## Column Status

### ✅ Fully Supported Columns
All 26 columns in your CSV are **fully supported** by the parser:
- `approval_policy` - ✅ Primary column (preferred)
- `learning_path_approval` - ✅ Still supported (backward compatibility)
- All employee columns - ✅ All processed correctly

### Column Mapping

The parser handles both old and new column names:

| CSV Column | Database Column | Status |
|------------|----------------|--------|
| `approval_policy` | `approval_policy` | ✅ Primary |
| `learning_path_approval` | `approval_policy` | ✅ Fallback (old name) |
| `kpis` | `kpis` | ✅ Primary |
| `primary_kpis` | `kpis` | ✅ Fallback (if exists) |
| `logo_url` | `logo_url` | ✅ |
| `company_logo` | `logo_url` | ✅ Fallback |
| `logo` | `logo_url` | ✅ Fallback |

## Important Notes

1. **Both `approval_policy` AND `learning_path_approval` are supported**
   - If both are present, `approval_policy` takes priority
   - If only `learning_path_approval` is present, it's used and normalized

2. **All columns are important and will be processed**
   - Company columns (1-10) are used in row 1
   - Employee columns (11-26) are used in rows 2+

3. **The parser normalizes values automatically:**
   - `learning_path_approval: "automatic"` → `approval_policy: "auto"`
   - `learning_path_approval: "manual"` → `approval_policy: "manual"`
   - Boolean strings ("true"/"false") → actual booleans
   - Empty strings → null/undefined

## Your CSV File is Valid ✅

Your CSV file structure is **correct** and all columns will be processed. The 500 error you're seeing is likely due to:
- Email conflicts (employees already exist)
- Database constraint violations
- Missing required data in some rows

The columns themselves are fine - the issue is with the data values, not the column structure.

