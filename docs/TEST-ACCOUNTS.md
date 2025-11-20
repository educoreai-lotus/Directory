# Test Accounts - InnovateTech Solutions

## Company Information
- **Company Name:** InnovateTech Solutions
- **Industry:** Technology
- **Domain:** innovate.io ⚠️ **NOTE: Domain is `innovate.io` NOT `innovatetech.io`**
- **Logo URL:** https://logo.clearbit.com/google.com

## HR Contact (Company Registrar)
- **Email:** jennifer.martinez@innovate.io ⚠️ **NOTE: Use `@innovate.io` domain**
- **Password:** SecurePass123
- **Role:** HR Manager + Decision Maker
- **Employee ID:** EMP005
- **Note:** This is the HR contact who registered the company. Use this email when registering the company.

## Test Accounts

### 1. Regular Employee (For Enrichment Testing)
- **Email:** alex.johnson@innovate.io ⚠️ **NOTE: Use `@innovate.io` domain**
- **Password:** SecurePass123
- **Role:** Regular Employee
- **Employee ID:** EMP001
- **Department:** Engineering
- **Team:** Frontend Team
- **Current Role:** Frontend Developer
- **Target Role:** Senior Frontend Developer
- **Use Case:** Test the full enrichment flow (LinkedIn + GitHub → Gemini → Skills Engine → HR Approval)

### 2. Trainer (For Trainer Features Testing)
- **Email:** sarah.williams@innovate.io ⚠️ **NOTE: Use `@innovate.io` domain**
- **Password:** SecurePass123
- **Role:** Trainer
- **Employee ID:** EMP002
- **Department:** Engineering
- **Team:** Frontend Team
- **Current Role:** Frontend Trainer
- **Target Role:** Senior Frontend Trainer
- **Use Case:** Test trainer-specific features (Trainer Settings, Courses Taught)

### 3. HR / Decision Maker (For Approval Testing)
- **Email:** jennifer.martinez@innovate.io ⚠️ **NOTE: Use `@innovate.io` domain**
- **Password:** SecurePass123
- **Role:** HR Manager + Decision Maker
- **Employee ID:** EMP005
- **Department:** Human Resources
- **Team:** HR Team
- **Current Role:** HR Manager
- **Target Role:** Senior HR Manager
- **Use Case:** 
  - View Company Profile
  - Approve enriched employee profiles
  - Approve learning path requests (as Decision Maker)

## Additional Test Accounts

### 4. Team Manager
- **Email:** michael.brown@innovatetech.io
- **Password:** SecurePass123
- **Role:** Regular Employee + Team Manager
- **Employee ID:** EMP003

### 5. Department Manager
- **Email:** david.wilson@innovatetech.io
- **Password:** SecurePass123
- **Role:** Regular Employee + Department Manager
- **Employee ID:** EMP006

## ⚠️ IMPORTANT: Before Testing

**You MUST upload the CSV file before trying to log in!**

The test accounts are created when you upload the CSV file. If you try to log in before uploading the CSV, you will get "Invalid email or password" error.

### Step 1: Company Registration
1. Go to registration page
2. Fill in:
   - Company Name: `InnovateTech Solutions`
   - Industry: `Technology`
   - Domain: `innovate.io` ⚠️ **NOTE: Domain is `innovate.io`**
   - HR Contact Name: `Jennifer Martinez`
   - HR Contact Email: `jennifer.martinez@innovate.io` ⚠️ **MUST MATCH CSV - Use `@innovate.io`**
   - HR Contact Role: `HR Manager`

### Step 2: CSV Upload
1. Upload `test_company_with_logo.csv`
2. Verify all employees are created
3. Verify company logo appears

### Step 3: Enrichment Testing
1. Log in as `alex.johnson@innovate.io` ⚠️ **Use `@innovate.io` domain**
2. Should redirect to enrichment page
3. Connect LinkedIn → Should redirect back to enrichment page
4. Connect GitHub → Should trigger enrichment → Redirect to profile
5. Profile should show "⏳ Waiting for HR Approval"

### Step 4: HR Approval Testing
1. Log in as `jennifer.martinez@innovate.io` ⚠️ **Use `@innovate.io` domain**
2. Go to Company Profile → "Pending Profile Approvals" tab
3. Approve Alex Johnson's profile
4. Log out

### Step 5: Approved Employee Testing
1. Log in as `alex.johnson@innovate.io` again ⚠️ **Use `@innovate.io` domain**
2. Should see full profile with:
   - Skills section (from Skills Engine)
   - Courses section (from Course Builder)
   - Learning Path section (from Learner AI)
   - Dashboard section (from Learning Analytics)
   - Requests section

### Step 6: Trainer Testing
1. Log in as `sarah.williams@innovate.io` ⚠️ **Use `@innovate.io` domain**
2. Should see Trainer Profile section with:
   - Trainer Settings
   - Courses Taught

## CSV File Location
`mockData/test_company_with_logo.csv`

