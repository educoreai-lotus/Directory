# EDUCORE DIRECTORY MANAGEMENT SYSTEM - USER FLOWS

## 1. LANDING PAGE FLOW

### 1.1 Entry Point
**Page**: Landing Page (Before Registration/Login)

**Visible Options**:
- **REGISTER YOUR COMPANY** button
- **ALREADY REGISTERED? LOGIN** button

**Purpose**: Entry point for companies and employees

**Notes**: Dummy page for testing login; actual authentication handled later by AUTH SERVICE

**User Actions**:
- Click "REGISTER YOUR COMPANY" → Navigate to Company Registration Flow
- Click "ALREADY REGISTERED? LOGIN" → Navigate to Login Flow

---

## 2. COMPANY REGISTRATION FLOW (First-Time Company Registration)

### 2.1 Step 1: Company Registration Form Page
**Purpose**: Collect company basic information

**Data Collected**:
- Company name
- Industry
- Company domain
- HR contact name
- HR contact email
- HR contact role

**Validation**:
- All fields required
- Email format validation
- Domain format validation

**Action**: Submit form → Navigate to Company Verification Page

---

### 2.2 Step 2: Company Verification Page
**Purpose**: Verify company registration

**Status Display**: "VERIFICATION IN PROGRESS"

**Verification Checks**:
- Domain validation
- Optional: Mail server verification

**User Experience**:
- Show verification status
- Display pending checks
- Auto-redirect when verification complete (or manual approval by Directory Admin)

**Next Step**: After verification → Navigate to Company CSV Upload Page

---

### 2.3 Step 3: Company CSV Upload Page
**Purpose**: Upload company hierarchy and employee data

**CSV File Requirements**:
- Full company hierarchy (departments, teams)
- All employees with:
  - employee_id
  - full_name
  - email
  - role_type
  - role_in_company
  - manager_id (optional)
  - current_role
  - target_role
  - dummy password for login testing
  - Trainer-specific fields: AI Enabled, Public Publish
  - Departments/Teams + managers

**Upload Process**:
1. User selects CSV file
2. System parses CSV
3. System validates data:
   - Check for mandatory fields
   - Validate data formats
   - Check for duplicate employee IDs
   - Validate hierarchy relationships
4. **If errors found**:
   - Display partial upload with warnings
   - Show flagged items in user-friendly UI form
   - Require user to provide/correct missing/invalid information
   - Keep temporary internal state for partially uploaded data
   - Error messages indicate exact row and column with issues
5. **If all valid**:
   - Create company account
   - Create employee profiles
   - Build organizational hierarchy
   - Navigate to Company Profile Page

**Purpose**: Build organization profile automatically

---

### 2.4 Step 4: Company Profile Page
**Purpose**: Display company overview and management dashboard

**Sections Displayed**:
- Company details
- Departments and teams hierarchy
- All employees list
- Dashboard with overview metrics
- Pending requests (for approvals, learning paths, etc.)
- Enrollment for Courses: send employees to courses via three main learning flows:
  - Career-path-driven
  - Skill-driven
  - Trainer-led

**User Actions** (Company HR/Admin):
- View company information
- Manage employees
- Approve profile updates
- Assign learning paths
- Track courses
- Manage department/team managers
- Update company settings (KPIs, approval type)

---

## 3. EMPLOYEE LOGIN & PROFILE FLOW

### 3.1 Step 1: Employee Login
**Page**: Login Page (dummy authentication)

**Input**:
- Email (from CSV)
- Password (dummy password from CSV)

**Validation**:
- Check email exists in system
- Verify password (dummy check)
- Determine user's company
- Load user roles and permissions

**First-Time Login Check**:
- If first login → Navigate to Enrich Your Profile Page
- If returning user → Navigate to Employee Profile Page

---

### 3.2 Step 2: Enrich Your Profile Page (First-Time Only - ONE TIME ONLY)
**Purpose**: Connect external accounts to build profile (ONE-TIME INITIAL SETUP)

**CRITICAL**: This page is shown ONLY ONCE during the employee's first login. Once completed, users CANNOT reconnect or re-sync LinkedIn/GitHub accounts.

