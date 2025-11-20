# Employee Profile - Complete Documentation (Updated Profiles Reference)

**Last Updated**: 2025-01-20  
**Purpose**: Complete reference for Employee Profile features, UI, and logic. Use this as a rollback reference point.

---

## Table of Contents

1. [Overview](#overview)
2. [Page Structure](#page-structure)
3. [Profile Sections](#profile-sections)
4. [Approval Workflow](#approval-workflow)
5. [Learning & Development Tabs](#learning--development-tabs)
6. [Trainer Features](#trainer-features)
7. [Data Flow](#data-flow)
8. [API Endpoints](#api-endpoints)
9. [Database Schema](#database-schema)
10. [Key Files](#key-files)

---

## Overview

The Employee Profile page (`/employee/:employeeId`) displays individual employee information, enriched profile data (AI-generated bio, project summaries, value proposition), and learning & development features. The page has different views based on profile approval status and employee roles.

### Key Features
- Basic profile information (name, email, role, department, team)
- Professional links (LinkedIn, GitHub)
- AI-generated bio (from OpenAI)
- Project summaries (from GitHub repositories)
- Value proposition (career progression statement)
- Profile approval status indicator
- Learning & Development section (only when approved)
- Trainer-specific sections
- Request submission
- Profile editing

---

## Page Structure

### Main Component: `EmployeeProfilePage.js`

**Location**: `frontend/src/pages/EmployeeProfilePage.js`

**Props/State**:
- `employeeId` (from URL params)
- `user` (from AuthContext)
- `loading` (state)
- `error` (state)
- `employee` (state) - Full employee object
- `isEditing` (state) - Edit mode toggle

**Layout**:
```
┌─────────────────────────────────────┐
│  [Header: Name, Role, Edit Button] │
├─────────────────────────────────────┤
│  Basic Information                  │
│  - Email, Department, Team         │
│  - LinkedIn, GitHub links           │
├─────────────────────────────────────┤
│  Professional Bio (AI-generated)   │
├─────────────────────────────────────┤
│  Project Summaries                  │
├─────────────────────────────────────┤
│  Value Proposition                  │
├─────────────────────────────────────┤
│  [Pending Approval Message]         │
│  OR                                 │
│  Learning & Development (Tabs)     │
├─────────────────────────────────────┤
│  Trainer Settings (if trainer)      │
└─────────────────────────────────────┘
```

---

## Profile Sections

### 1. Basic Information Section

**Displayed Fields**:
- Full Name
- Email
- Current Role
- Target Role
- Department (from `department_name` - JOIN with departments table)
- Team (from `team_name` - JOIN with teams table)
- LinkedIn URL (clickable link)
- GitHub URL (clickable link)

**NOT Displayed**:
- Employee ID (removed from UI)

**LinkedIn Link Handling**:
- Direct link to `employee.linkedin_url` from database
- No validation or transformation
- Opens in new tab/window

**GitHub Link Handling**:
- Direct link to `employee.github_url` from database
- Opens in new tab/window

**Data Source**: 
- `GET /api/v1/employees/:employeeId`
- Backend performs JOINs to get `department_name` and `team_name`

### 2. Professional Bio Section

**Content**: AI-generated bio from OpenAI

**Generation**:
- Model: `gpt-4-turbo`
- Prompt includes:
  - LinkedIn data (name, email, headline, locale)
  - GitHub data (name, login, bio, company, location, repos)
  - Employee info (full_name, current_role, target_role, company_name)
- Length: 2-3 sentences, maximum 150 words
- Style: Concise and general

**Display**:
- Styled card with heading "Professional Bio"
- Text displayed in readable format
- Uses design tokens for styling

**Data Source**: `employee.bio` (TEXT column in database)

### 3. Project Summaries Section

**Content**: AI-generated summaries for GitHub repositories

**Generation**:
- Model: `gpt-3.5-turbo`
- Input: Array of GitHub repositories
- Output: One-line summary per repository

**Display**:
- Card with heading "Project Summaries"
- List of project cards, each showing:
  - Repository name (clickable link to GitHub)
  - Summary text
  - GitHub icon (if URL available)

**Data Source**: 
- `employee_project_summaries` table
- Fetched via JOIN or separate query
- Stored as JSON array or separate rows

**Parsing**:
```javascript
const parseProjectSummaries = (summaries) => {
  if (!summaries) return [];
  if (typeof summaries === 'string') {
    try {
      return JSON.parse(summaries);
    } catch (e) {
      return [];
    }
  }
  return Array.isArray(summaries) ? summaries : [];
};
```

### 4. Value Proposition Section

**Content**: AI-generated career progression statement

**Generation**:
- Model: `gpt-4-turbo`
- Input: Employee basic info (name, current_role, target_role, company_name)
- Output: Statement about career progression and missing skills

**Display Format**:
```
To reach [target], [name] needs to improve [their] skills in [skills] - READ MORE.
This will allow [name] to realize [their] potential in the company and contribute meaningfully.
```

**"READ MORE" Button**:
- Placed at the end of the last sentence
- On click: Shows alert "You are being redirected to the Skills Engine page."
- Future: Will redirect to Skills Engine microservice frontend

**Fallback**:
- If value proposition is too short, adds: "This will allow [name] to realize [their] potential in the company and contribute meaningfully."

**Data Source**: `employee.value_proposition` (TEXT column in database)

**Parsing Logic**:
```javascript
// Find sentences mentioning skills/knowledge/experience
// Append "READ MORE" at end of last sentence
// Add fallback sentence if needed
```

### 5. Pending Approval Message

**Display Condition**: `profile_status !== 'approved'`

**Message**:
```
Profile enrichment is in progress. Bio and project summaries will appear here once enrichment is complete.
```

**OR** (if enriched but not approved):
```
Your profile has been enriched and is pending HR approval. Once approved, you will have access to additional features.
```

**Styling**: Yellow/amber background with border

**Visibility**: Hidden when `profile_status === 'approved'`

---

## Approval Workflow

### Profile Status States

1. **`basic`**: Initial state, no enrichment
2. **`enriched`**: Enrichment complete, awaiting approval
3. **`approved`**: Approved by HR, full access
4. **`rejected`**: Rejected by HR

### Enrichment Flow

1. Employee connects LinkedIn (OAuth)
2. Employee connects GitHub (OAuth)
3. `EnrichProfileUseCase.enrichProfile()` automatically triggered
4. OpenAI generates:
   - Bio
   - Project summaries
   - Value proposition
5. Data saved to database
6. `enrichment_completed` set to `true`
7. `profile_status` set to `'enriched'`
8. Approval request created in `employee_profile_approvals` table
9. HR sees request in Company Profile → Profile Approvals tab
10. HR approves → `profile_status` set to `'approved'`
11. Employee sees Learning & Development section

### Approval Impact

**Before Approval**:
- Basic profile information visible
- Bio, project summaries, value proposition visible
- "Pending approval" message shown
- Learning & Development section HIDDEN

**After Approval**:
- All basic information visible
- Bio, project summaries, value proposition visible
- "Pending approval" message HIDDEN
- Learning & Development section VISIBLE with tabs

---

## Learning & Development Tabs

**Visibility**: Only when `profile_status === 'approved'`

**Component**: `ApprovedProfileTabs`

**Tabs** (in order):
1. **Skills** (`skills`)
2. **Courses** (`courses`)
3. **Learning Path** (`learning-path`)
4. **Analytics** (`analytics`)
5. **Requests** (`requests`)

**Note**: "Dashboard" tab was REMOVED from Learning & Development.

### 1. Skills Tab

**Component**: `ProfileSkills`

**Features**:
- Hierarchical skills display
- Main competency → Sub-competencies → Skills
- Verified status indicators
- Integration with Skills Engine microservice

**Data Source**: Skills Engine microservice (with mock fallback)

**Mock Data Structure**:
```javascript
{
  nested_competencies: [
    {
      name: "Data Analysis",
      nested_competencies: [
        {
          name: "Data Processing",
          skills: [
            { name: "Python", verified: false },
            { name: "SQL", verified: false }
          ]
        }
      ]
    }
  ]
}
```

### 2. Courses Tab

**Component**: `ProfileCourses`

**Features**:
- **Assigned Courses**: List of courses assigned to employee
- **In Progress**: Courses currently being taken
- **Completed**: Completed courses
- **Taught** (Trainers only): Courses taught by trainer
  - Label: "Taught (0)" or "Taught (count)"
  - Message: "No courses taught yet." if empty

**Course Click Action**:
- Shows alert: "Redirecting to COURSE BUILDER"
- Future: Will redirect to Course Builder microservice

**Trainer-Specific**:
- Only trainers see "Taught" section
- Check: `employee.is_trainer || employee.roles.includes('TRAINER')`

**Data Source**: Course Builder microservice (with mock fallback)

### 3. Learning Path Tab

**Component**: `LearningPath`

**Features**:
- Learning path visualization
- Course progression
- Integration with Learner AI microservice

**Empty State Message**: "No learning path yet." (changed from "No courses assigned to your learning path yet.")

**View Full Learning Path Button**:
- Shows alert: "Redirecting to LEARNER AI"
- Future: Will redirect to Learner AI microservice

**Data Source**: Learner AI microservice (with mock fallback)

### 4. Analytics Tab

**Component**: `ProfileAnalytics`

**Features**:
- Learning progress summary
- Recent activity
- Upcoming deadlines
- Achievements
- Integration with Learning Analytics microservice

**View Full Analytics Button**:
- Shows alert for redirection
- Future: Will redirect to Learning Analytics microservice

**Data Source**: Learning Analytics microservice (with mock fallback)

### 5. Requests Tab

**Component**: `ProfileRequests`

**Features**:
- Submit new requests
- View existing requests
- Request types:
  - Learn New Skills
  - Apply for Trainer Role
  - Self-Learning Request
  - Other Request

**Submit Request Flow**:
1. User fills form (type, title, description)
2. Submits via `POST /api/v1/employees/:employeeId/requests`
3. Request saved to `employee_requests` table
4. Request appears in Company Profile → Pending Requests tab
5. List refreshes to show new request

**Request Display**:
- List of submitted requests
- Status (pending, approved, rejected, etc.)
- Submission date
- Response notes (if reviewed)

**Error Handling**:
- "failed to load requests" error fixed
- "Request failed with status code 500" error fixed
- Proper envelope structure handling

**Data Source**: 
- `GET /api/v1/employees/:employeeId/requests`
- `POST /api/v1/employees/:employeeId/requests`

---

## Trainer Features

### Trainer Settings Section

**Visibility**: Only when `employee.is_trainer === true`

**Component**: `TrainerSettings`

**Features**:
- AI-enabled toggle
- Public publish enable toggle
- Settings saved to `trainer_settings` table

**Location**: Below Learning & Development section

**Note**: "Trainer Profile" title was REMOVED. "Courses Taught" was REMOVED from trainer section (now in Courses tab).

### Trainer-Specific in Courses Tab

**Taught Section**:
- Only visible for trainers
- Shows count: "Taught (0)" or "Taught (count)"
- Empty state: "No courses taught yet."
- Located within Courses tab, after Completed section

---

## Data Flow

### Initial Load

1. **Page Mount**:
   ```javascript
   useEffect(() => {
     fetchEmployee();
   }, [employeeId, user?.companyId]);
   ```

2. **API Call**:
   - `getEmployee(companyId, employeeId)` → `GET /api/v1/employees/:employeeId`
   - Backend: `GetEmployeeUseCase.execute()`

3. **Backend Processing**:
   - Fetches employee data
   - Performs JOINs for department_name and team_name
   - Fetches project summaries
   - Returns full employee object

4. **Response Handling**:
   - Handles envelope: `response?.response?.employee || response?.employee || response`
   - Sets `employee` state

5. **Component Rendering**:
   - Renders basic information
   - Renders bio, project summaries, value proposition
   - Conditionally renders approval message or Learning & Development tabs
   - Conditionally renders trainer sections

### Profile Editing

1. User clicks "Edit Profile" button
2. `setIsEditing(true)` toggles edit mode
3. `ProfileEditForm` component renders
4. User edits fields
5. On save: API call to update employee
6. On cancel: `setIsEditing(false)`

### Request Submission

1. User fills request form in Requests tab
2. Submits via `submitEmployeeRequest()`
3. Frontend wraps in envelope: `{ requester_service: 'directory_service', payload: { ... } }`
4. Backend unwraps: `req.body.payload || req.body`
5. `SubmitEmployeeRequestUseCase.execute()` creates request
6. Request saved to `employee_requests` table
7. Component refreshes to show new request

---

## API Endpoints

### Get Employee

**Endpoint**: `GET /api/v1/employees/:employeeId`

**Headers**: `Authorization: Bearer <token>`

**Response**:
```javascript
{
  requester_service: 'directory_service',
  response: {
    employee: {
      id: UUID,
      full_name: string,
      email: string,
      current_role_in_company: string,
      target_role_in_company: string,
      department_name: string,  // From JOIN
      team_name: string,          // From JOIN
      bio: string,
      value_proposition: string,
      linkedin_url: string,
      github_url: string,
      profile_status: 'basic' | 'enriched' | 'approved' | 'rejected',
      enrichment_completed: boolean,
      is_trainer: boolean,
      roles: ['TRAINER', ...],
      project_summaries: [ ... ]
    }
  }
}
```

**Backend**:
- Controller: `EmployeeController.getEmployee()`
- Use Case: `GetEmployeeUseCase.execute()`
- Repository: `EmployeeRepository.findById()` with JOINs

### Submit Employee Request

**Endpoint**: `POST /api/v1/employees/:employeeId/requests`

**Headers**: `Authorization: Bearer <token>`

**Request Body** (wrapped in envelope):
```javascript
{
  requester_service: 'directory_service',
  payload: {
    request_type: 'learn-new-skills' | 'apply-trainer' | 'self-learning' | 'other',
    title: string,
    description: string,
    priority: 'high' | 'medium' | 'low'
  }
}
```

**Response**:
```javascript
{
  requester_service: 'directory_service',
  response: {
    success: true,
    request: { ... }
  }
}
```

**Backend**:
- Controller: `RequestController.submitRequest()`
- Use Case: `SubmitEmployeeRequestUseCase.execute()`
- Repository: `EmployeeRequestRepository.create()`

### Get Employee Requests

**Endpoint**: `GET /api/v1/employees/:employeeId/requests`

**Response**:
```javascript
{
  requester_service: 'directory_service',
  response: {
    requests: [ ... ]
  }
}
```

---

## Database Schema

### Employees Table

```sql
CREATE TABLE employees (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id),
    employee_id VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    current_role_in_company VARCHAR(255) NOT NULL,
    target_role_in_company VARCHAR(255) NOT NULL,
    department_name VARCHAR(255),  -- From JOIN
    team_name VARCHAR(255),          -- From JOIN
    bio TEXT,                        -- AI-generated
    value_proposition TEXT,          -- AI-generated
    linkedin_url VARCHAR(500),
    github_url VARCHAR(500),
    linkedin_data JSONB,
    github_data JSONB,
    profile_status VARCHAR(50) DEFAULT 'basic',
    enrichment_completed BOOLEAN DEFAULT FALSE,
    is_trainer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Employee Project Summaries Table

```sql
CREATE TABLE employee_project_summaries (
    id UUID PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id),
    repository_name VARCHAR(255) NOT NULL,
    repository_url VARCHAR(500),
    summary TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, repository_name)
);
```

### Employee Requests Table

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

---

## Key Files

### Frontend

- `frontend/src/pages/EmployeeProfilePage.js` - Main page component
- `frontend/src/components/ApprovedProfileTabs.js` - Tabbed Learning & Development section
- `frontend/src/components/ProfileSkills.js` - Skills display
- `frontend/src/components/ProfileCourses.js` - Courses display (with trainer "Taught" section)
- `frontend/src/components/LearningPath.js` - Learning path display
- `frontend/src/components/ProfileAnalytics.js` - Analytics display
- `frontend/src/components/ProfileRequests.js` - Request submission and display
- `frontend/src/components/TrainerSettings.js` - Trainer settings
- `frontend/src/components/ProfileEditForm.js` - Profile editing form
- `frontend/src/services/employeeService.js` - Employee API service

### Backend

- `backend/src/presentation/EmployeeController.js` - Employee endpoints
- `backend/src/application/GetEmployeeUseCase.js` - Get employee logic
- `backend/src/application/EnrichProfileUseCase.js` - Enrichment orchestration
- `backend/src/application/SubmitEmployeeRequestUseCase.js` - Request submission logic
- `backend/src/infrastructure/OpenAIAPIClient.js` - OpenAI integration
- `backend/src/infrastructure/EmployeeRepository.js` - Employee data access
- `backend/src/infrastructure/EmployeeRequestRepository.js` - Request data access

---

## Important Notes

1. **Department/Team Display**: Uses JOINs to get `department_name` and `team_name` from related tables, not stored directly in employees table.

2. **LinkedIn URL**: Direct link from database, no validation. If URL is invalid, browser handles it.

3. **Value Proposition "READ MORE"**: Placed at end of last sentence, shows alert for now.

4. **Learning & Development Visibility**: Only visible when `profile_status === 'approved'`.

5. **Trainer "Taught" Section**: Only in Courses tab, only for trainers.

6. **Request Envelope**: Frontend wraps requests in envelope, backend unwraps with `req.body.payload || req.body`.

7. **No Dashboard Tab**: Removed from Learning & Development tabs.

8. **Learning Path Message**: Changed to "No learning path yet."

---

## Rollback Reference

If changes break the Employee Profile:

1. Check this document for expected behavior
2. Verify basic information displays department_name and team_name (from JOINs)
3. Ensure LinkedIn link is direct from database
4. Confirm Value Proposition "READ MORE" placement
5. Verify Learning & Development tabs only show when approved
6. Check trainer "Taught" section appears in Courses tab
7. Ensure request submission uses envelope structure
8. Confirm no "Dashboard" tab in Learning & Development

**Last Known Working Commit**: Current as of 2025-01-20

