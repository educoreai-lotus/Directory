# Company Profile - Complete Documentation (Updated Profiles Reference)

**Last Updated**: 2025-01-20  
**Purpose**: Complete reference for Company Profile features, UI, and logic. Use this as a rollback reference point.

---

## Table of Contents

1. [Overview](#overview)
2. [Page Structure](#page-structure)
3. [Tabs and Features](#tabs-and-features)
4. [UI Components](#ui-components)
5. [Data Flow](#data-flow)
6. [API Endpoints](#api-endpoints)
7. [Database Schema](#database-schema)
8. [Key Files](#key-files)

---

## Overview

The Company Profile page (`/company/:companyId`) is the main management dashboard for HR and company administrators. It displays company information, organizational hierarchy, employee management, and approval workflows.

### Key Features
- Company logo display (circular, with fallback to initial letter)
- Company information (name, industry, domain)
- Tabbed interface for different sections
- Employee management (list, search, filter, sort)
- Profile approval workflow
- Pending requests management
- Organizational hierarchy visualization
- Analytics dashboard
- Course enrollment section

---

## Page Structure

### Main Component: `CompanyProfilePage.js`

**Location**: `frontend/src/pages/CompanyProfilePage.js`

**Props/State**:
- `companyId` (from URL params)
- `loading` (state)
- `error` (state)
- `profileData` (state) - Contains:
  - `company` - Company object
  - `departments` - Array of departments
  - `teams` - Array of teams
  - `employees` - Array of employees
  - `hierarchy` - Organizational hierarchy structure
  - `metrics` - Company metrics
  - `pending_approvals` - Array of pending profile approvals

**Layout**:
```
┌─────────────────────────────────────┐
│  Company Logo | Company Name        │
│               | Industry            │
├─────────────────────────────────────┤
│  [Tabs: Overview | Hierarchy | ...] │
├─────────────────────────────────────┤
│  [Tab Content]                      │
└─────────────────────────────────────┘
```

### Header Section

**Company Logo**:
- Circular display (80px × 80px)
- Uses `logo_url` from company data
- Fallback: Initial letter of company name in gradient background
- Styling uses design tokens:
  - `--logo-size`: 80px
  - `--radius-avatar`: 9999px (circular)
  - `--border-default`: Border color
  - `--shadow-card`: Box shadow

**Company Information**:
- Company Name (h1, 30px, bold)
- Subtitle: "Company Overview & Management Dashboard"
- Industry (if available, smaller text)

---

## Tabs and Features

### Tab Navigation

All tabs use consistent styling:
- Active tab: Teal border bottom (2px), teal text color
- Inactive tab: Gray text, hover effect
- Badge indicators for pending items (red background, white text)

**Tabs**:
1. **Overview** (`overview`)
2. **Hierarchy** (`hierarchy`)
3. **Analytics** (`dashboard`) - Label shows as "Analytics"
4. **Employees** (`employees`)
5. **Enroll to Courses** (`enrollment`)
6. **Pending Requests** (`requests`) - Shows count badge
7. **Profile Approvals** (`approvals`) - Shows count badge

### 1. Overview Tab

**Component**: `CompanyMetrics` + Company Information

**Features**:
- Company metrics cards:
  - Total Employees
  - Active Employees
  - Inactive Employees
  - Total Departments
  - Total Teams
- Company information grid:
  - Company Name
  - Industry
  - Domain

**Data Source**: `profileData.metrics` and `profileData.company`

### 2. Hierarchy Tab

**Component**: `CompanyHierarchy`

**Features**:
- Visual organizational structure
- Departments → Teams → Employees hierarchy
- Expandable/collapsible sections

**Data Source**: `profileData.hierarchy`

**Structure**:
```javascript
{
  [departmentId]: {
    department: { id, department_name, ... },
    teams: [
      {
        team: { id, team_name, ... },
        employees: [employee1, employee2, ...]
      }
    ]
  }
}
```

### 3. Analytics Tab

**Component**: `CompanyAnalyticsDashboard`

**Features**:
- Company-wide analytics dashboard
- Learning metrics
- Progress tracking
- Integration with Learning Analytics microservice

**Data Source**: Fetched from Learning Analytics microservice (with mock fallback)

### 4. Employees Tab

**Component**: `EmployeeList`

**Features**:
- **Search Bar**: Search by name or email
- **Role Filter**: Single-select dropdown (all roles or specific role)
- **Sort Options**: 
  - Sort by: Name, Email, Role, Department, Team
  - Sort direction: Ascending/Descending (arrow button)
- **Employee Cards**: Display employee information
- **Actions**:
  - Click employee card → Navigate to employee profile
  - Add Employee (dropdown menu)
  - Edit Employee
  - Delete Employee
  - Upload CSV

**Filter Logic**:
- Search: Filters by `full_name` or `email` (case-insensitive)
- Role: Single-select dropdown, filters employees with matching role
- Sort: Sorts by selected field (name, email, role, etc.)

**Removed Features**:
- Status filter (Active/Inactive) - REMOVED
- Multi-select role filter - REPLACED with single-select dropdown

**Data Source**: `profileData.employees`

### 5. Enroll to Courses Tab

**Component**: `EnrollmentSection`

**Features**:
- Course enrollment interface
- Employee selection
- Course selection
- Integration with Course Builder microservice

**Data Source**: Fetched from Course Builder microservice (with mock fallback)

### 6. Pending Requests Tab

**Component**: `PendingRequestsSection`

**Features**:
- **Display**: List of pending employee requests
- **Request Types**:
  - Learn New Skills
  - Apply for Trainer Role
  - Self-Learning Request
  - Other Request
  - Profile Update
  - Learning Path
  - Trainer Role Request
  - Skill Request
- **Request Information**:
  - Employee name and email
  - Request title
  - Description (if available)
  - Priority (high/medium/low)
  - Submission date
- **Actions**:
  - Approve (green button)
  - Reject (red button)
  - View Employee (navigates to employee profile)
- **Count Badge**: Red badge showing number of pending requests in tab header
- **No Auto-Refresh**: Component fetches once on mount, no polling

**Data Flow**:
1. Component receives `companyId` prop
2. Calls `getCompanyRequests(companyId, 'pending')`
3. Handles envelope structure: `response?.response?.requests`
4. Updates parent with count via `onRequestsLoaded` callback
5. Displays requests in cards

**Response Structure**:
```javascript
{
  requester_service: 'directory_service',
  response: {
    success: true,
    requests: [
      {
        id: UUID,
        employee_id: UUID,
        employee_name: string,
        employee_email: string,
        request_type: string,
        title: string,
        description: string,
        priority: 'high' | 'medium' | 'low',
        requested_at: timestamp,
        status: 'pending'
      }
    ]
  }
}
```

**Key Files**:
- `frontend/src/components/PendingRequestsSection.js`
- `frontend/src/services/employeeService.js` - `getCompanyRequests()`
- `backend/src/presentation/RequestController.js` - `getCompanyRequests()`
- `backend/src/infrastructure/EmployeeRequestRepository.js`

### 7. Profile Approvals Tab

**Component**: `PendingProfileApprovals`

**Features**:
- **Display**: List of employees with enriched profiles awaiting approval
- **Approval Information**:
  - Employee name and email
  - Enrichment completion date
  - Request date
- **Actions**:
  - Approve (green button) → Updates `profile_status` to 'approved'
  - Reject (red button) → Prompts for reason, updates status to 'rejected'
  - View Employee (navigates to employee profile)
- **Count Badge**: Red badge showing number of pending approvals in tab header
- **Auto-Refresh**: Page reloads after approval/rejection

**Approval Flow**:
1. Employee enriches profile (connects LinkedIn + GitHub)
2. `EnrichProfileUseCase` creates approval request in `employee_profile_approvals` table
3. HR sees request in Profile Approvals tab
4. HR clicks Approve → `POST /companies/:companyId/profile-approvals/:approvalId/approve`
5. Backend updates `employees.profile_status` to 'approved'
6. Page refreshes to show updated list

**Data Source**: `profileData.pending_approvals`

**Key Files**:
- `frontend/src/components/PendingProfileApprovals.js`
- `backend/src/presentation/EmployeeProfileApprovalController.js`
- `backend/src/infrastructure/EmployeeRepository.js` - `updateProfileStatus()`

---

## UI Components

### CompanyDashboard

**Location**: `frontend/src/components/CompanyDashboard.js`

**Props**:
- `company` - Company object
- `departments` - Array of departments
- `teams` - Array of teams
- `employees` - Array of employees
- `hierarchy` - Hierarchy structure
- `metrics` - Company metrics
- `pendingApprovals` - Array of pending approvals
- `onEmployeeClick` - Callback for employee click
- `companyId` - Company UUID

**State**:
- `activeTab` - Current active tab
- `refreshKey` - For forcing re-renders
- `pendingRequestsCount` - Count of pending requests (from PendingRequestsSection)

**Tab Management**:
- Uses `useState` for `activeTab`
- Tab buttons update `activeTab` state
- Conditional rendering based on `activeTab`

### Design Tokens Usage

All components use CSS custom properties from `design-tokens.json`:
- Colors: `--text-primary`, `--text-secondary`, `--bg-card`, `--border-default`, `--border-focus`
- Spacing: Standard Tailwind classes
- Typography: `--font-size-*`, `--font-weight-*`
- Borders: `--radius-card`, `--border-default`
- Shadows: `--shadow-card`

---

## Data Flow

### Initial Load

1. **Page Mount** (`CompanyProfilePage.js`):
   ```javascript
   useEffect(() => {
     fetchProfile();
   }, [companyId]);
   ```

2. **API Call**:
   - `getCompanyProfile(companyId)` → `GET /api/v1/companies/:companyId`
   - Backend: `GetCompanyProfileUseCase.execute(companyId)`

3. **Backend Processing**:
   - Fetches company, departments, teams, employees
   - Builds hierarchy structure
   - Calculates metrics
   - Fetches pending approvals

4. **Response Handling**:
   - Handles envelope structure: `response?.response || response`
   - Sets `profileData` state

5. **Component Rendering**:
   - Renders header with logo
   - Renders `CompanyDashboard` with all data

### Tab Switching

1. User clicks tab button
2. `setActiveTab(tabId)` updates state
3. Conditional rendering shows appropriate component
4. Component fetches additional data if needed (e.g., Analytics, Requests)

### Employee Click

1. User clicks employee card in EmployeeList
2. `onEmployeeClick(employee)` callback fired
3. Navigates to `/employee/:employeeId`

### Approval Actions

1. User clicks Approve/Reject in Profile Approvals tab
2. API call to backend
3. Backend updates database
4. `onApprovalUpdate()` callback triggers page reload
5. Fresh data fetched, updated list displayed

---

## API Endpoints

### Get Company Profile

**Endpoint**: `GET /api/v1/companies/:companyId`

**Response**:
```javascript
{
  requester_service: 'directory_service',
  response: {
    company: { ... },
    departments: [ ... ],
    teams: [ ... ],
    employees: [ ... ],
    hierarchy: { ... },
    metrics: {
      totalEmployees: number,
      activeEmployees: number,
      inactiveEmployees: number,
      totalDepartments: number,
      totalTeams: number
    },
    pending_approvals: [ ... ]
  }
}
```

**Backend**:
- Controller: `CompanyProfileController.getCompanyProfile()`
- Use Case: `GetCompanyProfileUseCase.execute()`
- Repositories: `CompanyRepository`, `DepartmentRepository`, `TeamRepository`, `EmployeeRepository`, `EmployeeProfileApprovalRepository`

### Get Company Requests

**Endpoint**: `GET /api/v1/companies/:companyId/requests?status=pending`

**Response**:
```javascript
{
  requester_service: 'directory_service',
  response: {
    success: true,
    requests: [
      {
        id: UUID,
        employee_id: UUID,
        employee_name: string,
        employee_email: string,
        request_type: string,
        title: string,
        description: string,
        priority: string,
        requested_at: timestamp,
        status: string
      }
    ]
  }
}
```

**Backend**:
- Controller: `RequestController.getCompanyRequests()`
- Repository: `EmployeeRequestRepository.findByCompanyId()`

### Approve Profile

**Endpoint**: `POST /api/v1/companies/:companyId/profile-approvals/:approvalId/approve`

**Request Body**: None

**Response**:
```javascript
{
  requester_service: 'directory_service',
  response: {
    success: true,
    message: 'Profile approved successfully'
  }
}
```

**Backend**:
- Controller: `EmployeeProfileApprovalController.approveProfile()`
- Use Case: `ApproveEmployeeProfileUseCase.execute()`
- Repository: `EmployeeRepository.updateProfileStatus()`

---

## Database Schema

### Companies Table

```sql
CREATE TABLE companies (
    id UUID PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    industry VARCHAR(255),
    domain VARCHAR(255) UNIQUE NOT NULL,
    logo_url VARCHAR(500),
    -- ... other fields
);
```

### Employee Profile Approvals Table

```sql
CREATE TABLE employee_profile_approvals (
    id UUID PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    status VARCHAR(50) DEFAULT 'pending',
    enriched_at TIMESTAMP,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by UUID REFERENCES employees(id),
    rejection_reason TEXT,
    UNIQUE(employee_id)
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

- `frontend/src/pages/CompanyProfilePage.js` - Main page component
- `frontend/src/components/CompanyDashboard.js` - Tabbed dashboard
- `frontend/src/components/CompanyMetrics.js` - Metrics display
- `frontend/src/components/CompanyHierarchy.js` - Hierarchy visualization
- `frontend/src/components/EmployeeList.js` - Employee list with filters
- `frontend/src/components/PendingRequestsSection.js` - Pending requests display
- `frontend/src/components/PendingProfileApprovals.js` - Approval workflow
- `frontend/src/services/companyProfileService.js` - API service
- `frontend/src/services/employeeService.js` - Employee API service

### Backend

- `backend/src/presentation/CompanyProfileController.js` - Company profile endpoint
- `backend/src/application/GetCompanyProfileUseCase.js` - Business logic
- `backend/src/presentation/RequestController.js` - Request endpoints
- `backend/src/presentation/EmployeeProfileApprovalController.js` - Approval endpoints
- `backend/src/infrastructure/CompanyRepository.js` - Company data access
- `backend/src/infrastructure/EmployeeRepository.js` - Employee data access
- `backend/src/infrastructure/EmployeeRequestRepository.js` - Request data access
- `backend/src/infrastructure/EmployeeProfileApprovalRepository.js` - Approval data access

---

## Important Notes

1. **Envelope Structure**: All API responses are wrapped in `{ requester_service: 'directory_service', response: { ... } }`. Frontend must unwrap: `response?.response || response`

2. **No Auto-Refresh**: Pending Requests section does NOT auto-refresh. It fetches once on mount.

3. **Count Badges**: Both Pending Requests and Profile Approvals tabs show red badges with counts.

4. **Tab Labels**: "Dashboard" tab is labeled as "Analytics" in the UI.

5. **Employee Filtering**: Role filter is single-select dropdown (not multi-select). Status filter was removed.

6. **Approval Flow**: After approval/rejection, page reloads to show updated data.

---

## Rollback Reference

If changes break the Company Profile:

1. Check this document for expected behavior
2. Verify tab structure matches this documentation
3. Ensure API response handling uses envelope structure
4. Confirm no auto-refresh in Pending Requests
5. Verify count badges display correctly
6. Check employee filtering logic matches single-select dropdown

**Last Known Working Commit**: Current as of 2025-01-20

