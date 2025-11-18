# Microservice Integration Specification - Directory

This document provides the complete integration specification for Directory with all external EduCore microservices.

**Last Updated**: Based on Integration with other microservices description

---

## 📌 Critical Rules

1. **Directory never "creates logic" for external systems**
   - It only: sends data, receives processed data, stores & displays results

2. **Every API call must include fallback using existing mocks**
   - If microservice is unreachable → use mock files

3. **Every time you detect mismatch in DTOs / schema / DB fields**
   - → STOP. Ask before making schema changes.

4. **Do NOT infer or guess missing fields**
   - Always stop and ask

---

## 1. Integration With SKILLS ENGINE Microservice

### 1.1 Purpose of Skills Engine

Skills Engine is responsible for:
- Processing employee raw data (LinkedIn, GitHub)
- Converting it into normalized competencies
- Updating verified/unverified skills after each course completion
- Sending relevance_score and missing skills (gap) back to Directory

**Directory responsibility**: Only displays skills — does not generate or process them.

### 1.2 When Directory Sends Data to Skills Engine

**Trigger**: First profile initialization (after enrichment)

**Endpoint**: `POST https://skillsengine-production.up.railway.app/api/fill-content-metrics`

**Envelope**:
```json
{
  "requester_service": "directory",
  "payload": {
    "employee_id": "<ID>",
    "company_id": "<ID>",
    "employee_type": "<roleType>",
    "raw_data": {
      "github": { ... },
      "linkedin": { ... }
    }
  },
  "response": {
    "user_id": 0,
    "competencies": [],
    "relevance_score": 0
  }
}
```

**Notes**:
- `raw_data` is the fetched JSON from LinkedIn & GitHub APIs
- `employee_type` is the role type (e.g., "trainer", "regular_employee")
- This always occurs when employee first enriches profile

### 1.3 What Skills Engine Returns to Directory

**Response Envelope**:
```json
{
  "requester_service": "directory",
  "payload": { ... },
  "response": {
    "user_id": 1024,
    "competencies": [
      {
        "name": "Data Science",
        "nested_competencies": [
          {
            "name": "Data Analysis",
            "nested_competencies": [
              {
                "name": "Data Processing",
                "skills": [
                  { "name": "Python", "verified": false },
                  { "name": "SQL", "verified": false }
                ]
              }
            ]
          }
        ]
      }
    ],
    "relevance_score": 0
  }
}
```

**Directory Responsibilities**:
- Store the competencies hierarchy in database
- Display them in employee profile: Competence → Sub-competence → Skill
- Update DB with relevance_score

**Database Storage**:
- Need table to store competencies hierarchy
- Need to link competencies to employees
- Need to store relevance_score per employee

### 1.4 Updates After Course Completion

**Trigger**: Whenever employee completes a course & passes an exam

**Note**: Skills Engine **pushes** update to Directory (not Directory requesting)

**Response Envelope**:
```json
{
  "requester_service": "skills-engine",
  "payload": { ... },
  "response": {
    "user_id": 1024,
    "competencies": [ ... ],
    "relevance_score": 78.4,
    "gap": {
      "missing_skills": ["Power BI", "Tableau", "Model Evaluation"]
    }
  }
}
```

**Directory Responsibilities**:
- Update verified/unverified statuses
- Check if there are new skills, if yes add them
- Update skill levels if included (beginner, intermediate, advanced)
- Update relevance_score
- Display Skill Gap VIEW BUTTON
  - For now, clicking shows a message (Skills Engine UI link not available yet)

### 1.5 Fallback Support

Every call between Directory and Skills Engine must have fallback:
- If Skills Engine API is unreachable
- Directory should use mock data from `/mockData/index.json`

---

## 2. Integration With ASSESSMENT Microservice

### 2.1 Important: CSV Requirements

**CRITICAL**: The company CSV must include:
- `passing_grade` (e.g., 70)
- `max_attempts` (e.g., 3)

**These were missing in CSV specifications — MUST add them.**

### 2.2 What Directory Sends to ASSESSMENT

**Trigger**: When ASSESSMENT asks for data

**Endpoint**: `POST https://assessment-tests-production.up.railway.app/api/fill-content-metrics`

**Envelope**:
```json
{
  "requester_service": "directory",
  "payload": {
    "passing_grade": 70,
    "max_attempts": 3
  },
  "response": {
    "status": ""
  }
}
```

