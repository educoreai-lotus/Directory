# CSV Upload Pipeline - Full Architecture Audit

## Current Flow Diagram

```
Frontend (CompanyCSVUploadPage)
  ↓
  POST /api/v1/companies/:id/upload
  ↓
CSVUploadController
  ↓ (multer file upload)
  ↓
ParseCSVUseCase.execute()
  ↓
  Step 1: CSVParser.parse() → Raw CSV rows
  Step 2: CSVParser.normalizeRow() → Normalized rows
  Step 3: CSVValidator.validate() → Validation result
  Step 4: If valid → processValidRows()
    ↓
    Transaction Start
    ↓
    updateCompanySettings() → UPDATE companies table
    ↓
    For each row:
      - DepartmentRepository.createOrGet()
      - TeamRepository.createOrGet()
      - EmployeeRepository.create() → ❌ NO EMAIL CHECK
      - EmployeeRepository.createRole()
      - EmployeeRepository.assignToTeam()
      - TrainerSettings (if TRAINER)
    ↓
    Manager relationships (second pass)
    ↓
    Transaction Commit
  ↓
Response to Frontend
```

## Critical Issues Identified

### 1. Email Uniqueness Constraint Violation
**Problem**: 
- Database constraint: `email VARCHAR(255) UNIQUE NOT NULL` (GLOBAL unique, not per-company)
- CSVValidator only checks for duplicates WITHIN the CSV file
- EmployeeRepository.create() does NOT check if email already exists in database
- Result: `duplicate key violates unique constraint employees_email_key`

**Root Cause**: No pre-insert lookup for existing emails

**Fix Required**:
- Add `findByEmailAndCompany()` method to EmployeeRepository
- Check email existence BEFORE insert in ParseCSVUseCase
- Business rule: If email exists for same company → UPDATE employee, else INSERT
- If email exists for different company → REJECT with clear error

### 2. learning_path_approval CHECK Constraint Violation
**Problem**:
- Database constraint: `CHECK (learning_path_approval IN ('manual', 'automatic'))`
- CSVParser.normalizeLearningPathApproval() returns `null` for invalid values
- ParseCSVUseCase.updateCompanySettings() passes `null` to UPDATE query
- PostgreSQL rejects `null` if it violates CHECK constraint

**Root Cause**: Invalid values not caught before database UPDATE

**Fix Required**:
- Ensure normalizeLearningPathApproval() always returns valid value or null
- In updateCompanySettings(), validate value before UPDATE
- Default to 'manual' if value is invalid/null
- Add validation in unified validator

### 3. Missing Pre-Insert Validation Layer
**Problem**:
- CSVValidator only validates CSV structure
- No validation against existing database records
- No validation of CHECK constraint values before insert
- Database errors propagate to user as technical messages

**Root Cause**: No unified protective validation layer

**Fix Required**:
- Create `DatabaseConstraintValidator` class
- Validate all enum/CHECK values before insert
- Check email uniqueness against database
- Check employee_id uniqueness per company
- Normalize all values to match database constraints
- Return human-friendly error messages

### 4. Technical Error Messages
**Problem**:
- All errors show PostgreSQL constraint names
- Users see: "duplicate key violates unique constraint employees_email_key"
- No translation to human language

**Root Cause**: No error message translation layer

**Fix Required**:
- Create `ErrorTranslator` utility
- Map PostgreSQL error codes to human messages
- Translate all validation errors
- Return user-friendly messages in API responses

### 5. Inconsistent Status Transitions
**Problem**:
- Verification → CSV upload flow may have race conditions
- Multiple rapid polls in frontend
- Redirect happens too early

**Root Cause**: Frontend polling logic needs cleanup

**Fix Required**:
- Ensure single redirect after verification
- Remove multiple rapid polls
- Add proper loading states

## Database Constraints Reference

### companies table
- `verification_status`: CHECK IN ('pending', 'approved', 'rejected') DEFAULT 'pending'
- `learning_path_approval`: CHECK IN ('manual', 'automatic') DEFAULT 'manual'
- `domain`: UNIQUE NOT NULL

### employees table
- `email`: UNIQUE NOT NULL (GLOBAL unique - critical!)
- `status`: CHECK IN ('active', 'inactive') DEFAULT 'active'
- `(company_id, employee_id)`: UNIQUE

### employee_roles table
- `role_type`: CHECK IN ('REGULAR_EMPLOYEE', 'TRAINER', 'TEAM_MANAGER', 'DEPARTMENT_MANAGER', 'DECISION_MAKER')
- `(employee_id, role_type)`: UNIQUE

### employee_managers table
- `relationship_type`: CHECK IN ('team_manager', 'department_manager')
- `(employee_id, manager_id, relationship_type)`: UNIQUE

## CSV Contract (Human-Friendly)

### Required Fields
- `employee_id`: Unique identifier for employee (per company)
- `full_name`: Employee's full name
- `email`: Email address (must be unique across ALL companies)
- `role_type`: One or more roles separated by '+'
  - Valid values: REGULAR_EMPLOYEE, TRAINER, TEAM_MANAGER, DEPARTMENT_MANAGER, DECISION_MAKER
  - Example: "REGULAR_EMPLOYEE + TEAM_MANAGER"
- `department_id`: Department identifier
- `department_name`: Department name
- `team_id`: Team identifier
- `team_name`: Team name

### Optional Fields
- `manager_id`: Employee ID of manager (must exist in CSV)
- `password`: Employee password (defaults to 'default123' if not provided)
- `current_role_in_company`: Current job title
- `target_role_in_company`: Target job title
- `preferred_language`: Language preference
- `status`: 'active' or 'inactive' (defaults to 'active')
- `learning_path_approval`: 'manual' or 'automatic' (company-level, from first row)
- `primary_kpis`: Company KPIs (company-level, from first row)
- `ai_enabled`: 'true'/'false' (for TRAINER role only)
- `public_publish_enable`: 'true'/'false' (for TRAINER role only)

### Validation Rules
1. Email must be unique across all companies
2. employee_id must be unique per company
3. All role types must be valid
4. status must be 'active' or 'inactive'
5. learning_path_approval must be 'manual' or 'automatic'
6. manager_id must reference an employee_id in the same CSV

## Implementation Plan

1. Create `DatabaseConstraintValidator` class
2. Add `findByEmailAndCompany()` to EmployeeRepository
3. Add `createOrUpdate()` method to EmployeeRepository
4. Fix `updateCompanySettings()` to validate learning_path_approval
5. Create `ErrorTranslator` utility
6. Update ParseCSVUseCase to use new validators
7. Update CSVUploadController to translate errors
8. Add comprehensive tests
9. Update frontend error handling

