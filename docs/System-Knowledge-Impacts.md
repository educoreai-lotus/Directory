# System Knowledge - Impact Analysis

This document identifies the impacts of the System Logic & High-Level Architecture description on existing code and future implementation.

**Generated**: After receiving System Logic & High-Level Architecture description

---

## Summary of Changes Required

### ✅ Already Implemented (No Changes Needed)
1. Company Registration Flow - Complete
2. Domain Verification - Complete
3. CSV Upload - Complete
4. Basic Employee Data Storage - Complete
5. Company Profile Page Structure - Complete
6. Enrollment Section UI (three flow options) - Complete
7. Preferred Language Field - Exists in forms

### ⚠️ Partially Implemented (Needs Enhancement)
1. Employee Profile Page - Structure exists in roadmap (F010) but not yet built
2. Trainer Fields - Basic fields exist, but lifecycle and status management missing
3. Enrollment Section - UI exists but backend logic missing

### ❌ Not Yet Implemented (Critical New Features)
1. Gemini AI Integration (bio + projects)
2. Skills Engine Integration (skill normalization, verification, gap analysis)
3. Content Studio Integration (course creation, trainer status)
4. Course Builder Integration (language sync, completion feedback)
5. Assessment Integration (test attempts, skill verification)
6. Learner AI Integration (learning path generation, approval)
7. Learning Analytics Integration (dashboard redirect)
8. HR & Management Reporting Integration (super admin analytics)
9. Employee Profile Enrichment Flow
10. Skill Verification Flow
11. Learning Path Approval Flow
12. Course Completion Tracking
13. Trainer Status Lifecycle
14. Super Admin Dashboard
15. Admin Action Logging
16. RBAC Implementation
17. GDPR Consent Storage

---

## UI/UX Impacts

### Company Profile Page

#### New Sections/Features Needed:
1. **Learning Paths View**
   - Section to view learning paths of all employees
   - Display employee learning path status
   - Link to Learner AI for detailed view

2. **Employee Profile Approval Interface**
   - HR approval workflow for employee profile cards
   - Approve/reject employee profiles after enrichment
   - Display pending approvals

3. **Trainer Management Interface**
   - View trainer status (Invited/Active/Archived)
   - Approve/disapprove trainers
   - Manage trainer lifecycle

4. **Training Request Processing**
   - Backend integration for the three enrollment flows
   - Status indicators for training requests
   - Integration with Content Studio for course creation

5. **Decision Maker Designation**
   - UI to designate single Decision Maker per company
   - Display current Decision Maker
   - Update Decision Maker (if needed)

#### Existing Features to Enhance:
1. **Enrollment Section** (already exists)
   - Add backend API calls to process requests
   - Add status indicators
   - Add redirects to Course Builder

2. **Pending Requests Section** (already exists)
   - Add Decision Maker approval requests
   - Add employee profile approval requests
   - Add trainer approval requests

### Employee Profile Page (F010 - Not Yet Built)

#### Critical Sections Required:
1. **Basic Info Section**
   - Name, email, company name
   - ✅ Already planned in roadmap

2. **Bio Section** (AI-Generated)
   - Display Gemini AI-generated bio
   - ❌ New requirement - not in current roadmap details

3. **Value Proposition Section**
   - Current role → Target role
   - AI-generated using career plans + Skills Engine data
   - ✅ Already planned in roadmap

4. **Skills Section**
   - Display normalized skills from Skills Engine
   - Relevance Score display
   - Skill Gap button (redirects to Skills Engine frontend)
   - "More" button (redirects to Skills Engine frontend)
   - ❌ Skills Engine integration not yet implemented

5. **Courses Section**
   - Courses assigned
   - Courses in-progress
   - Completed courses (only passed courses with feedback)
   - Course name, feedback, test attempts
   - ❌ Course Builder integration not yet implemented

6. **Projects Section** (AI-Generated)
   - Display Gemini AI-generated project summaries
   - Project titles and descriptions
   - ❌ Gemini AI integration not yet implemented

7. **External Data Section**
   - LinkedIn icon + link
   - GitHub icon + link
   - ✅ Already planned in roadmap

8. **Dashboard Button**
   - Redirects to Learning Analytics microservice
   - ❌ Learning Analytics integration not yet implemented

9. **Learning Path Button**
   - Redirects to Learner AI microservice
   - ❌ Learner AI integration not yet implemented

10. **Verify Your Skills Button** (One-time)
    - Triggers skill verification flow
    - Disappears after first use
    - ❌ Skill verification flow not yet implemented

11. **Edit Profile**
    - Editable fields (language, contact info)
    - Sensitive fields require HR + Admin approval
    - Language update triggers Course Builder sync
    - ⚠️ Approval workflow not yet implemented

12. **Requests Section**
    - Request to learn new skills
    - Apply for trainer role
    - Self-learning requests
    - ✅ Already planned in roadmap

### Trainer Profile Extensions