**Source**: These values come from company CSV (company-level settings)

### 2.3 What Directory Receives From ASSESSMENT

**Trigger**: After each exam submission

**Response Envelope**:
```json
{
  "requester_service": "assessment",
  "payload": { ... },
  "response": {
    "course_id": "hugl",
    "user_id": "u_123",
    "attempt_no": 1,
    "exam_type": "postcourse",
    "final_grade": 82,
    "passing_grade": 70,
    "passed": true,
    "submitted_at": "2025-11-07T16:48:22Z"
  }
}
```

**Directory Responsibilities**:
- Store passing result
- Store attempt number
- Link to employee profile
- Link to course

**Database Storage**:
- Need table to store exam results
- Fields: course_id, user_id (employee_id), attempt_no, exam_type, final_grade, passing_grade, passed, submitted_at

---

## 3. Integration With CONTENT STUDIO

### 3.1 Purpose

Used when a company enrolls employees into learning.

**Directory must choose an internal TRAINER based on skills.**

### 3.2 Payload Directory Sends

**Endpoint**: `POST https://content-studio-production-76b6.up.railway.app/api/fill-content-metrics`

**Envelope**:
```json
{
  "requester_service": "directory",
  "payload": {
    "trainer_id": "TR-123",
    "trainer_name": "Anna Cohen",
    "company_id": "C1",
    "aiEnabled": true,
    "can_publish_publicly": false,
    "exercises_limited": true,
    "num_of_exercises": 4
  },
  "response": {
    "course_id": "",
    "course_name": "",
    "trainer_id": "",
    "trainer_name": "",
    "status": ""
  }
}
```

**Important**: These fields MUST come from company CSV:
- `aiEnabled` (from `ai_enabled` in CSV)
- `can_publish_publicly` (from `public_publish_enable` in CSV)
- `exercises_limited` (NEW - needs to be added to CSV)
- `num_of_exercises` (NEW - needs to be added to CSV)

**If NO trainer is found**:
```json
{
  "trainer_id": -1,
  "trainer_name": null,
  "company_id": null
}
```
This tells Content Studio the course requires manual creation.

### 3.3 Response Directory Receives

**Response Envelope**:
```json
{
  "requester_service": "content-studio",
  "payload": { ... },
  "response": {
    "course_id": "COURSE-001",
    "course_name": "JavaScript Fundamentals",
    "trainer_id": "TR-555",
    "trainer_name": "Maya Levi",
    "status": "archived"
  }
}
```

**Directory Responsibilities**:
- Store course info
- Update trainer profile with course assignment
- Update learner profiles with enrolled courses
- Update trainer status based on `status` field

**Database Storage**:
- Need table to store courses
- Link courses to trainers
- Link courses to learners (employees)

---

## 4. Integration With COURSE BUILDER

### 4.1 Directory Sends: Language Sync

**Trigger**: Whenever employee updates preferred language

**Endpoint**: `POST https://coursebuilderfs-production.up.railway.app/api/fill-content-metrics`

**Envelope**:
```json
{
  "requester_service": "directory",
  "payload": {
    "employee_id": "E10",
    "preferred_language": "en"
  },
  "response": {
    "status": ""
  }
}
```

**Note**: One-way update (Directory → Course Builder, no response needed)

### 4.2 Directory Receives: Course Completion Feedback

**Trigger**: After course completion

**Response Envelope**:
```json
{
  "requester_service": "course-builder",
  "payload": { ... },
  "response": {
    "feedback": "...",
    "course_id": "C44",
    "course_name": "Data Analysis",
    "learner_id": "E10"
  }
}
```

**Directory Responsibilities**:
- Store course_name
- Store feedback
- Link it to learner's profile
- Maintain list of learned courses
- **Only display courses where employee passed the exam** (from Assessment integration)

**Database Storage**:
- Need table to store course completions
- Fields: course_id, course_name, learner_id (employee_id), feedback, completed_at

---

## 5. Integration With LEARNER AI

### 5.1 Purpose

Companies choose approval policy:
- `auto` - automatic approval
- `manual` - requires Decision Maker approval

**If manual → must specify one Decision Maker employee.**

**This data MUST be included in the company CSV.**

### 5.2 Payload Directory Sends

**Trigger**: During company registration OR update

**Endpoint**: `POST https://learner-ai-production.up.railway.app/api/fill-content-metrics`

