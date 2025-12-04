# UPDATED TODO LIST

**Generated:** 2025-01-20  
**Purpose:** Prioritized list of fixes, improvements, and features to implement  
**Sorting:** By priority (Critical → High → Medium → Low) and dependencies

---

## Table of Contents

1. [Critical Security & Functionality (Week 1-2)](#1-critical-security--functionality-week-1-2)
2. [High Priority User-Facing Issues (Week 3-4)](#2-high-priority-user-facing-issues-week-3-4)
3. [Medium Priority Improvements (Week 5-6)](#3-medium-priority-improvements-week-5-6)
4. [Data Integrity & Validation (Week 7)](#4-data-integrity--validation-week-7)
5. [UX Enhancements (Week 8)](#5-ux-enhancements-week-8)
6. [Future Enhancements (Post-MVP)](#6-future-enhancements-post-mvp)

---

## 1. Critical Security & Functionality (Week 1-2)

### 1.1. Security Fixes (MUST DO FIRST)

#### ✅ **TASK-001: Add Prompt Sanitization**
- **Priority:** 🔴 Critical
- **Effort:** 2-3 days
- **Dependencies:** None
- **Description:** Sanitize all user inputs before inserting into AI prompts to prevent prompt injection attacks
- **Files to Modify:**
  - `backend/src/infrastructure/OpenAIAPIClient.js`
  - `backend/src/infrastructure/GeminiAPIClient.js`
- **Implementation:**
  - Create sanitization utility function
  - Remove/escape special characters that could be used for injection
  - Validate input length and format
  - Test with various injection attempts

#### ✅ **TASK-002: Implement Audit Logging**
- **Priority:** 🔴 Critical
- **Effort:** 3-4 days
- **Dependencies:** None
- **Description:** Add audit logging for all critical actions (approvals, deletions, profile edits, etc.)
- **Files to Create/Modify:**
  - Create `backend/src/infrastructure/AuditLogger.js`
  - Modify all controllers to log actions:
    - `EmployeeProfileApprovalController.js` (approve/reject)
    - `RequestController.js` (approve/reject requests)
    - `CompanyVerificationController.js` (approve/reject company)
    - `EmployeeController.js` (add/update/delete)
    - `UpdateEmployeeUseCase.js` (profile edits)
- **Implementation:**
  - Create audit logging service
  - Log: action_type, user_id, resource_type, resource_id, action_details, timestamp
  - Add to `audit_logs` table (already exists in schema)
  - Include IP address and user agent for security

### 1.2. Critical Functionality Fixes

#### ✅ **TASK-003: Complete Request Approval/Rejection Handlers**
- **Priority:** 🔴 Critical
- **Effort:** 2-3 days
- **Dependencies:** TASK-002 (audit logging)
- **Description:** Implement the approve/reject buttons in `PendingRequestsSection.js` that currently have TODO comments
- **Files to Modify:**
  - `frontend/src/components/PendingRequestsSection.js` (lines 105, 110)
  - `backend/src/presentation/RequestController.js` (enhance `updateRequestStatus`)
- **Implementation:**
  - Connect frontend buttons to `PUT /api/v1/companies/:id/requests/:requestId` endpoint
  - Add status update logic
  - Send notification to employee (future: email notification)
  - Refresh request list after approval/rejection
  - Add audit log entry

#### ✅ **TASK-004: Fix Request Submission Feedback**
- **Priority:** 🔴 Critical
- **Effort:** 1 day
- **Dependencies:** None
- **Description:** Ensure request list refreshes immediately after submission (referenced in PROJECT_GAP_ANALYSIS.md lines 715-719)
- **Files to Modify:**
  - `frontend/src/components/ProfileRequests.js` (lines 45-78)
- **Implementation:**
  - Ensure `fetchRequests()` is called after successful submission
  - Add optimistic UI update (show request immediately)
  - Handle edge cases (network errors, etc.)

#### ✅ **TASK-005: Add Comprehensive Error Handling for CSV Processing**
- **Priority:** 🔴 Critical
- **Effort:** 2-3 days
- **Dependencies:** None
- **Description:** Handle all edge cases in CSV processing (empty rows, special characters, encoding issues)
- **Files to Modify:**
  - `backend/src/application/ParseCSVUseCase.js`
  - `backend/src/infrastructure/CSVParser.js`
  - `backend/src/infrastructure/CSVValidator.js`
- **Implementation:**
  - Handle empty rows gracefully
  - Handle special characters and encoding (UTF-8, BOM)
  - Handle malformed CSV (missing quotes, etc.)
  - Provide detailed error messages per row
  - Add retry logic for transient errors

#### ✅ **TASK-006: Add Comprehensive OAuth Error Handling**
- **Priority:** 🔴 Critical
- **Effort:** 2 days
- **Dependencies:** None
- **Description:** Add comprehensive error handling and user-friendly messages for OAuth flows
- **Files to Modify:**
  - `backend/src/presentation/OAuthController.js`
  - `frontend/src/pages/EnrichProfilePage.js`
- **Implementation:**
  - Handle OAuth errors (access denied, network errors, etc.)
  - Show user-friendly error messages
  - Add retry mechanism
  - Log errors for debugging
  - Handle token expiration

---

## 2. High Priority User-Facing Issues (Week 3-4)

### 2.1. Employee Management

#### ✅ **TASK-007: Add Employee Search/Filter/Sort**
- **Priority:** 🟠 High
- **Effort:** 3-4 days
- **Dependencies:** None
- **Description:** Add search bar, filter dropdowns (by department, role, status), and sort options to employee list
- **Files to Create/Modify:**
  - Create `frontend/src/components/EmployeeSearchFilterSort.js`
  - Modify `frontend/src/components/EmployeeList.js`
  - Modify `frontend/src/pages/CompanyProfilePage.js`
- **Implementation:**
  - Search by name, email, employee_id
  - Filter by department, team, role, status
  - Sort by name, email, date added
  - Persist filters in URL params
  - Add debounced search input

#### ✅ **TASK-008: Add Manual Employee Form**
- **Priority:** 🟠 High
- **Effort:** 4-5 days
- **Dependencies:** TASK-007 (search/filter should be done first)
- **Description:** Create form to manually add employees (similar to CSV format but without company row)
- **Files to Create:**
  - `frontend/src/components/AddEmployeeForm.js`
- **Files to Modify:**
  - `frontend/src/components/EmployeeList.js` (add "Add Employee" button)
  - `frontend/src/pages/CompanyProfilePage.js`
- **Implementation:**
  - Form fields matching CSV employee row format:
    - employee_id, full_name, email, role_type
    - department_id, department_name, team_id, team_name
    - manager_id, password, current_role_in_company, target_role_in_company
    - preferred_language, status
    - ai_enabled, public_publish_enable (for trainers)
  - Validation matching CSV validation
  - Call `POST /api/v1/companies/:id/employees` endpoint
  - Show success/error messages
  - Refresh employee list after addition

#### ✅ **TASK-009: Add CSV Upload for Additional Employees**
- **Priority:** 🟠 High
- **Effort:** 3-4 days
- **Dependencies:** TASK-008 (manual form should be done first for consistency)
- **Description:** Allow companies to upload additional CSV files with employees (append mode, no company row)
- **Files to Modify:**
  - `frontend/src/components/EmployeeList.js` (add "Upload CSV" option)
  - `backend/src/presentation/CSVUploadController.js` (add append mode)
  - `backend/src/application/ParseCSVUseCase.js` (handle append mode)
- **Implementation:**
  - CSV format: Same as company CSV but WITHOUT row 1 (company settings)
  - Only employee rows (starting from row 1)
  - Validate company-level fields are not present
  - Append to existing employees (don't create duplicates)
  - Show validation results
  - Handle errors gracefully

### 2.2. Profile Management

#### ✅ **TASK-010: Add Profile Edit Approval Workflow for Sensitive Fields**
- **Priority:** 🟠 High
- **Effort:** 5-6 days
- **Dependencies:** TASK-002 (audit logging)
- **Description:** Distinguish between editable fields and sensitive fields that require HR approval
- **Files to Create:**
  - `database/migrations/002_add_profile_edit_requests_table.sql` (if needed)
  - `backend/src/infrastructure/EmployeeProfileEditRequestRepository.js`
- **Files to Modify:**
  - `frontend/src/components/ProfileEditForm.js` (indicate which fields require approval)
  - `backend/src/application/UpdateEmployeeUseCase.js` (check field sensitivity)
  - `backend/src/presentation/EmployeeController.js` (handle approval workflow)
- **Implementation:**
  - Define sensitive fields: email, role_type, department, team, manager
  - Editable fields: preferred_language, contact info (non-sensitive)
  - When sensitive field edited: create approval request
  - Show pending approval status in UI
  - HR can approve/reject profile edit requests
  - Add audit log entries

#### ✅ **TASK-011: Clarify Profile Edit Field Requirements**
- **Priority:** 🟠 High
- **Effort:** 1-2 days
- **Dependencies:** TASK-010 (should be done together)
- **Description:** Clearly indicate which fields are editable vs. require approval (referenced in PROJECT_GAP_ANALYSIS.md lines 723-724)
- **Files to Modify:**
  - `frontend/src/components/ProfileEditForm.js`
- **Implementation:**
  - Add visual indicators (icons, badges) for fields requiring approval
  - Add tooltips explaining approval process
  - Show "Pending Approval" status for sensitive fields
  - Disable editing of fields that already have pending approval

### 2.3. Company Management

#### ✅ **TASK-012: Add Company Settings Edit Form**
- **Priority:** 🟠 High
- **Effort:** 4-5 days
- **Dependencies:** TASK-002 (audit logging)
- **Description:** Allow companies to edit settings (KPIs, approval policy, etc.) - some changes need admin approval
- **Files to Create:**
  - `frontend/src/components/CompanySettingsForm.js`
  - `backend/src/application/UpdateCompanySettingsUseCase.js`
- **Files to Modify:**
  - `frontend/src/pages/CompanyProfilePage.js` (add "Settings" tab)
  - `backend/src/presentation/CompanyProfileController.js` (add settings endpoint)
- **Implementation:**
  - Editable fields: primary_kpis, logo_url, hr_contact_name, hr_contact_email, hr_contact_role
  - Fields requiring admin approval: domain, company_name, industry
  - Create `PUT /api/v1/companies/:id/settings` endpoint
  - Validate KPI format (semicolon-separated)
  - Add approval workflow for sensitive changes
  - Add audit log entries

#### ✅ **TASK-013: Add Logo Upload Endpoint and UI**
- **Priority:** 🟠 High
- **Effort:** 3-4 days
- **Dependencies:** None
- **Description:** Allow companies to upload logo image file instead of just providing URL
- **Clarification:** This means creating a file upload interface where companies can:
  - Select an image file from their computer
  - Crop/resize the image if needed
  - Upload to cloud storage (or server storage)
  - Store the URL in `companies.logo_url` field
- **Files to Create:**
  - `frontend/src/components/LogoUpload.js`
  - `backend/src/infrastructure/FileStorageService.js` (or use cloud storage)
- **Files to Modify:**
  - `frontend/src/components/CompanySettingsForm.js` (include logo upload)
  - `backend/src/presentation/CompanyProfileController.js` (add `POST /api/v1/companies/:id/logo` endpoint)
- **Implementation:**
  - Accept image files (PNG, JPG, SVG)
  - Validate file size (max 5MB)
  - Validate image dimensions
  - Optionally: add image cropping/resizing
  - Upload to cloud storage (AWS S3, Cloudinary, etc.) or server storage
  - Return URL and store in database
  - Handle upload errors gracefully

### 2.4. Enrichment Flow Improvements

#### ✅ **TASK-014: Improve Enrichment Page Loading States**
- **Priority:** 🟠 High
- **Effort:** 2 days
- **Dependencies:** None
- **Description:** Show loading state during enrichment, disable button until complete (referenced in PROJECT_GAP_ANALYSIS.md lines 729-731)
- **Files to Modify:**
  - `frontend/src/pages/EnrichProfilePage.js`
- **Implementation:**
  - Show "Enriching profile..." loading state when both OAuth connected
  - Disable "Continue to Profile" button during enrichment
  - Poll for enrichment status
  - Show progress indicator
  - Only enable button when enrichment complete

---

## 3. Medium Priority Improvements (Week 5-6)

### 3.1. CSV Improvements

#### ✅ **TASK-015: Fix CSV Correction Form**
- **Priority:** 🟡 Medium
- **Effort:** 4-5 days
- **Dependencies:** None
- **Description:** Allow users to correct CSV errors in the UI instead of re-uploading entire file
- **Clarification:** When CSV upload has validation errors, show a form where users can:
  - See each error row
  - Edit the incorrect values inline
  - Submit corrected data
  - Re-validate and process
- **Files to Modify:**
  - `frontend/src/components/CSVErrorDisplay.js`
  - `frontend/src/components/CSVCorrectionForm.js` (complete the TODO at line 143)
  - `backend/src/presentation/CSVUploadController.js` (add correction endpoint)
- **Implementation:**
  - Display error rows in editable table
  - Allow inline editing of cell values
  - Validate corrections before submission
  - Submit only corrected rows
  - Merge with previously valid rows
  - Show success/error feedback

### 3.2. Validation Improvements

#### ✅ **TASK-016: Add Missing Validations**
- **Priority:** 🟡 Medium
- **Effort:** 3-4 days
- **Dependencies:** None
- **Description:** Add validations for email format, file upload, logo upload, KPI format
- **Files to Create:**
  - `backend/src/infrastructure/ValidationUtils.js`
- **Files to Modify:**
  - `frontend/src/components/AddEmployeeForm.js` (email validation)
  - `frontend/src/components/CSVUploadForm.js` (file size/type validation)
  - `frontend/src/components/LogoUpload.js` (image format/size validation)
  - `backend/src/application/UpdateCompanySettingsUseCase.js` (KPI format validation)
- **Implementation:**
  - Email: RFC 5322 compliant validation
  - File upload: Max size (10MB for CSV, 5MB for images), type validation
  - Logo upload: Image format (PNG, JPG, SVG), dimensions, file size
  - KPI format: Semicolon-separated list, no empty values, max length

### 3.3. Navigation & Flow Improvements

#### ✅ **TASK-017: Add Missing Navigation Flows**
- **Priority:** 🟡 Medium
- **Effort:** 2-3 days
- **Dependencies:** None
- **Description:** Improve post-action navigation flows
- **Files to Modify:**
  - `frontend/src/pages/CompanyCSVUploadPage.js` (post-upload flow)
  - `frontend/src/pages/EnrichProfilePage.js` (post-enrichment flow)
  - `frontend/src/components/ProfileRequests.js` (post-request submission)
- **Implementation:**
  - Post-CSV Upload: Show processing results, then "Continue" button (already implemented, verify it works)
  - Post-Enrichment: Show success message, then redirect (already implemented, verify it works)
  - Post-Request Submission: Show success message and refresh list (TASK-004 covers this)

### 3.4. Admin Features

#### ✅ **TASK-018: Add Admin Dashboard Requests Tab Functionality**
- **Priority:** 🟡 Medium
- **Effort:** 3-4 days
- **Dependencies:** TASK-002 (audit logging)
- **Description:** Allow admin to view and manage platform-level requests from companies
- **Files to Create:**
  - `backend/src/application/GetAdminRequestsUseCase.js`
- **Files to Modify:**
  - `frontend/src/pages/AdminDashboard.js` (implement requests tab)
  - `backend/src/presentation/AdminController.js` (add `GET /api/v1/admin/requests` endpoint)
- **Implementation:**
  - Fetch all company requests (not just one company)
  - Filter by company, status, type
  - Show company name with each request
  - Allow admin to approve/reject (if needed)
  - Add audit log entries

### 3.5. Filtering & Organization

#### ✅ **TASK-019: Add Filtering Options for Pending Approvals**
- **Priority:** 🟡 Medium
- **Effort:** 2-3 days
- **Dependencies:** None
- **Description:** Add filters for pending profile approvals (by employee, date, type) (referenced in PROJECT_GAP_ANALYSIS.md lines 856-858)
- **Files to Modify:**
  - `frontend/src/components/PendingProfileApprovals.js`
- **Implementation:**
  - Filter by employee name/email
  - Filter by date range
  - Filter by approval type (if multiple types exist)
  - Sort by date, employee name
  - Persist filters in URL params

---

## 4. Data Integrity & Validation (Week 7)

### 4.1. Database & Migrations

#### ✅ **TASK-020: Review Database Schema and Migrations**
- **Priority:** 🟡 Medium
- **Effort:** 2-3 days
- **Dependencies:** None
- **Description:** Check if all tables in schema are being used, identify unused tables, and create missing migrations
- **Files to Review:**
  - `database/schema.sql`
  - All repository files
  - All use case files
- **Implementation:**
  - List all tables in schema
  - Check which tables are queried in code
  - Identify unused tables (if any)
  - Document findings
  - Create migration for `employee_profile_edit_requests` table (if needed for TASK-010)
  - Create migration for any other missing tables
- **Findings:**
  - ✅ `companies` - USED (created in RegisterCompanyUseCase)
  - ✅ `departments` - USED (created in ParseCSVUseCase)
  - ✅ `teams` - USED (created in ParseCSVUseCase)
  - ✅ `employees` - USED (created in ParseCSVUseCase, AddEmployeeUseCase)
  - ✅ `employee_roles` - USED (created in ParseCSVUseCase)
  - ✅ `employee_teams` - USED (created in ParseCSVUseCase)
  - ✅ `employee_managers` - USED (created in ParseCSVUseCase)
  - ✅ `employee_project_summaries` - USED (created in EnrichProfileUseCase)
  - ✅ `trainer_settings` - USED (created in ParseCSVUseCase, updated in UpdateTrainerSettingsUseCase)
  - ⚠️ `audit_logs` - EXISTS but NOT WRITTEN TO (TASK-002 will fix this)
  - ❌ `company_registration_requests` - **NOT USED** (table exists but registration flow directly creates in `companies` table)
  - ✅ `employee_profile_approvals` - USED (has EmployeeProfileApprovalRepository, used in approval workflow)
  - ✅ `employee_requests` - USED (has EmployeeRequestRepository, used for employee requests)
  - ✅ `directory_admins` - USED (used in DummyAuthProvider for admin authentication)
- **Action Required:**
  - **`company_registration_requests` table is UNUSED** - Decision needed:
    - Option 1: Remove table if not needed
    - Option 2: Implement registration request workflow (companies submit requests, admin approves before creation)
    - **Recommendation:** Keep table for future feature (admin approval workflow for company registration)

### 4.2. Multi-Tenant Isolation

#### ✅ **TASK-021: Add Tenant Isolation Middleware**
- **Priority:** 🟡 Medium
- **Effort:** 4-5 days
- **Dependencies:** None (but should be done before scaling)
- **Description:** Add middleware to ensure company data isolation at the request level
- **Files to Create:**
  - `backend/src/shared/tenantIsolationMiddleware.js`
- **Files to Modify:**
  - `backend/src/index.js` (add middleware to routes)
  - All controllers (ensure company_id is validated)
- **Implementation:**
  - Middleware extracts company_id from request
  - Validates user belongs to company (from token)
  - Ensures all queries are scoped to company
  - Prevents cross-company data access
  - Add to all company-scoped routes

---

## 5. UX Enhancements (Week 8)

### 5.1. Loading States & Feedback

#### ✅ **TASK-022: Improve Loading States**
- **Priority:** 🟡 Medium
- **Effort:** 3-4 days
- **Dependencies:** None
- **Description:** Replace spinners with skeleton loaders, show progress for long operations (referenced in PROJECT_GAP_ANALYSIS.md lines 1156-1159)
- **Files to Create:**
  - `frontend/src/components/SkeletonLoader.js`
  - `frontend/src/components/ProgressBar.js`
- **Files to Modify:**
  - All pages with loading states
  - `frontend/src/pages/CompanyProfilePage.js`
  - `frontend/src/pages/EmployeeProfilePage.js`
  - `frontend/src/components/ProfileSkills.js`
  - `frontend/src/components/ProfileCourses.js`
- **Implementation:**
  - Create reusable skeleton loader components
  - Replace spinners with skeletons
  - Add progress bars for long operations (CSV upload, enrichment)
  - Add optimistic UI updates where appropriate

### 5.2. Employee Onboarding

#### ✅ **TASK-023: Add Employee Onboarding Checklist**
- **Priority:** 🟡 Medium
- **Effort:** 4-5 days
- **Dependencies:** None
- **Description:** Track which employees have completed enrichment, are approved, and send reminders (referenced in PROJECT_GAP_ANALYSIS.md lines 872-876)
- **Files to Create:**
  - `frontend/src/components/EmployeeOnboardingChecklist.js`
  - `backend/src/application/GetEmployeeOnboardingStatusUseCase.js`
- **Files to Modify:**
  - `frontend/src/pages/CompanyProfilePage.js` (add checklist view)
  - `backend/src/presentation/CompanyProfileController.js` (add onboarding status endpoint)
- **Implementation:**
  - Track: enrichment completed, profile approved, OAuth connected
  - Show checklist in company profile
  - Send email reminders to incomplete employees (future: email service)
  - Filter employees by onboarding status
  - Export onboarding report

---

## 6. Future Enhancements (Post-MVP)

### 6.1. Authentication Service Integration

#### 📋 **TASK-024: Integrate Real Authentication Service**
- **Priority:** 🟢 Future
- **Effort:** 2-3 weeks
- **Dependencies:** Authentication microservice must be ready
- **Description:** Replace dummy authentication with real auth service microservice
- **Note:** This is handled by another microservice, Directory Service will just call it
- **Files to Modify:**
  - `backend/src/infrastructure/auth/DummyAuthProvider.js` (replace with real auth client)
  - `backend/src/presentation/AuthController.js` (call auth service)
- **Implementation:**
  - Create auth service client
  - Replace dummy token validation with auth service calls
  - Handle JWT tokens from auth service
  - Update middleware to use auth service
  - Remove dummy auth code

#### 📋 **TASK-025: Implement Full RBAC Middleware**
- **Priority:** 🟢 Future
- **Effort:** 3-4 weeks
- **Dependencies:** TASK-024 (real auth service integration)
- **Description:** Implement comprehensive role-based access control with permissions table
- **Files to Create:**
  - `database/migrations/XXX_add_permissions_table.sql`
  - `backend/src/infrastructure/PermissionRepository.js`
  - `backend/src/shared/rbacMiddleware.js`
- **Files to Modify:**
  - `backend/src/shared/authMiddleware.js` (enhance with permissions)
  - All controllers (add permission checks)
- **Implementation:**
  - Create permissions table
  - Define granular permissions (view_employee, edit_employee, approve_profile, etc.)
  - Create role-permission mappings
  - Add permission checks to middleware
  - Update all endpoints with permission requirements

### 6.2. Microservice Integrations

#### 📋 **TASK-026: Complete Skills Engine Integration**
- **Priority:** 🟢 Future
- **Effort:** 1-2 weeks
- **Dependencies:** Skills Engine microservice must be ready
- **Description:** Replace mock data with real Skills Engine API calls
- **Files to Modify:**
  - `backend/src/application/GetEmployeeSkillsUseCase.js`
  - `backend/src/infrastructure/MicroserviceClient.js`
- **Implementation:**
  - Configure Skills Engine endpoint
  - Replace mock data with API calls
  - Handle errors gracefully (fallback to mock if needed)
  - Add timeout and retry logic

#### 📋 **TASK-027: Complete Course Builder Integration**
- **Priority:** 🟢 Future
- **Effort:** 1-2 weeks
- **Dependencies:** Course Builder microservice must be ready
- **Description:** Replace mock data with real Course Builder API calls
- **Files to Modify:**
  - `backend/src/application/GetEmployeeCoursesUseCase.js`
  - `backend/src/infrastructure/MicroserviceClient.js`
- **Implementation:**
  - Configure Course Builder endpoint
  - Replace mock data with API calls
  - Handle errors gracefully
  - Add redirect URLs to environment variables

#### 📋 **TASK-028: Complete Learner AI Integration**
- **Priority:** 🟢 Future
- **Effort:** 1-2 weeks
- **Dependencies:** Learner AI microservice must be ready
- **Description:** Replace mock data with real Learner AI API calls
- **Files to Modify:**
  - `backend/src/application/GetEmployeeLearningPathUseCase.js`
  - `frontend/src/components/LearningPath.js`
  - `frontend/src/components/LearningPathApprovals.js`
- **Implementation:**
  - Configure Learner AI endpoint
  - Replace mock data with API calls
  - Add redirect URLs to environment variables
  - Handle approval redirects

#### 📋 **TASK-029: Complete Learning Analytics Integration**
- **Priority:** 🟢 Future
- **Effort:** 1-2 weeks
- **Dependencies:** Learning Analytics microservice must be ready
- **Description:** Replace mock data with real Learning Analytics API calls
- **Files to Modify:**
  - `backend/src/application/GetEmployeeDashboardUseCase.js`
  - `frontend/src/components/ProfileDashboard.js`
  - `frontend/src/components/ProfileAnalytics.js`
  - `frontend/src/components/CompanyAnalyticsDashboard.js`
- **Implementation:**
  - Configure Learning Analytics endpoint
  - Replace mock data with API calls
  - Add redirect URLs to environment variables

#### 📋 **TASK-030: Complete Content Studio Integration**
- **Priority:** 🟢 Future
- **Effort:** 1-2 weeks
- **Dependencies:** Content Studio microservice must be ready
- **Description:** Implement trainer status lifecycle and course assignments
- **Files to Modify:**
  - `backend/src/presentation/TrainerController.js` (complete TODO at line 145)
  - `backend/src/infrastructure/MicroserviceClient.js`
- **Implementation:**
  - Configure Content Studio endpoint
  - Fetch trainer status (Invited → Active → Archived)
  - Fetch courses taught by trainer
  - Handle status updates

#### 📋 **TASK-031: Complete Assessment Integration**
- **Priority:** 🟢 Future
- **Effort:** 1-2 weeks
- **Dependencies:** Assessment microservice must be ready
- **Description:** Implement skill verification flow
- **Files to Create:**
  - `backend/src/application/VerifySkillsUseCase.js`
  - `backend/src/presentation/SkillVerificationController.js`
- **Files to Modify:**
  - `frontend/src/components/ProfileSkills.js` (complete TODO at line 278)
- **Implementation:**
  - Create `POST /api/v1/employees/:employeeId/verify-skills` endpoint
  - Call Assessment microservice
  - Handle verification results
  - Update skills with verification status

#### 📋 **TASK-032: Implement Enrollment API**
- **Priority:** 🟢 Future
- **Effort:** 1-2 weeks
- **Dependencies:** Learning Analytics microservice must be ready
- **Description:** Connect enrollment section to Learning Analytics API
- **Files to Create:**
  - `backend/src/application/EnrollEmployeesUseCase.js`
  - `backend/src/presentation/EnrollmentController.js`
- **Files to Modify:**
  - `frontend/src/components/EnrollmentSection.js` (complete TODO at line 37)
- **Implementation:**
  - Create `POST /api/v1/companies/:id/enrollments` endpoint
  - Support three flows: career-path, skill-driven, trainer-led
  - Call Learning Analytics API
  - Handle enrollment results
  - Show success/error feedback

#### 📋 **TASK-033: Add Microservice Redirect URLs**
- **Priority:** 🟢 Future
- **Effort:** 2-3 days
- **Dependencies:** All microservice frontends must be ready
- **Description:** Replace alert() calls with actual redirects to microservice frontends
- **Files to Modify:**
  - `frontend/src/components/ProfileCourses.js` (lines 168, 208, 264)
  - `frontend/src/components/LearningPath.js` (line 48)
  - `frontend/src/components/ProfileAnalytics.js` (line 48)
  - `frontend/src/components/ProfileDashboard.js` (line 46)
  - `frontend/src/pages/EmployeeProfilePage.js` (lines 458, 488)
  - `frontend/src/pages/AdminDashboard.js` (line 48)
- **Implementation:**
  - Add redirect URLs to environment variables
  - Replace alert() with `window.open()` or `navigate()`
  - Handle cases where microservice is unavailable

### 6.3. Response Format Standardization

#### 📋 **TASK-034: Standardize Response Formats**
- **Priority:** 🟢 Future
- **Effort:** 2-3 days
- **Dependencies:** None
- **Description:** Clarify that envelope format is ONLY for microservice-to-microservice calls, not internal endpoints
- **Note:** Current implementation is correct - envelope format is only for microservice calls
- **Files to Review:**
  - All controllers
  - `backend/src/shared/responseFormatter.js`
- **Implementation:**
  - Document which endpoints use envelope format (microservice calls only)
  - Document which endpoints use direct format (internal endpoints)
  - Ensure consistency
  - Update API documentation

### 6.4. Testing

#### 📋 **TASK-035: Add Comprehensive Testing**
- **Priority:** 🟢 Future
- **Effort:** 3-4 weeks
- **Dependencies:** None (can be done in parallel)
- **Description:** Add unit tests, regression tests, and E2E tests
- **Files to Create:**
  - Test files for all use cases
  - Test files for all repositories
  - E2E test scenarios
  - Test configuration files
- **Implementation:**
  - Unit tests: Use cases, repositories, utilities
  - Integration tests: API endpoints, database operations
  - E2E tests: Complete user flows (registration, login, enrichment, approval)
  - Regression tests: Ensure existing features don't break
  - Set up CI/CD to run tests automatically
  - Target: 80%+ code coverage

### 6.5. Enterprise Features

#### 📋 **TASK-036: Add Enterprise Features (Future)**
- **Priority:** 🟢 Future
- **Effort:** 4-6 weeks
- **Dependencies:** TASK-024 (auth service integration)
- **Description:** Add enterprise-grade features for large organizations
- **Features:**
  - SSO Integration (SAML, OAuth2 provider, Active Directory)
  - Advanced RBAC (granular permissions, custom roles)
  - Data Governance (GDPR compliance, data retention, export/deletion)
  - Multi-tenancy enhancements (custom branding, tenant-specific settings)
  - API Access (API keys, rate limiting, usage analytics)
  - Backup & Recovery (automated backups, point-in-time recovery)
  - Monitoring & Observability (application monitoring, error tracking, performance metrics)
- **Implementation:**
  - Prioritize based on customer requirements
  - Implement incrementally
  - Document each feature

---

## Priority Summary

### Week 1-2: Critical Security & Functionality
- TASK-001: Prompt Sanitization
- TASK-002: Audit Logging
- TASK-003: Request Approval/Rejection
- TASK-004: Request Submission Feedback
- TASK-005: CSV Error Handling
- TASK-006: OAuth Error Handling

### Week 3-4: High Priority User-Facing
- TASK-007: Employee Search/Filter/Sort
- TASK-008: Manual Employee Form
- TASK-009: CSV Upload for Additional Employees
- TASK-010: Profile Edit Approval Workflow
- TASK-011: Clarify Profile Edit Fields
- TASK-012: Company Settings Edit Form
- TASK-013: Logo Upload
- TASK-014: Enrichment Loading States

### Week 5-6: Medium Priority Improvements
- TASK-015: CSV Correction Form
- TASK-016: Missing Validations
- TASK-017: Navigation Flows
- TASK-018: Admin Requests Tab
- TASK-019: Approval Filtering

### Week 7: Data Integrity
- TASK-020: Database Schema Review
- TASK-021: Tenant Isolation Middleware

### Week 8: UX Enhancements
- TASK-022: Loading States
- TASK-023: Onboarding Checklist

### Post-MVP: Future Enhancements
- TASK-024 through TASK-036: Authentication, Microservices, Testing, Enterprise Features

---

## Dependencies Graph

```
TASK-001 (Prompt Sanitization) → No dependencies
TASK-002 (Audit Logging) → No dependencies
TASK-003 (Request Approval) → TASK-002
TASK-004 (Request Feedback) → No dependencies
TASK-005 (CSV Errors) → No dependencies
TASK-006 (OAuth Errors) → No dependencies
TASK-007 (Search/Filter) → No dependencies
TASK-008 (Manual Employee) → TASK-007
TASK-009 (CSV Upload) → TASK-008
TASK-010 (Profile Approval) → TASK-002
TASK-011 (Profile Edit Clarity) → TASK-010
TASK-012 (Company Settings) → TASK-002
TASK-013 (Logo Upload) → No dependencies
TASK-014 (Enrichment Loading) → No dependencies
TASK-015 (CSV Correction) → No dependencies
TASK-016 (Validations) → No dependencies
TASK-017 (Navigation) → No dependencies
TASK-018 (Admin Requests) → TASK-002
TASK-019 (Approval Filtering) → No dependencies
TASK-020 (Schema Review) → No dependencies
TASK-021 (Tenant Isolation) → No dependencies
TASK-022 (Loading States) → No dependencies
TASK-023 (Onboarding) → No dependencies
TASK-024 (Auth Service) → External dependency (auth microservice)
TASK-025 (RBAC) → TASK-024
TASK-026-032 (Microservices) → External dependencies (respective microservices)
TASK-033 (Redirects) → External dependencies (microservice frontends)
TASK-034 (Response Format) → No dependencies (documentation only)
TASK-035 (Testing) → No dependencies (can be parallel)
TASK-036 (Enterprise) → TASK-024
```

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-20  
**Next Review:** After completing Week 1-2 tasks

