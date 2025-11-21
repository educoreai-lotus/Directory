# Project File Reference - Complete File Listing with Descriptions

**Last Updated**: 2025-01-20  
**Purpose**: Comprehensive reference of all project files with descriptions of what each file contains and its purpose.

---

## Table of Contents

1. [Frontend Files](#frontend-files)
2. [Backend Files](#backend-files)
3. [Database Files](#database-files)
4. [Documentation Files](#documentation-files)
5. [Configuration Files](#configuration-files)

---

## Frontend Files

### Root Files

#### `frontend/src/App.js`
**Purpose**: Main React application component  
**Contains**: 
- React Router setup with all routes
- Context providers (AuthProvider, DesignSystemProvider)
- Route definitions for all pages
- Header component inclusion

**Routes Defined**:
- `/` - LandingPage
- `/login` - LoginPage
- `/enrich` - EnrichProfilePage
- `/employee/:employeeId` - EmployeeProfilePage
- `/register` - CompanyRegistrationForm
- `/verify/:companyId` - CompanyVerificationPage
- `/upload/:companyId` - CompanyCSVUploadPage
- `/company/:companyId` - CompanyProfilePage

#### `frontend/src/App.css`
**Purpose**: Global application styles  
**Contains**: CSS styles for the main app container and animations

#### `frontend/src/index.js`
**Purpose**: React application entry point  
**Contains**: ReactDOM render call, root component mounting

#### `frontend/src/index.css`
**Purpose**: Global CSS styles  
**Contains**: Base styles, CSS reset, global variables

#### `frontend/src/config.js`
**Purpose**: Frontend configuration  
**Contains**: API base URL, environment variables

---

### Pages (`frontend/src/pages/`)

#### `LandingPage.js`
**Purpose**: Landing/home page  
**Contains**: 
- Welcome message
- Navigation to registration or login
- Company branding

#### `LoginPage.js`
**Purpose**: User login page  
**Contains**: 
- Login form component
- Email and password input
- Authentication handling
- Redirect logic after login

#### `CompanyRegistrationForm.js`
**Purpose**: Company registration form page  
**Contains**: 
- Company registration form fields
- Company information input (name, industry, domain, HR contact)
- Form validation
- Submission handling
- Redirect to verification page

#### `CompanyVerificationPage.js`
**Purpose**: Company verification page  
**Contains**: 
- Verification status display
- Admin verification interface
- Redirect to CSV upload after verification

#### `CompanyCSVUploadPage.js`
**Purpose**: CSV upload page for employee data  
**Contains**: 
- CSV file upload interface
- Upload progress display
- Error handling and correction
- Redirect to company profile after upload

#### `CompanyProfilePage.js`
**Purpose**: Main company profile page  
**Contains**: 
- Company header with logo
- Company information display
- CompanyDashboard component integration
- Data fetching and state management
- Error and loading states

#### `EmployeeProfilePage.js`
**Purpose**: Individual employee profile page  
**Contains**: 
- Employee basic information display
- AI-generated bio, project summaries, value proposition
- Profile approval status handling
- Learning & Development tabs (when approved)
- Trainer settings (if trainer)
- Profile editing functionality

#### `EnrichProfilePage.js`
**Purpose**: Profile enrichment page  
**Contains**: 
- LinkedIn and GitHub connection buttons
- OAuth flow initiation
- Enrichment status display
- Redirect to profile after enrichment

---

### Components (`frontend/src/components/`)

#### `Header.js` / `Header.css`
**Purpose**: Application header/navigation bar  
**Contains**: 
- Navigation links
- User authentication status
- Logout functionality
- Responsive menu

#### `CompanyDashboard.js`
**Purpose**: Main company dashboard with tabs  
**Contains**: 
- Tab navigation (Overview, Hierarchy, Analytics, Employees, Enrollment, Requests, Approvals)
- Tab content rendering
- State management for active tab
- Pending requests count tracking

#### `CompanyMetrics.js`
**Purpose**: Company metrics display  
**Contains**: 
- Metrics cards (total employees, active/inactive, departments, teams)
- Visual metrics representation

#### `CompanyHierarchy.js`
**Purpose**: Organizational hierarchy visualization  
**Contains**: 
- Department → Team → Employee hierarchy display
- Expandable/collapsible sections
- Tree structure rendering

#### `CompanyAnalyticsDashboard.js`
**Purpose**: Company analytics dashboard  
**Contains**: 
- Analytics data fetching from Learning Analytics microservice
- Analytics visualization
- Mock data fallback

#### `EmployeeList.js`
**Purpose**: Employee list with management features  
**Contains**: 
- Employee cards display
- Search functionality (name, email)
- Single-select role filter dropdown
- Sort functionality (name, email, role, department, team)
- Sort direction toggle
- Add/Edit/Delete employee actions
- CSV upload option
- Employee click navigation

#### `AddEmployeeForm.js`
**Purpose**: Form to add new employee  
**Contains**: 
- Employee information input fields
- Form validation
- Submission handling

#### `EditEmployeeForm.js`
**Purpose**: Form to edit existing employee  
**Contains**: 
- Pre-filled employee data
- Editable fields
- Update submission

#### `PendingProfileApprovals.js`
**Purpose**: HR approval workflow component  
**Contains**: 
- List of pending profile approvals
- Approve/Reject buttons
- View employee navigation
- Approval status display
- Page refresh after approval

#### `PendingRequestsSection.js`
**Purpose**: Pending employee requests display  
**Contains**: 
- List of pending requests
- Request cards with details (type, employee, title, description, priority)
- Approve/Reject/View Employee buttons
- Count badge display
- No auto-refresh (fetches once on mount)

#### `ApprovedProfileTabs.js`
**Purpose**: Tabbed interface for approved employee profiles  
**Contains**: 
- Tab navigation (Skills, Courses, Learning Path, Analytics, Requests)
- Tab content rendering
- Active tab state management

#### `ProfileSkills.js`
**Purpose**: Employee skills display  
**Contains**: 
- Hierarchical skills visualization
- Skills Engine microservice integration
- Mock data fallback
- Verified status indicators

#### `ProfileCourses.js`
**Purpose**: Employee courses display  
**Contains**: 
- Assigned courses list
- In Progress courses
- Completed courses
- Taught courses (trainers only)
- Course click redirect (Course Builder)
- Mock data fallback

#### `LearningPath.js`
**Purpose**: Learning path display  
**Contains**: 
- Learning path visualization
- Learner AI microservice integration
- "No learning path yet." message
- View full learning path redirect

#### `ProfileAnalytics.js`
**Purpose**: Learning analytics display  
**Contains**: 
- Analytics data from Learning Analytics microservice
- Progress summary
- Recent activity
- Upcoming deadlines
- Achievements
- Mock data fallback

#### `ProfileRequests.js`
**Purpose**: Employee request submission and display  
**Contains**: 
- Request submission form
- Request type selection
- Title and description input
- Submitted requests list
- Request status display
- Error handling

#### `ProfileEditForm.js`
**Purpose**: Profile editing form  
**Contains**: 
- Editable employee fields
- Form validation
- Save/Cancel actions
- Update API call

#### `ProfileDashboard.js`
**Purpose**: Profile dashboard section  
**Contains**: 
- Dashboard data from Learning Analytics
- Progress summary
- Activity feed
- Mock data fallback

#### `TrainerSettings.js`
**Purpose**: Trainer-specific settings  
**Contains**: 
- AI-enabled toggle
- Public publish enable toggle
- Settings save functionality

#### `TrainerCoursesTaught.js`
**Purpose**: Trainer courses taught display (deprecated - moved to ProfileCourses)  
**Contains**: 
- List of courses taught by trainer
- Note: This component is deprecated, functionality moved to ProfileCourses

#### `LearningPathApprovals.js`
**Purpose**: Learning path approvals for decision makers  
**Contains**: 
- Learning path approval requests
- Approve/Reject functionality
- Only visible for DECISION_MAKER role

#### `LinkedInConnectButton.js`
**Purpose**: LinkedIn OAuth connection button  
**Contains**: 
- LinkedIn OAuth initiation
- Connection status display
- Redirect handling

#### `GitHubConnectButton.js`
**Purpose**: GitHub OAuth connection button  
**Contains**: 
- GitHub OAuth initiation
- Connection status display
- Redirect handling

#### `LoginForm.js`
**Purpose**: Login form component  
**Contains**: 
- Email and password inputs
- Form validation
- Login submission
- Error display

#### `CSVUploadForm.js`
**Purpose**: CSV file upload form  
**Contains**: 
- File input
- Upload button
- Progress display
- Error handling

#### `CSVUploadProgress.js`
**Purpose**: CSV upload progress indicator  
**Contains**: 
- Progress bar
- Status messages
- Error display

#### `CSVErrorDisplay.js`
**Purpose**: CSV upload error display  
**Contains**: 
- Error list display
- Error row details
- Correction suggestions

#### `CSVErrorRow.js`
**Purpose**: Individual CSV error row display  
**Contains**: 
- Error details for single row
- Correction form

#### `CSVCorrectionForm.js`
**Purpose**: CSV error correction form  
**Contains**: 
- Error field correction
- Resubmission handling

#### `CompanyRegistrationFormFields.js`
**Purpose**: Company registration form fields  
**Contains**: 
- Reusable form fields for company registration
- Field validation

#### `EnrollmentSection.js`
**Purpose**: Course enrollment section  
**Contains**: 
- Employee selection
- Course selection
- Enrollment submission
- Course Builder microservice integration

#### `VerificationStatus.js`
**Purpose**: Company verification status display  
**Contains**: 
- Verification status indicator
- Status messages

---

### Services (`frontend/src/services/`)

#### `api.js` (in `utils/`)
**Purpose**: Axios instance with interceptors  
**Contains**: 
- Base API configuration
- Request interceptor (adds auth token, handles envelope structure)
- Response interceptor (handles envelope unwrapping)
- Auth endpoint special handling (skips envelope)

#### `authService.js`
**Purpose**: Authentication API service  
**Contains**: 
- `login(email, password)` - User login
- `logout()` - User logout
- `getCurrentUser()` - Get current user data
- Token management

#### `employeeService.js`
**Purpose**: Employee-related API calls  
**Contains**: 
- `getEmployee(companyId, employeeId)` - Get employee data
- `updateEmployee(companyId, employeeId, data)` - Update employee
- `getEmployeeSkills(companyId, employeeId)` - Get skills
- `getEmployeeCourses(companyId, employeeId)` - Get courses
- `getEmployeeLearningPath(companyId, employeeId)` - Get learning path
- `getEmployeeDashboard(companyId, employeeId)` - Get dashboard
- `getEmployeeRequests(companyId, employeeId)` - Get requests
- `submitEmployeeRequest(companyId, employeeId, request)` - Submit request
- `getCompanyRequests(companyId, status)` - Get company requests

#### `companyProfileService.js`
**Purpose**: Company profile API service  
**Contains**: 
- `getCompanyProfile(companyId)` - Get full company profile
- Company data fetching

#### `companyRegistrationService.js`
**Purpose**: Company registration API service  
**Contains**: 
- `registerCompany(companyData)` - Register new company
- Registration submission

#### `companyVerificationService.js`
**Purpose**: Company verification API service  
**Contains**: 
- `verifyCompany(companyId, status)` - Verify company
- Verification status update

#### `csvUploadService.js`
**Purpose**: CSV upload API service  
**Contains**: 
- `uploadCSV(companyId, file)` - Upload CSV file
- Upload progress tracking
- Error handling

#### `oauthService.js`
**Purpose**: OAuth API service  
**Contains**: 
- `getLinkedInAuthUrl(employeeId)` - Get LinkedIn OAuth URL
- `getGitHubAuthUrl(employeeId)` - Get GitHub OAuth URL
- OAuth callback handling

#### `trainerService.js`
**Purpose**: Trainer-related API service  
**Contains**: 
- `getTrainerSettings(employeeId)` - Get trainer settings
- `updateTrainerSettings(employeeId, settings)` - Update settings

#### `designTokenService.js`
**Purpose**: Design tokens service  
**Contains**: 
- Design token loading
- Token application
- Theme management

---

### Context (`frontend/src/context/`)

#### `AuthContext.js`
**Purpose**: Authentication context provider  
**Contains**: 
- User authentication state
- Login/logout functions
- Token management
- User data storage
- Auth state persistence

#### `DesignSystemContext.js`
**Purpose**: Design system context provider  
**Contains**: 
- Design tokens loading
- Theme management
- CSS variable injection

---

### Hooks (`frontend/src/hooks/`)

#### `useTokenStyles.js`
**Purpose**: Custom hook for design token styles  
**Contains**: 
- Token-based style generation
- Dynamic style application

---

## Backend Files

### Root Files

#### `backend/src/index.js`
**Purpose**: Backend application entry point  
**Contains**: 
- Express app setup
- Middleware configuration
- Route registration
- Server startup
- Database connection

#### `backend/src/config.js`
**Purpose**: Backend configuration  
**Contains**: 
- Database connection string
- API keys (OpenAI, LinkedIn, GitHub)
- Environment variables
- Service URLs

---

### Presentation Layer (`backend/src/presentation/`)

#### `AuthController.js`
**Purpose**: Authentication endpoints  
**Contains**: 
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user
- Token validation

#### `CompanyProfileController.js`
**Purpose**: Company profile endpoints  
**Contains**: 
- `GET /companies/:companyId` - Get company profile
- Company data aggregation
- Response formatting

#### `CompanyRegistrationController.js`
**Purpose**: Company registration endpoints  
**Contains**: 
- `POST /companies/register` - Register company
- Registration validation
- Company creation

#### `CompanyVerificationController.js`
**Purpose**: Company verification endpoints  
**Contains**: 
- `POST /companies/:companyId/verify` - Verify company
- Verification status update
- Admin verification logic

#### `CSVUploadController.js`
**Purpose**: CSV upload endpoints  
**Contains**: 
- `POST /companies/:companyId/upload-csv` - Upload CSV
- CSV parsing and validation
- Employee creation
- Error handling

#### `EmployeeController.js`
**Purpose**: Employee endpoints  
**Contains**: 
- `GET /employees/:employeeId` - Get employee
- `PUT /employees/:employeeId` - Update employee
- `POST /employees` - Add employee
- `DELETE /employees/:employeeId` - Delete employee
- Department and team JOINs for display

#### `EmployeeProfileApprovalController.js`
**Purpose**: Profile approval endpoints  
**Contains**: 
- `GET /companies/:companyId/profile-approvals` - Get pending approvals
- `POST /companies/:companyId/profile-approvals/:approvalId/approve` - Approve profile
- `POST /companies/:companyId/profile-approvals/:approvalId/reject` - Reject profile
- Approval workflow logic

#### `OAuthController.js`
**Purpose**: OAuth callback endpoints  
**Contains**: 
- `GET /oauth/linkedin/authorize` - LinkedIn OAuth initiation
- `GET /oauth/linkedin/callback` - LinkedIn callback
- `GET /oauth/github/authorize` - GitHub OAuth initiation
- `GET /oauth/github/callback` - GitHub callback
- Enrichment trigger after both connections

#### `RequestController.js`
**Purpose**: Employee request endpoints  
**Contains**: 
- `GET /employees/:employeeId/requests` - Get employee requests
- `POST /employees/:employeeId/requests` - Submit request
- `GET /companies/:companyId/requests` - Get company requests
- Request status filtering
- Envelope unwrapping

#### `TrainerController.js`
**Purpose**: Trainer endpoints  
**Contains**: 
- `GET /trainers/:employeeId/settings` - Get trainer settings
- `PUT /trainers/:employeeId/settings` - Update trainer settings

#### `EnrichmentController.js`
**Purpose**: Enrichment endpoints  
**Contains**: 
- `POST /employees/:employeeId/enrich` - Manual enrichment trigger
- Enrichment status check

#### `UniversalEndpointController.js`
**Purpose**: Generic microservice endpoint handler  
**Contains**: 
- Generic endpoint routing
- Microservice integration
- Request forwarding
- Response formatting

---

### Application Layer (`backend/src/application/`)

#### `EnrichProfileUseCase.js`
**Purpose**: Profile enrichment orchestration  
**Contains**: 
- Enrichment flow coordination
- OpenAI API calls (bio, summaries, value proposition)
- Data persistence
- Approval request creation
- Error handling (no mock fallback)

#### `GetCompanyProfileUseCase.js`
**Purpose**: Company profile data aggregation  
**Contains**: 
- Company data fetching
- Department/team/employee aggregation
- Hierarchy building
- Metrics calculation
- Pending approvals fetching

#### `RegisterCompanyUseCase.js`
**Purpose**: Company registration logic  
**Contains**: 
- Company validation
- Domain uniqueness check
- Company creation
- Registration request creation

#### `VerifyCompanyUseCase.js`
**Purpose**: Company verification logic  
**Contains**: 
- Verification status update
- Company activation
- Admin verification

#### `ParseCSVUseCase.js`
**Purpose**: CSV parsing logic  
**Contains**: 
- CSV file parsing
- Row extraction
- Data transformation

#### `ValidateCSVDataUseCase.js`
**Purpose**: CSV data validation  
**Contains**: 
- Field validation
- Data type checking
- Constraint validation
- Error collection

#### `AddEmployeeUseCase.js`
**Purpose**: Add employee logic  
**Contains**: 
- Employee validation
- Password hashing
- Employee creation
- Role assignment

#### `UpdateEmployeeUseCase.js`
**Purpose**: Update employee logic  
**Contains**: 
- Employee update validation
- Data update
- Relationship updates

#### `DeleteEmployeeUseCase.js`
**Purpose**: Delete employee logic  
**Contains**: 
- Employee deletion
- Cascade handling
- Relationship cleanup

#### `ConnectLinkedInUseCase.js`
**Purpose**: LinkedIn connection logic  
**Contains**: 
- OAuth URL generation
- State management
- LinkedIn data fetching
- Data storage

#### `ConnectGitHubUseCase.js`
**Purpose**: GitHub connection logic  
**Contains**: 
- OAuth URL generation
- State management
- GitHub data fetching
- Repository fetching
- Data storage

#### `AuthenticateUserUseCase.js`
**Purpose**: User authentication logic  
**Contains**: 
- Credential validation
- Password verification
- Token generation
- User data retrieval

#### `SubmitEmployeeRequestUseCase.js`
**Purpose**: Employee request submission logic  
**Contains**: 
- Request validation
- Request creation
- Company association
- Status initialization

#### `GetEmployeeRequestsUseCase.js`
**Purpose**: Get employee requests logic  
**Contains**: 
- Request fetching
- Status filtering
- Data formatting

#### `GetEmployeeSkillsUseCase.js`
**Purpose**: Get employee skills logic  
**Contains**: 
- Skills Engine microservice call
- Mock data fallback
- Data formatting

#### `GetEmployeeCoursesUseCase.js`
**Purpose**: Get employee courses logic  
**Contains**: 
- Course Builder microservice call
- Mock data fallback
- Data formatting

#### `GetEmployeeLearningPathUseCase.js`
**Purpose**: Get learning path logic  
**Contains**: 
- Learner AI microservice call
- Mock data fallback
- Data formatting

#### `GetEmployeeDashboardUseCase.js`
**Purpose**: Get dashboard logic  
**Contains**: 
- Learning Analytics microservice call
- Mock data fallback
- Data formatting

#### `UpdateTrainerSettingsUseCase.js`
**Purpose**: Update trainer settings logic  
**Contains**: 
- Settings validation
- Settings update
- Data persistence

#### `FillContentMetricsUseCase.js`
**Purpose**: Content metrics calculation  
**Contains**: 
- Metrics computation
- Data aggregation

---

### Infrastructure Layer (`backend/src/infrastructure/`)

#### `EmployeeRepository.js`
**Purpose**: Employee data access  
**Contains**: 
- `findById()` - Get employee by ID
- `findByCompanyId()` - Get employees by company
- `create()` - Create employee
- `update()` - Update employee
- `delete()` - Delete employee
- `updateEnrichment()` - Update enrichment data
- `updateProfileStatus()` - Update approval status
- `updateLinkedInData()` - Update LinkedIn data
- `updateGitHubData()` - Update GitHub data
- `getCompanyByEmployeeId()` - Get company for employee
- JOINs for department_name and team_name

#### `CompanyRepository.js`
**Purpose**: Company data access  
**Contains**: 
- `findById()` - Get company by ID
- `findByDomain()` - Get company by domain
- `create()` - Create company
- `update()` - Update company

#### `DepartmentRepository.js`
**Purpose**: Department data access  
**Contains**: 
- `findByCompanyId()` - Get departments by company
- `create()` - Create department
- `findById()` - Get department by ID

#### `TeamRepository.js`
**Purpose**: Team data access  
**Contains**: 
- `findByCompanyId()` - Get teams by company
- `create()` - Create team
- `findById()` - Get team by ID

#### `EmployeeProfileApprovalRepository.js`
**Purpose**: Profile approval data access  
**Contains**: 
- `findPendingByCompanyId()` - Get pending approvals
- `create()` - Create approval request
- `updateStatus()` - Update approval status
- `findByEmployeeId()` - Get approval by employee

#### `EmployeeRequestRepository.js`
**Purpose**: Employee request data access  
**Contains**: 
- `create()` - Create request
- `findByEmployeeId()` - Get requests by employee
- `findByCompanyId()` - Get requests by company
- `updateStatus()` - Update request status

#### `OpenAIAPIClient.js`
**Purpose**: OpenAI API integration  
**Contains**: 
- `generateBio()` - Generate professional bio (GPT-4-turbo)
- `generateProjectSummaries()` - Generate project summaries (GPT-3.5-turbo)
- `generateValueProposition()` - Generate value proposition (GPT-4-turbo)
- API key management
- Error handling and logging
- No mock fallback

#### `GeminiAPIClient.js`
**Purpose**: Google Gemini API integration (deprecated)  
**Contains**: 
- Legacy Gemini API calls
- Note: Replaced by OpenAIAPIClient

#### `LinkedInOAuthClient.js`
**Purpose**: LinkedIn OAuth flow  
**Contains**: 
- Authorization URL generation
- Token exchange
- State management

#### `LinkedInAPIClient.js`
**Purpose**: LinkedIn API data fetching  
**Contains**: 
- Profile data fetching (OpenID Connect)
- Data parsing and formatting

#### `GitHubOAuthClient.js`
**Purpose**: GitHub OAuth flow  
**Contains**: 
- Authorization URL generation
- Token exchange
- State management

#### `GitHubAPIClient.js`
**Purpose**: GitHub API data fetching  
**Contains**: 
- Profile data fetching
- Repository data fetching
- Data parsing and formatting

#### `MicroserviceClient.js`
**Purpose**: Generic microservice integration  
**Contains**: 
- Generic endpoint calling
- Envelope structure handling
- Error handling
- Mock data fallback

#### `MockDataService.js`
**Purpose**: Mock data provider  
**Contains**: 
- Mock data for microservices
- Fallback data structures
- Default responses

#### `CSVParser.js`
**Purpose**: CSV file parsing  
**Contains**: 
- CSV parsing logic
- Row extraction
- Data transformation

#### `CSVValidator.js`
**Purpose**: CSV data validation  
**Contains**: 
- Field validation
- Data type checking
- Required field validation

#### `CSVErrorFormatter.js`
**Purpose**: CSV error formatting  
**Contains**: 
- Error message generation
- Error row formatting
- Correction suggestions

#### `DatabaseConstraintValidator.js`
**Purpose**: Database constraint validation  
**Contains**: 
- Foreign key validation
- Unique constraint checking
- Data integrity validation

#### `DomainValidator.js`
**Purpose**: Domain validation  
**Contains**: 
- Domain format validation
- Uniqueness checking

#### `AIQueryGenerator.js`
**Purpose**: AI query generation  
**Contains**: 
- Query construction for AI services
- Prompt building

---

### Authentication (`backend/src/infrastructure/auth/`)

#### `AuthFactory.js`
**Purpose**: Authentication provider factory  
**Contains**: 
- Provider selection logic
- Provider instantiation

#### `AuthProvider.js`
**Purpose**: Base authentication provider interface  
**Contains**: 
- Provider interface definition
- Common authentication methods

#### `DummyAuthProvider.js`
**Purpose**: Dummy authentication provider (for testing)  
**Contains**: 
- Simple token generation
- Password hash comparison
- Token validation
- User lookup

#### `AuthServiceProvider.js`
**Purpose**: External auth service provider (future)  
**Contains**: 
- External service integration
- Note: Not currently implemented

---

### Shared (`backend/src/shared/`)

#### `authMiddleware.js`
**Purpose**: Authentication middleware  
**Contains**: 
- Token extraction
- Token validation
- User context injection
- Request authentication

#### `requestParser.js`
**Purpose**: Request parsing utilities  
**Contains**: 
- Envelope unwrapping
- Request body parsing
- Data extraction

#### `responseFormatter.js`
**Purpose**: Response formatting utilities  
**Contains**: 
- Envelope wrapping
- Response structure formatting
- Error response formatting

#### `ErrorTranslator.js`
**Purpose**: Error translation  
**Contains**: 
- Error code translation
- User-friendly error messages
- Error logging

---

### Scripts (`backend/src/scripts/`)

#### `clearDatabase.js`
**Purpose**: Database cleanup script  
**Contains**: 
- Database table truncation
- Data deletion
- Testing utilities

---

## Database Files

### `database/migrations/001_initial_schema.sql`
**Purpose**: Database schema definition  
**Contains**: 
- All table definitions (companies, employees, departments, teams, etc.)
- Foreign key relationships
- Indexes
- Constraints
- UUID extension
- Value proposition column addition

**Tables Defined**:
- `companies` - Company information
- `departments` - Department data
- `teams` - Team data
- `employees` - Employee data
- `employee_roles` - Employee role assignments
- `employee_teams` - Employee-team relationships
- `employee_managers` - Manager relationships
- `employee_project_summaries` - AI-generated project summaries
- `trainer_settings` - Trainer-specific settings
- `audit_logs` - Audit trail
- `company_registration_requests` - Registration requests
- `employee_profile_approvals` - Approval workflow
- `employee_requests` - Employee requests

### `database/scripts/clean_database_for_testing.sql`
**Purpose**: Database cleanup script  
**Contains**: 
- DELETE statements for all tables
- Safe deletion order (respecting foreign keys)
- Testing data cleanup

### `database/scripts/create_employee_requests_table.sql`
**Purpose**: Standalone table creation script  
**Contains**: 
- `employee_requests` table definition
- For fixing missing table issues

---

## Documentation Files

### Updated Profiles Documentation

#### `docs/UPDATED-PROFILES-INDEX.md`
**Purpose**: Central index for updated profiles documentation  
**Contains**: Links to all documentation, quick reference, rollback procedures

#### `docs/UPDATED-PROFILES-COMPANY-PROFILE.md`
**Purpose**: Complete Company Profile documentation  
**Contains**: Company Profile features, UI, logic, API endpoints, rollback guide

#### `docs/UPDATED-PROFILES-EMPLOYEE-PROFILE.md`
**Purpose**: Complete Employee Profile documentation  
**Contains**: Employee Profile features, UI, logic, API endpoints, rollback guide

#### `docs/UPDATED-PROFILES-FEATURES-AND-FLOWS.md`
**Purpose**: Complete features and flows documentation  
**Contains**: All user flows, enrichment flow, approval flow, request flow, rollback guide

#### `docs/UPDATED-PROFILES-FILE-REFERENCE.md`
**Purpose**: This file - complete file listing with descriptions

### Other Documentation

#### `docs/PROJECT-STATUS-AND-TESTING-GUIDE.md`
**Purpose**: Project status and testing guide  
**Contains**: Implemented features, testing procedures, user flows

#### `docs/system-overview.md`
**Purpose**: System architecture overview  
**Contains**: Technical architecture, technology stack, system design

#### `docs/ENRICHMENT-FEATURE-PROTECTION.md`
**Purpose**: Enrichment feature protection rules  
**Contains**: Critical enrichment flow, protection rules, common issues

#### `docs/OPENAI-MIGRATION-GUIDE.md`
**Purpose**: OpenAI migration documentation  
**Contains**: Migration from Gemini to OpenAI, implementation details

#### `docs/OPENAI-DATA-FLOW-SUMMARY.md`
**Purpose**: OpenAI data flow documentation  
**Contains**: Data sent to OpenAI, prompts, response storage

#### `docs/BASIC-PROFILE-LAYOUT.md`
**Purpose**: Basic profile layout documentation  
**Contains**: Standard profile layout, structure, styling

---

## Configuration Files

### Frontend

#### `package.json` (frontend)
**Purpose**: Frontend dependencies and scripts  
**Contains**: React dependencies, build scripts, dev dependencies

#### `design-tokens.json`
**Purpose**: Design system tokens  
**Contains**: Colors, spacing, typography, borders, shadows, CSS variables

### Backend

#### `package.json` (backend)
**Purpose**: Backend dependencies and scripts  
**Contains**: Express, database drivers, API clients, scripts

#### `.env.example`
**Purpose**: Environment variable template  
**Contains**: Required environment variables with descriptions

---

## Test Files

### Frontend Tests
- Located in `frontend/src/__tests__/` (if exists)
- Component tests
- Service tests

### Backend Tests
- Located in `backend/src/__tests__/`
- Use case tests
- Infrastructure tests
- CSV parsing/validation tests

---

## Important Notes

1. **File Organization**: Follows Onion Architecture (Presentation → Application → Infrastructure)

2. **Envelope Structure**: Most API endpoints use envelope: `{ requester_service: 'directory_service', response: {...} }`

3. **Auth Endpoints**: Auth endpoints (`/auth/login`, `/auth/logout`, `/auth/me`) do NOT use envelope structure

4. **Deprecated Files**: 
   - `GeminiAPIClient.js` - Replaced by `OpenAIAPIClient.js`
   - `TrainerCoursesTaught.js` - Functionality moved to `ProfileCourses.js`

5. **Key Files for Rollback**:
   - `EmployeeRepository.js` - Core data access
   - `EnrichProfileUseCase.js` - Critical enrichment flow
   - `OpenAIAPIClient.js` - AI integration
   - `CompanyDashboard.js` - Main company UI
   - `EmployeeProfilePage.js` - Main employee UI

---

## File Count Summary

- **Frontend Pages**: 8 files
- **Frontend Components**: 30+ files
- **Frontend Services**: 9 files
- **Backend Controllers**: 12 files
- **Backend Use Cases**: 20+ files
- **Backend Repositories**: 6 files
- **Backend Infrastructure**: 15+ files
- **Database**: 3 files
- **Documentation**: 20+ files

---

**Last Updated**: 2025-01-20  
**Total Files Documented**: 100+

