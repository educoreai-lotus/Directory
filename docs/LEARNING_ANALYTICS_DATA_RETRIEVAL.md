# How Learning Analytics Retrieves Data from Directory

## Overview

Learning Analytics requests data from Directory through Coordinator. Directory's AI Query Generator automatically generates SQL queries based on what Learning Analytics requests in the `response` template.

## How It Works

### Step 1: Learning Analytics Sends Request

Learning Analytics sends a request through Coordinator with a `response` template that specifies **exactly what fields it wants**:

**Example Request (On-Demand):**
```json
{
  "requester_service": "LearningAnalytics",
  "payload": {
    "company_id": "550e8400-e29b-41d4-a716-446655440000"
  },
  "response": {
    "company_id": "",
    "company_name": "",
    "industry": "",
    "company_size": 0,
    "primary_hr_contact": "",
    "approver": "",
    "KPIs": "",
    "max_test_attempts": 0,
    "exercises_limit": false
  }
}
```

**Example Request (Batch - All Companies):**
```json
{
  "requester_service": "LearningAnalytics",
  "payload": {
    "type": "batch",
    "cursor": null
  },
  "response": {
    "version": "",
    "fetched_at": "",
    "pagination": {
      "total_records": 0,
      "returned_records": 0,
      "next_cursor": "",
      "has_more": false
    },
    "companies": [
      {
        "company_id": "",
        "company_name": "",
        "industry": "",
        "company_size": 0,
        "primary_hr_contact": "",
        "approver": "",
        "KPIs": "",
        "max_test_attempts": 0,
        "exercises_limit": false
      }
    ]
  }
}
```

**Example Request (Employee Data):**
```json
{
  "requester_service": "LearningAnalytics",
  "payload": {
    "company_id": "550e8400-e29b-41d4-a716-446655440000"
  },
  "response": {
    "employees": [
      {
        "employee_id": "",
        "employee_name": "",
        "current_role": "",
        "target_role": "",
        "department_id": "",
        "team_id": "",
        "manager_id": "",
        "role_type": "",
        "completed_courses": [
          {
            "course_name": "",
            "feedback": ""
          }
        ],
        "courses_taught": [
          {
            "course_name": ""
          }
      ]
    ]
  }
}
```

**Example Request (Hierarchy):**
```json
{
  "requester_service": "LearningAnalytics",
  "payload": {
    "company_id": "550e8400-e29b-41d4-a716-446655440000"
  },
  "response": {
    "company_id": "",
    "company_name": "",
    "hierarchy": [
      {
        "department_id": "",
        "department_name": "",
        "manager_id": "",
        "teams": [
          {
            "team_id": "",
            "team_name": "",
            "manager_id": "",
            "employees": [
              {
                "employee_id": "",
                "name": "",
                "role_type": ""
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### Step 2: Directory's AI Analyzes the Request

Directory's `AIQueryGenerator` receives:
- The `payload` (filters, company_id, etc.)
- The `response` template (what fields are requested)
- The database schema (from migration files)

The AI then:
1. **Identifies which tables** need to be queried (companies, employees, departments, teams, etc.)
2. **Determines which fields** to select based on the response template
3. **Generates SQL queries** with proper JOINs, WHERE clauses, and aggregations
4. **Maps field names** (e.g., `employee_name` → `full_name` in database)

### Step 3: Directory Executes Query and Fills Response

Directory:
1. Executes the AI-generated SQL query
2. Maps database results to the response template fields
3. Returns the filled response

**Example Response:**
```json
{
  "requester_service": "LearningAnalytics",
  "payload": {
    "company_id": "550e8400-e29b-41d4-a716-446655440000"
  },
  "response": {
    "employees": [
      {
        "employee_id": "EMP001",
        "employee_name": "John Doe",
        "current_role": "Software Engineer",
        "target_role": "Senior Software Engineer",
        "department_id": "DEPT001",
        "team_id": "TEAM001",
        "manager_id": "EMP002",
        "role_type": "REGULAR_EMPLOYEE",
        "completed_courses": [],  // Empty if not in Directory DB
        "courses_taught": []      // Empty if not in Directory DB
      }
    ]
  }
}
```

## Key Points

### ✅ You DON'T Need To:
- Manually specify what data to return
- Write SQL queries for each request type
- Know in advance what Learning Analytics will request

### ✅ You DO Need To:
- Have the data in your database
- Let the AI Query Generator handle SQL generation
- Ensure your database schema matches the migration files

### ✅ How Learning Analytics Gets Data:

1. **Learning Analytics decides** what it needs (Employee Data, Company Data, Hierarchy, etc.)
2. **Learning Analytics sends request** with `response` template specifying fields
3. **Directory's AI generates SQL** automatically based on the template
4. **Directory executes query** and fills the response
5. **Directory returns** the filled response to Learning Analytics

## Different Request Types

### 1. On-Demand Requests
- Learning Analytics requests specific data for a specific company/employee
- Example: "Get employee data for company X"
- Response: Single object or small array

### 2. Batch Requests
- Learning Analytics requests ALL data (all companies, all employees, etc.)
- Uses pagination with cursor
- Example: "Get all companies with pagination"
- Response: Array with pagination metadata

### 3. Hierarchy Requests
- Learning Analytics requests organizational structure
- Example: "Get company hierarchy (departments → teams → employees)"
- Response: Nested JSON structure

## What Data Can Be Returned?

Directory can return **any data that exists in its database**, including:

### Employee Data
- Basic info: `employee_id`, `employee_name`, `email`, `current_role`, `target_role`
- Organizational: `department_id`, `team_id`, `manager_id`, `role_type`
- Profile: `bio`, `profile_photo_url`, `linkedin_url`, `github_url`
- Settings: `preferred_language`, `status`, `ai_enabled`, `public_publish_enable`
- **Note**: `completed_courses` and `courses_taught` are typically empty arrays (not stored in Directory DB)

### Company Data
- Basic: `company_id`, `company_name`, `industry`, `domain`
- Settings: `approval_policy`, `kpis`, `passing_grade`, `max_attempts`, `exercises_limited`
- Contacts: `hr_contact_name`, `hr_contact_email`, `hr_contact_role`
- Status: `verification_status`, `created_at`, `updated_at`

### Hierarchy Data
- Departments: `department_id`, `department_name`, `manager_id`
- Teams: `team_id`, `team_name`, `manager_id`, `department_id`
- Employees: `employee_id`, `name`, `role_type` (nested within teams)

## Summary

**Learning Analytics controls what it gets** by specifying fields in the `response` template.

**Directory automatically generates SQL** to fetch whatever is requested.

**You don't need to manually configure** what data to return - it's all automatic based on the request!

