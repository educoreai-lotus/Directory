# Directory → Coordinator → Microservices: Endpoint Mapping Report

## Executive Summary

This report maps all Directory backend REST API endpoints that trigger microservice calls through the Coordinator unified proxy. These endpoints are the **testable entry points** for verifying Coordinator communication.

**Total Endpoints Found**: 5 public REST API endpoints + 1 internal enrichment trigger

---

## Complete Endpoint Mapping Table

| Endpoint | HTTP Method | Triggers Microservice | Internal Function | Coordinator Payload | Notes |
|----------|-------------|------------------------|-------------------|---------------------|-------|
| `/api/v1/companies/:id/employees/:employeeId/skills` | GET | **skills-engine** | `GetEmployeeSkillsUseCase.execute()` → `MicroserviceClient.getEmployeeSkills()` | `action: "get_employee_skills_for_directory_profile"`<br>`target_service: "skills-engine"`<br>`payload: { employee_id, company_id, employee_type, raw_data: { linkedin, github } }` | Fetches normalized skills from LinkedIn/GitHub data. Requires profile to be approved. |
| `/api/v1/companies/:id/employees/:employeeId/courses` | GET | **course-builder** | `GetEmployeeCoursesUseCase.execute()` → `MicroserviceClient.getEmployeeCourses()` | `action: "fetch_employee_courses_for_directory"`<br>`target_service: "course-builder"`<br>`payload: { employee_id, company_id }` | Fetches employee courses (assigned, in progress, completed). Requires profile to be approved. |
| `/api/v1/companies/:id/employees/:employeeId/learning-path` | GET | **learner-ai** | `GetEmployeeLearningPathUseCase.execute()` → `MicroserviceClient.getLearningPath()` | `action: "get_learning_path_for_employee_dashboard"`<br>`target_service: "learner-ai"`<br>`payload: { employee_id, company_id }` | Fetches personalized learning path recommendations. Requires profile to be approved. |
| `/api/v1/companies/:id/employees/:employeeId/dashboard` | GET | **learning-analytics** | `GetEmployeeDashboardUseCase.execute()` → `MicroserviceClient.getLearningDashboard()` | `action: "fetch_learning_progress_for_employee_dashboard"`<br>`target_service: "learning-analytics"`<br>`payload: { employee_id, company_id }` | Fetches learning dashboard data (progress, activity, deadlines, achievements). Requires profile to be approved. |
| `/api/v1/employees/:employeeId/enrich` | POST | **skills-engine** | `EnrichProfileUseCase.enrichProfile()` → `MicroserviceClient.getEmployeeSkills()` | `action: "get_employee_skills_for_directory_profile"`<br>`target_service: "skills-engine"`<br>`payload: { employee_id, company_id, employee_type, raw_data: { linkedin, github } }` | Triggers profile enrichment. After AI enrichment, sends LinkedIn/GitHub data to Skills Engine for normalization. Non-blocking (continues even if Skills Engine fails). |

---

## Detailed Code Flow Analysis

### 1. GET `/api/v1/companies/:id/employees/:employeeId/skills`

**Route Definition**: `backend/src/index.js:273-275`
```javascript
apiRouter.get('/companies/:id/employees/:employeeId/skills', authMiddleware, (req, res, next) => {
  employeeController.getEmployeeSkills(req, res, next);
});
```

**Controller**: `backend/src/presentation/EmployeeController.js:209-229`
- Calls: `GetEmployeeSkillsUseCase.execute(employeeId, companyId)`

**Use Case**: `backend/src/application/GetEmployeeSkillsUseCase.js:19-75`
- Line 60: `await this.microserviceClient.getEmployeeSkills(employee.employee_id, employee.company_id.toString(), employeeType, rawData)`

