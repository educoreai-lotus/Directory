# System Knowledge - Directory Microservice Integration

This document summarizes the system logic, high-level architecture, and integration rules for the Directory microservice within the EduCore ecosystem.

**Last Updated**: Based on System Logic & High-Level Architecture description

---

## 1. Company Registration Flow

### Current Implementation Status
✅ **Already Implemented**:
- Company registration form
- Domain verification (DNS + mail server)
- CSV upload with company structure
- Employee data storage

### Integration Points
- **Auth Service**: Company registration (implicit - HR login)
- **Directory DB**: Stores company structure, departments, teams, employees

### Key Rules
- **HR = Company representative who registered and can access Company Profile**
- **When HR employee logs in with their email, they see the Company Profile (not a typical employee profile)**
- HR employees are responsible for managing the Company Profile
- Domain verification required before CSV upload
- CSV includes: company details, departments, teams, employees with career paths
- Learning Path Approval policy: Manual or Auto-Approval (stored in Directory)
- Single Decision Maker per company (optional if auto-approval)

---

## 2. Employee Profile Creation & Enrichment

### Current Implementation Status
❌ **NOT YET IMPLEMENTED** - Critical new feature

### Enrichment Flow (Clarified):

1. **Company uploads CSV** → Directory creates company profile
2. **Directory creates basic employee profiles** from CSV data
3. **Employee logs in for first time** → Sees basic profile with:
   - Name, email, team, department, role in company, etc.
   - **Message asking to connect LinkedIn and GitHub** (mandatory)
4. **Employee connects LinkedIn + GitHub** (OAuth on first login)
5. **Directory fetches raw data** from LinkedIn and GitHub APIs
6. **Directory enriches profile** using Gemini AI + Skills Engine
7. **Directory updates profile status to "enriched"** (but not yet approved)
8. **Directory sends profile approval request to Company Profile**
9. **HR sees approval requests** in Company Profile (pending enriched profiles)
10. **HR reviews and approves/rejects** the enriched profile
11. **If approved**: Employee profile status changes to "approved" → Employee can now use the system (learning, requests, etc.)
12. **If rejected**: Employee profile remains "enriched" but not approved → Employee cannot use the system until approved

### Key Points:
- Enrichment is **mandatory** - employee cannot use system until profile is enriched
- **HR approval is required** - enriched profile must be approved by company before employee can use system
- Employee must connect LinkedIn and GitHub themselves (OAuth)
- This is a **one-time only** process (cannot reconnect later)
- Approval ensures enriched profile (with external data) is suitable/appropriate for the company

### External Integrations Required

#### 2.1 Gemini AI Integration
**Purpose**: Generate employee bio and project summaries

**Process**:
1. Directory collects raw employee data (from LinkedIn + GitHub OAuth)
2. Directory sends raw data to Gemini AI module
3. Gemini AI returns:
   - Short professional bio for each employee
   - Project names and AI-generated summaries
4. Directory stores in employee profile

**Data Flow**:
```
Employee → OAuth (LinkedIn + GitHub) → Directory → Gemini AI → Directory (bio + projects)
```

**UI Impact**: 
- Employee Profile needs "Projects" section
- Employee Profile needs "Bio" section (AI-generated)
- "Enrich Your Profile" page on first login
- OAuth connection buttons for LinkedIn and GitHub
- Profile status indicator: "Basic" → "Enriched" → "Approved"
- Employee sees "Waiting for HR approval" message after enrichment

#### 2.2 External APIs (LinkedIn + GitHub)
**Purpose**: Enrich employee profiles with external data

**Process**:
1. **Employee logs in for first time** → Sees basic profile
2. **Employee clicks "Connect LinkedIn"** → OAuth flow
3. **Employee clicks "Connect GitHub"** → OAuth flow
4. Directory receives OAuth tokens
5. Directory queries LinkedIn API with token
6. Directory queries GitHub API with token
7. Raw data collected and sent to Skills Engine

**Note**: 
- This is a ONE-TIME enrichment (as per requirements.md)
- Employee initiates OAuth (not HR)
- Mandatory step - employee cannot use system until completed

#### 2.3 Skills Engine Integration
**Purpose**: Normalize skills and identify skill gaps

**Process**:
1. Directory sends raw data + employee type (trainer/regular) to Skills Engine
2. Skills Engine normalizes raw data into:
   - Structured competencies
   - Unverified skills
3. Skills Engine returns normalized data to Directory
4. Directory generates Employee Card with:
   - Normalized skills/competencies
   - Short bio (from Gemini AI)
   - Value proposition (AI-generated using career plans + Skills Engine data)
   - Relevance scoring (Required skills - Current verified skills)
