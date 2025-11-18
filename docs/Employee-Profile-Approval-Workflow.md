# Employee Profile Approval Workflow

This document describes the HR approval workflow for enriched employee profiles.

**Last Updated**: Based on user clarification

---

## Purpose

After an employee enriches their profile with external data (LinkedIn, GitHub), the enriched profile must be reviewed and approved by the company (HR) to ensure:

1. The enriched profile data is suitable/appropriate for the company
2. External data (bio, skills, projects) aligns with company standards
3. Employee can only start using the system (learning, requests) after approval

---

## Workflow Steps

### 1. Employee Enriches Profile

1. Employee logs in for first time
2. Employee sees basic profile (from CSV data)
3. Employee connects LinkedIn and GitHub (OAuth)
4. Directory fetches raw data from external APIs
5. Directory enriches profile using Gemini AI + Skills Engine
6. **Directory updates profile status to "enriched"** (not yet approved)

### 2. Approval Request Sent to Company

1. **Directory automatically sends approval request to Company Profile**
2. Approval request includes:
   - Employee ID
   - Employee name and email
   - Enrichment date
   - Link to view enriched profile

### 3. HR Reviews Pending Approvals

1. **HR accesses Company Profile**
2. **HR sees "Pending Profile Approvals" section** with:
   - List of all employees with enriched but not yet approved profiles
   - Employee name, email, department, team
   - Date of enrichment
   - "View Profile" button (to see full enriched profile)
   - "Approve" button
   - "Reject" button

### 4. HR Approves or Rejects

**If HR Approves**:
1. Directory updates employee profile status to "approved"
2. Employee can now use the system:
   - Start learning
   - Send requests
   - Access all features
3. Approval notification sent to employee (optional)

**If HR Rejects**:
1. Directory updates employee profile status to "rejected"
2. Employee profile remains "enriched" but not approved
3. Employee **cannot** use the system until approved
4. Rejection notification sent to employee with reason (optional)
5. Employee may need to update profile and request re-approval

---

## Database Schema Updates

### Employee Profile Status

**New field in `employees` table**:
```sql
ALTER TABLE employees ADD COLUMN profile_status VARCHAR(50) DEFAULT 'basic';
-- Values: 'basic', 'enriched', 'approved', 'rejected'
```

**Status Flow**:
- `basic` → Initial state (from CSV)
- `enriched` → After OAuth + enrichment (waiting for approval)
- `approved` → After HR approval (employee can use system)
- `rejected` → After HR rejection (employee cannot use system)

### Approval Requests

**New table: `employee_profile_approvals`**:
```sql
CREATE TABLE employee_profile_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id),
  company_id UUID REFERENCES companies(id),
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  enriched_at TIMESTAMP,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by UUID, -- HR employee ID (optional)
  rejection_reason TEXT, -- If rejected
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Backend Implementation

### 1. Update Employee Profile Status

**File**: `/backend/src/application/EnrichEmployeeProfileUseCase.js`

**After enrichment completes**:
```javascript
// Update profile status to 'enriched'
await employeeRepository.updateProfileStatus(employeeId, 'enriched');

// Create approval request
await approvalRepository.createApprovalRequest({
  employee_id: employeeId,
  company_id: companyId,
  status: 'pending',
  enriched_at: new Date()
});
```

### 2. Create Approval Request Repository

**File**: `/backend/src/infrastructure/EmployeeProfileApprovalRepository.js` (NEW)

**Methods**:
- `createApprovalRequest(data)` - Create new approval request
- `findPendingByCompanyId(companyId)` - Get all pending approvals for a company
- `approveProfile(approvalId, reviewedBy)` - Approve profile
- `rejectProfile(approvalId, reviewedBy, reason)` - Reject profile
- `findByEmployeeId(employeeId)` - Get approval request for employee

### 3. Approval Controller

**File**: `/backend/src/presentation/EmployeeProfileApprovalController.js` (NEW)

**Endpoints**:
- `GET /companies/:id/profile-approvals` - Get pending approvals
- `POST /companies/:id/profile-approvals/:approvalId/approve` - Approve profile
- `POST /companies/:id/profile-approvals/:approvalId/reject` - Reject profile
- `GET /employees/:id/approval-status` - Get employee approval status

### 4. Update Employee Status After Approval

**When HR approves**:
```javascript
// Update approval request
await approvalRepository.approveProfile(approvalId, hrEmployeeId);

// Update employee profile status
await employeeRepository.updateProfileStatus(employeeId, 'approved');
```

**When HR rejects**:
```javascript
// Update approval request
await approvalRepository.rejectProfile(approvalId, hrEmployeeId, reason);

