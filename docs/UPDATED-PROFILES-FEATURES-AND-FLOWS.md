# Features and Flows - Complete Documentation (Updated Profiles Reference)

**Last Updated**: 2025-01-20  
**Purpose**: Complete reference for all system features, user flows, and business logic. Use this as a rollback reference point.

---

## Table of Contents

1. [User Flows](#user-flows)
2. [Enrichment Flow](#enrichment-flow)
3. [Approval Flow](#approval-flow)
4. [Request Flow](#request-flow)
5. [Authentication Flow](#authentication-flow)
6. [Company Registration Flow](#company-registration-flow)
7. [Key Features](#key-features)
8. [Microservice Integration](#microservice-integration)

---

## User Flows

### 1. Company Registration Flow

**Steps**:
1. User visits landing page
2. Clicks "Register Your Company"
3. Fills company registration form:
   - Company name
   - Industry
   - Domain
   - HR contact information
4. Submits form → Creates `company_registration_request`
5. Redirected to verification page
6. Admin verifies company
7. Company created in `companies` table
8. Redirected to CSV upload page
9. Uploads employee CSV file
10. Employees created in database
11. Redirected to company profile page

**Key Files**:
- `frontend/src/pages/CompanyRegistrationForm.js`
- `frontend/src/pages/CompanyVerificationPage.js`
- `frontend/src/pages/CompanyCSVUploadPage.js`
- `backend/src/application/RegisterCompanyUseCase.js`
- `backend/src/application/ProcessCSVUseCase.js`

### 2. Employee Login Flow

**Steps**:
1. User visits login page
2. Enters email and password
3. Backend validates credentials (dummy authentication)
4. Returns token and user data
5. Token stored in localStorage
6. User redirected to enrich profile page (if not enriched) or employee profile

**Authentication**:
- **Mode**: Dummy authentication (for testing)
- **Password**: Stored as hash in database
- **Token**: Simple string token (not JWT)
- **Validation**: Direct password comparison

**Key Files**:
- `frontend/src/pages/LoginPage.js`
- `frontend/src/context/AuthContext.js`
- `backend/src/presentation/AuthController.js`
- `backend/src/infrastructure/DummyAuthProvider.js`

**Note**: No external auth service microservice calls. All authentication is handled internally.

### 3. Employee Profile Enrichment Flow

See [Enrichment Flow](#enrichment-flow) section below.

### 4. HR Approval Flow

See [Approval Flow](#approval-flow) section below.

### 5. Employee Request Flow

See [Request Flow](#request-flow) section below.

---

## Enrichment Flow

### Overview

The enrichment flow is triggered automatically after an employee connects both LinkedIn and GitHub accounts. It uses OpenAI to generate:
1. Professional bio
2. Project summaries (from GitHub repositories)
3. Value proposition (career progression statement)

### Detailed Steps

1. **Employee Connects LinkedIn**:
   - Clicks "Connect LinkedIn" button
   - Redirected to LinkedIn OAuth
   - Authorizes application
   - Callback receives authorization code
   - Backend exchanges code for access token
   - Backend fetches LinkedIn profile data (OpenID Connect)
   - Data stored in `employees.linkedin_data` (JSONB)
   - LinkedIn URL stored in `employees.linkedin_url`

2. **Employee Connects GitHub**:
   - Clicks "Connect GitHub" button
   - Redirected to GitHub OAuth
   - Authorizes application
   - Callback receives authorization code
   - Backend exchanges code for access token
   - Backend fetches GitHub profile and repositories
   - Data stored in `employees.github_data` (JSONB)
   - GitHub URL stored in `employees.github_url`

3. **Enrichment Trigger**:
   - After GitHub connection, `OAuthController` checks if both LinkedIn and GitHub are connected
   - If both connected, calls `EnrichProfileUseCase.enrichProfile(employeeId)`

4. **Enrichment Process**:
   - Validates employee exists
   - Checks if already enriched (one-time only)
   - Validates both LinkedIn and GitHub data exist
   - Fetches company name
   - Calls OpenAI API three times:
     a. `generateBio()` - GPT-4-turbo
     b. `generateProjectSummaries()` - GPT-3.5-turbo
     c. `generateValueProposition()` - GPT-4-turbo
   - Saves results to database:
     - `employees.bio`
     - `employee_project_summaries` table
     - `employees.value_proposition`
   - Sets `enrichment_completed = true`
   - Sets `profile_status = 'enriched'`
   - Creates approval request in `employee_profile_approvals` table

5. **Error Handling**:
   - If OpenAI fails, enrichment fails explicitly (no mock data fallback)
   - Error logged with full details
   - Employee sees error message

### OpenAI Integration

**API Client**: `OpenAIAPIClient.js`

**Models Used**:
- `gpt-4-turbo`: Bio and Value Proposition
- `gpt-3.5-turbo`: Project Summaries (cheaper for multiple repos)

**Data Sent to OpenAI**:

**For Bio**:
- LinkedIn: name, given_name, family_name, email, locale, headline
- GitHub: name, login, bio, company, location, blog, public_repos, followers, following, repositories (with full details)
- Employee: full_name, current_role_in_company, target_role_in_company, company_name

**For Project Summaries**:
- GitHub repositories: name, full_name, description, language, stars, forks, url, created_at, updated_at, is_fork, is_private, topics

**For Value Proposition**:
- Employee: full_name, current_role_in_company, target_role_in_company, company_name

**Prompt Examples**:

**Bio Prompt**:
```
Generate a professional bio for [full_name], who works as [current_role] at [company_name] and aims to become [target_role]. 
Use the following information:
LinkedIn: [linkedin_data]
GitHub: [github_data]
Requirements: 2-3 sentences, maximum 150 words, concise and general.
```

**Value Proposition Prompt**:
```
Generate a value proposition for [full_name], currently [current_role] at [company_name], targeting [target_role].
Focus on what skills/knowledge they need to develop to reach their target role.
```

**Response Storage**:
- Bio: `employees.bio` (TEXT)
- Project Summaries: `employee_project_summaries` table (one row per repository)
- Value Proposition: `employees.value_proposition` (TEXT)

### Key Files

- `backend/src/application/EnrichProfileUseCase.js` - Orchestration
- `backend/src/infrastructure/OpenAIAPIClient.js` - OpenAI API calls
- `backend/src/presentation/OAuthController.js` - OAuth callbacks
- `backend/src/infrastructure/LinkedInAPIClient.js` - LinkedIn data fetching
- `backend/src/infrastructure/GitHubAPIClient.js` - GitHub data fetching
- `backend/src/infrastructure/EmployeeRepository.js` - Data persistence

### Protection Rules

1. **One-Time Only**: Enrichment can only happen once per employee
2. **No Fallback**: If OpenAI fails, enrichment fails (no mock data)
3. **Both Required**: Both LinkedIn and GitHub must be connected
4. **Explicit Errors**: All errors are logged and thrown explicitly

---

## Approval Flow

### Overview

After enrichment, an employee's profile must be approved by HR before they can access Learning & Development features.

### Detailed Steps

1. **Approval Request Creation**:
   - After successful enrichment, `EnrichProfileUseCase` creates entry in `employee_profile_approvals` table
   - Status: `'pending'`
   - `enriched_at`: Timestamp of enrichment
   - `requested_at`: Current timestamp

2. **HR Views Pending Approvals**:
   - HR navigates to Company Profile → Profile Approvals tab
   - Sees list of employees with pending approvals
   - Each entry shows:
     - Employee name and email
     - Enrichment date
     - Request date

3. **HR Approves Profile**:
   - HR clicks "Approve" button
   - API call: `POST /api/v1/companies/:companyId/profile-approvals/:approvalId/approve`
   - Backend:
     - Updates `employees.profile_status` to `'approved'`
     - Updates `employee_profile_approvals.status` to `'approved'`
     - Sets `reviewed_at` timestamp
     - Sets `reviewed_by` to HR employee ID
   - Page refreshes to show updated list

4. **HR Rejects Profile**:
   - HR clicks "Reject" button
   - Prompted for rejection reason
   - API call: `POST /api/v1/companies/:companyId/profile-approvals/:approvalId/reject`
   - Backend:
     - Updates `employees.profile_status` to `'rejected'`
     - Updates `employee_profile_approvals.status` to `'rejected'`
     - Sets `rejection_reason`
     - Sets `reviewed_at` and `reviewed_by`
   - Page refreshes

5. **Employee Sees Changes**:
   - Before approval: Sees "Pending approval" message, no Learning & Development section
   - After approval: "Pending approval" message hidden, Learning & Development section visible

### Database Changes

**Before Approval**:
- `employees.profile_status = 'enriched'`
- `employee_profile_approvals.status = 'pending'`

**After Approval**:
- `employees.profile_status = 'approved'`
- `employee_profile_approvals.status = 'approved'`
- `employee_profile_approvals.reviewed_at = NOW()`
- `employee_profile_approvals.reviewed_by = <hr_employee_id>`

### Key Files

- `frontend/src/components/PendingProfileApprovals.js` - Approval UI
- `backend/src/presentation/EmployeeProfileApprovalController.js` - Approval endpoints
- `backend/src/application/ApproveEmployeeProfileUseCase.js` - Approval logic
- `backend/src/infrastructure/EmployeeRepository.js` - `updateProfileStatus()`

---

## Request Flow

### Overview

Employees can submit requests (e.g., learn new skills, apply for trainer role) which appear in the Company Profile → Pending Requests tab for HR review.

### Detailed Steps

1. **Employee Submits Request**:
   - Employee navigates to their profile → Learning & Development → Requests tab
   - Fills form:
     - Request type (dropdown)
     - Title
     - Description (optional)
   - Clicks "Submit Request"

2. **Request Submission**:
   - Frontend wraps request in envelope:
     ```javascript
     {
       requester_service: 'directory_service',
       payload: {
         request_type: 'learn-new-skills',
         title: '...',
         description: '...'
       }
     }
     ```
   - API call: `POST /api/v1/employees/:employeeId/requests`
   - Backend unwraps: `req.body.payload || req.body`
   - `SubmitEmployeeRequestUseCase.execute()`:
     - Validates employee exists
     - Gets company_id from employee
     - Creates entry in `employee_requests` table
     - Status: `'pending'`
     - `requested_at`: Current timestamp

3. **Request Appears in Company Profile**:
   - HR navigates to Company Profile → Pending Requests tab
   - Component fetches: `GET /api/v1/companies/:companyId/requests?status=pending`
   - Backend returns all pending requests for company
   - Component displays requests in cards

4. **HR Reviews Request**:
   - HR sees:
     - Employee name and email
     - Request type
     - Title and description
     - Priority (if set)
     - Submission date
   - HR can:
     - Approve (future: implement approval logic)
     - Reject (future: implement rejection logic)
     - View Employee (navigates to employee profile)

### Request Types

- `learn-new-skills`: Request to learn new skills
- `apply-trainer`: Application for trainer role
- `self-learning`: Self-learning request
- `other`: Other type of request

### Database Schema

```sql
CREATE TABLE employee_requests (
    id UUID PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    request_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(50),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by UUID REFERENCES employees(id),
    rejection_reason TEXT
);
```

### Key Files

- `frontend/src/components/ProfileRequests.js` - Request submission UI
- `frontend/src/components/PendingRequestsSection.js` - HR view of requests
- `backend/src/presentation/RequestController.js` - Request endpoints
- `backend/src/application/SubmitEmployeeRequestUseCase.js` - Submission logic
- `backend/src/infrastructure/EmployeeRequestRepository.js` - Data access

### Important Notes

1. **Envelope Structure**: Frontend wraps requests, backend unwraps
2. **Auto-Refresh**: Pending Requests section does NOT auto-refresh (fetches once on mount)
3. **Count Badge**: Pending Requests tab shows red badge with count
4. **No Polling**: No setInterval or polling mechanism

---

## Authentication Flow

### Dummy Authentication

**Mode**: Testing/dummy authentication (not production-ready)

**Process**:
1. User enters email and password
2. Backend looks up employee by email
3. Compares password hash with stored hash
4. If match, generates simple token string
5. Returns token and user data
6. Frontend stores token in localStorage

**Token Format**: `dummy-token-<uuid>`

**Validation**:
- Token extracted from `Authorization: Bearer <token>` header
- Backend validates token format
- Extracts employee ID from token
- Looks up employee in database

**Key Files**:
- `backend/src/infrastructure/DummyAuthProvider.js`
- `backend/src/presentation/AuthController.js`
- `frontend/src/context/AuthContext.js`
- `frontend/src/utils/api.js` - Request interceptor (skips envelope for auth endpoints)

**Important**: 
- Auth endpoints (`/auth/login`, `/auth/logout`, `/auth/me`) do NOT use envelope structure
- Frontend `api.js` interceptor skips envelope wrapping for these endpoints

---

## Company Registration Flow

### Steps

1. **Registration Form**:
   - User fills company information
   - Submits form
   - Creates `company_registration_request` entry

2. **Verification**:
   - Admin verifies company
   - Creates company in `companies` table
   - Sets `verification_status = 'approved'`

3. **CSV Upload**:
   - User uploads employee CSV
   - CSV parsed and validated
   - Employees created in database
   - Departments and teams created

4. **Company Profile**:
   - User redirected to company profile
   - Can view company dashboard

### CSV Format

**Required Columns**:
- employee_id
- full_name
- email
- password (will be hashed)
- current_role_in_company
- target_role_in_company
- preferred_language
- department_id
- department_name
- team_id
- team_name
- roles (comma-separated)
- logo_url (optional, for company logo)

**Processing**:
- CSV parsed row by row
- Each employee created with hashed password
- Departments and teams created if not exist
- Employee-team relationships created
- Employee roles assigned

---

## Key Features

### 1. Profile Enrichment
- Automatic after LinkedIn + GitHub connection
- OpenAI-generated bio, project summaries, value proposition
- One-time only process
- No mock data fallback

### 2. Profile Approval
- HR approval workflow
- Approval required for Learning & Development access
- Status tracking: basic → enriched → approved/rejected

### 3. Request System
- Employees submit requests
- HR reviews in Company Profile
- Request types: learn skills, apply trainer, self-learning, other

### 4. Learning & Development
- Only visible when profile approved
- Tabs: Skills, Courses, Learning Path, Analytics, Requests
- Integration with microservices (with mock fallback)

### 5. Trainer Features
- Trainer-specific settings
- "Taught" courses section in Courses tab
- Trainer settings panel

### 6. Company Management
- Employee list with search, filter, sort
- Organizational hierarchy
- Metrics dashboard
- Pending approvals and requests

---

## Microservice Integration

### Integration Pattern

All microservice calls use:
1. **Generic Client**: `MicroserviceClient.js`
2. **Envelope Structure**: `{ requester_service: 'directory_service', payload: {...} }`
3. **Mock Fallback**: If microservice fails, use mock data

### Microservices

1. **Skills Engine**:
   - Endpoint: `/skills/employee/:employeeId`
   - Returns: Hierarchical skills data
   - Mock: Default skills structure

2. **Course Builder**:
   - Endpoint: `/courses/employee/:employeeId`
   - Returns: Employee courses
   - Mock: Empty courses array

3. **Learner AI**:
   - Endpoint: `/learning-path/:employeeId`
   - Returns: Learning path data
   - Mock: Empty learning path

4. **Learning Analytics**:
   - Endpoint: `/analytics/employee/:employeeId`
   - Returns: Analytics data
   - Mock: Default analytics structure

### Redirect Placeholders

- Skills Engine: Alert "You are being redirected to the Skills Engine page."
- Course Builder: Alert "Redirecting to COURSE BUILDER"
- Learner AI: Alert "Redirecting to LEARNER AI"
- Learning Analytics: Alert for redirection

---

## Rollback Reference

If changes break features:

1. Check this document for expected flows
2. Verify enrichment triggers after both OAuth connections
3. Ensure approval workflow updates profile_status correctly
4. Confirm request submission uses envelope structure
5. Check authentication skips envelope for auth endpoints
6. Verify microservice calls have mock fallback

**Last Known Working Commit**: Current as of 2025-01-20

