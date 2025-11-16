# EDUCORE DIRECTORY MANAGEMENT SYSTEM - REQUIREMENTS

## 1. SYSTEM OVERVIEW

### 1.1 Purpose
A multi-tenant Company Directory platform that allows companies to manage their employees, roles, teams, and departments efficiently. Each company has its own isolated directory within the EDUCORE platform.

### 1.2 Core Capabilities
- Multi-tenant company registration and management
- Employee directory with hierarchical organization
- Role-based access control (RBAC)
- CSV-based company onboarding
- Employee profile management with external integrations
- Learning path and course enrollment management
- Audit logging and compliance

---

## 2. USER ROLES & PERMISSIONS

### 2.1 Role Types
- **REGULAR_EMPLOYEE**: Standard employee without management responsibilities
- **TRAINER**: Employee who can teach courses
- **TEAM_MANAGER**: Manages a team (can be combined with REGULAR_EMPLOYEE or TRAINER)
- **DEPARTMENT_MANAGER**: Manages a department (can be combined with other roles)
- **DECISION_MAKER**: Has approval authority (often combined with DEPARTMENT_MANAGER)
- **COMPANY_HR/ADMIN**: Company-level administrator (sees company profile page)
- **DIRECTORY_ADMIN/SUPER_ADMIN**: Platform-level administrator (sees all companies)

### 2.2 Role Combinations
Users can have multiple roles simultaneously:
- REGULAR_EMPLOYEE + TEAM_MANAGER
- REGULAR_EMPLOYEE + DEPARTMENT_MANAGER
- TRAINER + DEPARTMENT_MANAGER
- TRAINER + TEAM_MANAGER
- REGULAR_EMPLOYEE + DECISION_MAKER + DEPARTMENT_MANAGER
- Standard employees without management roles

### 2.3 Hierarchy Rules
- Employees report to a Team Manager
- Team Managers report to Department Managers
- Department Managers may also be Decision Makers
- Managers are not a separate role type; they are existing employees (EMPLOYEE or TRAINER) with a managerial role

---

## 3. AUTHENTICATION & AUTHORIZATION

### 3.1 Current Implementation (Testing Phase)
- **Dummy Login System**: For testing purposes only
- Landing page with "REGISTER YOUR COMPANY" and "ALREADY REGISTERED? LOGIN" options
- Employees log in using email/password from CSV file
- No real authentication; simulates user flows

### 3.2 Future Implementation
- Authentication will be handled by a separate microservice (AUTH SERVICE)
- Proper JWT-based authentication
- Secure token management

### 3.3 External OAuth Integrations
- **LinkedIn**: Fully functional OAuth (including Sign In with LinkedIn using OpenID Connect)
- **GitHub**: Fully functional OAuth
- Used for employee profile enrichment during first-time login

### 3.4 Gemini AI Integration (ONE TIME ONLY - First Login)
- **Purpose**: Generate professional bio and project summaries from LinkedIn/GitHub data (ONE-TIME INITIAL SETUP)
- **API**: Google Gemini API
- **Integration Points** (ONE TIME ONLY):
  - After LinkedIn OAuth connection (first login only): Generate bio from LinkedIn profile data
  - After GitHub OAuth connection (first login only): Generate project summaries from GitHub repositories
  - **No Re-enrichment**: Changes in LinkedIn/GitHub do NOT trigger re-generation. Profile remains as generated from initial login.
- **Outputs** (Stored Permanently):
  - **Bio**: Professional bio generated from LinkedIn profile and GitHub contributions (stored once, never regenerated)
  - **Project Summaries**: AI-generated summaries for each GitHub repository (stored once, never regenerated)
- **Critical Requirement**: All user profiles must display AI-generated bio and project summaries. No view or flow should omit Gemini's contribution.
- **One-Time Setup**: LinkedIn/GitHub connection page is shown ONLY ONCE during first login. Once completed, users CANNOT reconnect or re-sync accounts.
- **Fallback**: If Gemini API fails, use mock AI-generated content from `/mockData/index.json`
- **Secrets**: `GEMINI_API_KEY` stored in Railway dashboard (not in .env)

---

## 4. COMPANY REGISTRATION & ONBOARDING

### 4.1 Registration Flow
1. **Company Registration Form**
   - Collects: company name, industry, company domain, HR contact name/email/role
   - Submits form → Verification step

2. **Company Verification Page**
   - Shows status: "VERIFICATION IN PROGRESS"
   - Domain validation
   - Optional: Mail server verification

3. **Company CSV Upload Page**
   - Upload CSV file containing:
     - Full company hierarchy (departments, teams)
     - All employees with: employee_id, full_name, email, role_type, role_in_company, manager_id, current_role, target_role, dummy password
     - Trainer-specific fields: AI Enabled, Public Publish
     - Departments/Teams + managers