// Update employee profile status
await employeeRepository.updateProfileStatus(employeeId, 'rejected');
```

---

## Frontend Implementation

### 1. Employee Profile Status Indicator

**File**: `/frontend/src/components/EmployeeProfileStatus.js` (NEW)

**Display**:
- "Basic Profile" (if status = 'basic')
- "Enriched - Waiting for HR Approval" (if status = 'enriched')
- "Approved" (if status = 'approved')
- "Rejected" (if status = 'rejected') + rejection reason

### 2. Company Profile - Pending Approvals Section

**File**: `/frontend/src/components/PendingProfileApprovals.js` (NEW)

**Display**:
- List of employees with enriched but not approved profiles
- Employee card showing:
  - Name, email, department, team
  - Enrichment date
  - "View Profile" button (opens employee profile modal)
  - "Approve" button
  - "Reject" button (opens rejection reason modal)

### 3. Update Company Dashboard

**File**: `/frontend/src/components/CompanyDashboard.js` (UPDATE)

**Add new tab or section**:
- "Pending Approvals" tab/section
- Shows count of pending approvals
- Links to PendingProfileApprovals component

### 4. Employee Profile Page

**File**: `/frontend/src/pages/EmployeeProfilePage.js` (UPDATE)

**Add status indicator**:
- Show profile status at top of page
- If 'enriched' → Show "Waiting for HR approval" message
- If 'rejected' → Show rejection reason and "Contact HR" message
- If 'approved' → Show "Profile Approved" badge

### 5. Access Control

**File**: `/frontend/src/utils/accessControl.js` (NEW or UPDATE)

**Check before allowing actions**:
```javascript
// Employee can only perform actions if profile is approved
if (employee.profile_status !== 'approved') {
  // Show message: "Your profile must be approved by HR before you can use this feature"
  // Disable action buttons
}
```

---

## API Endpoints

### Get Pending Approvals
```
GET /api/v1/companies/:companyId/profile-approvals
```

**Response**:
```json
{
  "requester_service": "directory",
  "response": {
    "pending_approvals": [
      {
        "id": "approval-uuid",
        "employee_id": "employee-uuid",
        "employee_name": "John Doe",
        "employee_email": "john@company.com",
        "department": "Engineering",
        "team": "Backend",
        "enriched_at": "2025-01-15T10:30:00Z",
        "requested_at": "2025-01-15T10:30:00Z"
      }
    ],
    "total_pending": 5
  }
}
```

### Approve Profile
```
POST /api/v1/companies/:companyId/profile-approvals/:approvalId/approve
```

**Request**:
```json
{
  "requester_service": "directory",
  "payload": {
    "reviewed_by": "hr-employee-uuid" // Optional
  }
}
```

**Response**:
```json
{
  "requester_service": "directory",
  "response": {
    "success": true,
    "message": "Employee profile approved",
    "employee_id": "employee-uuid",
    "status": "approved"
  }
}
```

### Reject Profile
```
POST /api/v1/companies/:companyId/profile-approvals/:approvalId/reject
```

**Request**:
```json
{
  "requester_service": "directory",
  "payload": {
    "reason": "Profile data does not align with company standards",
    "reviewed_by": "hr-employee-uuid" // Optional
  }
}
```

**Response**:
```json
{
  "requester_service": "directory",
  "response": {
    "success": true,
    "message": "Employee profile rejected",
    "employee_id": "employee-uuid",
    "status": "rejected"
  }
}
```

### Get Employee Approval Status
```
GET /api/v1/employees/:employeeId/approval-status
```

**Response**:
```json
{
  "requester_service": "directory",
  "response": {
    "employee_id": "employee-uuid",
    "profile_status": "enriched", // 'basic', 'enriched', 'approved', 'rejected'
    "approval_request": {
      "id": "approval-uuid",
      "status": "pending", // 'pending', 'approved', 'rejected'
      "enriched_at": "2025-01-15T10:30:00Z",
      "requested_at": "2025-01-15T10:30:00Z",
      "reviewed_at": null,
      "rejection_reason": null
    }
  }
}
```

---

## Access Control Rules

### Employee Actions

**Employee can only perform these actions if `profile_status = 'approved'`**:
- Start learning (enroll in courses)
- Send requests (training requests, etc.)
- Access learning paths
- View full profile features

**Employee can perform these actions even if not approved**:
- View own profile (basic or enriched)
- Update profile information
- Connect LinkedIn/GitHub (if not done yet)

### HR Actions

**HR can always**:
- View all employee profiles (basic, enriched, approved, rejected)
- Approve/reject enriched profiles
- View pending approvals

---

## Implementation Checklist

### Backend:
- [ ] Add `profile_status` field to `employees` table
- [ ] Create `employee_profile_approvals` table
- [ ] Create `EmployeeProfileApprovalRepository`
- [ ] Create `EmployeeProfileApprovalController`
- [ ] Update `EnrichEmployeeProfileUseCase` to create approval request
- [ ] Add approval/rejection endpoints
- [ ] Add access control checks for employee actions

### Frontend:
- [ ] Create `EmployeeProfileStatus` component
- [ ] Create `PendingProfileApprovals` component
- [ ] Add "Pending Approvals" section to Company Dashboard
- [ ] Update Employee Profile page with status indicator
- [ ] Add access control checks (disable actions if not approved)
- [ ] Add approval/rejection UI

### Testing:
- [ ] Test enrichment flow → approval request creation
- [ ] Test HR approval flow
- [ ] Test HR rejection flow
- [ ] Test access control (employee cannot use system until approved)
- [ ] Test notification system (if implemented)

---

## Notes

1. **Approval is mandatory** - Employee cannot use system until profile is approved
2. **One approval per employee** - After approval, employee can use system indefinitely
3. **Rejection allows re-approval** - If rejected, employee can update profile and request re-approval
4. **HR can view full profile** - Before approving, HR should be able to view the complete enriched profile
5. **Audit trail** - All approvals/rejections should be logged with timestamp and reviewer

---

## Files Created/Updated

1. `/docs/Employee-Profile-Approval-Workflow.md` - This document
2. `/docs/System-Knowledge.md` - Updated with approval workflow
3. `/docs/Integration-Clarifications.md` - Updated with approval clarification