#### New Features Required:
1. **Status Display**
   - Show status: Invited → Active → Archived
   - Status managed by Content Studio
   - ❌ Status lifecycle not yet implemented

2. **Courses Taught Section**
   - Display courses assigned to trainer
   - Link to Course Builder
   - ❌ Content Studio integration not yet implemented

3. **Request to Teach Interface**
   - Trainer can proactively request to teach a skill
   - Submit teaching request
   - ❌ Not yet implemented

4. **AI Enable Toggle**
   - ✅ Already exists in database
   - ⚠️ Needs UI in trainer profile

5. **Public Publish Enable Toggle**
   - ✅ Already exists in database
   - ⚠️ Needs UI in trainer profile

### Decision Maker Profile

#### New Features Required:
1. **Pending Requests Section**
   - Display pending Learning Path approval requests
   - Click request → redirect to Learner AI for detailed review
   - ❌ Not yet implemented

---

## Backend Logic Impacts

### New API Endpoints Required

#### Employee Profile Enrichment
- `POST /api/v1/employees/:id/enrich` - Trigger enrichment (Gemini AI + Skills Engine)
- `POST /api/v1/employees/:id/approve` - HR approval of employee profile
- `GET /api/v1/employees/:id/enrichment-status` - Check enrichment status

#### Skills Engine Integration
- `POST /api/v1/employees/:id/skills/normalize` - Send to Skills Engine for normalization
- `POST /api/v1/employees/:id/skills/verify` - Trigger skill verification
- `GET /api/v1/employees/:id/skills` - Get skills and relevance score
- `GET /api/v1/employees/:id/skill-gap` - Get skill gap analysis

#### Training Requests
- `POST /api/v1/companies/:id/training-requests/career-path` - Career path driven training
- `POST /api/v1/companies/:id/training-requests/skill-driven` - Skill-driven training
- `POST /api/v1/companies/:id/training-requests/trainer-led` - Trainer-led training

#### Content Studio Integration
- `POST /api/v1/trainers/:id/assign-course` - Assign course to trainer
- `GET /api/v1/trainers/:id/status` - Get trainer status
- `POST /api/v1/courses/create-ai` - Request AI course creation

#### Course Builder Integration
- `POST /api/v1/employees/:id/language-sync` - Sync language to Course Builder
- `POST /api/v1/course-completions` - Receive completion feedback from Course Builder
- `GET /api/v1/employees/:id/completed-courses` - Get completed courses

#### Learner AI Integration
- `POST /api/v1/companies/:id/approval-policy` - Send approval policy to Learner AI
- `GET /api/v1/employees/:id/learning-path` - Get learning path (redirect info)

#### Learning Analytics Integration
- `GET /api/v1/employees/:id/analytics-url` - Get redirect URL to Learning Analytics

#### Assessment Integration
- `POST /api/v1/employees/:id/assessments/request` - Request assessment for skill verification
- `GET /api/v1/employees/:id/assessments/results` - Get assessment results

### Database Schema Changes

#### New Fields Needed:
1. **employees table**:
   - `bio` (TEXT) - AI-generated bio
   - `enrichment_completed` (BOOLEAN) - ✅ Already exists
   - `enrichment_completed_at` (TIMESTAMP) - ✅ Already exists
   - `verified_skills` (JSONB) - Store verified skills from Skills Engine
   - `relevance_score` (NUMERIC) - Skill relevance score
   - `decision_maker` (BOOLEAN) - Is this employee the Decision Maker?

2. **employee_project_summaries table**:
   - ✅ Already exists in schema
   - Need to populate via Gemini AI integration

3. **trainer_settings table**:
   - `status` (VARCHAR) - Invited/Active/Archived - ❌ Missing
   - ✅ `ai_enabled` exists
   - ✅ `public_publish_enable` exists

4. **companies table**:
   - `decision_maker_id` (UUID) - Reference to employee who is Decision Maker - ❌ Missing
   - ✅ `learning_path_approval` exists

5. **New tables needed**:
   - `training_requests` - Store training requests
   - `course_completions` - Store course completion data from Course Builder
   - `admin_logs` - Log admin actions
   - `user_consents` - GDPR consent storage

### External Service Integration Points

#### Gemini AI
- Endpoint: TBD (need API details)
- Purpose: Generate bio and project summaries
- Data sent: Raw employee data (LinkedIn + GitHub)
- Data received: Bio text, project summaries

#### Skills Engine
- Endpoint: TBD (need API details)
- Purpose: Skill normalization, verification, gap analysis
- Data sent: Raw employee data, employee type, skill verification requests
- Data received: Normalized skills, verified skills, relevance scores

#### Content Studio
- Endpoint: TBD (need API details)
- Purpose: Course creation, trainer status management
- Data sent: Trainer info, course creation requests
- Data received: Trainer status updates, course assignments

#### Course Builder
- Endpoint: TBD (need API details)
- Purpose: Language sync, receive completion feedback
- Data sent: Employee preferred language (one-way)
- Data received: Course completion feedback