**Envelope**:
```json
{
  "requester_service": "directory",
  "payload": {
    "company_id": "12345",
    "company_name": "TechCorp",
    "approval_policy": "manual",
    "decision_maker": {
      "employee_id": "E101",
      "employee_name": "Dana Levi",
      "employee_email": "dana@techcorp.com"
    }
  },
  "response": {
    "status": ""
  }
}
```

**Note**: One-way integration (Directory → Learner AI, no response)

**CSV Requirements**:
- `learning_path_approval` (already exists: "manual" or "automatic")
- `decision_maker_id` (NEW - needs to be added to CSV)
- `decision_maker_name` (NEW - optional, can derive from employee data)
- `decision_maker_email` (NEW - optional, can derive from employee data)

### 5.3 Directory UI Requirements

**Decision Maker Profile Tab**:
- "Learning Paths Approvals" tab
- Currently mock only → still required UI foundation
- When clicking a request → redirect to Learner AI for detailed review

---

## 6. Integration With LEARNING ANALYTICS

### 6.1 Purpose

Triggered **daily** for each company.

Directory must send comprehensive employee and company data.

### 6.2 Payload Directory Sends

**Trigger**: Daily (automated)

**Endpoint**: `POST https://learning-analytics-production.up.railway.app/api/fill-content-metrics`

**Envelope**:
```json
{
  "requester_service": "directory",
  "payload": {
    "company_id": "...",
    "company_name": "...",
    "company_info": { ... },
    "kpis": "...",
    "approver": { ... },
    "max_test_attempts": 3,
    "exercises_limit": true,
    "hierarchy": { ... },
    "employees": [
      {
        "employee_id": "...",
        "employee_name": "...",
        "current_role": "...",
        "target_role": "...",
        "department": "...",
        "team": "...",
        "manager": "...",
        "completed_courses": [
          {
            "course_id": "...",
            "course_name": "...",
            "feedback": "..."
          }
        ],
        "courses_taught": [ ... ] // if trainer
      }
    ]
  },
  "response": {
    "status": ""
  }
}
```

**Employee Data Required**:
- ids + names
- current_role, target_role
- department/team
- manager
- completed courses with feedback
- courses taught (if trainer)

**Company Data Required**:
- company info + KPIs
- approver (Decision Maker)
- max_test_attempts
- exercises_limit
- hierarchy (full structure)

**Note**: One-way push (Directory → Learning Analytics, no response)

### 6.3 Directory UI Requirements

**Both company and employee profile pages**:
- Must contain a tab linking to Learning Analytics UI
- Currently mock only (redirect to Learning Analytics microservice)

---

## 7. Integration With MANAGEMENT & REPORTING (Admin-Level)

### 7.1 Purpose

Also requested **daily**, for system-wide analytics.

### 7.2 Payload Directory Sends

**Trigger**: Daily (automated)

**Endpoint**: `POST https://lotusproject-production.up.railway.app/api/fill-content-metrics`

**Envelope**:
```json
{
  "requester_service": "directory",
  "payload": {
    "companies": [
      {
        "company_id": "...",
        "company_name": "...",
        "industry": "...",
        "size": "...",
        "date_registered": "...",
        "hr_contact": { ... },
        "approval_policy": "...",
        "max_test_attempts": 3,
        "kpis": "...",
        "website_url": "...",
        "verification_status": "...",
        "hierarchy": { ... }
      }
    ]
  },
  "response": {
    "status": ""
  }
}
```

**Data Required**:
- company info
- industry, size, date_registered
- primary HR contact
- approval policy
- max_test_attempts
- KPIs
- website_url (NEW - needs to be added to company registration)
- verification_status
- hierarchy

**Note**: One-way push (Directory → Management & Reporting, no response)

### 7.3 Directory UI Requirements

**Super Admin Dashboard**:
- "System Dashboard" tab
- Currently mock only
- Displays analytics from Management & Reporting

---

## Summary of Integration Points

### Microservices Directory Integrates With:

1. **Skills Engine**
   - Send: Employee raw data (first enrichment)
   - Receive: Normalized competencies, relevance_score, skill gap
   - Receive: Updates after course completion (pushed by Skills Engine)

2. **Assessment**
   - Send: passing_grade, max_attempts (when requested)
   - Receive: Exam results (course_id, user_id, attempt_no, passed, etc.)

