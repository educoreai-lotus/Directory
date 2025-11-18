# Microservice Integration - Impact Analysis

This document identifies the impacts of the Microservice Integration Specification on existing code and implementation.

**Generated**: After receiving Integration with other microservices description

---

## 🚨 CRITICAL FINDINGS

### Major Schema Changes Required

1. **CSV Schema Must Be Updated** - Missing critical fields
2. **Database Schema Must Be Updated** - New tables and fields needed
3. **CSV Parser Must Be Updated** - Handle new fields
4. **Company Registration Form Must Be Updated** - Add new fields

---

## CSV Schema Updates Required

### ❌ Missing Fields (MUST ADD):

#### Company-Level Fields:
1. `passing_grade` (number, e.g., 70) - **REQUIRED**
2. `max_attempts` (number, e.g., 3) - **REQUIRED**
3. `exercises_limited` (boolean) - **REQUIRED**
4. `num_of_exercises` (number, e.g., 4) - **REQUIRED**
5. `decision_maker_id` (employee_id) - **REQUIRED if manual approval**
6. `website_url` (NOT needed - use existing `domain` field instead)

#### Employee-Level Fields:
- ✅ `ai_enabled` - Already exists
- ✅ `public_publish_enable` - Already exists

### Files to Update:
- `/docs/CSV_CONTRACT.md` - Add new fields to documentation
- `/backend/src/infrastructure/CSVParser.js` - Parse new fields
- `/backend/src/infrastructure/CSVValidator.js` - Validate new fields
- `/frontend/src/components/CSVUploadForm.js` - Update instructions
- All CSV sample files - Add new fields

---

## Database Schema Updates Required

### New Tables Needed:

1. **employee_competencies**
   ```sql
   CREATE TABLE employee_competencies (
     id UUID PRIMARY KEY,
     employee_id UUID REFERENCES employees(id),
     competence_name VARCHAR(255),
     parent_competence_id UUID REFERENCES employee_competencies(id),
     skill_name VARCHAR(255),
     verified BOOLEAN DEFAULT FALSE,
     skill_level VARCHAR(50), -- beginner, intermediate, advanced
     created_at TIMESTAMP,
     updated_at TIMESTAMP
   );
   ```

2. **exam_results**
   ```sql
   CREATE TABLE exam_results (
     id UUID PRIMARY KEY,
     course_id VARCHAR(255),
     employee_id UUID REFERENCES employees(id),
     attempt_no INTEGER,
     exam_type VARCHAR(50), -- postcourse, skill_verification
     final_grade NUMERIC,
     passing_grade NUMERIC,
     passed BOOLEAN,
     submitted_at TIMESTAMP,
     created_at TIMESTAMP
   );
   ```

3. **courses**
   ```sql
   CREATE TABLE courses (
     id UUID PRIMARY KEY,
     course_id VARCHAR(255) UNIQUE,
     course_name VARCHAR(255),
     trainer_id UUID REFERENCES employees(id),
     company_id UUID REFERENCES companies(id),
     status VARCHAR(50), -- active, archived
     created_at TIMESTAMP,
     updated_at TIMESTAMP
   );
   ```

4. **employee_courses** (enrollments)
   ```sql
   CREATE TABLE employee_courses (
     id UUID PRIMARY KEY,
     employee_id UUID REFERENCES employees(id),
     course_id UUID REFERENCES courses(id),
     enrollment_status VARCHAR(50), -- enrolled, in_progress, completed
     enrolled_at TIMESTAMP,
     completed_at TIMESTAMP,
     UNIQUE(employee_id, course_id)
   );
   ```

5. **course_completions**
   ```sql
   CREATE TABLE course_completions (
     id UUID PRIMARY KEY,
     course_id VARCHAR(255),
     course_name VARCHAR(255),
     learner_id UUID REFERENCES employees(id),
     feedback TEXT,
     completed_at TIMESTAMP,
     created_at TIMESTAMP
   );
   ```

### New Fields in Existing Tables:

1. **companies table**:
   ```sql
   ALTER TABLE companies ADD COLUMN passing_grade NUMERIC;
   ALTER TABLE companies ADD COLUMN max_attempts INTEGER;
   ALTER TABLE companies ADD COLUMN exercises_limited BOOLEAN DEFAULT FALSE;
   ALTER TABLE companies ADD COLUMN num_of_exercises INTEGER;
   ALTER TABLE companies ADD COLUMN decision_maker_id UUID REFERENCES employees(id);
   ALTER TABLE companies ADD COLUMN website_url VARCHAR(500);
   ```

2. **employees table**:
   ```sql
   ALTER TABLE employees ADD COLUMN relevance_score NUMERIC DEFAULT 0;
   -- preferred_language already exists ✅
   ```

3. **trainer_settings table**:
   ```sql
   ALTER TABLE trainer_settings ADD COLUMN status VARCHAR(50) DEFAULT 'invited';
   -- ai_enabled already exists ✅
   -- public_publish_enable already exists ✅
   ```

---

## Backend Implementation Impacts

### 1. Universal Endpoint Implementation