**MicroserviceClient**: `backend/src/infrastructure/MicroserviceClient.js:145-163`
- Method: `getEmployeeSkills()`
- Calls: `callMicroservice('skillsEngine', payload, responseTemplate, 'normalize-skills')`
- Coordinator Payload:
  ```javascript
  {
    requester_service: "directory-service",
    payload: {
      action: "get_employee_skills_for_directory_profile",
      target_service: "skills-engine",
      employee_id: "EMP001",
      company_id: "company-uuid",
      employee_type: "regular_employee" | "trainer",
      raw_data: {
        linkedin: { ... },
        github: { ... }
      }
    },
    response: {
      user_id: 0,
      competencies: [],
      relevance_score: 0,
      gap: { missing_skills: [] }
    }
  }
  ```

**Requirements**:
- Authentication required (`authMiddleware`)
- Employee profile must be `approved`
- Employee must belong to the specified company

---

### 2. GET `/api/v1/companies/:id/employees/:employeeId/courses`

**Route Definition**: `backend/src/index.js:277-279`
```javascript
apiRouter.get('/companies/:id/employees/:employeeId/courses', authMiddleware, (req, res, next) => {
  employeeController.getEmployeeCourses(req, res, next);
});
```

**Controller**: `backend/src/presentation/EmployeeController.js:235-255`
- Calls: `GetEmployeeCoursesUseCase.execute(employeeId, companyId)`

**Use Case**: `backend/src/application/GetEmployeeCoursesUseCase.js:19-51`
- Line 38: `await this.microserviceClient.getEmployeeCourses(employee.employee_id, employee.company_id.toString())`

**MicroserviceClient**: `backend/src/infrastructure/MicroserviceClient.js:171-184`
- Method: `getEmployeeCourses()`
- Calls: `callMicroservice('courseBuilder', payload, responseTemplate, 'get-courses')`
- Coordinator Payload:
  ```javascript
  {
    requester_service: "directory-service",
    payload: {
      action: "fetch_employee_courses_for_directory",
      target_service: "course-builder",
      employee_id: "EMP001",
      company_id: "company-uuid"
    },
    response: {
      assigned_courses: [],
      in_progress_courses: [],
      completed_courses: []
    }
  }
  ```

**Requirements**:
- Authentication required (`authMiddleware`)
- Employee profile must be `approved`
- Employee must belong to the specified company

---

### 3. GET `/api/v1/companies/:id/employees/:employeeId/learning-path`

**Route Definition**: `backend/src/index.js:281-283`
```javascript
apiRouter.get('/companies/:id/employees/:employeeId/learning-path', authMiddleware, (req, res, next) => {
  employeeController.getEmployeeLearningPath(req, res, next);
});
```

**Controller**: `backend/src/presentation/EmployeeController.js:261-281`
- Calls: `GetEmployeeLearningPathUseCase.execute(employeeId, companyId)`

**Use Case**: `backend/src/application/GetEmployeeLearningPathUseCase.js:19-51`
- Line 38: `await this.microserviceClient.getLearningPath(employee.employee_id, employee.company_id.toString())`

**MicroserviceClient**: `backend/src/infrastructure/MicroserviceClient.js:192-207`
- Method: `getLearningPath()`
- Calls: `callMicroservice('learnerAI', payload, responseTemplate, 'learning-path')`
- Coordinator Payload:
  ```javascript
  {
    requester_service: "directory-service",
    payload: {
      action: "get_learning_path_for_employee_dashboard",
      target_service: "learner-ai",
      employee_id: "EMP001",
      company_id: "company-uuid"
    },
    response: {
      path_id: "",
      courses: [],
      progress: 0,
      recommendations: []
    }
  }
  ```

**Requirements**:
- Authentication required (`authMiddleware`)
- Employee profile must be `approved`
- Employee must belong to the specified company

---

### 4. GET `/api/v1/companies/:id/employees/:employeeId/dashboard`

**Route Definition**: `backend/src/index.js:285-287`
```javascript
apiRouter.get('/companies/:id/employees/:employeeId/dashboard', authMiddleware, (req, res, next) => {
  employeeController.getEmployeeDashboard(req, res, next);
});
```

**Controller**: `backend/src/presentation/EmployeeController.js:287-307`
- Calls: `GetEmployeeDashboardUseCase.execute(employeeId, companyId)`

**Use Case**: `backend/src/application/GetEmployeeDashboardUseCase.js:19-51`
- Line 38: `await this.microserviceClient.getLearningDashboard(employee.employee_id, employee.company_id.toString())`