5. Employee Card sent to HR for approval
6. Profile stored in Directory DB

**Data Flow**:
```
Directory → Skills Engine → Directory (normalized skills)
Directory → Gemini AI → Directory (bio)
Directory → HR (approval) → Directory (stored)
```

**UI Impact**:
- Employee Profile needs "Skills" section
- Employee Profile needs "Skill Gap" button (redirects to Skills Engine frontend)
- Employee Profile needs "Relevance Score" display
- HR needs approval interface for employee profiles

---

## 3. HR Training Requests

### Current Implementation Status
⚠️ **PARTIALLY IMPLEMENTED** - UI exists but backend logic missing

**Existing**: Enrollment Section UI with three flow options (Career-Path-Driven, Skill-Driven, Trainer-Led)

**Missing**: Backend logic, Content Studio integration, Skills Engine integration

### Three Training Request Types

#### 3.1 Fully Personalized (Career Path Driven)
**Process**:
1. HR submits requests aligned with employees' career plans
2. Directory checks missing skills (skill gap) via Skills Engine
3. Directory searches for trainer in company with required skills
4. Directory sends trainer info to Content Studio (status → active)
5. Content Studio updates trainer status to archived when course content upload completed
6. **If no suitable trainer found**:
   - Directory tells Content Studio to create course on-the-fly by AI
   - When HR assigns trainer to course, it appears in trainer profile
   - Trainer clicks course card → redirects to Course Builder to upload content
   - Course card also appears in assigned employees' profiles
   - Employees click → redirect to Course Builder to learn

**Integration Points**:
- Skills Engine (check skill gaps)
- Content Studio (create courses, manage trainer status)
- Course Builder (upload/learn content)

#### 3.2 Group/Department Training (Skill-Driven Training)
**Process**:
1. HR requests specific skills for employees/groups
2. Directory checks if employee lacks these skills:
   - If yes: Directory finds suitable trainer with this skill in company
   - If skill already acquired: HR decides whether enrollment is required

**Integration Points**:
- Skills Engine (check skill acquisition status)

#### 3.3 Specific Trainer (Trainer-Led Training)
**Process**:
1. HR requests a particular trainer from company to teach employees
2. Directory checks if employees lack skills taught by trainer:
   - If yes: They are enrolled
   - If already acquired: HR decides whether enrollment is required

**Integration Points**:
- Skills Engine (check skill gaps)

### UI/UX Impact
- ✅ Enrollment Section UI already exists
- ❌ Need backend endpoints to process training requests
- ❌ Need integration with Content Studio API
- ❌ Need integration with Skills Engine API
- ❌ Need redirect logic to Course Builder

---

## 4. Learning Path Approval Flow

### Current Implementation Status
❌ **NOT YET IMPLEMENTED** - Critical new feature

### Integration: Learner AI

**Process**:
1. When company registers/updates Learning Path approval policy:
   - Directory sends company's approval policy to Learner AI
   - Directory sends single designated Decision Maker info to Learner AI
   - **One-way integration** (Directory → Learner AI, no response)
   - Directory logs this for auditing

2. When employee assigned to new course/training:
   - Skills Engine sends employee skill data to Learner AI
   - Learner AI generates AI-generated personalized Learning Path

3. Directory checks company's approval policy:
   - **If Auto-Approval**: Learning Path immediately approved, employee can begin
   - **If Manual Approval**: Learner AI sends Learning Path request to Decision Maker

4. Decision Maker reviews in Learner AI:
   - Approves/rejects request directly in Learner AI
   - Can view pending requests in Directory profile
   - When selecting request → redirected to Learner AI for detailed review

5. Learner AI manages:
   - Approval/rejection recording
   - Revisions and resubmissions (if rejected)

6. Employee/Company views:
   - Employee can see approved learning path in profile (via "Learning Path" button)
   - Company can see learning paths of its employees

**Data Flow**:
```
Directory → Learner AI (approval policy + Decision Maker)
Skills Engine → Learner AI (employee skill data)
Learner AI → Decision Maker (approval request)
Decision Maker → Learner AI (approve/reject)
```

**UI Impact**:
- Employee Profile needs "Learning Path" button (redirects to Learner AI)
- Company Profile needs section to view employee learning paths
- Decision Maker profile needs "Pending Requests" section (redirects to Learner AI)
- Need to store Decision Maker designation in company/employee data

---

## 5. Employee User Flow

### Current Implementation Status
⚠️ **PARTIALLY IMPLEMENTED** - Basic profile exists, many features missing