**Required Connections**:
- **LinkedIn**: OAuth connection (Sign In with LinkedIn using OpenID Connect)
- **GitHub**: OAuth connection

**Process**:
1. Display connection buttons for LinkedIn and GitHub (shown only on first login)
2. User clicks connection button
3. OAuth flow initiated
4. User authorizes connection
5. System fetches data from external service (ONE TIME ONLY)
6. **Gemini AI Integration**: System sends LinkedIn and GitHub raw data to Gemini API (ONE TIME ONLY)
7. **Gemini generates**: User bio and project summaries from collected data (ONE TIME ONLY)
8. Data automatically populates profile fields (including AI-generated bio and project summaries)
9. Profile enrichment is locked - no future re-enrichment
10. Redirect → Employee Profile Page

**Data Fetched** (ONE TIME ONLY):
- LinkedIn: Professional profile, work history, skills, connections
- GitHub: Repositories, contributions, programming languages, projects

**Gemini AI Processing** (ONE TIME ONLY):
- **Input**: Raw LinkedIn profile data + GitHub repository data (fetched once during first login)
- **Output**: 
  - Generated professional bio (stored permanently)
  - AI-generated project summaries for each GitHub project (stored permanently)
- **Integration**: Gemini API called automatically after OAuth data fetch (ONCE)
- **Fallback**: If Gemini API fails, use mock data from `/mockData/index.json`
- **Important**: After initial generation, changes in LinkedIn/GitHub do NOT trigger re-enrichment. Profile remains as generated from initial login.

**Purpose**: Build profile automatically from external data with AI-enhanced content (ONE-TIME INITIAL SETUP)

**Lock**: Once enrichment is complete, the profile is locked. No re-connection or re-sync is allowed.

---

### 3.3 Step 3: Employee Profile Page
**Purpose**: Display employee profile with all relevant information

**Sections**:

#### 3.3.1 Basic Info Section
- Name
- Email
- Company name
- **Bio (AI-Generated)**: Generated by Gemini AI from LinkedIn/GitHub data

#### 3.3.2 Value Proposition Section
- Current role → Target role
- Career progression visualization

#### 3.3.3 Skills Section
- Skills list
- Relevance Score: gap between current skills and target role
- Skill recommendations

#### 3.3.4 Courses Section
- Courses assigned
- Courses in-progress
- Courses completed
- Course progress tracking

#### 3.3.5 Projects Section
- **AI-Generated Summaries**: Generated by Gemini AI from GitHub repository data
- Project descriptions (from GitHub)
- Contributions (from GitHub)
- **Note**: All project summaries are generated by Gemini AI to ensure consistent, professional descriptions

#### 3.3.6 External Data Section
- LinkedIn icon + link
- GitHub icon + link
- External profile integration

#### 3.3.7 Dashboard
- Overview metrics
- Activity summary
- Recent updates

#### 3.3.8 Edit Your Profile
- Editable fields: language, contact info, etc.
- Save changes

#### 3.3.9 Requests
- Request to learn new skills
- Apply for trainer role
- Other requests

#### 3.3.10 Learning Path
- Assigned learning paths
- Progress tracking
- Recommendations

**User Actions**:
- View profile information
- Edit profile details
- Submit requests
- View learning progress

---

### 3.4 Trainer-Specific Profile Flow
**Base**: All Employee Profile Page sections

**Additional Sections**:
- **Courses Taught**: List of courses the trainer is teaching
- **AI Enabled Toggle**: Enable/disable AI features for trainer
- **Public Publish Toggle**: Enable/disable public publishing of trainer content

**User Actions**:
- Manage courses taught
- Toggle AI features
- Control public publishing

---

### 3.5 Department Manager Profile Flow
**Base**: Standard profile view (employee/trainer)

**Additional Hierarchy Section**:
- **Teams Under Department**: List of all teams in the department
- **Employees Under Teams**: Hierarchical view of employees in those teams
- **Access to Lower-Level Profiles**: Can view and manage profiles of employees in their department

**User Actions**:
- View department hierarchy
- Access employee profiles in department
- Manage team managers
- View department status and metrics

---

### 3.6 Team Manager Profile Flow
**Base**: Standard profile view (employee/trainer)