4. **Company Profile Page**
   - Company details
   - Departments and teams hierarchy
   - All employees
   - Dashboard with overview metrics
   - Pending requests (for approvals, learning paths, etc.)
   - Enrollment for Courses: send employees to courses via three main learning flows (career-path-driven, skill-driven, trainer-led)

### 4.2 CSV Upload Requirements

#### 4.2.1 Mandatory Fields
- employee_id
- full_name
- email
- role(s) (role_type)
- team
- department
- manager_id (optional, but should be provided or entered manually)

#### 4.2.2 CSV Error Handling
- **Approach**: Allow partial upload with warnings, then prompt to fill missing data in UI
- Parse as much valid data as possible
- Flag missing or incorrect fields
- Display flagged items in user-friendly UI form
- Require company to provide or correct missing/invalid information
- Only after all mandatory fields are completed and verified should the company account and employee profiles be fully created
- Keep temporary internal state for partially uploaded data
- Error messages must indicate exactly which row and column in the CSV has the issue

#### 4.3 Sample Data Generation
- During development/testing, generate 10–20 sample employees
- Sample data must cover all role combinations:
  - REGULAR_EMPLOYEE + TEAM_MANAGER
  - REGULAR_EMPLOYEE + DEPARTMENT_MANAGER
  - TRAINER + DEPARTMENT_MANAGER
  - TRAINER + TEAM_MANAGER
  - REGULAR_EMPLOYEE + DECISION_MAKER + DEPARTMENT_MANAGER
  - Standard employees without management roles

---

## 5. PAGES & VIEWS

### 5.1 Landing Page (Before Registration/Login)
- **REGISTER YOUR COMPANY** option
- **ALREADY REGISTERED? LOGIN** option
- Purpose: Entry point for companies and employees
- Notes: Dummy page for testing login

### 5.2 Employee Login & Profile Flow

#### 5.2.1 First-Time Employee Login (ONE TIME ONLY)
- **Enrich Your Profile Page** (Shown ONLY ONCE - First Login)
  - Must connect: LinkedIn (via OAuth), GitHub (via OAuth)
  - Data fetched builds profile automatically (ONE TIME)
  - **Gemini AI Integration**: System sends LinkedIn and GitHub raw data to Gemini API (ONE TIME)
  - **Gemini generates**: User bio and project summaries from collected data (ONE TIME)
  - Profile fields populated with AI-generated content (PERMANENT)
  - Enrichment flag set to "completed" - prevents future re-enrichment
  - **No Re-connection**: Once setup is complete, user CANNOT reconnect or re-sync LinkedIn/GitHub
  - Redirect → Employee Profile Page

#### 5.2.2 Employee Profile Page
Sections:
- Basic info: name, email, company name
- **Bio (AI-Generated)**: Generated by Gemini AI from LinkedIn/GitHub data
- Value Proposition: current_role → target_role
- Skills Section: Relevance Score (gap between current skills and target role)
- Courses Section: courses assigned, in-progress, completed
- **Projects Section: AI-generated summaries** (Generated by Gemini AI from GitHub repository data)
- External Data Section: LinkedIn / GitHub icons + links
- Dashboard
- Edit Your Profile: editable fields (language, contact info, etc.)
- Requests: request to learn new skills, apply for trainer role, etc.
- Learning Path

#### 5.2.3 Trainer-Specific Profile
- All standard profile sections
- Additional: Courses taught, AI Enabled toggle, Public Publish toggle

#### 5.2.4 Department Manager Profile
- Standard profile view (employee/trainer)
- Additional Hierarchy Section:
  - Teams under department
  - Employees under those teams
  - Access to lower-level profiles and statuses

#### 5.2.5 Team Manager Profile
- Standard profile view (employee/trainer)
- Additional Hierarchy Section:
  - Employees in the team
  - Access to lower-level profiles and statuses

### 5.3 Company HR / Company Admin View
- Sees Company Profile Page
- Company details
- Full organizational hierarchy
- Employee list
- Dashboard / KPIs
- Requests overview
- Can manage employees:
  - Approve profile updates
  - Assign learning paths
  - Track courses
  - Manage department/team managers
  - Update company settings (KPIs, approval type)

### 5.4 Directory Admin / Super Admin View
- Full Directory Dashboard
- Overview of all registered companies
- Access to every company profile
- View departments, teams, employees of each company in directory
- Approve or reject company registration requests (Pending/Approved/Rejected)
- Analytics across companies
- Read-only access to company data but can manage directory-level configurations

---

## 6. DATA DISPLAY REQUIREMENTS

### 6.1 Profile Display
- Profiles must show role(s) and hierarchical position
- Correct hierarchy must be visible on team/department pages

### 6.2 Error Handling
- Invalid CSV uploads must be rejected with clear messages
- Missing optional fields (like manager_id) should trigger UI prompts
- Duplicate employee IDs must be detected

---

## 7. SECURITY & COMPLIANCE