### 5.1 Profile Access & Editing
**Process**:
- Employee can access own profile
- Employee can edit allowed fields
- Sensitive fields require HR + Admin approval

**UI Impact**:
- Employee Profile needs edit functionality
- Need approval workflow for sensitive field changes

### 5.2 Missing Skills & Self-Learning Requests
**Process**:
- Employee views missing skills
- Employee can request self-learning:
  - **Active learners**: Direct enrollment allowed
  - **Not yet directed**: HR approval required

**UI Impact**:
- Employee Profile needs "Request Learning" button/interface
- Need HR approval interface for learning requests

### 5.3 Course Completion Updates
**Process**:
- Course completions automatically updated in profile
- Data sources:
  - Course name and learner feedback from Course Builder
  - Test attempts number from Assessment microservice

**Integration Points**:
- Course Builder (course completion + feedback)
- Assessment (test attempts)

**UI Impact**:
- Employee Profile needs "Completed Courses" section
- Display: Course name, feedback, test attempts

### 5.4 Preferred Language Management
**Process**:
- Each employee profile contains preferred_language field (default: Hebrew)
- When employee updates preferred language:
  - Directory immediately sends updated value to Course Builder
  - **One-way update** (Directory → Course Builder, no response)

**Integration Points**:
- Course Builder (language preference sync)

**UI Impact**:
- ✅ Preferred language field already exists in forms
- ❌ Need to implement sync to Course Builder on update

### 5.5 Skills & Skills Gap View
**Process**:
- Employee views full detailed skills and skills gap via Skills Engine
- Employee Profile includes "More" button that redirects to Skills Engine frontend

**UI Impact**:
- Employee Profile needs "More" button (redirects to Skills Engine)
- Employee Profile needs "Skills Gap" display/button

### 5.6 Analytics Dashboard
**Process**:
- Employee Profile includes "Dashboard" button
- When clicked: Directory redirects to Learning Analytics microservice
- Learning Analytics determines appropriate dashboard view based on employee role/access level

**Integration Points**:
- Learning Analytics (redirect only)

**UI Impact**:
- Employee Profile needs "Dashboard" button (redirects to Learning Analytics)

### 5.7 Learning Path View
**Process**:
- Employee views learning path via Learner AI
- Employee Profile includes "Learning Path" button

**UI Impact**:
- Employee Profile needs "Learning Path" button (redirects to Learner AI)

---

## 6. Skill Verification Flow

### Current Implementation Status
❌ **NOT YET IMPLEMENTED** - Critical new feature

### Process
1. Employee clicks "Verify Your Skills" in profile (one-time only)
2. Directory triggers Skills Engine verification process
3. Skills Engine sends assessment request to Assessment microservice
4. Employee completes assessments
5. Assessment returns result to Skills Engine
6. Skills Engine sends back to Directory:
   - List of verified skills
   - Updated relevance score
7. **"Verify Your Skills" button is permanently hidden** (one-time only)
8. Directory updates employee profile with verified skills and relevance scores
9. When employee completes new courses:
   - Skills Engine automatically checks for new verified skills
   - Skills Engine **calls Directory's `/api/fill-content-metrics`** with updated skills
   - Directory updates employee profile with newly verified skills
   - **No button needed** - updates happen automatically

