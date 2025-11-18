# Database Constraints Reference

## Complete List of All Database Constraints

### companies table

#### CHECK Constraints
1. **verification_status**
   - Constraint: `CHECK (verification_status IN ('pending', 'approved', 'rejected'))`
   - Default: `'pending'`
   - Description: Company verification status must be one of the three allowed values
   - Error Message: "Company verification status must be 'pending', 'approved', or 'rejected'."

2. **learning_path_approval**
   - Constraint: `CHECK (learning_path_approval IN ('manual', 'automatic'))`
   - Default: `'manual'`
   - Description: Learning path approval method must be either manual or automatic
   - Error Message: "Learning path approval must be either 'manual' or 'automatic'."

#### UNIQUE Constraints
3. **domain**
   - Constraint: `UNIQUE NOT NULL`
   - Description: Each company must have a unique domain name
   - Error Message: "A company with this domain already exists."

#### NOT NULL Constraints
4. **company_name**: Required
5. **domain**: Required

---

### employees table

#### CHECK Constraints
1. **status**
   - Constraint: `CHECK (status IN ('active', 'inactive'))`
   - Default: `'active'`
   - Description: Employee status must be either active or inactive
   - Error Message: "Employee status must be either 'active' or 'inactive'."

#### UNIQUE Constraints
2. **email**
   - Constraint: `UNIQUE NOT NULL` (GLOBAL - across all companies)
   - Description: Each email address must be unique across the entire system
   - Error Message: "This email address is already registered. Each employee must have a unique email address."

3. **(company_id, employee_id)**
   - Constraint: `UNIQUE`
   - Description: Employee ID must be unique within each company
   - Error Message: "An employee with this ID already exists in your company."

#### NOT NULL Constraints
4. **company_id**: Required
5. **employee_id**: Required
6. **full_name**: Required
7. **email**: Required

---

### employee_roles table

#### CHECK Constraints
1. **role_type**
   - Constraint: `CHECK (role_type IN ('REGULAR_EMPLOYEE', 'TRAINER', 'TEAM_MANAGER', 'DEPARTMENT_MANAGER', 'DECISION_MAKER'))`
   - Description: Role type must be one of the five allowed values
   - Error Message: "Invalid role type. Valid roles are: REGULAR_EMPLOYEE, TRAINER, TEAM_MANAGER, DEPARTMENT_MANAGER, DECISION_MAKER."

#### UNIQUE Constraints
2. **(employee_id, role_type)**
   - Constraint: `UNIQUE`
   - Description: An employee cannot have the same role twice
   - Error Message: "This employee already has this role assigned."

#### NOT NULL Constraints
3. **employee_id**: Required
4. **role_type**: Required

---

### employee_managers table

#### CHECK Constraints
1. **relationship_type**
   - Constraint: `CHECK (relationship_type IN ('team_manager', 'department_manager'))`
   - Description: Relationship type must be either team_manager or department_manager
   - Error Message: "Invalid relationship type. Must be either 'team_manager' or 'department_manager'."

#### UNIQUE Constraints
2. **(employee_id, manager_id, relationship_type)**
   - Constraint: `UNIQUE`
   - Description: An employee cannot have the same manager relationship type twice
   - Error Message: "This manager relationship already exists."

#### NOT NULL Constraints
3. **employee_id**: Required
4. **manager_id**: Required
5. **relationship_type**: Required

---

### departments table

#### UNIQUE Constraints
1. **(company_id, department_id)**
   - Constraint: `UNIQUE`
   - Description: Department ID must be unique within each company
   - Error Message: "A department with this ID already exists in your company."

#### NOT NULL Constraints
2. **company_id**: Required
3. **department_id**: Required
4. **department_name**: Required

---

### teams table

#### UNIQUE Constraints
1. **(company_id, team_id)**
   - Constraint: `UNIQUE`
   - Description: Team ID must be unique within each company
   - Error Message: "A team with this ID already exists in your company."

#### NOT NULL Constraints
2. **company_id**: Required
3. **team_id**: Required
4. **team_name**: Required

---

## PostgreSQL Error Codes Reference

- **23505**: Unique violation (duplicate key)
- **23503**: Foreign key violation
- **23514**: Check constraint violation
- **23502**: Not null violation
- **42P01**: Undefined table
- **42703**: Undefined column

## Validation Rules Summary

1. **Email Uniqueness**: Global across all companies - must check before insert
2. **Employee ID Uniqueness**: Per company - must check before insert
3. **Enum Values**: All CHECK constraints must be validated before insert
4. **Default Values**: Must be set for fields with defaults if not provided
5. **Required Fields**: Must be validated before insert