### 7.1 Role-Based Access Control (RBAC)
- Each user can access only the data allowed for their role and hierarchy
- Managers can see profiles of employees under their supervision, but not other departments unless explicitly authorized

### 7.2 Data Encryption
- All sensitive data, including emails, passwords (dummy for now), and PII, must be encrypted at rest and in transit (TLS/HTTPS)

### 7.3 Audit Logs
- All critical actions (profile creation, updates, approvals, course enrollment, learning path approvals) must be logged with timestamp, user ID, and action type
- Logs must be tamper-proof and stored securely

### 7.4 PII Minimization
- Only store necessary personal data
- Avoid unnecessary sensitive information

### 7.5 GDPR / Privacy Compliance
- Explicit consent for storing employee data must be tracked
- Provide the ability to delete personal data on request
- Ensure that employee data is not shared between companies

### 7.6 Environment & Secrets Handling
- No local `.env` files storing secrets
- All environment variables and tokens must be manually entered in hosting dashboards (Vercel / Railway / Supabase)
- Orchestrator will instruct where and how to set them but must never generate, persist, or fetch real secrets or tokens

### 7.7 Data Retention Policies
- Retain audit logs and critical company/employee data for a defined period (configurable) to comply with corporate or legal requirements

### 7.8 Fallback & Mock Data
- Any call to external microservices (LinkedIn, GitHub, **Gemini AI**, Skills Engine, Assessment, Content Studio, etc.) must have mock data as fallback to prevent exposure of real credentials or unauthorized data
- **Gemini AI**: Critical integration for generating bio and project summaries. Must be integrated in all relevant flows.
- Mock data stored in `/mockData/index.json`

---

## 8. TECHNICAL REQUIREMENTS

### 8.1 Technology Stack
- **Architecture**: Onion Architecture (layered, separation of concerns)
- **Frontend**: React + Tailwind CSS → deployed to Vercel
- **Backend**: Node.js + Express → deployed to Railway
- **Database**: PostgreSQL → hosted on Supabase
- **CI/CD**: GitHub Actions
- **Language**: JavaScript (ES6) only — no TypeScript

### 8.2 Repository Structure
- Monorepo with folders: `frontend/`, `backend/`, `database/`

### 8.3 API Design
- **Internal endpoints**: Directory microservice has multiple internal endpoints; not exposed externally; follow consistent naming; document in architecture.md
- **Single public endpoint**: accepts service/client id + JSON request; dynamically generates SQL through AI-assisted prompt referencing current DB schema; returns requested fields
- **External API fallback**: on failure, load mock data from `/mockData/index.json`
- Global URLs stored in config.js or .env; endpoint names fixed
- All dynamic SQL validated; AI query prompts reviewed for security

### 8.4 Deployment
- Frontend → Vercel
- Backend → Railway
- Database → Supabase
- GitHub Actions workflow `.github/workflows/deploy.yml` with:
  - PR/feature branch checks
  - Preview deploys
  - Milestone/tag deploys
  - Secure secrets (VERCEL_TOKEN, RAILWAY_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  - Rollback hooks
  - Health checks

---

## 9. FUTURE CONSIDERATIONS

### 9.1 Scalability
- System should be scalable and secure
- Roles are dynamic per company but should follow CSV structure

### 9.2 Cloud Deployment
- System will be deployed on cloud for real company use

### 9.3 External Microservices
- AUTH SERVICE (future)
- Skills Engine
- Assessment Service
- Content Studio
- All must have mock data fallback

---

## 10. TESTING REQUIREMENTS

### 10.1 Test Data
- Sample CSV file: `mockData/lotus_tech_hub_sample_company.csv`
- Generate 10–20 sample employees covering all role combinations

### 10.2 Testing Approach
- TDD: Create unit test skeletons before implementation
- CI: Run tests and security scans; deployment blocked on failures
- Regression: Every add/refine triggers automated regression tests

---

## 11. DOCUMENTATION REQUIREMENTS

### 11.1 Project Documentation
- All artifacts saved under `docs/`
- `docs/project_customization.md` for project-specific rules
- `docs/prompt_refinements.md` for AI usage documentation
- `docs/System_Description.txt` for reference

### 11.2 Final Deliverables
- `final_plan.md` with executive summary, workflow, AI decisions, Roadmap JSON, security & monitoring, TDD/testing strategy, solo workflow notes

---

## 12. FEATURE MANAGEMENT

### 12.1 Feature Organization
- Each feature has dedicated files
- No two features share a file
- Shared utilities under `/core` or `/shared` only
- Maintain `features-map.json` for feature → file list
- Update on add/refine/remove

### 12.2 Project Customization
- Store all project-specific, non-global requests in `docs/project_customization.md`
- Cursor reads this first before templates; its rules override general templates
- Only store project-specific logic; do not duplicate general behavior
- Enables re-running templates while preserving all project-specific tweaks

