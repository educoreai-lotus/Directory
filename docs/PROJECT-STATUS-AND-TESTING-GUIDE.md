# EDUCORE Directory Management System - Project Status & Testing Guide

**Last Updated**: 2025-01-20  
**Purpose**: Comprehensive reference for new chat sessions, testing, and understanding what's implemented vs. what needs work

---

## Table of Contents

1. [Quick Start for New Chat Sessions](#quick-start-for-new-chat-sessions)
2. [Implemented Features (Complete)](#implemented-features-complete)
3. [Partially Implemented Features](#partially-implemented-features)
4. [Missing Features (Future Work)](#missing-features-future-work)
5. [Critical Enrichment Flow (DO NOT BREAK)](#critical-enrichment-flow-do-not-break)
6. [Generic Endpoint & AI Query Generation](#generic-endpoint--ai-query-generation)
7. [User Flows (Complete Journey)](#user-flows-complete-journey)
8. [What's Not Working / Needs Testing](#whats-not-working--needs-testing)
9. [Architecture Overview](#architecture-overview)
10. [Critical Files & Protection Rules](#critical-files--protection-rules)

---

## Quick Start for New Chat Sessions

### First Steps
1. **Read this document** - Understand current state
2. **Read `docs/system-overview.md`** - Full technical overview
3. **Read `docs/ENRICHMENT-FEATURE-PROTECTION.md`** - Critical enrichment flow protection
4. **Check Railway logs** - For backend errors
5. **Check browser console** - For frontend errors

### Current Branch Status
- **Main branch**: Latest development
- **test-old-version branch**: Commit 43d9a7c (for testing old version)
- **Deployment**: Railway (backend), Vercel (frontend)

### Key Environment Variables
- **Backend (Railway)**: `DATABASE_URL`, `GEMINI_API_KEY`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `FRONTEND_URL`
- **Frontend (Vercel)**: `REACT_APP_API_BASE_URL` (points to Railway backend)

---

## Implemented Features (Complete)

### ✅ Milestone M0: Foundation
- **F016**: Database Schema & Migrations
  - Single migration file: `database/migrations/001_initial_schema.sql`
  - All tables: companies, employees, departments, teams, employee_roles, employee_profile_approvals, employee_project_summaries, trainer_settings, employee_requests
  - **Policy**: Only one migration file - use ALTER TABLE for updates

### ✅ Milestone M1: Company Registration & Onboarding
- **F001**: Landing Page
  - Welcome page with registration/login links
  - Design token-based styling

- **F002**: Company Registration Form
  - Company name, industry, domain, HR contact info
  - Domain validation (DNS, MX records)
  - Auto-approval for valid domains

- **F003**: Company Verification System
  - Automatic domain verification
  - Status: pending → approved/rejected
  - Auto-approval for valid domains

- **F004**: CSV Upload & Parsing
  - Comprehensive CSV validation
  - Required fields: employee_id, full_name, email, role_type, department_id, department_name, team_id, team_name
  - Optional fields: manager_id, password (defaults to SecurePass123)
  - Company settings: learning_path_approval, primary_kpis, passing_grade, max_attempts, exercises_limited, num_of_exercises
  - Trainer settings: ai_enabled, public_publish_enable

- **F005**: CSV Error Handling & Correction UI
  - Detailed validation errors
  - Row-by-row error reporting
  - Clear error messages

- **F006**: Company Profile Page
  - Company overview (logo, name, industry, domain)
  - Company settings display
  - Departments & Teams hierarchy
  - Employees list (with filtering, sorting, search)
  - Pending Profile Approvals tab
  - Add Employee functionality (manual + CSV)

- **F019**: Mock Data Fallback System
  - Fallback when microservices fail
  - Mock data in `mockData/index.json`
  - Used by all microservice integrations

### ✅ Milestone M2: Employee Profiles & Authentication
- **F007**: Employee Login (Dummy Authentication)
  - Email/password authentication
  - Dummy token generation: `dummy-token-{employeeId}-{email}-{timestamp}`
  - HR detection (matches `companies.hr_contact_email`)
  - Profile status routing:
    - `basic` + not both OAuth → `/enrich`
    - HR → `/company/{companyId}`
    - Regular employee → `/employee/{employeeId}`

- **F008**: Employee Profile Enrichment - LinkedIn OAuth
  - OpenID Connect scopes: `openid`, `profile`, `email`
  - Fetches profile data, email, photo
  - Stores in `employees.linkedin_data` (JSONB)
  - Token persistence during OAuth redirects

- **F009**: Employee Profile Enrichment - GitHub OAuth
  - OAuth 2.0 flow
  - Fetches profile, repositories, email
  - Stores in `employees.github_data` (JSONB)
  - Token persistence during OAuth redirects

- **F009A**: Gemini AI Integration
  - Bio generation from LinkedIn + GitHub data
  - Project summaries from GitHub repositories
  - Uses `gemini-1.5-flash` model
  - Fallback to mock data if API fails
  - One-time enrichment (prevents re-enrichment)

- **F010**: Employee Profile Page
  - Basic information display
  - Professional bio (AI-generated)
  - Project summaries (AI-generated)
  - Profile photo (LinkedIn → GitHub → placeholder)
  - HR approval status display
  - Learning & Development section (visible after approval):
    - Skills (placeholder - needs Skills Engine integration)
    - Courses (placeholder - needs Course Builder integration)
    - Dashboard (placeholder - needs Learning Analytics integration)
    - Requests (placeholder - needs implementation)
    - Learning Path (placeholder - needs Learner AI integration)
  - Trainer Profile section (if trainer)
  - Learning Path Approvals (if decision maker)

- **F011**: Trainer Profile Extensions
  - TrainerSettings component (AI enabled, public publish)
  - TrainerCoursesTaught component
  - Backend endpoints for trainer settings

### ✅ Infrastructure Features
- **Universal Endpoint**: `/api/fill-content-metrics`
  - Receives requests from other microservices
  - Envelope structure: `{ requester_service, payload, response }`
  - AI query generation for dynamic SQL
  - Stringified JSON request/response

- **AI Query Generator**
  - Generates SQL queries dynamically using Gemini AI
  - Schema matching (e.g., `user_id` → `employee_id`)
  - SQL validation (SELECT only, no DDL/DML)
  - Uses database schema from migration file

- **Microservice Integration Pattern**
  - All microservices use universal endpoint
  - Envelope structure required
  - Fallback to mock data on failure
  - Integrated services:
    - Skills Engine
    - Course Builder
    - Learner AI (different endpoint: `/api/fill-learner-ai-fields`)
    - Learning Analytics
    - Management & Reporting
    - Content Studio
    - Assessment

---

## Partially Implemented Features

### ⚠️ F010: Employee Profile Page
**Status**: Core structure complete, some sections are placeholders

**Working**:
- ✅ Basic info, bio, project summaries
- ✅ Profile photo
- ✅ HR approval status
- ✅ Trainer profile section
- ✅ Learning Path Approvals (Decision Maker)

**Placeholders (Need Implementation)**:
- ⚠️ Skills section - Shows placeholder, needs Skills Engine integration
- ⚠️ Courses section - Shows placeholder, needs Course Builder integration
- ⚠️ Dashboard section - Shows placeholder, needs Learning Analytics integration
- ⚠️ Requests section - Shows placeholder, needs backend implementation
- ⚠️ Learning Path section - Shows placeholder, needs Learner AI integration

### ⚠️ F006: Company Profile Page
**Status**: Core features exist, some admin features may be missing

**Working**:
- ✅ Company overview
- ✅ Hierarchy view
- ✅ Employees list (filter, sort, search)
- ✅ Pending approvals
- ✅ Add employee

**May Need Enhancement**:
- ⚠️ Company KPIs/metrics dashboard
- ⚠️ Company settings management UI
- ⚠️ Advanced employee management features

---

## Missing Features (Future Work)

### ❌ Milestone M2: Employee Profiles & Authentication
- **F017**: Role-Based Access Control (RBAC)
  - No RBAC middleware
  - No permission system
  - Currently using basic role checks in controllers

- **F018**: Audit Logging System
  - No audit log infrastructure
  - No action tracking

- **F021**: Profile Edit Functionality
  - No profile edit form
  - No update endpoints for employee profile fields

- **F024**: Multi-tenant Data Isolation
  - No tenant isolation middleware
  - Data isolation relies on company_id checks in queries

### ❌ Milestone M3: Management & Admin Views
- **F012**: Team Manager Hierarchy View
  - No TeamManagerHierarchy component
  - No team hierarchy endpoints

- **F013**: Department Manager Hierarchy View
  - No DepartmentManagerHierarchy component
  - No department hierarchy endpoints

- **F014**: Company HR/Admin Dashboard
  - CompanyProfilePage exists but may not have all admin features
  - Missing: Company KPIs dashboard, advanced employee management, company settings UI

- **F015**: Directory Admin Dashboard
  - No DirectoryAdminDashboard page
  - No platform-level admin features
  - No company approval workflow UI

- **F022**: Employee Requests System
  - ProfileRequests component exists as placeholder
  - No request submission functionality
  - No request management backend

### ❌ Milestone M0: Foundation
- **F020**: Sample Data Generation
  - CSV samples exist, but no automated generation script
  - No seed data generator

- **F023**: CI/CD Pipeline Setup
  - No GitHub Actions workflows
  - No automated testing/deployment

---

## Critical Enrichment Flow (DO NOT BREAK)

### Overview
The enrichment flow is the **CORE FEATURE** that must not be broken. It combines:
**LinkedIn OAuth → GitHub OAuth → Gemini AI → Profile Enrichment → HR Approval**

### Complete Flow

```
1. Employee First Login
   ↓
2. Redirect to /enrich (EnrichProfilePage)
   ↓
3. Employee clicks "Connect LinkedIn"
   ↓
4. Redirect to LinkedIn OAuth
   ↓
5. User authorizes → LinkedIn redirects back
   ↓
6. Backend: handleLinkedInCallback()
   - Exchange code for access token
   - Fetch LinkedIn profile data (OpenID Connect: userinfo endpoint)
   - Store in employees.linkedin_data (JSONB)
   - Generate dummy token + user object
   - Redirect to /enrich?linkedin=connected&token=...&user=...
   ↓
7. Frontend: Extract token + user from URL
   - Store in localStorage
   - Update linkedinConnected state
   - Show "✓ LinkedIn connected successfully!"
   - Clear URL params (linkedin, token, user)
   ↓
8. Employee clicks "Connect GitHub"
   ↓
9. Redirect to GitHub OAuth
   ↓
10. User authorizes → GitHub redirects back
   ↓
11. Backend: handleGitHubCallback()
    - Exchange code for access token
    - Fetch GitHub profile + repositories
    - Store in employees.github_data (JSONB)
    - Check: Both linkedin_data AND github_data exist?
    - YES → Trigger enrichment automatically
    - Generate dummy token + user object
    - Redirect to /enrich?github=connected&linkedin=connected&enriched=true&token=...&user=...
   ↓
12. EnrichProfileUseCase.enrichProfile()
    - Fetch LinkedIn + GitHub data
    - Call GeminiAPIClient.generateBio()
    - Call GeminiAPIClient.generateProjectSummaries()
    - Store bio in employees.bio
    - Store project summaries in employee_project_summaries table
    - Update profile_status to 'enriched'
    - Set enrichment_completed = true (prevents re-enrichment)
    - Create approval request in employee_profile_approvals
   ↓
13. Frontend: Detect both connected
    - Show "✓ Both LinkedIn and GitHub connected!"
    - Redirect to /employee/{id}?enrichment=complete
   ↓
14. Employee Profile Page
    - Shows "⏳ Waiting for HR Approval"
    - Learning & Development section HIDDEN (only visible when approved)
   ↓
15. HR logs in → Company Profile → Pending Profile Approvals tab
   ↓
16. HR clicks "Approve" on employee profile
   ↓
17. Backend: Update profile_status to 'approved'
   ↓
18. Employee logs in again
   ↓
19. Employee Profile Page
    - Shows "✓ Profile Approved"
    - Learning & Development section VISIBLE
    - Skills, Courses, Learning Path, Dashboard, Requests all visible
```

### Critical Protection Rules

1. **Never remove OAuth callback token/user data** - Always include both in redirect URLs (even on errors!)
2. **Never skip OAuth callback detection** - Always check URL params before redirecting
3. **Always use boolean coercion for OAuth detection** - Use `!!errorParam`, not `errorParam` (prevents string values)
4. **Never redirect to login during OAuth callbacks** - Including errors - show error on enrich page instead
5. **Always preserve session on OAuth errors** - Backend must return token + user even when OAuth fails
6. **Never remove Gemini fallback** - Always have MockDataService as backup
7. **Never modify enrichment trigger logic** - Both OAuth must be connected
8. **Always test end-to-end** - OAuth → Enrichment → Profile → Approval

### Critical Code Patterns

#### OAuth Callback Detection (MUST USE THIS PATTERN)
```javascript
// ✅ CORRECT - Always use boolean coercion
const linkedinParam = searchParams.get('linkedin');
const githubParam = searchParams.get('github');
const errorParam = searchParams.get('error');
const tokenParam = searchParams.get('token');
const enrichedParam = searchParams.get('enriched');

const isOAuthCallback = linkedinParam === 'connected' || 
                        githubParam === 'connected' || 
                        !!errorParam ||  // ✅ Boolean coercion
                        !!tokenParam ||   // ✅ Boolean coercion
                        enrichedParam === 'true';
```

#### Backend Error Redirects (MUST INCLUDE TOKEN + USER)
```javascript
// ✅ CORRECT - Always include token + user on errors
catch (error) {
  // Extract employee from state
  // Build user object
  // Generate dummy token
  return res.redirect(`${frontendUrl}/enrich?error=${encodeURIComponent(errorMessage)}&token=${encodeURIComponent(dummyToken)}&user=${encodeURIComponent(userDataEncoded)}`);
}
```

### Critical Files (DO NOT MODIFY WITHOUT TESTING)

**Backend**:
- `backend/src/presentation/OAuthController.js` - OAuth callbacks, token generation, enrichment trigger
- `backend/src/application/EnrichProfileUseCase.js` - Enrichment orchestration
- `backend/src/infrastructure/GeminiAPIClient.js` - Gemini API integration
- `backend/src/infrastructure/EmployeeRepository.js` - `updateLinkedInData()`, `updateGitHubData()`, `updateEnrichment()`

**Frontend**:
- `frontend/src/pages/EnrichProfilePage.js` - OAuth callback handling
- `frontend/src/context/AuthContext.js` - Token persistence during OAuth
- `frontend/src/components/LinkedInConnectButton.js` - LinkedIn OAuth initiation
- `frontend/src/components/GitHubConnectButton.js` - GitHub OAuth initiation

### Common Issues & Solutions

**Issue 1: Token Lost During OAuth Redirect**
- **Solution**: OAuth callbacks must include token + user data in redirect URL (even on errors!)
- **Files**: `OAuthController.js`, `EnrichProfilePage.js`, `AuthContext.js`

**Issue 2: Premature Redirect to Profile**
- **Solution**: Check for active OAuth callback in URL params, don't redirect during OAuth flow
- **Files**: `EnrichProfilePage.js`

**Issue 3: Generic Bio/Project Summaries**
- **Solution**: Check if Gemini API is actually being called (check Railway logs), verify GEMINI_API_KEY
- **Files**: `GeminiAPIClient.js`, `EnrichProfileUseCase.js`

**Issue 4: Enrichment Not Triggering**
- **Solution**: Check `isReadyForEnrichment()` - both `linkedin_data` and `github_data` must exist
- **Files**: `OAuthController.js`

**Issue 5: OAuth Errors Cause Redirect to Login**
- **Solution**: Backend must include token + user in error redirects, frontend must use `!!errorParam` (boolean coercion)
- **Files**: `OAuthController.js`, `AuthContext.js`, `EnrichProfilePage.js`

---

## Generic Endpoint & AI Query Generation

### Universal Endpoint Pattern

**All microservice communication uses ONE universal endpoint per microservice:**

| Microservice | Universal Endpoint |
|--------------|-------------------|
| Skills Engine | `/api/fill-content-metrics` |
| Course Builder | `/api/fill-content-metrics` |
| Learner AI | `/api/fill-learner-ai-fields` ⚠️ Different |
| Learning Analytics | `/api/fill-content-metrics` |
| Management & Reporting | `/api/fill-content-metrics` |
| Content Studio | `/api/fill-content-metrics` |
| Assessment | `/api/fill-content-metrics` |
| Directory | `/api/fill-content-metrics` |

### Envelope Structure

**Every request MUST contain exactly 3 fields:**

```json
{
  "requester_service": "directory",
  "payload": {
    "employee_id": "EMP001",
    "company_id": "COMP001",
    ...
  },
  "response": {
    "user_id": "",
    "competencies": [],
    ...
  }
}
```

**Important**: Request body is **stringified JSON** (not plain JSON object).

### AI Query Generation Flow

```
1. Microservice sends request to Directory's /api/fill-content-metrics
   ↓
2. UniversalEndpointController receives envelope
   ↓
3. FillContentMetricsUseCase.execute()
   ↓
4. AIQueryGenerator.generateQuery()
   - Loads database schema from 001_initial_schema.sql
   - Builds prompt with payload + response template
   - Calls Gemini API: "Generate SQL to fill response template from payload"
   - Validates generated SQL (SELECT only, no DDL/DML)
   ↓
5. Execute SQL query
   ↓
6. Map results to response template
   ↓
7. Return filled response in envelope structure
```

### Schema Matching

**AI must map field names between microservices and Directory database:**

- `user_id` → `employee_id`
- `user_name` → `full_name`
- `company_id` → `company_id` (same)
- `skill_list` → (query from `employee_roles` or Skills Engine data)

### Implementation Files

- **Controller**: `backend/src/presentation/UniversalEndpointController.js`
- **Use Case**: `backend/src/application/FillContentMetricsUseCase.js`
- **AI Generator**: `backend/src/infrastructure/AIQueryGenerator.js`
- **Schema Loader**: Loads from `database/migrations/001_initial_schema.sql`

### Fallback Mechanism

**All microservice calls have fallback to mock data:**
- If microservice call fails → `MockDataService.getMockData()`
- Mock data stored in `mockData/index.json`
- Ensures system continues working even if microservices are down

---

## User Flows (Complete Journey)

### Flow 1: Company Registration & Onboarding

```
1. HR/Manager visits landing page (/)
   ↓
2. Clicks "Register Company"
   ↓
3. Fill registration form:
   - Company name
   - Industry
   - Domain
   - HR contact name
   - HR contact email
   - HR contact role
   ↓
4. Submit registration
   ↓
5. Backend: RegisterCompanyUseCase
   - Create company record
   - Create HR employee record (from HR contact info)
   - Set verification_status = 'pending'
   ↓
6. Backend: VerifyCompanyUseCase (automatic)
   - Validate domain (DNS, MX records)
   - If valid → Set verification_status = 'approved'
   ↓
7. Redirect to CSV upload page (/upload/{companyId})
   ↓
8. HR uploads CSV with employees
   ↓
9. CSV processing:
   - Parse CSV
   - Validate data
   - Create departments, teams, employees
   - Set up relationships (managers, roles)
   ↓
10. Redirect to Company Profile (/company/{companyId})
```

### Flow 2: Employee Login & Profile Enrichment

```
1. Employee visits login page (/login)
   ↓
2. Enter email + password
   ↓
3. Backend: AuthenticateUserUseCase
   - Find employee by email
   - Verify password (bcrypt)
   - Generate dummy token
   - Build user object with roles, profile status, OAuth status
   ↓
4. Frontend: Store token + user in localStorage
   ↓
5. Route based on profile status:
   
   IF profile_status === 'basic' AND NOT bothOAuthConnected:
     → Redirect to /enrich (Enrichment Page)
   
   ELSE IF isHR:
     → Redirect to /company/{companyId} (Company Profile)
   
   ELSE:
     → Redirect to /employee/{employeeId} (Employee Profile)
   ↓
6. IF redirected to /enrich:
   - Connect LinkedIn (OAuth flow)
   - Connect GitHub (OAuth flow)
   - Enrichment triggers automatically when both connected
   - Redirect to /employee/{employeeId}
```

### Flow 3: HR Approval Workflow

```
1. Employee completes enrichment
   - Profile status = 'enriched'
   - Approval request created in employee_profile_approvals
   ↓
2. HR logs in
   - Redirected to Company Profile
   ↓
3. HR navigates to "Pending Profile Approvals" tab
   ↓
4. HR sees list of pending approvals
   ↓
5. HR clicks on employee name
   ↓
6. HR views enriched profile (bio, project summaries)
   ↓
7. HR clicks "Approve" or "Reject"
   ↓
8. Backend: Update profile_status to 'approved' or 'rejected'
   ↓
9. Employee logs in again
   ↓
10. IF approved:
    - Profile shows "✓ Profile Approved"
    - Learning & Development section visible
    - Skills, Courses, Learning Path, Dashboard, Requests all accessible
```

### Flow 4: Employee Profile Viewing (After Approval)

```
1. Employee logs in (after approval)
   ↓
2. Redirected to /employee/{employeeId}
   ↓
3. Employee Profile Page displays:
   
   Basic Information:
   - Employee ID, Email, Department, Team
   - Current Role, Target Role
   - Preferred Language, Status
   
   Professional Links:
   - LinkedIn URL, GitHub URL
   
   Professional Bio:
   - AI-generated bio (if enriched)
   
   Project Summaries:
   - AI-generated summaries from GitHub repos
   
   Learning & Development (if approved):
   - Skills (from Skills Engine) - PLACEHOLDER
   - Courses (from Course Builder) - PLACEHOLDER
   - Learning Path (from Learner AI) - PLACEHOLDER
   - Dashboard (from Learning Analytics) - PLACEHOLDER
   - Requests (employee requests) - PLACEHOLDER
   
   Trainer Profile (if trainer):
   - Trainer Settings
   - Courses Taught
   
   Learning Path Approvals (if decision maker):
   - Pending approvals list
```

### Flow 5: Decision Maker - Learning Path Approvals

```
1. Employee with DECISION_MAKER role logs in
   ↓
2. Redirected to /employee/{employeeId}
   ↓
3. Sees "Learning Path Approvals" section
   ↓
4. Sees count: "4 waiting approvals"
   ↓
5. Clicks on approval item
   ↓
6. Redirect to Learner AI microservice frontend
   (Currently: placeholder/mock - will redirect when Learner AI frontend is available)
   ↓
7. Decision Maker reviews and approves/rejects
   ↓
8. Request status updated
```

---

## What's Not Working / Needs Testing

### 🔴 Critical Issues to Test

1. **OAuth Token Persistence**
   - **Test**: Connect LinkedIn → Check if token persists
   - **Test**: Connect GitHub → Check if token persists
   - **Test**: OAuth error → Check if token persists (should not redirect to login)
   - **Expected**: Token should always persist during OAuth flow
   - **Check**: Railway logs for token generation, browser console for token storage

2. **Enrichment Trigger**
   - **Test**: Connect LinkedIn → Connect GitHub → Check if enrichment triggers
   - **Expected**: Enrichment should trigger automatically when both OAuth connected
   - **Check**: Railway logs for "EnrichProfileUseCase" messages
   - **Check**: Database for `profile_status = 'enriched'` and `enrichment_completed = true`

3. **Gemini API Integration**
   - **Test**: Check if Gemini API is actually being called
   - **Expected**: Unique bio per employee (not generic)
   - **Check**: Railway logs for "GeminiAPIClient" messages
   - **Check**: Database for `employees.bio` and `employee_project_summaries`
   - **Issue**: If all bios are generic, Gemini API may not be called (check GEMINI_API_KEY)

4. **HR Approval Workflow**
   - **Test**: HR logs in → Navigate to Pending Approvals → Approve employee
   - **Expected**: Profile status should update to 'approved'
   - **Check**: Database for `profile_status = 'approved'`
   - **Check**: Employee profile should show "✓ Profile Approved"

5. **Profile Status Routing**
   - **Test**: Employee with `basic` status → Should redirect to /enrich
   - **Test**: Employee with `enriched` status → Should redirect to /employee/{id}
   - **Test**: Employee with `approved` status → Should redirect to /employee/{id}
   - **Test**: HR employee → Should redirect to /company/{companyId}
   - **Expected**: Correct routing based on profile status and role

6. **LinkedIn OAuth Scope Mismatch**
   - **Test**: Connect LinkedIn → Check for `unauthorized_scope_error`
   - **Expected**: Should use OpenID Connect scopes (`openid`, `profile`, `email`)
   - **Check**: Railway logs for scope errors
   - **Fix**: Remove `LINKEDIN_USE_LEGACY_SCOPES` from Railway or set to `false`

7. **CSV Password Handling**
   - **Test**: Login with CSV-imported employee
   - **Expected**: Should work with password from CSV (or default `SecurePass123`)
   - **Check**: Database for `password_hash` (should be bcrypt hashed)
   - **Issue**: If login fails, check password hashing in `EmployeeRepository.js`

8. **Microservice Integration**
   - **Test**: Employee profile → Skills section → Should fetch from Skills Engine
   - **Test**: Employee profile → Courses section → Should fetch from Course Builder
   - **Expected**: Should use mock data if microservice fails
   - **Check**: Railway logs for microservice calls
   - **Issue**: If placeholders show, microservice integration may not be working

9. **Universal Endpoint**
   - **Test**: Other microservices calling Directory's `/api/fill-content-metrics`
   - **Expected**: Should generate SQL query using AI and return filled response
   - **Check**: Railway logs for "UniversalEndpointController" and "AIQueryGenerator" messages
   - **Issue**: If errors occur, check AI query generation and SQL validation

10. **URL Parameter Clearing**
    - **Test**: After OAuth callback → Check if URL params are cleared
    - **Expected**: URL should not have `linkedin`, `github`, `token`, `user` params after processing
    - **Check**: Browser URL after OAuth callback
    - **Issue**: If params persist, may cause false success messages

### 🟡 Known Limitations

1. **Dummy Authentication** - Not secure, must be replaced with JWT before production
2. **No RBAC** - Basic role checks only, no permission system
3. **No Audit Logging** - No action tracking
4. **Placeholder Components** - Skills, Courses, Dashboard, Requests, Learning Path sections are placeholders
5. **No Profile Edit** - Employees cannot edit their profiles
6. **No Multi-HR Support** - Assumes one HR per company
7. **No Directory Admin** - No platform-level admin features
8. **No Employee Requests** - Request system not implemented
9. **No Team/Department Manager Views** - Hierarchy views not implemented
10. **Single Migration File** - All schema changes must go in `001_initial_schema.sql`

---

## Architecture Overview

### Onion Architecture (3 Layers)

```
┌─────────────────────────────────────┐
│   Presentation Layer (Controllers)  │  ← HTTP requests/responses
├─────────────────────────────────────┤
│   Application Layer (Use Cases)     │  ← Business logic
├─────────────────────────────────────┤
│   Infrastructure Layer (Repositories)│  ← Database, APIs, External services
└─────────────────────────────────────┘
```

### Key Directories

- **Backend**: `backend/src/`
  - `presentation/` - Controllers (HTTP handlers)
  - `application/` - Use Cases (business logic)
  - `infrastructure/` - Repositories, API clients, database
  - `shared/` - Shared utilities (authMiddleware, etc.)

- **Frontend**: `frontend/src/`
  - `pages/` - Page components
  - `components/` - Reusable components
  - `context/` - React Context providers (AuthContext, etc.)
  - `services/` - API service functions
  - `utils/` - Utility functions

- **Database**: `database/`
  - `migrations/001_initial_schema.sql` - Single migration file
  - `scripts/clear_all_data.sql` - Database cleanup script

- **Documentation**: `docs/`
  - `system-overview.md` - Full technical overview
  - `ENRICHMENT-FEATURE-PROTECTION.md` - Enrichment flow protection
  - `PROJECT-STATUS-AND-TESTING-GUIDE.md` - This document

---

## Critical Files & Protection Rules

### Files That Must Not Be Modified Without Testing

**Backend**:
- `backend/src/presentation/OAuthController.js` - OAuth callbacks, token generation
- `backend/src/application/EnrichProfileUseCase.js` - Enrichment orchestration
- `backend/src/infrastructure/GeminiAPIClient.js` - Gemini API integration
- `backend/src/infrastructure/EmployeeRepository.js` - Data persistence methods
- `backend/src/infrastructure/auth/DummyAuthProvider.js` - Dummy auth implementation
- `backend/src/shared/authMiddleware.js` - Token validation
- `backend/src/presentation/UniversalEndpointController.js` - Universal endpoint handler
- `backend/src/infrastructure/AIQueryGenerator.js` - AI query generation

**Frontend**:
- `frontend/src/pages/EnrichProfilePage.js` - OAuth callback handling
- `frontend/src/context/AuthContext.js` - Token persistence during OAuth
- `frontend/src/components/LinkedInConnectButton.js` - LinkedIn OAuth initiation
- `frontend/src/components/GitHubConnectButton.js` - GitHub OAuth initiation

**Database**:
- `database/migrations/001_initial_schema.sql` - Single migration file (do not split)

### Protection Rules

1. **Never remove OAuth callback token/user data** - Always include both in redirect URLs (even on errors!)
2. **Never skip OAuth callback detection** - Always check URL params before redirecting
3. **Always use boolean coercion for OAuth detection** - Use `!!errorParam`, not `errorParam`
4. **Never redirect to login during OAuth callbacks** - Including errors - show error on enrich page instead
5. **Always preserve session on OAuth errors** - Backend must return token + user even when OAuth fails
6. **Never remove Gemini fallback** - Always have MockDataService as backup
7. **Never modify enrichment trigger logic** - Both OAuth must be connected
8. **Always test end-to-end** - OAuth → Enrichment → Profile → Approval
9. **Never split migration files** - Only use `001_initial_schema.sql`
10. **Always hash passwords** - Use bcrypt (10 rounds)

---

## Testing Checklist

Before making changes or starting a new chat session:

- [ ] Read this document completely
- [ ] Read `docs/system-overview.md`
- [ ] Read `docs/ENRICHMENT-FEATURE-PROTECTION.md`
- [ ] Check Railway logs for backend errors
- [ ] Check browser console for frontend errors
- [ ] Test OAuth flow end-to-end (LinkedIn + GitHub)
- [ ] Test enrichment trigger
- [ ] Test HR approval workflow
- [ ] Test profile status routing
- [ ] Test CSV upload and validation
- [ ] Test employee login with different roles
- [ ] Test company profile page
- [ ] Test employee profile page
- [ ] Verify all critical files are intact

---

## Quick Reference

### Test Accounts
- Use CSV-imported employees for testing
- Default password: `SecurePass123` (if not specified in CSV)
- HR email: Matches `companies.hr_contact_email`

### Environment Variables
- **Backend**: `DATABASE_URL`, `GEMINI_API_KEY`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `FRONTEND_URL`
- **Frontend**: `REACT_APP_API_BASE_URL`

### Deployment
- **Backend**: Railway (auto-deploys on push to main)
- **Frontend**: Vercel (auto-deploys on push to main)
- **Database**: Supabase (PostgreSQL)

### Key URLs
- **Backend**: `https://directory3-production.up.railway.app`
- **Frontend**: (Vercel URL - check Vercel dashboard)
- **API Base**: `https://directory3-production.up.railway.app/api/v1`

---

**End of Document**

*This document should be updated whenever new features are implemented or critical issues are discovered.*