**File**: `/backend/src/presentation/UniversalEndpointController.js` (NEW)

**Must Handle**:
- Requests from Skills Engine (for employee data)
- Requests from Assessment (for passing_grade, max_attempts)
- Requests from Content Studio (for trainer/company data)
- Requests from Course Builder (for employee data)
- Requests from Learner AI (for approval policy)
- Requests from Learning Analytics (for employee/company data)
- Requests from Management & Reporting (for system-wide data)

### 2. Skills Engine Integration

**Files to Create/Update**:
- `/backend/src/infrastructure/SkillsEngineClient.js` (NEW)
- `/backend/src/application/EnrichEmployeeProfileUseCase.js` (NEW)
- `/backend/src/application/UpdateEmployeeSkillsUseCase.js` (NEW)

**Flow**:
1. Employee enriches profile (LinkedIn + GitHub)
2. Directory sends raw data to Skills Engine
3. Skills Engine returns normalized competencies
4. Directory stores competencies hierarchy
5. Skills Engine pushes updates after course completion
6. Directory updates skills and relevance_score

### 3. Assessment Integration

**Files to Create/Update**:
- `/backend/src/infrastructure/AssessmentClient.js` (NEW)
- `/backend/src/application/StoreExamResultUseCase.js` (NEW)

**Flow**:
1. Assessment requests passing_grade and max_attempts
2. Directory responds with company settings
3. Assessment sends exam results after submission
4. Directory stores exam results

### 4. Content Studio Integration

**Files to Create/Update**:
- `/backend/src/infrastructure/ContentStudioClient.js` (NEW)
- `/backend/src/application/CreateTrainingRequestUseCase.js` (UPDATE)

**Flow**:
1. HR submits training request
2. Directory finds suitable trainer (based on skills)
3. Directory sends trainer info to Content Studio
4. Content Studio creates course and returns course info
5. Directory updates trainer and learner profiles

### 5. Course Builder Integration

**Files to Create/Update**:
- `/backend/src/infrastructure/CourseBuilderClient.js` (NEW)
- `/backend/src/application/SyncLanguageUseCase.js` (NEW)
- `/backend/src/application/StoreCourseCompletionUseCase.js` (NEW)

**Flow**:
1. Employee updates preferred language
2. Directory syncs to Course Builder (one-way)
3. Course Builder sends completion feedback
4. Directory stores completion data

### 6. Learner AI Integration

**Files to Create/Update**:
- `/backend/src/infrastructure/LearnerAIClient.js` (NEW)
- `/backend/src/application/SyncApprovalPolicyUseCase.js` (NEW)

**Flow**:
1. Company registers/updates approval policy
2. Directory sends policy + Decision Maker to Learner AI (one-way)
3. Directory logs the sync for auditing

### 7. Learning Analytics Integration

**Files to Create/Update**:
- `/backend/src/infrastructure/LearningAnalyticsClient.js` (NEW)
- `/backend/src/jobs/DailyAnalyticsSyncJob.js` (NEW)

**Flow**:
1. Daily job runs for each company
2. Directory collects employee + company data
3. Directory sends to Learning Analytics (one-way)
4. No response needed

### 8. Management & Reporting Integration

**Files to Create/Update**:
- `/backend/src/infrastructure/ManagementReportingClient.js` (NEW)
- `/backend/src/jobs/DailyAdminAnalyticsJob.js` (NEW)

**Flow**:
1. Daily job runs for system-wide data
2. Directory collects all company data
3. Directory sends to Management & Reporting (one-way)
4. No response needed

---

## Frontend Implementation Impacts

### 1. CSV Upload Form

**File**: `/frontend/src/components/CSVUploadForm.js` (UPDATE)

**Add Instructions For**:
- `passing_grade` (company-level)
- `max_attempts` (company-level)
- `exercises_limited` (company-level)
- `num_of_exercises` (company-level)
- `decision_maker_id` (company-level, if manual approval)

### 2. Company Registration Form

**File**: `/frontend/src/pages/CompanyRegistrationForm.js` (UPDATE)

**Add Fields**:
- `website_url` (optional)

### 3. Employee Profile Page (F010 - Not Yet Built)

**New Sections Required**:
- **Skills Section**:
  - Display competencies hierarchy (Competence → Sub-competence → Skill)
  - Display verified/unverified status
  - Display relevance_score
  - "Skill Gap" VIEW button (mock for now - shows message)
  - "More" button (redirects to Skills Engine frontend)

- **Courses Section**:
  - Display enrolled courses
  - Display in-progress courses
  - Display completed courses (only passed)
  - Show course feedback
  - Show exam attempts

- **Exam Results Section** (optional, or part of Courses):
  - Display exam results
  - Show attempt numbers
  - Show pass/fail status

### 4. Company Profile Page

**New Sections Required**:
- **Learning Analytics Tab**:
  - Link to Learning Analytics microservice
  - Currently mock (redirect)

### 5. Decision Maker Profile

**New Tab Required**:
- **"Learning Paths Approvals" Tab**:
  - Display pending approval requests
  - Click request → redirect to Learner AI
  - Currently mock (UI foundation)

