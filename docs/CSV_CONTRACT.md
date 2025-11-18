# CSV File Format Contract

## Human-Friendly CSV Upload Guide

This document describes the exact format required for uploading company employee data via CSV.

---

## Required Columns

### Employee Identification
- **employee_id** (Required)
  - Unique identifier for the employee within your company
  - Example: "EMP001", "12345", "john.doe"
  - Must be unique within your company
  - Cannot be empty

- **full_name** (Required)
  - Employee's full name
  - Example: "John Doe", "Jane Smith"
  - Cannot be empty

- **email** (Required)
  - Employee's email address
  - Example: "john.doe@company.com"
  - Must be a valid email format (contains @ and domain)
  - **IMPORTANT**: Must be unique across ALL companies in the system
  - Cannot be empty

### Role and Position
- **role_type** (Required)
  - Employee's role(s) in the company
  - Valid values: `REGULAR_EMPLOYEE`, `TRAINER`, `TEAM_MANAGER`, `DEPARTMENT_MANAGER`, `DECISION_MAKER`
  - You can combine multiple roles using `+` (plus sign)
  - Examples:
    - Single role: `REGULAR_EMPLOYEE`
    - Combined roles: `REGULAR_EMPLOYEE + TEAM_MANAGER`
    - Multiple roles: `TRAINER + DEPARTMENT_MANAGER`
  - Case insensitive (will be converted to uppercase)
  - If not provided, defaults to `REGULAR_EMPLOYEE`

### Department Information
- **department_id** (Required)
  - Unique identifier for the department within your company
  - Example: "DEPT001", "ENG", "SALES"
  - Must be unique within your company
  - Cannot be empty

- **department_name** (Required)
  - Name of the department
  - Example: "Engineering", "Sales", "Human Resources"
  - Cannot be empty

### Team Information
- **team_id** (Required)
  - Unique identifier for the team within your company
  - Example: "TEAM001", "BACKEND", "FRONTEND"
  - Must be unique within your company
  - Cannot be empty

- **team_name** (Required)
  - Name of the team
  - Example: "Backend Team", "Frontend Team", "QA Team"
  - Cannot be empty

---

## Optional Columns

### Employee Details
- **manager_id** (Optional but Recommended)
  - Employee ID of the employee's manager
  - Example: "EMP002"
  - Must reference an `employee_id` that exists in the same CSV file
  - If not provided, employee will have no manager assigned

- **password** (Optional)
  - Employee's login password
  - If not provided, a default password will be assigned
  - Recommended: Provide secure passwords for all employees

- **current_role_in_company** (Optional)
  - Employee's current job title
  - Example: "Software Engineer", "Senior Developer", "Product Manager"
  - Free text field

- **target_role_in_company** (Optional)
  - Employee's target/desired job title
  - Example: "Senior Software Engineer", "Engineering Manager"
  - Free text field

- **preferred_language** (Optional)
  - Employee's preferred language
  - Example: "en", "es", "fr"
  - Free text field

- **status** (Optional)
  - Employee's status
  - Valid values: `active`, `inactive`
  - Case insensitive (will be converted to lowercase)
  - Default: `active`
  - Examples: "Active", "active", "ACTIVE" → all become "active"

### Company-Level Settings (from first row only)
- **learning_path_approval** (Optional)
  - How learning paths are approved for the company
  - Valid values: `manual`, `automatic`
  - Case insensitive (will be converted to lowercase)
  - Default: `manual`
  - Only the value from the first row is used
  - Examples: "Manual", "manual", "AUTOMATIC" → all become "manual" or "automatic"

- **primary_kpis** (Optional)
  - Company's primary Key Performance Indicators
  - Free text field
  - Only the value from the first row is used

### Trainer-Specific Fields (Only for TRAINER role)
- **ai_enabled** (Optional, for TRAINER only)
  - Whether AI features are enabled for this trainer
  - Valid values: `true`, `false`, `1`, `0`, `yes`, `no`
  - Case insensitive
  - Default: `false`
  - Only used if employee has `TRAINER` role

- **public_publish_enable** (Optional, for TRAINER only)
  - Whether public publishing is enabled for this trainer
  - Valid values: `true`, `false`, `1`, `0`, `yes`, `no`
  - Case insensitive
  - Default: `false`
  - Only used if employee has `TRAINER` role

---

## CSV File Format

### File Requirements
- File format: CSV (Comma-Separated Values)
- File size: Maximum 10MB
- Encoding: UTF-8 recommended
- First row: Must contain column headers

### Column Headers
Your CSV file must start with a header row containing the column names. The exact column names are case-sensitive.

**Required headers:**
```
employee_id,full_name,email,role_type,department_id,department_name,team_id,team_name
```

**Optional headers:**
```
manager_id,password,current_role_in_company,target_role_in_company,preferred_language,status,learning_path_approval,primary_kpis,ai_enabled,public_publish_enable
```

### Example CSV File

```csv
employee_id,full_name,email,role_type,department_id,department_name,team_id,team_name,manager_id,status,learning_path_approval
EMP001,John Doe,john.doe@company.com,REGULAR_EMPLOYEE + TEAM_MANAGER,ENG,Engineering,BACKEND,Backend Team,EMP002,active,manual
EMP002,Jane Smith,jane.smith@company.com,DEPARTMENT_MANAGER,ENG,Engineering,BACKEND,Backend Team,,active,manual
EMP003,Bob Johnson,bob.johnson@company.com,TRAINER,SALES,Sales,FRONTEND,Frontend Team,EMP002,active,manual
```

---

## Validation Rules

### Data Validation
1. **Email Uniqueness**: Each email must be unique across ALL companies. If an email is already registered to another company, the upload will fail.

2. **Employee ID Uniqueness**: Each employee_id must be unique within your company. Duplicates within the same CSV or existing employees will cause an error.

3. **Manager References**: If you provide a `manager_id`, it must reference an `employee_id` that exists in the same CSV file.

4. **Role Combinations**: You can combine multiple roles, but each role must be valid. Invalid roles will be ignored, and the employee will default to `REGULAR_EMPLOYEE`.

5. **Department/Team Uniqueness**: `department_id` and `team_id` must be unique within your company.

### Error Handling
- If any required field is missing, the row will be rejected with a clear error message
- If email conflicts with another company, the upload will fail with a clear message
- If validation errors occur, you'll see exactly which row and column has the problem
- All errors are shown in human-friendly language (no technical database errors)

---

## Common Mistakes to Avoid

1. ❌ **Using duplicate emails**: Each email must be unique across the entire system
2. ❌ **Missing required fields**: All required columns must have values
3. ❌ **Invalid role types**: Use only the allowed role values
4. ❌ **Invalid status values**: Use only "active" or "inactive"
5. ❌ **Invalid learning_path_approval**: Use only "manual" or "automatic"
6. ❌ **Manager ID not in CSV**: Manager IDs must reference employees in the same file
7. ❌ **Case sensitivity in headers**: Column headers are case-sensitive

---

## Tips for Success

✅ **Test with a small file first**: Upload a few rows to verify your format is correct
✅ **Check for duplicates**: Ensure no duplicate emails or employee IDs
✅ **Validate manager references**: Make sure all manager_id values exist in your CSV
✅ **Use consistent formatting**: Keep department_id, team_id, and employee_id formats consistent
✅ **Review error messages**: If upload fails, read the error messages carefully - they tell you exactly what's wrong

---

## Support

If you encounter issues:
1. Check the error messages - they will tell you exactly what's wrong
2. Verify all required fields are present
3. Ensure email addresses are unique
4. Check that role types, status, and learning_path_approval use valid values
5. Contact support if you need assistance