**Additional Hierarchy Section**:
- **Employees in Team**: List of all employees reporting to this team manager
- **Access to Lower-Level Profiles**: Can view and manage profiles of employees in their team

**User Actions**:
- View team hierarchy
- Access employee profiles in team
- Manage team members
- View team status and metrics

**Note**: Managers are not a separate role type; they are existing employees (EMPLOYEE or TRAINER) with a managerial role

---

## 4. COMPANY HR / COMPANY ADMIN VIEW FLOW

### 4.1 Access
**User Type**: Company HR / Company Admin

**Entry Point**: Company Profile Page (same page seen during registration)

### 4.2 Available Sections
- **Company Details**: View and edit company information
- **Full Organizational Hierarchy**: Visual representation of departments, teams, and employees
- **Employee List**: Complete list of all employees with filtering and search
- **Dashboard / KPIs**: Company-wide metrics and key performance indicators
- **Requests Overview**: All pending requests (profile updates, learning paths, approvals)

### 4.3 Management Actions
- **Approve Profile Updates**: Review and approve employee profile changes
- **Assign Learning Paths**: Assign learning paths to employees
- **Track Courses**: Monitor course enrollment and completion
- **Manage Department/Team Managers**: Assign or change managers
- **Update Company Settings**: Modify KPIs, approval types, and other company configurations

---

## 5. DIRECTORY ADMIN / SUPER ADMIN VIEW FLOW

### 5.1 Access
**User Type**: Directory Admin / Super Admin

**Entry Point**: Full Directory Dashboard

### 5.2 Available Sections
- **Overview of All Registered Companies**: List of all companies in the platform
- **Company Profile Access**: Can access every company profile
- **View Departments, Teams, Employees**: Can view organizational structure of any company
- **Company Registration Requests**: Approve or reject company registration requests
  - Status: Pending/Approved/Rejected
- **Analytics Across Companies**: Platform-wide analytics and metrics
- **Directory-Level Configurations**: Manage platform settings

### 5.3 Access Permissions
- **Read-Only Access**: Can view company data but cannot modify company-specific settings
- **Directory Management**: Can manage directory-level configurations
- **Company Approval**: Can approve or reject company registrations

---

## 6. PAGE FLOW SUMMARY

### 6.1 Landing Page → Register / Login
- Landing Page
  - → Register → Company Registration Flow
  - → Login → Employee Login Flow

### 6.2 First-Time Company Flow
- Registration → Verification → CSV Upload → Company Profile → HR can manage → Enrollment for courses

### 6.3 Employee Login Flow
- Dummy login → Enrich Profile (first-time) → Employee Profile → Dashboard / Courses / Skills / Projects / Requests

### 6.4 Managers Flow
- Employee view + Hierarchy sections (managers are employees with managerial role, not a separate role type)

### 6.5 Trainers Flow
- Employee view + Courses taught + AI/Public toggles

### 6.6 Directory Admin Flow
- Overview of all companies + Approvals + Analytics

---

## 7. NAVIGATION PATTERNS

### 7.1 Common Navigation Elements
- **Header**: Company logo, user profile, logout
- **Sidebar**: Role-based menu items
- **Breadcrumbs**: Show current location in hierarchy
- **Search**: Global search for employees, teams, departments

### 7.2 Role-Based Menu Items

#### Employee Menu
- My Profile
- My Courses
- My Skills
- My Projects
- My Requests
- Learning Path

#### Trainer Menu
- All Employee items
- Courses Taught
- Trainer Settings

#### Manager Menu (Team/Department)
- All Employee/Trainer items
- My Team/Department
- Team/Department Hierarchy
- Team/Department Reports

#### Company HR/Admin Menu
- Company Profile
- Employee Directory
- Organizational Hierarchy
- Dashboard / KPIs
- Requests
- Company Settings

#### Directory Admin Menu
- Directory Dashboard
- All Companies
- Company Approvals
- Platform Analytics
- Directory Settings

---

## 8. ERROR HANDLING FLOWS

