# HR Access Control - Company Profile Access

This document clarifies how HR employees access the system and their special privileges.

**Last Updated**: Based on user clarification

---

## Key Understanding

**HR employees are responsible for Company Profile management.**

When an HR employee logs in with their email, they see the **Company Profile** (not a typical employee profile).

---

## HR Login Flow

### 1. HR Employee Authentication

1. HR employee logs in with their email (same authentication system as regular employees)
2. **System identifies HR role** (based on email, role, or company registration)
3. **System redirects HR to Company Profile** (not Employee Profile)
4. HR sees Company Profile dashboard with:
   - Company overview
   - Employee management
   - Pending approvals
   - Company settings
   - All company management features

### 2. HR vs Regular Employee Views

**Regular Employee Login**:
- Sees their own Employee Profile
- Can view own data, skills, courses
- Limited to own profile management

**HR Employee Login**:
- Sees Company Profile (default view)
- Can view all employees
- Can manage company settings
- Can approve/reject employee profiles
- Has full company management access

---

## Identifying HR Employees

### Methods to Identify HR:

1. **Email-based**: HR email is stored during company registration
2. **Role-based**: HR employees may have a specific role (e.g., "HR_MANAGER", "COMPANY_ADMIN")
3. **Registration-based**: The employee who registered the company is automatically HR
4. **Explicit designation**: Company can designate specific employees as HR

### Database Schema:

**Option 1: Use existing `hr_contact_email` in companies table**
```sql
-- Check if employee email matches company's HR contact
SELECT * FROM companies WHERE hr_contact_email = employee_email
```

**Option 2: Add HR flag to employees table**
```sql
ALTER TABLE employees ADD COLUMN is_hr BOOLEAN DEFAULT FALSE;
ALTER TABLE employees ADD COLUMN is_company_admin BOOLEAN DEFAULT FALSE;
```

**Option 3: Use role-based system**
```sql
-- Check if employee has HR-related role
SELECT * FROM employee_roles 
WHERE employee_id = ? 
AND role_type IN ('HR_MANAGER', 'COMPANY_ADMIN', 'HR')
```

---

## Routing Logic

### Backend Routing:

**After login, check employee role**:
```javascript
// Check if employee is HR
const isHR = await checkIfHR(employeeId, companyId);

if (isHR) {
  // Redirect to Company Profile
  return res.redirect(`/company/${companyId}`);
} else {
  // Redirect to Employee Profile
  return res.redirect(`/employee/${employeeId}`);
}
```

### Frontend Routing:

**After authentication, determine view**:
```javascript
// Check if current user is HR
const isHR = user.isHR || user.role === 'HR' || user.email === company.hr_contact_email;

if (isHR) {
  // Navigate to Company Profile
  navigate(`/company/${companyId}`);
} else {
  // Navigate to Employee Profile
  navigate(`/employee/${employeeId}`);
}
```

---

## HR Privileges in Company Profile

### HR Can Access:

1. **Company Overview**:
   - Company metrics
   - Company information
   - Company settings

2. **Employee Management**:
   - View all employees
   - Add/edit/delete employees
   - View employee profiles (all statuses)

3. **Pending Approvals**:
   - View pending profile approvals
   - Approve/reject enriched profiles
   - View approval history

4. **Training Management**:
   - Submit training requests
   - View training enrollments
   - Manage course assignments

5. **Company Settings**:
   - Update company information
   - Update company settings (passing_grade, max_attempts, etc.)
   - Manage Decision Maker

6. **Analytics**:
   - View company analytics
   - Access Learning Analytics
   - View reports

---

## Implementation Checklist

### Backend:
- [ ] Create function to identify HR employees (`checkIfHR`)
- [ ] Update authentication logic to detect HR role
- [ ] Update routing to redirect HR to Company Profile
- [ ] Add HR flag or role to employees table (if needed)
- [ ] Create middleware to check HR access

### Frontend:
- [ ] Update login flow to detect HR role
- [ ] Update routing to redirect HR to Company Profile
- [ ] Update Company Profile to show HR-specific features
- [ ] Add HR badge/indicator in UI
- [ ] Ensure HR sees Company Profile by default

### Database:
- [ ] Determine HR identification method (email, role, flag)
- [ ] Add necessary fields/tables if needed
- [ ] Update migration if schema changes required

---

## Notes

1. **HR employees are still employees** - They have employee records, but see Company Profile when logging in
2. **Multiple HR employees possible** - Company may have multiple HR employees
3. **HR can view own employee profile** - HR can still access their own employee profile if needed (via navigation)
4. **Default view is Company Profile** - HR's default landing page is Company Profile, not Employee Profile

---

## Files Created/Updated

1. `/docs/HR-Access-Control.md` - This document
2. `/docs/System-Knowledge.md` - Updated with HR access clarification
3. `/docs/Employee-Profile-Approval-Workflow.md` - Updated with HR access clarification

