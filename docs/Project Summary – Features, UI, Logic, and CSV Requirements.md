# Project Summary – Features, UI, Logic, and CSV Requirements

**Last Updated**: 2025-11-21  
**Project**: EDUCORE Directory Management System  
**Purpose**: Comprehensive reference document covering all implemented features, UI/UX flows, business logic, CSV requirements, and fixes

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Implemented Features](#implemented-features)
3. [User Roles & Permissions](#user-roles--permissions)
4. [UI/UX Flows by Profile Type](#uiux-flows-by-profile-type)
5. [Business Logic & Rules](#business-logic--rules)
6. [CSV Format Requirements](#csv-format-requirements)
7. [CSV Validation Rules](#csv-validation-rules)
8. [Database Constraints](#database-constraints)
9. [Authentication & Authorization](#authentication--authorization)
10. [Error Fixes & Solutions](#error-fixes--solutions)
11. [Special Considerations](#special-considerations)
12. [Architecture Overview](#architecture-overview)

---

## System Overview

### Purpose
A multi-tenant Company Directory platform that allows companies to manage their employees, roles, teams, and departments efficiently. Each company has its own isolated directory within the EDUCORE platform.

### Technology Stack
- **Backend**: Node.js, Express.js, PostgreSQL
- **Frontend**: React.js, React Router
- **Database**: PostgreSQL (Supabase/Railway)
- **Authentication**: Dummy authentication (testing phase)
- **External APIs**: LinkedIn OAuth, GitHub OAuth, Google Gemini AI
- **Deployment**: Railway (backend), Vercel (frontend)

### Architecture Pattern
**Onion Architecture (Clean Architecture)** - 3 layers:
- **Presentation Layer**: Controllers (HTTP handlers)
- **Application Layer**: Use Cases (business logic)
- **Infrastructure Layer**: Repositories, API clients, database

---

## Implemented Features

### 1. Company Registration & Verification
- **Company Registration**: HR/Manager registers company with basic info (name, industry, domain, HR contact)
- **Domain Verification**: Automatic domain validation (DNS check, MX records)
- **Auto-Approval**: Companies with valid domains are auto-approved
- **Company Settings**: Configurable settings (approval policy, KPIs, passing grade, max attempts, exercises)

### 2. CSV Upload & Employee Management
- **CSV Upload**: Bulk employee import via CSV file
- **CSV Validation**: Comprehensive validation (format, required fields, data types, relationships)
- **Employee Creation**: Automatic creation of employees, departments, teams from CSV
- **Role Management**: Support for multiple roles per employee
- **Hierarchy Management**: Automatic manager relationships based on CSV data
- **Email Uniqueness**: Enforces unique emails across all companies
- **Reserved Email Protection**: `admin@educore.io` is reserved for Directory Admin

### 3. Profile Enrichment (LinkedIn + GitHub + AI)
- **LinkedIn OAuth**: Connect LinkedIn account, fetch profile data (OpenID Connect)
- **GitHub OAuth**: Connect GitHub account, fetch repositories and profile
- **AI Enrichment**: Google Gemini AI generates professional bio and project summaries
- **Profile Status**: State machine (basic → enriched → approved)
- **HR Approval**: Enriched profiles require HR approval before full access
- **One-Time Only**: Enrichment can only happen once per employee

### 4. Employee Profile Management
- **Profile Viewing**: View employee profiles with bio, skills, courses, learning path
- **Profile Editing**: Employees can edit their own profiles (after approval)
- **Profile Photo**: Fetched from LinkedIn (priority) or GitHub (fallback)
- **Role-Based Access**: Different views for HR, regular employees, trainers, managers, decision makers
- **Management Hierarchy**: Managers see their team/department structure
- **Trainer Settings**: Trainers have dedicated settings section

### 5. Company Profile & Management
- **Company Dashboard**: Overview of company, departments, teams, employees
- **Organizational Hierarchy**: Visual representation of departments and teams
- **Employee List**: Full list with search, filter, add/edit/delete (HR only)
- **Pending Requests**: Employee requests requiring HR approval
- **Pending Approvals**: Enriched profiles awaiting HR approval
- **Analytics Dashboard**: Company metrics and KPIs
- **Logo Display**: Company logos with fallback to initial letter

### 6. Admin Dashboard (Directory Admin)
- **Platform-Level Access**: View all companies in the directory
- **Read-Only Mode**: All admin views are read-only (no modifications allowed)
- **Company Cards**: Grid view of all companies with logos, status badges
- **Company Profile Access**: View any company profile (read-only)
- **Employee Profile Access**: View any employee profile (read-only)
- **Management & Reporting**: Placeholder for microservice integration

### 7. Request System
- **Employee Requests**: Employees can submit requests (learn new skills, apply for trainer, etc.)
- **HR Review**: Requests appear in Company Profile → Pending Requests tab
- **Request Types**: learn-new-skills, apply-trainer, self-learning, other
- **Status Tracking**: pending, approved, rejected, in_progress, completed
- **Auto-Refresh**: Requests refresh on tab click and window focus

### 8. Learning & Development Integration
- **Skills Engine**: Integration with Skills Engine microservice
- **Course Builder**: Integration with Course Builder microservice
- **Learner AI**: Integration with Learner AI microservice
- **Learning Analytics**: Integration with Learning Analytics microservice
- **Mock Fallback**: All microservices have mock data fallback
- **Profile Status Gate**: Only visible when `profile_status === 'approved'`

---

## User Roles & Permissions

### Role Types

#### Base Roles
1. **REGULAR_EMPLOYEE**: Standard employee without management responsibilities
2. **TRAINER**: Employee who can teach courses

#### Additional Roles (Can be combined with base roles)
3. **TEAM_MANAGER**: Manages a team (can be combined with REGULAR_EMPLOYEE or TRAINER)
4. **DEPARTMENT_MANAGER**: Manages a department (can be combined with other roles)
5. **DECISION_MAKER**: Has approval authority (often combined with DEPARTMENT_MANAGER)
6. **HR_MANAGER**: Company-level administrator (sees company profile page)
7. **DIRECTORY_ADMIN**: Platform-level administrator (sees all companies)

### Role Combinations
Users can have multiple roles simultaneously:
- `REGULAR_EMPLOYEE + TEAM_MANAGER`
- `REGULAR_EMPLOYEE + DEPARTMENT_MANAGER`
- `TRAINER + DEPARTMENT_MANAGER`
- `TRAINER + TEAM_MANAGER`
- `REGULAR_EMPLOYEE + DECISION_MAKER + DEPARTMENT_MANAGER`

### Role Rules
- **Base Role Requirement**: Every employee MUST have either `REGULAR_EMPLOYEE` or `TRAINER` as a base role
- **DECISION_MAKER Uniqueness**: Only ONE `DECISION_MAKER` per company
- **Format**: Roles are separated by `+` (e.g., `REGULAR_EMPLOYEE + TEAM_MANAGER`)

### Permissions by Role

#### REGULAR_EMPLOYEE
- View own profile
- Edit own profile (after approval)
- Submit requests (after approval)
- View own requests history
- Enrich profile (one-time only)

#### TRAINER
- All REGULAR_EMPLOYEE permissions
- Configure trainer settings
- View courses taught
- View management hierarchy (if also manager)

#### TEAM_MANAGER / DEPARTMENT_MANAGER
- All base role permissions
- View management hierarchy (read-only)
- Navigate to employee profiles from hierarchy

#### HR_MANAGER
- All employee permissions
- View company dashboard
- Approve/reject employee requests
- Approve/reject profile enrichments
- Add/Edit/Delete employees
- Upload CSV files
- View company-wide data

#### DECISION_MAKER
- All employee permissions
- Access to company-level decisions
- View comprehensive company analytics
- Only one per company (enforced in CSV validation)

#### DIRECTORY_ADMIN
- View all companies (read-only)
- View any company profile (read-only)
- View any employee profile (read-only)
- Navigate between companies and employees
- **Cannot** modify any data (read-only mode)
- **Cannot** approve/reject requests
- **Cannot** approve/reject profiles
- **Cannot** edit company details
- **Cannot** modify employee profiles

---

## UI/UX Flows by Profile Type

### Employee Profile

#### Profile Status Flow
1. **Basic** → Initial profile state (from CSV)
2. **Enriched** → After enrichment process (bio, skills, etc. added)
3. **Approved** → After HR approval (required for submitting requests)
4. **Rejected** → If enrichment is rejected by HR

#### Tabs & Sections

**Overview Tab:**
- Basic information (name, email, role, department, team)
- Profile photo (from LinkedIn/GitHub or placeholder)
- Bio and enrichment data (if enriched)
- Skills section (from Skills Engine microservice)
- Courses section (from Course Builder microservice)
- Learning Path section (from Learner AI microservice)
- Project summaries (from GitHub repositories)
- Value proposition (AI-generated career progression text)

**Management Tab:**
- **Trainer Settings** (if TRAINER role):
  - Appears at top of Management tab
  - Trainer preferences
  - AI-enabled toggle
  - Public publish enable toggle
  - Courses taught section
  - **Collapsed by default**
- **Management Hierarchy** (if TEAM_MANAGER or DEPARTMENT_MANAGER):
  - Appears below Trainer Settings (if trainer is also manager)
  - For TEAM_MANAGER: Shows team members and team structure
  - For DEPARTMENT_MANAGER: Shows department teams and employees
  - Expandable/collapsible sections
  - Employee cards with names, roles, and basic info
  - **Collapsed by default**
  - Fallback logic: If no direct reports found, shows manager's own team/department

**Requests Tab:**
- Submit new request form
- Request type dropdown (learn-new-skills, apply-trainer, self-learning, other)
- Title and description fields
- View request history
- Request status tracking

#### Special UI Logic

**Trainer Profile:**
- Trainer Settings section appears FIRST in Management tab
- Management Hierarchy appears BELOW Trainer Settings (if trainer is also manager)
- Both sections collapsed by default

**Manager Profile:**
- Management Hierarchy section shows team/department structure
- If no direct reports found:
  - TEAM_MANAGER: Falls back to showing all employees in manager's assigned team
  - DEPARTMENT_MANAGER: Falls back to showing all employees in manager's department
- Hierarchy UI matches Company Profile hierarchy tab style
- Expandable/collapsible sections

**Profile Status Gates:**
- Learning & Development sections (Skills, Courses, Learning Path, Requests) only visible when `profile_status === 'approved'`
- Before approval: Shows "Pending approval" message
- After approval: Full access to all features

**Admin View:**
- Detected via `?admin=true` query param or `user.isAdmin` or `user.role === 'DIRECTORY_ADMIN'`
- All edit/approve/reject actions disabled
- Read-only notices displayed
- Navigation maintains `?admin=true` context

---

### Company Profile

#### Header Section
- Company logo (circular, 80px) with `object-fit: contain` and `padding: 4px`
- Company name (large, bold)
- Industry subtitle
- Fallback to company initial if logo missing or fails to load

#### Tabs Available

1. **Overview**
   - Company metrics (employee count, departments, teams)
   - Company information (name, industry, domain)
   - Quick stats

2. **Dashboard**
   - Analytics dashboard
   - Charts and visualizations
   - Company KPIs

3. **Hierarchy**
   - Organizational structure
   - Departments and teams
   - Employee assignments
   - Expandable/collapsible sections
   - Visual tree structure

4. **Employees**
   - Full employee list
   - Search and filter functionality
   - Add/Edit/Delete employees (HR only)
   - CSV upload option (HR only)
   - Employee cards with basic info

5. **Enroll to Courses**
   - Course enrollment section
   - Integration with Course Builder microservice

6. **Pending Requests**
   - Employee requests requiring approval
   - Request cards with:
     - Employee name and email
     - Request type and title
     - Description
     - Priority badge
     - Submission date
   - Approve/Reject actions (HR only)
   - "View Employee" button
   - **Auto-refresh**: On tab click and window focus
   - **401 Error Handling**: Treats 401 as "no requests" for new companies
   - **Read-only for Admin**: Buttons disabled, notice displayed

7. **Approvals**
   - Pending profile approvals
   - Employees with enriched profiles awaiting approval
   - Approve/Reject actions (HR only)
   - "View Profile" button
   - **Read-only for Admin**: Buttons hidden

#### Actions Available

**For HR Managers:**
- View all company data
- Approve/reject employee requests
- Approve/reject profile enrichments
- Add/Edit/Delete employees
- Upload CSV files
- View company analytics

**For Regular Employees:**
- View company hierarchy (read-only)
- View employee list (read-only)
- View company information (read-only)

**For Admins (Read-Only Mode):**
- View all company data
- **Cannot** approve/reject requests (buttons disabled, notice shown)
- **Cannot** approve/reject profiles (buttons hidden)
- **Cannot** edit company details
- **Cannot** modify employee profiles (buttons hidden in Employee List)

---

### Admin Profile (Directory Admin)

#### Header Section
- Admin avatar (circular, initial letter)
- Admin name and role
- "Directory Admin" badge in Header component

#### Tabs Available

1. **Overview**
   - Grid of company cards
   - Each card shows:
     - Company logo (60px circular) with fallback to initial
     - Company name
     - Industry
     - Domain
     - Status badge (color-coded: green=approved, yellow=pending, red=rejected)
     - Created date
   - Clicking card navigates to company profile with `?admin=true` query param

2. **Requests**
   - Placeholder for future company-level requests
   - "Coming soon" message

3. **Management & Reporting**
   - Placeholder for microservice integration
   - "View System Analytics" link (shows redirect message)
   - Descriptive text with inline link

#### Actions Available
- View all companies
- View any company profile (read-only)
- View any employee profile (read-only)
- Navigate between companies and employees
- **Cannot** modify any data (read-only mode)

#### Special Logic

**Read-Only Mode:**
- All company profiles accessed via admin show read-only notices
- Approve/Reject buttons disabled in Requests tab
- Approve/Reject buttons hidden in Approvals tab
- Edit buttons disabled in employee profiles
- Add/Edit/Delete buttons hidden in Employee List

**Navigation:**
- All links include `?admin=true` query param
- Maintains admin context throughout navigation

**Authentication:**
- Auto-detection: System tries admin authentication first, then falls back to employee
- No checkbox needed - system auto-detects based on email
- Admin email: `admin@educore.io` (reserved, cannot be used by companies/employees)

---

## Business Logic & Rules

### Profile Status State Machine

```
basic → enriched → approved
         ↓
      rejected
```

**Transitions:**
- `basic` → `enriched`: After successful enrichment (LinkedIn + GitHub + AI)
- `enriched` → `approved`: After HR approval
- `enriched` → `rejected`: After HR rejection
- **No reverse transitions**: Once approved/rejected, status doesn't change back

### Enrichment Rules

1. **One-Time Only**: Enrichment can only happen once per employee
2. **Both Required**: Both LinkedIn and GitHub must be connected
3. **No Fallback**: If AI enrichment fails, enrichment fails (no mock data)
4. **Automatic Trigger**: Enrichment triggers automatically after GitHub connection (if LinkedIn already connected)
5. **Approval Required**: Enriched profiles require HR approval before full access

### Request Rules

1. **Profile Approval Required**: Employees can only submit requests if `profile_status === 'approved'`
2. **Request Types**: learn-new-skills, apply-trainer, self-learning, other
3. **Status Flow**: pending → approved/rejected/in_progress/completed
4. **HR Review**: All requests appear in Company Profile → Pending Requests tab
5. **Auto-Refresh**: Requests refresh on tab click and window focus

### Manager Hierarchy Rules

1. **TEAM_MANAGER**: Manages a specific team
   - First checks for directly managed employees
   - If none found, falls back to showing all employees in manager's assigned team
2. **DEPARTMENT_MANAGER**: Manages a department
   - First checks for directly managed employees
   - If none found, falls back to showing all employees in manager's department
3. **Hierarchy Display**: Expandable/collapsible sections, collapsed by default
4. **UI Style**: Matches Company Profile hierarchy tab style

### Company Settings Rules

1. **Approval Policy**: `'manual'` or `'auto'`
   - If `'manual'`: Must have exactly one `DECISION_MAKER` in CSV
   - If `'auto'`: Automatic approval (no DECISION_MAKER required)
2. **KPIs**: Mandatory, semicolon-separated (e.g., `"KPI1;KPI2;KPI3"`)
3. **Passing Grade**: Number 0-100, mandatory
4. **Max Attempts**: Positive number, mandatory
5. **Exercises Limited**: Boolean (`true`/`false`), mandatory
6. **Num of Exercises**: Number, required if `exercises_limited = true`

### Email Rules

1. **Global Uniqueness**: Email must be unique across ALL companies (not just within company)
2. **Reserved Email**: `admin@educore.io` is reserved for Directory Admin
   - Cannot be used by any company or employee
   - Validation in CSV upload, AddEmployeeUseCase, EmployeeRepository
   - Clear error message: "Email is reserved for Directory Admin and cannot be used"
3. **Format Validation**: Must follow standard email format
4. **Case Insensitive**: Email comparisons are case-insensitive

### Role Validation Rules

1. **Base Role Required**: Every employee MUST have either `REGULAR_EMPLOYEE` or `TRAINER`
2. **Valid Combinations**: Additional roles can be combined:
   - `REGULAR_EMPLOYEE + TEAM_MANAGER`
   - `REGULAR_EMPLOYEE + DEPARTMENT_MANAGER`
   - `TRAINER + DEPARTMENT_MANAGER`
   - `REGULAR_EMPLOYEE + DECISION_MAKER + DEPARTMENT_MANAGER`
3. **Invalid Examples**:
   - `TEAM_MANAGER` alone (missing base role)
   - `DEPARTMENT_MANAGER + DECISION_MAKER` (missing base role)
4. **DECISION_MAKER Uniqueness**: Only ONE per company (enforced in CSV validation)

### Logo Display Rules

1. **Company Logos**: Circular, 80px, `object-fit: contain`, `padding: 4px`
2. **Admin Cards**: Circular, 60px, `object-fit: contain`, `padding: 4px`
3. **Fallback**: Company initial letter if logo missing or fails to load
4. **Error Handling**: Graceful fallback on image load errors

---

## CSV Format Requirements

### File Structure

**Total Columns**: 26 columns in exact order

**Row 1**: Header row with all 26 column names

**Row 2**: Company settings row
- Fields 1-10: Company data
- Fields 11-26: **EMPTY** (16 empty fields)

**Row 3+**: Employee data rows
- Fields 1-10: **EMPTY** (10 empty fields - exactly 10 commas)
- Fields 11-26: Employee data

### Column Order (26 Total)

1. `company_name`
2. `industry`
3. `logo_url`
4. `approval_policy`
5. `kpis`
6. `passing_grade`
7. `max_attempts`
8. `exercises_limited`
9. `num_of_exercises`
10. `learning_path_approval`
11. `employee_id`
12. `full_name`
13. `email`
14. `role_type`
15. `department_id`
16. `department_name`
17. `team_id`
18. `team_name`
19. `manager_id`
20. `password`
21. `current_role_in_company`
22. `target_role_in_company`
23. `preferred_language`
24. `status`
25. `ai_enabled`
26. `public_publish_enable`

### Row 2 – Company Settings (Required)

**All fields must be filled:**
- `company_name`: Company name
- `industry`: Industry classification
- `logo_url`: URL to company logo image
- `approval_policy`: `'manual'` or `'auto'`
- `kpis`: Semicolon-separated (e.g., `"KPI1;KPI2;KPI3"`)
- `passing_grade`: Number 0-100
- `max_attempts`: Positive number
- `exercises_limited`: `'true'` or `'false'`
- `num_of_exercises`: Number (required if `exercises_limited = true`)
- `learning_path_approval`: `'auto'` or `'manual'` (alternative to approval_policy)

**Fields 11-26**: Must be empty (16 empty fields)

**Note**: If `approval_policy = 'manual'`, CSV must include exactly one employee with `DECISION_MAKER` role.

### Row 3+ – Employee Records (Required per employee)

**Fields 1-10**: Must be empty (10 empty fields - exactly 10 commas)

**Required Fields (11-26):**
- `employee_id`: Unique identifier within company
- `full_name`: Employee full name
- `email`: Unique email (cannot be `admin@educore.io`)
- `role_type`: Must include `REGULAR_EMPLOYEE` or `TRAINER` as base role
- `department_id`, `department_name`: Department information
- `team_id`, `team_name`: Team information
- `manager_id`: Manager's employee_id (can be empty `""`)
- `password`: Employee password (will be hashed)
- `current_role_in_company`: Current job title
- `target_role_in_company`: Target job title
- `preferred_language`: Language code (e.g., `en`)
- `status`: `'active'` or `'inactive'`

**Only for TRAINERS:**
- `ai_enabled`: `'true'` or `'false'`
- `public_publish_enable`: `'true'` or `'false'`

### Critical Formatting Rules

1. **Exactly 10 empty fields** at the start of each employee row (rows 3+)
2. **Exactly 16 empty fields** at the end of the company row (row 2)
3. **All rows must have 26 columns total** (matching the header)
4. **No missing commas** - every field position must be accounted for
5. **Column alignment**: Employee rows must start at column 11 (after 10 empty fields)

### Example CSV Structure

```csv
company_name,industry,logo_url,approval_policy,kpis,passing_grade,max_attempts,exercises_limited,num_of_exercises,learning_path_approval,employee_id,full_name,email,role_type,department_id,department_name,team_id,team_name,manager_id,password,current_role_in_company,target_role_in_company,preferred_language,status,ai_enabled,public_publish_enable
COMPANY_NAME,Industry,https://logo.url,auto,KPI1;KPI2;KPI3,75,3,true,15,auto,,,,,,,,,,,,,
,,,,,,,,,,EMP001,John Doe,john.doe@company.com,REGULAR_EMPLOYEE + DECISION_MAKER,DEPT001,Engineering,TEAM001,Dev Team,,SecurePass123,CEO,CEO,en,active,false,false
,,,,,,,,,,EMP002,Jane Smith,jane.smith@company.com,REGULAR_EMPLOYEE + HR_MANAGER,DEPT002,HR,TEAM002,HR Team,,SecurePass123,HR Manager,HR Director,en,active,false,false
```

---

## CSV Validation Rules

### Structure Validation

1. **File Not Empty**: CSV must contain at least header + company row + 1 employee row
2. **Column Count**: All rows must have exactly 26 columns (matching header)
3. **Company Fields in Row 1 Only**: Company fields must only appear in row 2 (after header)
4. **Employee Fields in Rows 2+ Only**: Employee fields must only appear in rows 3+
5. **No Company Fields in Employee Rows**: Warning if company fields found in employee rows
6. **No Employee Fields in Company Row**: Error if employee fields found in company row

### Company Row Validation (Row 2)

**Required Fields:**
- `kpis`: Mandatory, cannot be empty
- `passing_grade`: Mandatory, must be number 0-100
- `max_attempts`: Mandatory, must be positive number
- `exercises_limited`: Mandatory, must be `'true'` or `'false'`
- `num_of_exercises`: Required if `exercises_limited = true`

**Optional Fields:**
- `company_name`, `industry`, `logo_url`, `approval_policy`, `learning_path_approval`

### Employee Row Validation (Rows 3+)

**Required Fields:**
- `employee_id`: Required, must be unique within CSV
- `full_name`: Required
- `email`: Required, must be valid format, unique, not reserved
- `role_type`: Required, must include base role (REGULAR_EMPLOYEE or TRAINER)
- `department_id`, `department_name`: Required
- `team_id`, `team_name`: Required
- `password`: Required
- `current_role_in_company`: Required
- `target_role_in_company`: Required
- `preferred_language`: Required
- `status`: Required, must be `'active'` or `'inactive'`

**Conditional Fields:**
- `ai_enabled`: Required if TRAINER role
- `public_publish_enable`: Required if TRAINER role

### Role Type Validation

1. **Base Role Check**: Must include `REGULAR_EMPLOYEE` or `TRAINER`
2. **Valid Roles**: REGULAR_EMPLOYEE, TRAINER, TEAM_MANAGER, DEPARTMENT_MANAGER, DECISION_MAKER
3. **Format**: Roles separated by `+` (e.g., `REGULAR_EMPLOYEE + TEAM_MANAGER`)
4. **DECISION_MAKER Count**: Only one DECISION_MAKER allowed per company
5. **DECISION_MAKER Requirement**: If `approval_policy = 'manual'`, must have exactly one DECISION_MAKER

### Email Validation

1. **Format Check**: Must follow standard email format (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
2. **Uniqueness Check**: Must be unique within CSV file
3. **Reserved Email Check**: Cannot be `admin@educore.io`
4. **Database Check**: Pre-validates against existing emails in database
   - If email exists for same company → UPDATE employee
   - If email exists for different company → REJECT with error
   - If email doesn't exist → INSERT new employee

### Validation Pipeline

1. **CSVParser** (`backend/src/infrastructure/CSVParser.js`)
   - Parses CSV buffer into rows
   - Separates company row (row 1) from employee rows (rows 2+)
   - Normalizes company data using `normalizeCompanyRow()`
   - Normalizes employee data using `normalizeEmployeeRow()`
   - Handles column alignment and padding

2. **CSVValidator** (`backend/src/infrastructure/CSVValidator.js`)
   - Validates CSV structure (company fields in row 1, employee fields in rows 2+)
   - Validates role types (base role requirement, DECISION_MAKER uniqueness)
   - Validates email uniqueness within CSV
   - Validates required fields
   - Checks for reserved admin email

3. **DatabaseConstraintValidator** (`backend/src/infrastructure/DatabaseConstraintValidator.js`)
   - Validates data against database constraints
   - Checks mandatory KPIs
   - Validates role types against allowed values
   - Validates approval_policy (`'manual'` or `'auto'`)
   - Ensures all values are properly normalized

4. **ParseCSVUseCase** (`backend/src/application/ParseCSVUseCase.js`)
   - Orchestrates the entire CSV processing pipeline
   - Pre-validates all emails against database
   - Handles company settings from `companyRow`
   - Processes employee data from `employeeRows`
   - Executes database insertion within a transaction
   - Uses `createOrUpdate()` for employees (handles email conflicts)

---

## Database Constraints

### companies Table

#### CHECK Constraints
1. **verification_status**
   - Values: `'pending'`, `'approved'`, `'rejected'`
   - Default: `'pending'`

2. **approval_policy** (Current - Active)
   - Constraint: `companies_approval_policy_check`
   - Values: `'manual'` or `'auto'`
   - Default: `'manual'`
   - **Note**: Old constraint `companies_learning_path_approval_check` (expecting `'automatic'`) should be removed

#### UNIQUE Constraints
3. **domain**: UNIQUE NOT NULL (each company must have unique domain)

#### NOT NULL Constraints
4. **company_name**: Required
5. **domain**: Required
6. **kpis**: Required (TEXT NOT NULL)

### employees Table

#### CHECK Constraints
1. **status**
   - Values: `'active'` or `'inactive'`
   - Default: `'active'`

2. **profile_status**
   - Values: `'basic'`, `'enriched'`, `'approved'`, `'rejected'`
   - Default: `'basic'`

#### UNIQUE Constraints
3. **email**: UNIQUE NOT NULL (GLOBAL - across all companies)
4. **(company_id, employee_id)**: UNIQUE (employee ID unique within company)

#### NOT NULL Constraints
5. **company_id**: Required
6. **employee_id**: Required
7. **full_name**: Required
8. **email**: Required

### employee_roles Table

#### CHECK Constraints
1. **role_type**
   - Values: `'REGULAR_EMPLOYEE'`, `'TRAINER'`, `'TEAM_MANAGER'`, `'DEPARTMENT_MANAGER'`, `'DECISION_MAKER'`

#### UNIQUE Constraints
2. **(employee_id, role_type)**: UNIQUE (employee cannot have same role twice)

### employee_requests Table

#### CHECK Constraints
1. **request_type**
   - Values: `'learn-new-skills'`, `'apply-trainer'`, `'self-learning'`, `'other'`

2. **status**
   - Values: `'pending'`, `'approved'`, `'rejected'`, `'in_progress'`, `'completed'`
   - Default: `'pending'`

### employee_managers Table

#### CHECK Constraints
1. **relationship_type**
   - Values: `'team_manager'`, `'department_manager'`

---

## Authentication & Authorization

### Authentication Mode
**Dummy Authentication** (Testing Phase - Not Production-Ready)

### Authentication Flow

1. **Login Process**:
   - User enters email and password
   - Backend auto-detects account type:
     - Tries admin authentication first
     - If not admin or wrong password, tries employee authentication
   - Returns token and user data
   - Frontend stores token in localStorage

2. **Token Format**:
   - Employee: `dummy-token-<employeeId>-<email>-<timestamp>`
   - Admin: `dummy-token-admin-<adminId>-<email>-<timestamp>`

3. **Token Validation**:
   - Token extracted from `Authorization: Bearer <token>` header
   - Backend validates token format
   - Extracts user ID from token
   - Looks up user in database (employees or directory_admins)

### Authorization Middleware

1. **authMiddleware**: Validates token, attaches user to `req.user`
2. **adminOnlyMiddleware**: Ensures user is admin (must be used after authMiddleware)
3. **hrOnlyMiddleware**: Ensures user is HR (must be used after authMiddleware)
4. **optionalAuthMiddleware**: Validates token if present, but doesn't fail if missing

### Admin Email Reservation

- **Reserved Email**: `admin@educore.io`
- **Protection**: Cannot be used by any company or employee
- **Validation Points**:
  - CSV upload (`CSVValidator`)
  - Add employee (`AddEmployeeUseCase`)
  - Employee repository (`EmployeeRepository.createOrUpdate`)
- **Error Type**: `reserved_email` (translated to user-friendly message)

### Response Envelope Format

All API responses (except auth endpoints) follow this structure:

```javascript
{
  requester_service: 'directory_service',
  response: {
    // Actual data here
  }
}
```

**Important**: Controllers should **NOT** manually wrap responses. The `formatResponse` middleware handles it automatically.

**Auth Endpoints Exception**: `/auth/login`, `/auth/logout`, `/auth/me` do NOT use envelope structure.

---

## Error Fixes & Solutions

### 1. CSV Column Misalignment Error

**Error:**
```
Invalid email format: HR Manager
12 rows with errors
```

**Root Cause:**
Employee rows (row 3+) were missing empty fields corresponding to company-level columns at the beginning, causing column misalignment.

**Solution:**
- Updated CSV generation to include 10 empty fields at the start of each employee row
- Ensured all rows have the same number of columns (26) matching the header
- Fixed in `test_company_lotus_techhub.csv`

**Prevention:**
- CSV validator checks column count consistency
- Parser normalizes rows before processing

---

### 2. Pending Requests Not Visible (401 Unauthorized)

**Error:**
```
Failed to load pending requests
401 Unauthorized error
Token in localStorage: null
```

**Root Causes:**
1. **Double-envelope issue (Fixed earlier):**
   - `RequestController.getCompanyRequests` was returning data in double-envelope format
   - Frontend was parsing `response.response.requests` but actual path was `response.response.response.requests`
   - **Fix:** Removed manual envelope wrapping from `RequestController.getCompanyRequests`, let `formatResponse` middleware handle envelope wrapping

2. **401 Error on new company view (Current fix):**
   - When a company is just created via CSV upload, user is redirected to company profile
   - User might not be logged in (no token in localStorage)
   - `PendingRequestsSection` tries to fetch requests but gets 401 Unauthorized
   - Component shows error message instead of gracefully handling "no requests" case

**Solution:**
- **Frontend fix:** Handle 401 errors gracefully in `PendingRequestsSection`
  - If error is 401 Unauthorized, treat as "no requests" (new company won't have requests anyway)
  - Set `error = null` and `requests = []` for 401 errors
  - Only show error message for other errors (500, network, etc.)
  - This prevents showing "Failed to load pending requests" when viewing a new company without login

**Files Changed:**
- `backend/src/presentation/RequestController.js` (earlier fix)
- `frontend/src/components/PendingRequestsSection.js` (both fixes)

**Prevention:**
- Always handle 401 errors gracefully when the absence of data is acceptable (e.g., new companies with no requests)
- Distinguish between authentication errors (401) and actual data errors (500, network failures)

---

### 3. Employee Profile Not Loading After Enrichment

**Error:**
```
Syntax error: Identifier 'isAdminView' has already been declared
```

**Root Cause:**
- Duplicate `isAdminView` variable declaration in `EmployeeProfilePage.js`

**Solution:**
- Removed duplicate declaration
- Fixed `useEffect` dependency to correctly use `isAdminView`

**Files Changed:**
- `frontend/src/pages/EmployeeProfilePage.js`

---

### 4. Management Hierarchy 404 Error

**Error:**
```
GET /companies/:companyId/employees/:employeeId/management-hierarchy → 404
Failed to load management hierarchy
```

**Root Causes:**
1. UUID comparison mismatch: `employee.company_id` (UUID object) vs `companyId` (string)
2. Manager hierarchy logic not finding direct reports
3. Response format not matching frontend expectations

**Solutions:**
1. Fixed UUID comparison: `String(employee.company_id) !== String(companyId)`
2. Added fallback logic for team managers:
   - First checks for directly managed employees
   - If none found, queries manager's own assigned team
3. Added fallback for department managers:
   - Queries manager's own department if no managed employees found
4. Ensured response format matches frontend expectations
5. Added extensive logging for debugging

**Files Changed:**
- `backend/src/application/GetManagerHierarchyUseCase.js`
- `backend/src/presentation/EmployeeController.js`
- `frontend/src/components/ProfileManagement.js`

---

### 5. Admin Overview Missing Companies

**Error:**
```
Companies not appearing in Admin Dashboard Overview
```

**Root Cause:**
- Same double-envelope issue as pending requests
- `AdminController.getAllCompanies` was manually wrapping response
- `formatResponse` middleware wrapped it again

**Solution:**
- Removed manual envelope wrapping from all `AdminController` methods
- Let `formatResponse` middleware handle wrapping
- Frontend now correctly parses `response.response.companies`
- Added `logo_url` to the query

**Files Changed:**
- `backend/src/presentation/AdminController.js`
- `frontend/src/pages/AdminDashboard.js`

---

### 6. Invalid Hierarchy Data Structure

**Error:**
```
Invalid hierarchy data structure received
Expected hierarchy.manager_type but got: null
```

**Root Cause:**
- Frontend expecting different response structure than backend provided
- Response parsing not handling all possible formats

**Solution:**
- Updated `ProfileManagement.js` to handle multiple response formats
- Added fallback parsing strategies
- Updated UI to match `CompanyHierarchy` component style
- Set default state for sections to collapsed

**Files Changed:**
- `frontend/src/components/ProfileManagement.js`

---

### 7. Logo Not Displayed / Logo Fitting

**Error:**
```
Company logo not showing or cropped incorrectly
```

**Root Cause:**
- Logo URL not being fetched or displayed correctly
- Image loading errors not handled
- Logo cropping with `object-fit: cover`

**Solution:**
- Verified logo URL in database
- Added error handling for image loading
- Added fallback to company initial if image fails
- Changed `object-fit` from `'cover'` to `'contain'`
- Added `padding: '4px'` and `objectPosition: 'center'` for better fitting

**Files Changed:**
- `frontend/src/pages/CompanyProfilePage.js`
- `frontend/src/pages/AdminDashboard.js`

---

### 8. Approval Policy Constraint Violation

**Error:**
```
Approval policy must be either "manual" or "auto". Received value: "auto"
```

**Root Cause:**
- Two CHECK constraints existed on `approval_policy` column:
  1. `companies_approval_policy_check`: allows `'manual'` or `'auto'` ✅ (correct)
  2. `companies_learning_path_approval_check`: allows `'manual'` or `'automatic'` ❌ (old/wrong)
- Both constraints must pass, so only `'manual'` worked (satisfies both)
- `'auto'` failed because the old constraint expects `'automatic'`

**Solution:**
- Created diagnostic script to identify the issue
- Created fix script to drop the old constraint
- Removed `companies_learning_path_approval_check` constraint
- Kept only `companies_approval_policy_check` (allowing `'manual'` or `'auto'`)

**Files Created:**
- `database/scripts/diagnose_approval_policy_constraints.sql`
- `database/scripts/fix_approval_policy_constraints.sql`

**Prevention:**
- Always check for old constraints when migrating database schemas
- Ensure only one constraint exists per column

---

## Special Considerations

### UUID Handling

- **Always convert UUIDs to strings for comparison**: `String(uuid1) === String(uuid2)`
- **Database returns UUIDs as objects**, URL params are strings
- **Use `$1::uuid` casting in SQL queries** for consistency

### Response Envelope Format

- **All API responses** (except auth endpoints) use envelope structure
- **Controllers should NOT manually wrap** - middleware handles it
- **Frontend parsing**: Always check `response.response.data` or `response.response.requests`

### Admin Read-Only Mode

- **Detection**: Via `?admin=true` query param or `user.isAdmin` or `user.role === 'DIRECTORY_ADMIN'`
- **All edit/approve/reject actions disabled**
- **Read-only notices displayed**
- **Navigation maintains `?admin=true` context**

### Refresh Mechanisms

- **Pending Requests**: Refreshes on tab click and window focus
- **Company Profile**: Refreshes on tab navigation
- **Employee Profile**: Refreshes on data updates

### Logo Display

- **Company Logos**: Circular, 80px, `object-fit: contain`, `padding: 4px`
- **Admin Cards**: Circular, 60px, `object-fit: contain`, `padding: 4px`
- **Fallback**: Company initial letter if logo missing or fails to load
- **Error Handling**: Graceful fallback on image load errors

### Profile Status Gates

- **Learning & Development sections** only visible when `profile_status === 'approved'`
- **Request submission** only allowed when `profile_status === 'approved'`
- **Skills, Courses, Learning Path** sections hidden until approval

### Management Hierarchy Fallbacks

- **TEAM_MANAGER**: If no direct reports, shows all employees in manager's assigned team
- **DEPARTMENT_MANAGER**: If no direct reports, shows all employees in manager's department
- **Sections collapsed by default**

### CSV Processing Transaction

- **All CSV processing happens in a single transaction**
- **If any error occurs, entire transaction rolls back**
- **Pre-validation** of emails before transaction starts
- **Email conflict handling**: Update if same company, reject if different company

---

## Architecture Overview

### Backend Structure

```
backend/src/
├── presentation/          # Controllers (HTTP handlers)
│   ├── AuthController.js
│   ├── AdminController.js
│   ├── CSVUploadController.js
│   ├── CompanyProfileController.js
│   ├── EmployeeController.js
│   ├── RequestController.js
│   └── ...
├── application/           # Use Cases (business logic)
│   ├── ParseCSVUseCase.js
│   ├── EnrichProfileUseCase.js
│   ├── GetManagerHierarchyUseCase.js
│   └── ...
├── infrastructure/        # Repositories, API clients
│   ├── CSVParser.js
│   ├── CSVValidator.js
│   ├── DatabaseConstraintValidator.js
│   ├── EmployeeRepository.js
│   ├── CompanyRepository.js
│   └── ...
└── shared/                # Shared utilities
    ├── authMiddleware.js
    ├── ErrorTranslator.js
    ├── requestParser.js
    └── responseFormatter.js
```

### Frontend Structure

```
frontend/src/
├── pages/                 # Page components
│   ├── LoginPage.js
│   ├── AdminDashboard.js
│   ├── CompanyProfilePage.js
│   ├── EmployeeProfilePage.js
│   └── ...
├── components/            # Reusable components
│   ├── Header.js
│   ├── CompanyDashboard.js
│   ├── ProfileManagement.js
│   ├── PendingRequestsSection.js
│   └── ...
├── context/               # React Context providers
│   └── AuthContext.js
├── services/              # API service functions
│   ├── authService.js
│   ├── adminService.js
│   ├── employeeService.js
│   └── ...
└── utils/                 # Utility functions
    └── api.js             # Axios instance with interceptors
```

### Database Structure

```
database/
├── migrations/
│   └── 001_initial_schema.sql
└── scripts/
    ├── diagnose_approval_policy_constraints.sql
    ├── fix_approval_policy_constraints.sql
    └── create_admin_account.sql
```

---

## Key Implementation Details

### CSV Processing Flow

1. **Upload**: Frontend sends CSV file via `POST /api/v1/companies/:id/upload`
2. **Parse**: `CSVParser.parse()` converts buffer to rows
3. **Normalize**: Separate company row (row 1) from employee rows (rows 2+)
4. **Validate**: `CSVValidator.validate()` checks structure, roles, emails
5. **Pre-validate**: Check all emails against database before transaction
6. **Process**: `ParseCSVUseCase.processValidRows()` within transaction:
   - Update company settings
   - Create departments and teams
   - Create/update employees
   - Assign roles
   - Create manager relationships
7. **Commit**: Transaction commits if all successful, rolls back on error

### Profile Enrichment Flow

1. **LinkedIn Connection**: OAuth flow → Store LinkedIn data
2. **GitHub Connection**: OAuth flow → Store GitHub data
3. **Auto-Trigger**: If both connected, `EnrichProfileUseCase` runs automatically
4. **AI Generation**: Google Gemini generates:
   - Bio (from LinkedIn + GitHub data)
   - Project summaries (from GitHub repositories)
   - Value proposition (career progression text)
5. **Status Update**: `profile_status = 'enriched'`
6. **Approval Request**: Creates entry in `employee_profile_approvals` table

### Request Flow

1. **Submission**: Employee submits request via profile → Requests tab
2. **Storage**: Request stored in `employee_requests` table with `status = 'pending'`
3. **Display**: Request appears in Company Profile → Pending Requests tab
4. **Review**: HR can approve/reject (future: implement approval logic)
5. **Status Update**: Request status updated to `'approved'` or `'rejected'`

### Admin Authentication Flow

1. **Auto-Detection**: Backend tries admin authentication first
2. **Fallback**: If not admin or wrong password, tries employee authentication
3. **Token Generation**: Admin tokens have `admin-` prefix
4. **Redirect**: Admin redirected to `/admin/dashboard`
5. **Read-Only**: All admin views are read-only

---

## Testing Checklist

### CSV Upload
- [ ] Company fields only in row 1
- [ ] Employee fields only in rows 2+
- [ ] Base role requirement (REGULAR_EMPLOYEE or TRAINER)
- [ ] Only one DECISION_MAKER per company
- [ ] Email uniqueness validation
- [ ] Reserved email validation (admin@educore.io)
- [ ] Approval policy validation (`'manual'` or `'auto'`)
- [ ] Column alignment (10 empty fields in employee rows)

### Employee Profiles
- [ ] Regular employee can view/edit own profile
- [ ] Trainer sees Trainer Settings section
- [ ] Manager sees Management Hierarchy
- [ ] HR can approve/reject requests
- [ ] Admin sees read-only view
- [ ] Profile status gates work correctly
- [ ] Management hierarchy fallbacks work

### Company Profile
- [ ] Logo displays correctly
- [ ] Pending requests visible and refreshable
- [ ] Pending approvals visible
- [ ] Admin read-only mode works
- [ ] All tabs functional
- [ ] 401 errors handled gracefully for new companies

### Admin Dashboard
- [ ] Companies appear in Overview
- [ ] Company logos display
- [ ] Clicking company navigates to read-only profile
- [ ] Management & Reporting link works
- [ ] Read-only mode enforced throughout

---

## Future Enhancements (Not Implemented)

1. **CSV Validation Improvements**
   - Real-time validation feedback
   - Better error messages with row numbers
   - Preview before upload

2. **Profile Enhancements**
   - Bulk actions for HR
   - Advanced filtering and search
   - Export functionality

3. **Admin Features**
   - Company-level analytics
   - System-wide reporting
   - User management UI

4. **Request System**
   - Full approval/rejection workflow
   - Email notifications
   - Request history tracking

5. **Management & Reporting**
   - Microservice integration
   - Analytics dashboard
   - Reporting features

---

## Critical Notes

### Do Not Modify

1. **Response Envelope Format**: Controllers should NOT manually wrap responses
2. **Auth Endpoints**: Do NOT use envelope structure for `/auth/*` endpoints
3. **UUID Comparisons**: Always convert to strings before comparing
4. **Admin Email**: `admin@educore.io` is reserved - validation must remain
5. **Profile Status Gates**: Learning & Development sections require `profile_status === 'approved'`

### Important Patterns

1. **Error Handling**: Always handle 401 errors gracefully when absence of data is acceptable
2. **Transaction Safety**: All CSV processing in single transaction
3. **Pre-Validation**: Validate emails against database before transaction
4. **Fallback Logic**: Management hierarchy has fallbacks for edge cases
5. **Read-Only Mode**: Admin views should never allow modifications

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-21  
**Maintained By**: Development Team

---

*This document serves as the single source of truth for all implemented features, UI/UX flows, business logic, CSV requirements, and fixes. Use this as a reference when continuing development or onboarding new team members.*