### 8.1 CSV Upload Errors
1. User uploads CSV
2. System parses and validates
3. If errors found:
   - Display error summary
   - Show flagged rows/columns
   - Provide UI form to correct errors
   - User corrects errors
   - System re-validates
   - If valid → Proceed to company creation
   - If still errors → Repeat correction process

### 8.2 Authentication Errors
- Invalid email/password → Show error message
- Account not found → Show error message
- Account locked → Show message and contact admin

### 8.3 OAuth Connection Errors
- LinkedIn/GitHub connection fails → Show error, allow retry
- Connection timeout → Show timeout message, allow retry
- User cancels OAuth → Return to profile page with message

### 8.4 Permission Errors
- User tries to access unauthorized resource → Show "Access Denied" message
- Redirect to appropriate page based on user role

---

## 9. DATA FLOW

### 9.1 Company Registration Data Flow
1. Company Registration Form → Backend validates → Database stores company record
2. Verification → Backend checks domain → Updates company status
3. CSV Upload → Backend parses → Validates → Stores employees, departments, teams
4. Company Profile → Backend fetches company data → Frontend displays

### 9.2 Employee Profile Data Flow
1. Login → Backend authenticates → Returns user data
2. **First Login Check**: 
   - If first login → Show Enrich Profile Page
   - If returning user → Skip to step 4
3. **First Login Only - OAuth Connection**: 
   - External API call (LinkedIn/GitHub) → Backend stores fetched raw data (ONE TIME)
   - **Gemini AI Integration** → Backend sends raw data to Gemini API → Gemini generates bio and project summaries → Backend stores AI-generated content (ONE TIME)
   - Profile enrichment flag set to "completed" - no future re-enrichment
4. Profile View → Backend fetches user data (including AI-generated bio/projects) + hierarchy → Frontend displays
5. Profile Edit → Frontend sends changes → Backend validates → Database updates → Frontend refreshes
6. **No Re-enrichment**: Changes in LinkedIn/GitHub do NOT trigger re-generation. Profile remains as generated from initial login.

### 9.3 Hierarchy Data Flow
1. Manager views team/department → Backend queries hierarchy → Returns employees under manager
2. Frontend displays hierarchical tree
3. Manager clicks employee → Backend fetches employee profile → Frontend displays

---

## 10. EXTERNAL INTEGRATION FLOWS

### 10.1 LinkedIn OAuth Flow
1. User clicks "Connect LinkedIn"
2. Frontend redirects to LinkedIn OAuth
3. User authorizes on LinkedIn
4. LinkedIn redirects back with authorization code
5. Backend exchanges code for access token
6. Backend fetches LinkedIn profile data
7. Backend stores data in user profile
8. Frontend displays LinkedIn data in profile

### 10.2 GitHub OAuth Flow
1. User clicks "Connect GitHub"
2. Frontend redirects to GitHub OAuth
3. User authorizes on GitHub
4. GitHub redirects back with authorization code
5. Backend exchanges code for access token
6. Backend fetches GitHub profile and repository data
7. Backend stores data in user profile
8. Frontend displays GitHub data in profile

### 10.3 Gemini AI Integration Flow (ONE TIME ONLY - First Login)
1. User connects LinkedIn/GitHub accounts (FIRST LOGIN ONLY)
2. Backend receives raw profile/repository data (ONE TIME)
3. Backend sends raw data to Gemini API with prompt for bio and project summary generation (ONE TIME)
4. Gemini API processes data and returns:
   - Professional bio
   - Project summaries for each repository
5. Backend stores AI-generated content in employee profile (PERMANENT)
6. Backend sets enrichment_completed flag to true (prevents future re-enrichment)
7. Frontend displays AI-enhanced profile
8. **No Re-enrichment**: User cannot reconnect LinkedIn/GitHub. Profile remains as generated from initial login.

**Fallback**: If Gemini API fails → Backend loads mock AI-generated content from `/mockData/index.json`

**Important**: This process happens ONLY ONCE during first login. After completion, no re-connection or re-sync is allowed.

### 10.4 Mock Data Fallback
- If external API call fails (LinkedIn, GitHub, or Gemini) → Backend loads mock data from `/mockData/index.json`
- Frontend displays mock data with indicator
- System continues to function without external dependency