### 6. Super Admin Dashboard

**New Tab Required**:
- **"System Dashboard" Tab**:
  - Display analytics from Management & Reporting
  - Currently mock

---

## Unclear Points - Updated Status

### ✅ Now Answered:

1. **Decision Maker Designation** - ✅ ANSWERED
   - Set in CSV during company registration
   - Field: `decision_maker_id` (employee_id)
   - **Cannot be changed after registration** (nice to have for future)

2. **Course Completion Display** - ✅ ANSWERED
   - Only passed courses are displayed
   - Failed courses don't appear even if skills were verified
   - Course completion feedback comes from Course Builder
   - Exam results come from Assessment

3. **Trainer Status Lifecycle** - ✅ ANSWERED
   - Status managed by Content Studio
   - Directory receives status updates from Content Studio
   - Status values: Invited → Active → Archived

4. **Learning Path Approval Policy** - ✅ ANSWERED
   - Set in CSV: `learning_path_approval` ("manual" or "automatic")
   - If manual, must specify `decision_maker_id`
   - Sent to Learner AI during registration only (not on update)

5. **Redirect URLs** - ✅ ANSWERED (from previous description)
   - URLs stored in config
   - All use `/api/fill-content-metrics` endpoint (except Learner AI uses `/api/fill-learner-ai-fields`)

6. **Employee Profile Enrichment Timing** - ✅ ANSWERED
   - Enrichment happens on **first employee login**, not during CSV upload
   - Flow: CSV upload → Basic profiles created → Employee logs in → Sees basic profile → Connects LinkedIn/GitHub (mandatory) → Profile enriched
   - Employee cannot use system until profile is enriched

7. **LinkedIn/GitHub OAuth Flow** - ✅ ANSWERED
   - **Employee initiates OAuth on first login only**
   - Employee sees basic profile with message to connect LinkedIn and GitHub
   - Employee clicks "Connect LinkedIn" and "Connect GitHub" buttons
   - OAuth flow completes, Directory fetches raw data
   - This is a one-time only process (cannot reconnect later)

8. **Skill Verification Button** - ✅ ANSWERED
   - Button is **one-time only** for initial skill verification
   - **NOT** for skill verification after course completion (that's automatic)
   - Button is **permanently hidden** after first use
   - Future skill updates happen automatically (Skills Engine calls Directory)

9. **Daily Jobs Timing** - ✅ ANSWERED
   - For now, just implement endpoints
   - Use mock data (other microservices not done yet)
   - Timing doesn't matter - they will call Directory when ready
   - No need for cron jobs or scheduled tasks yet

10. **Skills Engine Push Updates** - ✅ ANSWERED
    - Skills Engine calls Directory's `/api/fill-content-metrics` with updated skills
    - Directory receives envelope with updated competencies and relevance_score
    - No polling or webhooks needed

11. **CSV Field Updates** - ✅ ANSWERED
    - Company **CAN** update `passing_grade`, `max_attempts`, etc. in Company Profile edit
    - Updates do **NOT** trigger re-sync to Assessment
    - Assessment will ask for these fields when needed (via universal endpoint)
    - Assessment initiates the request, Directory responds with current values

12. **Decision Maker Updates** - ✅ ANSWERED
    - Decision Maker **CANNOT** be changed after registration (for now)
    - This is a "nice to have" feature for future
    - Saved in `/docs/NICE_TO_HAVE.md`

---

## Implementation Priority

### Phase 1: Schema Updates (CRITICAL - BLOCKING)
1. Update database migration with new tables and fields
2. Update CSV parser to handle new fields
3. Update CSV validator to validate new fields
4. Update CSV documentation
5. Update CSV sample files

### Phase 2: Core Infrastructure
1. Implement universal endpoint `/api/fill-content-metrics`
2. Create AI query generation service
3. Create schema matching service
4. Create microservice client utility
5. Implement fallback mechanism

### Phase 3: Microservice Integrations
1. Skills Engine integration
2. Assessment integration
3. Content Studio integration
4. Course Builder integration
5. Learner AI integration
6. Learning Analytics integration (daily job)
7. Management & Reporting integration (daily job)

### Phase 4: UI Updates
1. Update CSV upload form
2. Update Company Registration form
3. Build Employee Profile page with all sections
4. Add Learning Analytics tabs
5. Add Decision Maker approvals tab
6. Add Super Admin dashboard tab

---

## Critical Notes

1. **CSV Schema Changes Are Blocking** - Cannot proceed without updating CSV format
2. **Database Schema Changes Are Blocking** - Cannot store new data without schema updates
3. **All Integrations Use Universal Endpoint** - No exceptions
4. **Fallback Is Mandatory** - Every external call must have fallback
5. **Daily Jobs Required** - Learning Analytics and Management & Reporting need daily sync
6. **One-Way Integrations** - Learner AI, Learning Analytics, Management & Reporting don't respond

---

## Files Created

1. `/docs/Microservice-Integration-Spec.md` - Complete integration specification
2. `/docs/Microservice-Integration-Impacts.md` - This impact analysis document