#### Assessment
- Endpoint: TBD (need API details)
- Purpose: Skill verification assessments
- Data sent: Assessment requests
- Data received: Assessment results

#### Learner AI
- Endpoint: TBD (need API details)
- Purpose: Learning path generation and approval
- Data sent: Approval policy, Decision Maker info (one-way)
- Data received: None (one-way integration)

#### Learning Analytics
- Endpoint: TBD (need API details)
- Purpose: Analytics dashboard (redirect only)
- Data sent: None (redirect only)
- Data received: None

#### HR & Management Reporting
- Endpoint: TBD (need API details)
- Purpose: Super admin analytics
- Data sent: None (read-only)
- Data received: Analytics data

---

## Unclear or Contradictory Points

### 1. Employee Profile Enrichment Timing ⚠️ STILL UNCLEAR
**Question**: When does enrichment happen?
- Description says "Before sending raw data to Skills Engine, Directory processes through Gemini AI"
- But also says "For each employee listed in registration form: Create base profile... Query external APIs... Send to Skills Engine"
- **Clarification needed**: Does enrichment happen:
  - During CSV upload?
  - After CSV upload, before HR approval?
  - After HR approval?
  - On first employee login?

### 2. LinkedIn/GitHub OAuth Flow ⚠️ STILL UNCLEAR
**Question**: How does OAuth work?
- Description mentions "Query external APIs for enrichment: LinkedIn + GITHUB"
- But requirements.md says "First-Time Employee Login (ONE TIME ONLY) - Enrich Your Profile Page"
- **Clarification needed**: Does employee connect LinkedIn/GitHub:
  - During company registration (HR does it)?
  - On first employee login (employee does it)?
  - Both?

### 3. Decision Maker Designation ✅ ANSWERED
**Answer**: 
- Set in CSV during company registration
- Field: `decision_maker_id` (employee_id)
- Required if `learning_path_approval` is "manual"
- Can be updated later (needs confirmation on UI location)

### 4. Trainer Status Lifecycle ✅ ANSWERED
**Answer**:
- Status managed by Content Studio
- Directory receives status updates from Content Studio
- Status values: Invited → Active → Archived
- "Invited → Active" happens after Content Studio assignment
- "Active → Archived" happens after Content Studio update or HR disapproval

### 5. Course Completion Display ✅ ANSWERED
**Answer**:
- Only passed courses are displayed as completed
- Failed courses don't appear even if skills were verified
- Course completion feedback comes from Course Builder
- Exam results (pass/fail) come from Assessment
- If employee fails course but gains verified skills, course is NOT shown, but skills are updated

### 6. Skill Verification Button ⚠️ STILL UNCLEAR
**Question**: When does button appear/disappear?
- Description says "Verify Your Skills button is hidden" after verification
- But also says "When the employee completes new courses, Skills Engine automatically checks for new verified skills"
- **Clarification needed**: 
  - Does button reappear if new skills can be verified?
  - Or is it truly one-time only (initial verification)?

### 7. Learning Path Approval Policy Update ✅ ANSWERED
**Answer**:
- Set in CSV: `learning_path_approval` ("manual" or "automatic")
- Sent to Learner AI during registration/update
- Can be updated after registration (needs confirmation on UI location)
- Updates trigger re-sync to Learner AI

### 8. Redirect URLs ✅ ANSWERED
**Answer**: 
- URLs stored in config (see API Interaction Rules)
- All microservices use `/api/fill-content-metrics` endpoint
- User context passed in `payload` field of envelope structure
- Redirects likely use query parameters or tokens (to be confirmed in third description)

---

## Critical Implementation Notes

1. **One-Time Processes**:
   - Employee Profile Enrichment (LinkedIn/GitHub) - ONE TIME ONLY
   - Skill Verification ("Verify Your Skills" button) - ONE TIME ONLY

2. **One-Way Integrations** (Directory → Other, no response):
   - Learner AI (approval policy + Decision Maker)
   - Course Builder (language sync)

3. **Status Management**:
   - Trainer status managed by Content Studio (not Directory)
   - Directory only displays status

4. **Approval Workflows**:
   - Employee profile cards require HR approval after enrichment
   - Learning paths require Decision Maker approval (if manual)
   - Sensitive field changes require HR + Admin approval

5. **Data Flow Priority**:
   - Only passed courses are displayed as completed
   - Failed courses don't appear even if skills were verified
   - Skills Engine can update verified skills independently of course completion

---

## Next Steps

1. **Wait for clarifications** on unclear points above
2. **Receive API Interaction Rules** description (second description)
3. **Receive Integration with other microservices** description (third description)
4. **After all three descriptions received**: Create implementation plan

---

## Files Created

1. `/docs/System-Knowledge.md` - Complete system knowledge documentation
2. `/docs/System-Knowledge-Impacts.md` - This impact analysis document