### Key Points:
- Button is **only for initial skill verification**
- **NOT** for skill verification after course completion (that's automatic)
- Button never reappears after first use

**Data Flow**:
```
Directory → Skills Engine (trigger verification)
Skills Engine → Assessment (assessment request)
Assessment → Skills Engine (results)
Skills Engine → Directory (verified skills + relevance score)
```

**Important Notes**:
- "Verify Your Skills" is a **one-time test** with only passing grade, no max attempts
- "Post-Course Exams" are different: associated with specific courses, have max attempts, employees can request additional attempts via HR approval

**UI Impact**:
- Employee Profile needs "Verify Your Skills" button (one-time, disappears after use)
- Employee Profile needs display of verified skills
- Employee Profile needs updated relevance score display

---

## 7. Course Builder Feedback & Language Sync

### Current Implementation Status
❌ **NOT YET IMPLEMENTED**

### 7.1 Language Sync to Course Builder
**Process**:
- Directory sends each employee's preferred language to Course Builder:
  - When company is created with its employees
  - When employee updates preferred language manually
- **One-way update** (Directory → Course Builder, no response)

**Integration Points**:
- Course Builder (language preference)

**Backend Impact**:
- Need API endpoint to sync language to Course Builder
- Need to call on company creation (CSV upload)
- Need to call on employee language update

### 7.2 Course Completion Feedback
**Process**:
1. After course completion, Course Builder sends feedback data to Directory via `/api/fill-content-metrics`:
   - feedback
   - course_id
   - course_name
   - learner_id
2. Directory checks if employee passed the exam (from Assessment integration)
3. **Only courses with passed post-course exam** are displayed as completed
4. Directory updates employee profile to display completed courses and feedback
5. **Failed courses**: 
   - If Assessment identifies new verified skills, Skills Engine updates Directory with new skills
   - But failed course is **NOT shown** under completed courses
   - Skills are updated automatically (no button needed)

**Integration Points**:
- Course Builder (sends completion feedback)
- Assessment (determines pass/fail)
- Skills Engine (updates verified skills even for failed courses)

**UI Impact**:
- Employee Profile needs "Completed Courses" section
- Display: Course name, feedback, completion status
- Only show passed courses

---

## 8. Trainer User Flow

### Current Implementation Status
⚠️ **PARTIALLY IMPLEMENTED** - Basic trainer fields exist, lifecycle missing

**Existing**: 
- Trainer-specific fields in CSV (ai_enabled, public_publish_enable)
- Trainer settings in database

**Missing**: 
- Status lifecycle (Invited → Active → Archived)
- Content Studio integration
- Teaching request functionality

### 8.1 Extra Fields
- **Status**: Invited → Active → Archived
- **AI Enable**: Whether AI adjusts content (editable by trainer)
- **Public Publish Enable**: Whether content is shareable cross-company

### 8.2 Lifecycle
- **Invited → Active**: After Content Studio assignment
- **Active → Archived**: After Content Studio update or HR disapproval

### 8.3 Profile Updates
- Courses taught (displayed in trainer profile)

### 8.4 Teaching Requests
- Trainers can proactively request to teach a skill
- Submit teaching request in Directory

**Integration Points**:
- Content Studio (manages trainer status)
- HR (approves/disapproves trainers)

**UI Impact**:
- Trainer Profile needs status display (Invited/Active/Archived)
- Trainer Profile needs "Courses Taught" section
- Trainer Profile needs "Request to Teach" button/interface
- Need HR interface to approve/disapprove trainers

---

## 9. Directory Super Admin

### Current Implementation Status
❌ **NOT YET IMPLEMENTED**

### Process
1. Directory Admin logs in with super-admin credentials
2. Dashboard retrieves analytics data from HR & Management Reporting microservice
3. Admin can:
   - View all companies and employee profiles
   - Monitor system-level logs and performance indicators
4. All views are read-only for company data
5. Configuration changes limited to Directory system settings

**Integration Points**:
- HR & Management Reporting (analytics data)

**UI Impact**:
- Need Super Admin dashboard
- Need analytics display from HR & Management Reporting
- Need system-level logs view
- All company/employee views must be read-only

---

## 10. Security & Governance

### Current Implementation Status
❌ **NOT YET IMPLEMENTED**

### Requirements
- Every admin action logged in Admin Log
- RBAC (Role-Based Access Control) enforced for all users
- PII minimization → store only necessary data
- Explicit user consent stored (GDPR compliance)
- HR & Admin approvals required for:
  - Employee sensitive field changes

**Backend Impact**:
- Need admin action logging system
- Need RBAC implementation
- Need GDPR consent storage
- Need approval workflow for sensitive fields

---

## Integration Summary

### Microservices Directory Interacts With:
1. **Auth Service** - Company registration, HR login
2. **Gemini AI** - Bio and project summary generation
3. **Skills Engine** - Skill normalization, skill gap analysis, skill verification
4. **Content Studio** - Course creation, trainer status management
5. **Course Builder** - Language sync, course completion feedback
6. **Assessment** - Test attempts, skill verification assessments
7. **Learner AI** - Learning path generation and approval
8. **Learning Analytics** - Analytics dashboard (redirect)
9. **HR & Management Reporting** - Super admin analytics

### Data Flow Patterns:
- **One-way (Directory → Other)**: Learner AI (approval policy), Course Builder (language)
- **Two-way (Directory ↔ Other)**: Skills Engine, Content Studio, Course Builder (feedback), Assessment

---

## Critical Implementation Notes

1. **Employee Profile Enrichment** is a ONE-TIME process (as per requirements.md)
2. **Skill Verification** is a ONE-TIME process (button disappears after use)
3. **Learning Path Approval** supports only ONE Decision Maker per company
4. **Course Completion** only shows passed courses (failed courses don't appear even if skills were verified)
5. **Trainer Status** is managed by Content Studio, not Directory
6. **All redirects** to other microservices should maintain user context (employee_id, company_id, etc.)