**MicroserviceClient**: `backend/src/infrastructure/MicroserviceClient.js:215-229`
- Method: `getLearningDashboard()`
- Calls: `callMicroservice('learningAnalytics', payload, responseTemplate, 'dashboard')`
- Coordinator Payload:
  ```javascript
  {
    requester_service: "directory-service",
    payload: {
      action: "fetch_learning_progress_for_employee_dashboard",
      target_service: "learning-analytics",
      employee_id: "EMP001",
      company_id: "company-uuid"
    },
    response: {
      progress_summary: {},
      recent_activity: [],
      upcoming_deadlines: [],
      achievements: []
    }
  }
  ```

**Requirements**:
- Authentication required (`authMiddleware`)
- Employee profile must be `approved`
- Employee must belong to the specified company

---

### 5. POST `/api/v1/employees/:employeeId/enrich`

**Route Definition**: `backend/src/index.js:313-315`
```javascript
apiRouter.post('/employees/:employeeId/enrich', authMiddleware, (req, res, next) => {
  enrichmentController.enrichProfile(req, res, next);
});
```

**Controller**: `backend/src/presentation/EnrichmentController.js:17-49`
- Calls: `EnrichProfileUseCase.enrichProfile(employeeId)`

**Use Case**: `backend/src/application/EnrichProfileUseCase.js:25-243`
- Line 191: `await this.microserviceClient.getEmployeeSkills(employee.employee_id, employee.company_id.toString(), employeeType, rawData)`
- **Note**: This call is **non-blocking** - if Skills Engine fails, enrichment continues

