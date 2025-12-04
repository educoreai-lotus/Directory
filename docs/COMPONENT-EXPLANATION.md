# Component Explanation - EDUCORE Directory Management System

**Purpose**: Comprehensive explanation of every component in the project, why it exists, and how it's used.

---

## Table of Contents

1. [Backend Components](#backend-components)
   - [Presentation Layer (Controllers)](#presentation-layer-controllers)
   - [Application Layer (Use Cases)](#application-layer-use-cases)
   - [Infrastructure Layer](#infrastructure-layer)
   - [Shared Utilities](#shared-utilities)
2. [Frontend Components](#frontend-components)
   - [Page Components](#page-components)
   - [Reusable Components](#reusable-components)
   - [Context & Services](#context--services)

---

## Backend Components

### Presentation Layer (Controllers)

**Purpose**: Handle HTTP requests/responses, validate input, call use cases, format responses.

#### `AuthController.js`
- **What**: Handles authentication endpoints (login, logout, token validation)
- **Why**: Centralizes all authentication logic in one place
- **How**: 
  - `POST /api/v1/auth/login` - Employee login
  - `POST /api/v1/auth/admin/login` - Admin login
  - `GET /api/v1/auth/me` - Get current user
- **Uses**: `AuthenticateUserUseCase`, `AuthenticateAdminUseCase`, `DummyAuthProvider`

#### `AdminController.js`
- **What**: Handles admin-specific endpoints (view all companies, view any employee/company)
- **Why**: Directory admin needs read-only access to all companies
- **How**:
  - `GET /api/v1/admin/companies` - List all companies
  - `GET /api/v1/admin/companies/:id` - Get company details
  - `GET /api/v1/admin/employees/:id` - Get employee details
- **Uses**: `AdminRepository`, `CompanyRepository`, `EmployeeRepository`

#### `CompanyProfileController.js`
- **What**: Handles company profile endpoints (overview, employees, requests, hierarchy)
- **Why**: Company profile page needs multiple data sources
- **How**:
  - `GET /api/v1/companies/:id` - Get company profile
  - `GET /api/v1/companies/:id/employees` - List employees
  - `GET /api/v1/companies/:id/requests` - Get pending requests
- **Uses**: `GetCompanyProfileUseCase`, `EmployeeRepository`, `EmployeeRequestRepository`

#### `CompanyRegistrationController.js`
- **What**: Handles company registration flow
- **Why**: Companies need to register before uploading employees
- **How**:
  - `POST /api/v1/companies/register` - Register new company
- **Uses**: `RegisterCompanyUseCase`, `DomainValidator`

#### `CompanyVerificationController.js`
- **What**: Handles company domain verification
- **Why**: Verify company owns the domain they claim
- **How**:
  - `GET /api/v1/companies/:id/verification` - Get verification status
  - `POST /api/v1/companies/:id/verify` - Trigger verification
- **Uses**: `VerifyCompanyUseCase`, `DomainValidator`

#### `CSVUploadController.js`
- **What**: Handles CSV file uploads for bulk employee import
- **Why**: Companies need to upload many employees at once
- **How**:
  - `POST /api/v1/companies/:id/upload` - Upload CSV file
- **Uses**: `ParseCSVUseCase`, `CSVParser`, `CSVValidator`

#### `EmployeeController.js`
- **What**: Handles employee CRUD operations and profile data
- **Why**: Employees need to view/edit their profiles, get skills, courses, etc.
- **How**:
  - `GET /api/v1/companies/:id/employees/:employeeId` - Get employee profile
  - `POST /api/v1/companies/:id/employees` - Add employee
  - `PUT /api/v1/companies/:id/employees/:employeeId` - Update employee
  - `DELETE /api/v1/companies/:id/employees/:employeeId` - Delete employee
  - `GET /api/v1/companies/:id/employees/:employeeId/skills` - Get skills
  - `GET /api/v1/companies/:id/employees/:employeeId/courses` - Get courses
  - `GET /api/v1/companies/:id/employees/:employeeId/management-hierarchy` - Get management hierarchy
- **Uses**: `AddEmployeeUseCase`, `UpdateEmployeeUseCase`, `GetEmployeeSkillsUseCase`, `GetManagerHierarchyUseCase`

#### `EmployeeProfileApprovalController.js`
- **What**: Handles profile approval/rejection by HR
- **Why**: HR needs to approve enriched profiles before they're visible
- **How**:
  - `POST /api/v1/companies/:id/employees/:employeeId/approve` - Approve profile
  - `POST /api/v1/companies/:id/employees/:employeeId/reject` - Reject profile
- **Uses**: `EmployeeProfileApprovalRepository`

#### `EnrichmentController.js`
- **What**: Handles profile enrichment flow (LinkedIn + GitHub + OpenAI)
- **Why**: Employees need to enrich their profiles with external data
- **How**:
  - `POST /api/v1/companies/:id/employees/:employeeId/enrich` - Start enrichment
- **Uses**: `EnrichProfileUseCase`, `OpenAIAPIClient`, `LinkedInAPIClient`, `GitHubAPIClient`

#### `OAuthController.js`
- **What**: Handles OAuth callbacks from LinkedIn and GitHub
- **Why**: OAuth flow requires callback endpoints
- **How**:
  - `GET /api/v1/oauth/linkedin/callback` - LinkedIn OAuth callback
  - `GET /api/v1/oauth/github/callback` - GitHub OAuth callback
- **Uses**: `ConnectLinkedInUseCase`, `ConnectGitHubUseCase`, `LinkedInOAuthClient`, `GitHubOAuthClient`

#### `RequestController.js`
- **What**: Handles employee requests (training requests, etc.)
- **Why**: Employees need to submit requests that HR can approve
- **How**:
  - `POST /api/v1/companies/:id/employees/:employeeId/requests` - Submit request
  - `GET /api/v1/companies/:id/requests` - Get company requests
- **Uses**: `SubmitEmployeeRequestUseCase`, `EmployeeRequestRepository`

#### `TrainerController.js`
- **What**: Handles trainer-specific endpoints (settings, courses taught)
- **Why**: Trainers have special features (AI settings, courses they teach)
- **How**:
  - `GET /api/v1/employees/:employeeId/trainer-settings` - Get trainer settings
  - `PUT /api/v1/employees/:employeeId/trainer-settings` - Update trainer settings
  - `GET /api/v1/employees/:employeeId/courses-taught` - Get courses taught
- **Uses**: `UpdateTrainerSettingsUseCase`, `EmployeeRepository`

#### `UniversalEndpointController.js`
- **What**: Handles dynamic microservice endpoints using AI query generation
- **Why**: Allows calling any microservice endpoint without hardcoding
- **How**:
  - `POST /api/v1/universal/:microservice/:operation` - Call any microservice
- **Uses**: `AIQueryGenerator`, `MicroserviceClient`

---

### Application Layer (Use Cases)

**Purpose**: Business logic orchestration. Each use case represents one business operation.

#### `AddEmployeeUseCase.js`
- **What**: Orchestrates adding a new employee to the system
- **Why**: Adding employee requires multiple steps: create employee, assign roles, assign team, assign manager
- **How**: Called by `EmployeeController.addEmployee()`
- **Uses**: `EmployeeRepository`, `TeamRepository`, `DepartmentRepository`

#### `AuthenticateUserUseCase.js`
- **What**: Authenticates an employee login
- **Why**: Login requires password verification and token generation
- **How**: Called by `AuthController.login()`
- **Uses**: `EmployeeRepository`, `DummyAuthProvider`

#### `AuthenticateAdminUseCase.js`
- **What**: Authenticates directory admin login
- **Why**: Admin uses separate authentication
- **How**: Called by `AuthController.adminLogin()`
- **Uses**: `AdminRepository`, `DummyAuthProvider`

#### `ConnectGitHubUseCase.js`
- **What**: Connects employee's GitHub account via OAuth
- **Why**: Need to fetch GitHub data for profile enrichment
- **How**: Called by `OAuthController.githubCallback()`
- **Uses**: `GitHubOAuthClient`, `EmployeeRepository`

#### `ConnectLinkedInUseCase.js`
- **What**: Connects employee's LinkedIn account via OAuth
- **Why**: Need to fetch LinkedIn data for profile enrichment
- **How**: Called by `OAuthController.linkedinCallback()`
- **Uses**: `LinkedInOAuthClient`, `EmployeeRepository`

#### `DeleteEmployeeUseCase.js`
- **What**: Soft-deletes an employee (marks as inactive)
- **Why**: Need to preserve data but remove from active directory
- **How**: Called by `EmployeeController.deleteEmployee()`
- **Uses**: `EmployeeRepository`

#### `EnrichProfileUseCase.js`
- **What**: Orchestrates profile enrichment (LinkedIn + GitHub + OpenAI)
- **Why**: Enrichment requires multiple API calls and data synthesis
- **How**: Called by `EnrichmentController.enrich()`
- **Uses**: `OpenAIAPIClient`, `EmployeeRepository`, `FillContentMetricsUseCase`

#### `FillContentMetricsUseCase.js`
- **What**: Fills profile content using OpenAI (bio, value proposition, project summaries)
- **Why**: AI generates professional content from LinkedIn/GitHub data
- **How**: Called by `EnrichProfileUseCase`
- **Uses**: `OpenAIAPIClient`, `EmployeeRepository`

#### `GetCompanyProfileUseCase.js`
- **What**: Fetches complete company profile data
- **Why**: Company profile needs aggregated data from multiple sources
- **How**: Called by `CompanyProfileController.getCompany()`
- **Uses**: `CompanyRepository`, `EmployeeRepository`, `DepartmentRepository`, `TeamRepository`

#### `GetEmployeeCoursesUseCase.js`
- **What**: Fetches employee's courses from Course Builder microservice
- **Why**: Employees need to see their enrolled courses
- **How**: Called by `EmployeeController.getEmployeeCourses()`
- **Uses**: `MicroserviceClient`

#### `GetEmployeeDashboardUseCase.js`
- **What**: Fetches employee dashboard data (metrics, stats)
- **Why**: Dashboard needs aggregated data
- **How**: Called by dashboard endpoints
- **Uses**: `EmployeeRepository`, `MicroserviceClient`

#### `GetEmployeeLearningPathUseCase.js`
- **What**: Fetches employee's learning path from Learner AI microservice
- **Why**: Employees need to see their learning path
- **How**: Called by learning path endpoints
- **Uses**: `MicroserviceClient`

#### `GetEmployeeRequestsUseCase.js`
- **What**: Fetches employee's submitted requests
- **Why**: Employees need to see their request history
- **How**: Called by request endpoints
- **Uses**: `EmployeeRequestRepository`

#### `GetEmployeeSkillsUseCase.js`
- **What**: Fetches employee's skills from Skills Engine microservice
- **Why**: Employees need to see their skills hierarchy
- **How**: Called by `EmployeeController.getEmployeeSkills()`
- **Uses**: `MicroserviceClient`, `MockDataService`

#### `GetManagerHierarchyUseCase.js`
- **What**: Fetches management hierarchy for team/department managers
- **Why**: Managers need to see who they manage
- **How**: Called by `EmployeeController.getManagerHierarchy()`
- **Uses**: `EmployeeRepository`, `TeamRepository`, `DepartmentRepository`

#### `ParseCSVUseCase.js`
- **What**: Orchestrates CSV parsing, validation, and database insertion
- **Why**: CSV upload requires parsing, validation, and transaction management
- **How**: Called by `CSVUploadController.uploadCSV()`
- **Uses**: `CSVParser`, `CSVValidator`, `DatabaseConstraintValidator`, repositories

#### `RegisterCompanyUseCase.js`
- **What**: Registers a new company in the system
- **Why**: Companies need to register before uploading employees
- **How**: Called by `CompanyRegistrationController.register()`
- **Uses**: `CompanyRepository`, `DomainValidator`

#### `SubmitEmployeeRequestUseCase.js`
- **What**: Submits an employee request (training, etc.)
- **Why**: Employees need to submit requests that HR can approve
- **How**: Called by `RequestController.submitRequest()`
- **Uses**: `EmployeeRequestRepository`

#### `UpdateEmployeeUseCase.js`
- **What**: Updates an existing employee's information
- **Why**: Employees/HR need to update employee data
- **How**: Called by `EmployeeController.updateEmployee()`
- **Uses**: `EmployeeRepository`, `TeamRepository`

#### `UpdateTrainerSettingsUseCase.js`
- **What**: Updates trainer-specific settings (AI enabled, public publish)
- **Why**: Trainers have special configuration options
- **How**: Called by `TrainerController.updateTrainerSettings()`
- **Uses**: `EmployeeRepository`

#### `ValidateCSVDataUseCase.js`
- **What**: Validates CSV data before insertion
- **Why**: Need to validate data before database operations
- **How**: Called by `ParseCSVUseCase`
- **Uses**: `CSVValidator`, `DatabaseConstraintValidator`

#### `VerifyCompanyUseCase.js`
- **What**: Verifies company domain ownership
- **Why**: Need to verify company owns the domain
- **How**: Called by `CompanyVerificationController.verify()`
- **Uses**: `DomainValidator`, `CompanyRepository`

---

### Infrastructure Layer

**Purpose**: External services, database access, API clients, validators.

#### Repositories (Database Access)

#### `AdminRepository.js`
- **What**: Database operations for directory admins
- **Why**: Admin data needs separate repository
- **How**: Used by `AdminController`, `AuthenticateAdminUseCase`
- **Methods**: `findByEmail()`, `create()`, `findAll()`

#### `CompanyRepository.js`
- **What**: Database operations for companies
- **Why**: All company data access in one place
- **How**: Used by company-related use cases and controllers
- **Methods**: `create()`, `findById()`, `findByDomain()`, `update()`, `findAll()`

#### `DepartmentRepository.js`
- **What**: Database operations for departments
- **Why**: Department data needs separate repository
- **How**: Used by `ParseCSVUseCase`, `GetCompanyProfileUseCase`
- **Methods**: `create()`, `findByCompanyId()`, `findById()`

#### `EmployeeRepository.js`
- **What**: Database operations for employees
- **Why**: All employee data access in one place
- **How**: Used by all employee-related use cases
- **Methods**: `create()`, `findById()`, `findByEmail()`, `update()`, `delete()`, `assignRole()`, `assignToTeam()`, `assignManager()`, `isTrainer()`, `getTrainerSettings()`, `updateLinkedInData()`, `updateGitHubData()`, `getProjectSummaries()`

#### `EmployeeProfileApprovalRepository.js`
- **What**: Database operations for profile approvals
- **Why**: Approval workflow needs separate repository
- **How**: Used by `EmployeeProfileApprovalController`
- **Methods**: `create()`, `findPendingByCompany()`, `approve()`, `reject()`

#### `EmployeeRequestRepository.js`
- **What**: Database operations for employee requests
- **Why**: Request system needs separate repository
- **How**: Used by `RequestController`, `GetEmployeeRequestsUseCase`
- **Methods**: `create()`, `findByEmployee()`, `findByCompany()`, `updateStatus()`

#### `TeamRepository.js`
- **What**: Database operations for teams
- **Why**: Team data needs separate repository
- **How**: Used by `ParseCSVUseCase`, `GetManagerHierarchyUseCase`
- **Methods**: `create()`, `findByCompanyId()`, `findById()`, `findByDepartmentId()`

#### API Clients (External Services)

#### `OpenAIAPIClient.js`
- **What**: Client for OpenAI API (GPT-4 for bio, value proposition, project summaries)
- **Why**: Need to generate AI content for profiles
- **How**: Used by `EnrichProfileUseCase`, `FillContentMetricsUseCase`
- **Methods**: `generateBio()`, `generateValueProposition()`, `generateProjectSummary()`

#### `LinkedInOAuthClient.js`
- **What**: Client for LinkedIn OAuth flow
- **Why**: Need to authenticate and fetch LinkedIn data
- **How**: Used by `ConnectLinkedInUseCase`, `OAuthController`
- **Methods**: `getAuthUrl()`, `exchangeCodeForToken()`, `getProfile()`

#### `LinkedInAPIClient.js`
- **What**: Client for LinkedIn API (fetching profile data)
- **Why**: Need to fetch LinkedIn profile information
- **How**: Used by `EnrichProfileUseCase`
- **Methods**: `getProfile()`, `getExperience()`

#### `GitHubOAuthClient.js`
- **What**: Client for GitHub OAuth flow
- **Why**: Need to authenticate and fetch GitHub data
- **How**: Used by `ConnectGitHubUseCase`, `OAuthController`
- **Methods**: `getAuthUrl()`, `exchangeCodeForToken()`, `getProfile()`

#### `GitHubAPIClient.js`
- **What**: Client for GitHub API (fetching repository data)
- **Why**: Need to fetch GitHub repositories and contributions
- **How**: Used by `EnrichProfileUseCase`
- **Methods**: `getRepositories()`, `getContributions()`

#### `MicroserviceClient.js`
- **What**: Generic client for calling other microservices (Skills Engine, Course Builder, Learner AI)
- **Why**: Need unified way to call multiple microservices
- **How**: Used by `GetEmployeeSkillsUseCase`, `GetEmployeeCoursesUseCase`, `GetEmployeeLearningPathUseCase`
- **Methods**: `call()`, `callWithEnvelope()`
- **Features**: Universal envelope structure, mock data fallback

#### `MockDataService.js`
- **What**: Service for loading mock data when microservices are unavailable
- **Why**: Need fallback data for development/testing
- **How**: Used by `MicroserviceClient`
- **Methods**: `loadMockData()`, `getMockData()`

#### `GeminiAPIClient.js`
- **What**: Client for Google Gemini API (AI query generation)
- **Why**: Need AI to generate SQL queries for microservice calls
- **How**: Used by `AIQueryGenerator`
- **Methods**: `generateQuery()`

#### `AIQueryGenerator.js`
- **What**: Generates SQL queries from natural language using Gemini AI
- **Why**: Universal endpoint needs to generate queries dynamically
- **How**: Used by `UniversalEndpointController`
- **Methods**: `generateQuery()`, `validateQuery()`

#### Validators & Parsers

#### `CSVParser.js`
- **What**: Parses CSV files into structured data
- **Why**: Need to convert CSV rows into company/employee objects
- **How**: Used by `ParseCSVUseCase`
- **Methods**: `parse()`, `normalizeCompanyRow()`, `normalizeEmployeeRow()`

#### `CSVValidator.js`
- **What**: Validates CSV data (format, required fields, business rules)
- **Why**: Need to catch errors before database insertion
- **How**: Used by `ParseCSVUseCase`
- **Methods**: `validate()`, `validateCompanyRow()`, `validateEmployeeRow()`, `validateRoleType()`

#### `DatabaseConstraintValidator.js`
- **What**: Validates data against database constraints
- **Why**: Need to check foreign keys, unique constraints before insertion
- **How**: Used by `ParseCSVUseCase`
- **Methods**: `validate()`, `checkForeignKey()`, `checkUnique()`

#### `DomainValidator.js`
- **What**: Validates company domain ownership (DNS, MX records)
- **Why**: Need to verify company owns the domain
- **How**: Used by `RegisterCompanyUseCase`, `VerifyCompanyUseCase`
- **Methods**: `validate()`, `checkDNS()`, `checkMX()`

#### `CSVErrorFormatter.js`
- **What**: Formats CSV validation errors for display
- **Why**: Need user-friendly error messages
- **How**: Used by `CSVUploadController`
- **Methods**: `formatErrors()`, `formatRowError()`

#### Authentication

#### `DummyAuthProvider.js`
- **What**: Dummy authentication provider for testing
- **Why**: Need authentication system during development
- **How**: Used by `AuthController`, `AuthenticateUserUseCase`
- **Methods**: `authenticate()`, `validateToken()`, `generateToken()`

#### `AuthFactory.js`
- **What**: Factory for creating auth providers
- **Why**: Need to switch between auth providers (dummy, JWT, etc.)
- **How**: Used by `authMiddleware`
- **Methods**: `create()`

#### `AuthProvider.js` & `AuthServiceProvider.js`
- **What**: Abstract interfaces for auth providers
- **Why**: Need consistent interface for different auth implementations
- **How**: Extended by `DummyAuthProvider`

---

### Shared Utilities

#### `authMiddleware.js`
- **What**: Express middleware for authentication
- **Why**: Need to protect routes and extract user info
- **How**: Applied to protected routes
- **Features**: Token validation, user extraction, HR detection, admin detection

#### `ErrorTranslator.js`
- **What**: Translates technical errors to user-friendly messages
- **Why**: Users shouldn't see database errors
- **How**: Used by all controllers
- **Methods**: `translateError()`

#### `requestParser.js`
- **What**: Parses request bodies (handles different formats)
- **Why**: Need to handle different request formats
- **How**: Used by middleware

#### `responseFormatter.js`
- **What**: Formats responses in universal envelope structure
- **Why**: Need consistent response format
- **How**: Used by middleware

---

## Frontend Components

### Page Components

**Location**: `frontend/src/pages/`

#### `LoginPage.js`
- **What**: Login page for employees and admin
- **Why**: Users need to authenticate
- **How**: Renders `LoginForm` component

#### `EmployeeProfilePage.js`
- **What**: Main employee profile page
- **Why**: Employees need to view/edit their profiles
- **How**: 
  - Fetches employee data
  - Renders profile sections (bio, skills, courses, management, etc.)
  - Conditionally shows sections based on role (trainer settings, management hierarchy)
- **Uses**: `ProfileEditForm`, `TrainerSettings`, `ProfileManagement`, `ApprovedProfileTabs`

#### `CompanyProfilePage.js`
- **What**: Company profile page (HR view)
- **Why**: HR needs to manage company, employees, requests
- **How**:
  - Fetches company data
  - Renders tabs: Overview, Requests, Management & Reporting
  - Shows employee list, pending requests, hierarchy
- **Uses**: `CompanyDashboard`, `PendingRequestsSection`, `PendingProfileApprovals`, `EmployeeList`, `CompanyHierarchy`

#### `AdminDashboard.js`
- **What**: Directory admin dashboard
- **Why**: Admin needs to view all companies
- **How**:
  - Fetches all companies
  - Displays company cards
  - Allows navigation to company profiles
- **Uses**: `AdminHeader`, company cards

#### `CompanyCSVUploadPage.js`
- **What**: CSV upload page for companies
- **Why**: Companies need to upload employee data
- **How**:
  - Shows CSV requirements
  - Handles file upload
  - Displays validation errors
- **Uses**: `CSVUploadForm`, `CSVErrorDisplay`, `CSVUploadProgress`

#### `CompanyRegistrationPage.js`
- **What**: Company registration page
- **Why**: Companies need to register before using the system
- **How**:
  - Shows registration form
  - Handles domain verification
- **Uses**: `CompanyRegistrationFormFields`, `VerificationStatus`

---

### Reusable Components

**Location**: `frontend/src/components/`

#### Header Components

#### `Header.js`
- **What**: Main header for employee/company pages
- **Why**: Consistent navigation across pages
- **How**: Shows user info, logout, navigation links
- **Used by**: `EmployeeProfilePage`, `CompanyProfilePage`

#### `AdminHeader.js`
- **What**: Header for admin pages
- **Why**: Admin needs different navigation
- **How**: Shows admin-specific navigation
- **Used by**: `AdminDashboard`

#### Profile Components

#### `ProfileEditForm.js`
- **What**: Form for editing employee profile
- **Why**: Employees need to edit their profiles
- **How**: Renders form fields, handles submission
- **Used by**: `EmployeeProfilePage`

#### `ApprovedProfileTabs.js`
- **What**: Tabs for approved profile sections (Skills, Courses, Learning Path, Analytics)
- **Why**: Approved profiles have additional sections
- **How**: Renders tabs and content
- **Uses**: `ProfileSkills`, `ProfileCourses`, `LearningPath`, `ProfileAnalytics`

#### `ProfileSkills.js`
- **What**: Displays employee skills in hierarchical tree view
- **Why**: Employees need to see their skills
- **How**: Fetches skills from API, renders tree structure
- **Used by**: `ApprovedProfileTabs`

#### `ProfileCourses.js`
- **What**: Displays employee's enrolled courses
- **Why**: Employees need to see their courses
- **How**: Fetches courses from API
- **Used by**: `ApprovedProfileTabs`

#### `ProfileAnalytics.js`
- **What**: Displays employee analytics/metrics
- **Why**: Employees need to see their progress
- **How**: Fetches analytics data
- **Used by**: `ApprovedProfileTabs`

#### `ProfileDashboard.js`
- **What**: Dashboard view for employee profile
- **Why**: Employees need overview of their profile
- **How**: Shows summary cards, metrics
- **Used by**: `EmployeeProfilePage`

#### `ProfileRequests.js`
- **What**: Displays employee's submitted requests
- **Why**: Employees need to see their request history
- **How**: Fetches requests from API
- **Used by**: `EmployeeProfilePage`

#### `ProfileManagement.js`
- **What**: Displays management hierarchy for managers
- **Why**: Managers need to see who they manage
- **How**: Fetches hierarchy from API, renders expandable tree
- **Used by**: `EmployeeProfilePage`

#### Trainer Components

#### `TrainerSettings.js`
- **What**: Form for trainer-specific settings (AI enabled, public publish)
- **Why**: Trainers have special configuration
- **How**: Fetches/updates trainer settings
- **Used by**: `EmployeeProfilePage` (only for trainers)

#### `TrainerCoursesTaught.js`
- **What**: Displays courses taught by trainer
- **Why**: Trainers need to see courses they teach
- **How**: Fetches courses from API
- **Used by**: Trainer section

#### Company Components

#### `CompanyDashboard.js`
- **What**: Dashboard for company overview
- **Why**: HR needs company overview
- **How**: Shows company metrics, stats
- **Used by**: `CompanyProfilePage`

#### `CompanyMetrics.js`
- **What**: Displays company metrics (employee count, etc.)
- **Why**: HR needs to see company statistics
- **How**: Fetches metrics from API
- **Used by**: `CompanyDashboard`

#### `CompanyHierarchy.js`
- **What**: Displays company organizational hierarchy
- **Why**: HR needs to see company structure
- **How**: Fetches departments/teams/employees, renders tree
- **Used by**: `CompanyProfilePage`

#### `CompanyAnalyticsDashboard.js`
- **What**: Analytics dashboard for company
- **Why**: HR needs company analytics
- **How**: Fetches analytics data
- **Used by**: Company profile

#### Employee Management Components

#### `EmployeeList.js`
- **What**: Lists all employees in company
- **Why**: HR needs to see all employees
- **How**: Fetches employees, renders list with actions
- **Used by**: `CompanyProfilePage`

#### `AddEmployeeForm.js`
- **What**: Form for adding new employee
- **Why**: HR needs to add employees manually
- **How**: Renders form, handles submission
- **Used by**: `EmployeeList`

#### `EditEmployeeForm.js`
- **What**: Form for editing employee
- **Why**: HR needs to edit employee data
- **How**: Renders form, handles submission
- **Used by**: `EmployeeList`

#### Request & Approval Components

#### `PendingRequestsSection.js`
- **What**: Displays pending employee requests
- **Why**: HR needs to see and approve requests
- **How**: Fetches requests, renders list with approve/reject actions
- **Used by**: `CompanyProfilePage`

#### `PendingProfileApprovals.js`
- **What**: Displays pending profile approvals
- **Why**: HR needs to approve enriched profiles
- **How**: Fetches approvals, renders list with approve/reject actions
- **Used by**: `CompanyProfilePage`

#### `LearningPathApprovals.js`
- **What**: Displays learning path approvals
- **Why**: HR/Decision Maker needs to approve learning paths
- **How**: Fetches approvals, renders list
- **Used by**: Company profile

#### CSV Upload Components

#### `CSVUploadForm.js`
- **What**: Form for uploading CSV file
- **Why**: Companies need to upload employee data
- **How**: Handles file selection, upload, progress
- **Used by**: `CompanyCSVUploadPage`

#### `CSVUploadProgress.js`
- **What**: Progress indicator for CSV upload
- **Why**: Users need to see upload progress
- **How**: Shows progress bar, status
- **Used by**: `CSVUploadForm`

#### `CSVErrorDisplay.js`
- **What**: Displays CSV validation errors
- **Why**: Users need to see what's wrong with CSV
- **How**: Renders error list with row numbers
- **Used by**: `CompanyCSVUploadPage`

#### `CSVErrorRow.js`
- **What**: Displays single CSV error row
- **Why**: Need to show individual errors
- **How**: Renders error details
- **Used by**: `CSVErrorDisplay`

#### `CSVCorrectionForm.js`
- **What**: Form for correcting CSV errors
- **Why**: Users need to fix CSV errors
- **How**: Renders correction form
- **Used by**: CSV upload flow

#### OAuth Components

#### `LinkedInConnectButton.js`
- **What**: Button to connect LinkedIn account
- **Why**: Employees need to connect LinkedIn for enrichment
- **How**: Initiates OAuth flow
- **Used by**: Enrichment flow

#### `GitHubConnectButton.js`
- **What**: Button to connect GitHub account
- **Why**: Employees need to connect GitHub for enrichment
- **How**: Initiates OAuth flow
- **Used by**: Enrichment flow

#### Other Components

#### `LoginForm.js`
- **What**: Login form component
- **Why**: Users need to log in
- **How**: Renders form, handles authentication
- **Used by**: `LoginPage`

#### `LearningPath.js`
- **What**: Displays employee learning path
- **Why**: Employees need to see their learning path
- **How**: Fetches learning path from API
- **Used by**: `ApprovedProfileTabs`

#### `EnrollmentSection.js`
- **What**: Section for course enrollment
- **Why**: Employees need to enroll in courses
- **How**: Renders enrollment interface
- **Used by**: Profile pages

#### `VerificationStatus.js`
- **What**: Displays company verification status
- **Why**: Companies need to see verification status
- **How**: Fetches status, renders indicator
- **Used by**: `CompanyRegistrationPage`

#### `CompanyRegistrationFormFields.js`
- **What**: Form fields for company registration
- **Why**: Companies need registration form
- **How**: Renders form fields
- **Used by**: `CompanyRegistrationPage`

---

### Context & Services

#### `AuthContext.js`
- **What**: React Context for authentication state
- **Why**: Need to share auth state across components
- **How**: Provides `user`, `login()`, `logout()`, `isAuthenticated`
- **Used by**: All pages and components

#### API Services (`frontend/src/services/`)
- **What**: Functions for calling backend APIs
- **Why**: Centralize API calls
- **Files**: `employeeService.js`, `companyService.js`, `authService.js`, `requestService.js`
- **How**: Used by components to fetch data

---

## Summary

**Backend Architecture**: 3-layer Onion Architecture
- **Presentation**: Controllers handle HTTP
- **Application**: Use Cases contain business logic
- **Infrastructure**: Repositories, API clients, validators

**Frontend Architecture**: Component-based React
- **Pages**: Top-level route components
- **Components**: Reusable UI components
- **Context**: Shared state (auth)
- **Services**: API communication

**Key Design Principles**:
1. **Separation of Concerns**: Each component has one responsibility
2. **Reusability**: Components can be reused across pages
3. **Testability**: Business logic separated from HTTP/database
4. **Maintainability**: Clear structure, easy to find code
5. **Scalability**: Easy to add new features without breaking existing code