3. **Content Studio**
   - Send: Trainer info, course creation request
   - Receive: Course info, trainer status updates

4. **Course Builder**
   - Send: Employee preferred language (one-way)
   - Receive: Course completion feedback

5. **Learner AI**
   - Send: Approval policy, Decision Maker info (one-way)
   - Receive: Nothing (one-way integration)

6. **Learning Analytics**
   - Send: Employee + Company data (daily, one-way)
   - Receive: Nothing (one-way integration)

7. **Management & Reporting**
   - Send: System-wide company data (daily, one-way)
   - Receive: Nothing (one-way integration)

---

## CSV Schema Updates Required

### New Fields Needed in Company CSV:

1. **Company-level**:
   - `passing_grade` (number, e.g., 70)
   - `max_attempts` (number, e.g., 3)
   - `exercises_limited` (boolean)
   - `num_of_exercises` (number, e.g., 4)
   - `decision_maker_id` (employee_id of Decision Maker, if manual approval)
   - `website_url` (optional, for Management & Reporting)

2. **Employee-level** (already exists):
   - `ai_enabled` → maps to `aiEnabled`
   - `public_publish_enable` → maps to `can_publish_publicly`

---

## Database Schema Updates Required

### New Tables Needed:

1. **employee_competencies** (or similar)
   - Store competencies hierarchy from Skills Engine
   - Link competencies to employees
   - Store verified/unverified status

2. **exam_results**
   - Store exam results from Assessment
   - Fields: course_id, employee_id, attempt_no, exam_type, final_grade, passing_grade, passed, submitted_at

3. **courses**
   - Store course info from Content Studio
   - Fields: course_id, course_name, trainer_id, status

4. **employee_courses** (enrollments)
   - Link employees to courses
   - Track enrollment status

5. **course_completions**
   - Store course completion feedback from Course Builder
   - Fields: course_id, course_name, learner_id (employee_id), feedback, completed_at

### New Fields Needed in Existing Tables:

1. **companies table**:
   - `passing_grade` (NUMERIC)
   - `max_attempts` (INTEGER)
   - `exercises_limited` (BOOLEAN)
   - `num_of_exercises` (INTEGER)
   - `decision_maker_id` (UUID, references employees.id)
   - `website_url` (VARCHAR)

2. **employees table**:
   - `relevance_score` (NUMERIC)
   - Already has: `preferred_language` ✅

3. **trainer_settings table**:
   - Already has: `ai_enabled` ✅
   - Already has: `public_publish_enable` ✅
   - `status` (VARCHAR) - Invited/Active/Archived (from Content Studio)

---

## Implementation Checklist

### Backend:
- [ ] Implement universal endpoint `/api/fill-content-metrics`
- [ ] Create AI query generation service
- [ ] Create schema matching service
- [ ] Create microservice client utility
- [ ] Implement Skills Engine integration
- [ ] Implement Assessment integration
- [ ] Implement Content Studio integration
- [ ] Implement Course Builder integration
- [ ] Implement Learner AI integration
- [ ] Implement Learning Analytics integration (daily job)
- [ ] Implement Management & Reporting integration (daily job)
- [ ] Create fallback mechanism with mock data
- [ ] Update database schema (new tables, new fields)
- [ ] Update CSV parser to handle new fields

### Frontend:
- [ ] Add Skill Gap VIEW button (mock for now)
- [ ] Add Decision Maker "Learning Paths Approvals" tab
- [ ] Add Learning Analytics tab to Company Profile
- [ ] Add Learning Analytics tab to Employee Profile
- [ ] Add Super Admin "System Dashboard" tab
- [ ] Update CSV upload form to include new fields

### Testing:
- [ ] Test all microservice integrations with envelope structure
- [ ] Test fallback mechanism
- [ ] Test AI query generation
- [ ] Test schema matching
- [ ] Test daily jobs (Learning Analytics, Management & Reporting)

---

## Critical Notes

1. **All integrations use universal endpoint**: `/api/fill-content-metrics`
2. **All requests use envelope structure**: `{ requester_service, payload, response }`
3. **All requests/responses are stringified JSON**
4. **Fallback to mock data is mandatory** for all external calls
5. **CSV schema must be updated** to include new required fields
6. **Database schema must be updated** to store new data
7. **Daily jobs required** for Learning Analytics and Management & Reporting
8. **One-way integrations**: Learner AI, Learning Analytics, Management & Reporting (no responses)