**MicroserviceClient**: `backend/src/infrastructure/MicroserviceClient.js:145-163`
- Method: `getEmployeeSkills()` (same as endpoint #1)
- Coordinator Payload: Same as endpoint #1

**Requirements**:
- Authentication required (`authMiddleware`)
- Employee must have connected LinkedIn and GitHub OAuth
- Skills Engine call is non-critical (enrichment continues even if it fails)

---

## Coordinator Communication Flow

All microservice calls follow this pattern:

1. **Directory REST API** receives request
2. **Controller** validates and calls **Use Case**
3. **Use Case** calls **MicroserviceClient** method
4. **MicroserviceClient** builds envelope and calls **CoordinatorClient.postToCoordinator()**
5. **CoordinatorClient** signs request (if `PRIVATE_KEY` configured) and sends to:
   ```
   POST ${COORDINATOR_URL}/api/fill-content-metrics/
   Headers:
     - X-Service-Name: directory-service
     - X-Signature: <base64 ECDSA signature>
     - Content-Type: application/json
   Body: { requester_service, payload, response }
   ```
6. **Coordinator** routes to target microservice based on `payload.target_service`
7. **Target Microservice** processes request and returns response
8. **Coordinator** returns response to Directory
9. **Directory** extracts data and returns to client

---

## Best Endpoints to Test Coordinator Communication

### 🎯 **Primary Test Endpoints** (Recommended)

1. **GET `/api/v1/companies/:id/employees/:employeeId/skills`**
   - **Why**: Most commonly used, sends rich payload (LinkedIn/GitHub data)
   - **Test**: Verify Skills Engine receives normalized skills request
   - **Payload**: Includes `raw_data` with LinkedIn/GitHub JSON

2. **GET `/api/v1/companies/:id/employees/:employeeId/courses`**
   - **Why**: Simple payload, easy to verify
   - **Test**: Verify Course Builder receives course request
   - **Payload**: Minimal (just employee_id, company_id)

3. **GET `/api/v1/companies/:id/employees/:employeeId/learning-path`**
   - **Why**: Tests Learner AI routing
   - **Test**: Verify Learner AI receives learning path request
   - **Payload**: Minimal (just employee_id, company_id)

### 🔧 **Secondary Test Endpoints**

4. **GET `/api/v1/companies/:id/employees/:employeeId/dashboard`**
   - **Why**: Tests Learning Analytics routing
   - **Test**: Verify Learning Analytics receives dashboard request

5. **POST `/api/v1/employees/:employeeId/enrich`**
   - **Why**: Tests Skills Engine call during enrichment flow
   - **Note**: This is non-blocking, so Coordinator failure won't break enrichment

---

## Testing Checklist

### Prerequisites
- [ ] Employee profile must be `approved` (for endpoints 1-4)
- [ ] Employee must have LinkedIn and GitHub connected (for endpoint 5)
- [ ] Valid authentication token in `Authorization` header
- [ ] `COORDINATOR_URL` environment variable set
- [ ] `PRIVATE_KEY` environment variable set (for signature)
- [ ] `SERVICE_NAME` environment variable set (defaults to `directory-service`)

### Test Steps

1. **Authenticate** to get token:
   ```
   POST /api/v1/auth/login
   Body: { email, password }
   ```

2. **Get employee ID and company ID** from profile or database

3. **Call test endpoint**:
   ```
   GET /api/v1/companies/{companyId}/employees/{employeeId}/skills
   Headers: { Authorization: Bearer {token} }
   ```

4. **Verify in Coordinator logs**:
   - Request received with `X-Service-Name: directory-service`
   - Signature verified (if enabled)
   - Request routed to `skills-engine`

5. **Verify in Skills Engine logs**:
   - Request received from Coordinator
   - Response returned to Coordinator

6. **Verify Directory response**:
   - Returns skills data or falls back to mock data if Coordinator/Skills Engine fails

---

## Internal Code Locations Summary

| Component | File | Line(s) | Purpose |
|-----------|------|---------|---------|
| **Routes** | `backend/src/index.js` | 273-287, 313-315 | Define REST API endpoints |
| **Controllers** | `backend/src/presentation/EmployeeController.js` | 209-307 | Handle HTTP requests/responses |
| **Controllers** | `backend/src/presentation/EnrichmentController.js` | 17-49 | Handle enrichment requests |
| **Use Cases** | `backend/src/application/GetEmployeeSkillsUseCase.js` | 60 | Orchestrate skills fetch |
| **Use Cases** | `backend/src/application/GetEmployeeCoursesUseCase.js` | 38 | Orchestrate courses fetch |
| **Use Cases** | `backend/src/application/GetEmployeeLearningPathUseCase.js` | 38 | Orchestrate learning path fetch |
| **Use Cases** | `backend/src/application/GetEmployeeDashboardUseCase.js` | 38 | Orchestrate dashboard fetch |
| **Use Cases** | `backend/src/application/EnrichProfileUseCase.js` | 191 | Trigger skills normalization during enrichment |
| **Client** | `backend/src/infrastructure/MicroserviceClient.js` | 145-229 | Build Coordinator envelopes |
| **Client** | `backend/src/infrastructure/CoordinatorClient.js` | 17-55 | Sign and send to Coordinator |

---

## Notes

- **All endpoints require authentication** (`authMiddleware`)
- **Endpoints 1-4 require approved profile** - unapproved employees will get 403
- **Endpoint 5 (enrich)** is non-blocking - Skills Engine failure doesn't stop enrichment
- **Fallback logic**: If Coordinator or target microservice fails, Directory falls back to mock data
- **Signature verification**: Coordinator responses are optionally verified (non-blocking)
- **Service name**: All requests use `requester_service: "directory-service"`

---

## Quick Reference: Test URLs

Assuming Directory runs on `https://directory3-production.up.railway.app`:

```
GET  https://directory3-production.up.railway.app/api/v1/companies/{companyId}/employees/{employeeId}/skills
GET  https://directory3-production.up.railway.app/api/v1/companies/{companyId}/employees/{employeeId}/courses
GET  https://directory3-production.up.railway.app/api/v1/companies/{companyId}/employees/{employeeId}/learning-path
GET  https://directory3-production.up.railway.app/api/v1/companies/{companyId}/employees/{employeeId}/dashboard
POST https://directory3-production.up.railway.app/api/v1/employees/{employeeId}/enrich
```

---

**Report Generated**: 2025-01-20  
**Directory Service Version**: 1.0.0  
**Coordinator Integration**: Active

