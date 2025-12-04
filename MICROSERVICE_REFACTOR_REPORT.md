# Microservice-to-Microservice Communication Refactor Report

## PART 1: Direct Microservice Calls Found

### Summary
All microservice calls are currently made through `MicroserviceClient.js`, which makes **direct HTTP calls** to individual microservice URLs. These need to be refactored to go through the **Coordinator** unified proxy endpoint.

---

## Direct Calls Identified

### 1. Skills Engine
**File**: `backend/src/infrastructure/MicroserviceClient.js`  
**Method**: `getEmployeeSkills()` (lines 127-145)  
**Current Call**: `POST ${SKILLS_ENGINE_URL}/api/fill-content-metrics`  
**Purpose**: Get normalized skills from LinkedIn/GitHub raw data  
**Used By**:
- `backend/src/application/GetEmployeeSkillsUseCase.js` (line 60)
- `backend/src/application/EnrichProfileUseCase.js` (line 191)

**Current Implementation**:
```javascript
async getEmployeeSkills(employeeId, companyId, roleType, rawData) {
  const payload = {
    employee_id: employeeId,
    company_id: companyId,
    employee_type: roleType,
    raw_data: rawData || {}
  };
  const responseTemplate = {
    user_id: 0,
    competencies: [],
    relevance_score: 0,
    gap: { missing_skills: [] }
  };
  return await this.callMicroservice('skillsEngine', payload, responseTemplate, 'normalize-skills');
}
```

---

### 2. Course Builder
**File**: `backend/src/infrastructure/MicroserviceClient.js`  
**Method**: `getEmployeeCourses()` (lines 148-166)  
**Current Call**: `POST ${COURSE_BUILDER_URL}/api/fill-content-metrics`  
**Purpose**: Get employee courses (assigned, in progress, completed)  
**Used By**:
- `backend/src/application/GetEmployeeCoursesUseCase.js` (line 38)

**Current Implementation**:
```javascript
async getEmployeeCourses(employeeId, companyId) {
  const payload = {
    employee_id: employeeId,
    company_id: companyId
  };
  const responseTemplate = {
    assigned_courses: [],
    in_progress_courses: [],
    completed_courses: []
  };
  return await this.callMicroservice('courseBuilder', payload, responseTemplate, 'get-courses');
}
```

---

### 3. Learner AI
**File**: `backend/src/infrastructure/MicroserviceClient.js`  
**Method**: `getLearningPath()` (lines 169-220)  
**Current Call**: `POST ${LEARNER_AI_URL}/api/fill-learner-ai-fields`  
**Purpose**: Get personalized learning path for employee  
**Used By**:
- `backend/src/application/GetEmployeeLearningPathUseCase.js` (line 38)

**Current Implementation**:
```javascript
async getLearningPath(employeeId, companyId) {
  const payload = {
    employee_id: employeeId,
    company_id: companyId
  };
  const responseTemplate = {
    path_id: '',
    courses: [],
    progress: 0,
    recommendations: []
  };
  // Direct axios call (not using callMicroservice helper)
  const response = await axios.post(
    `${microservice.baseUrl}${microservice.endpoint}`,
    JSON.stringify(envelope),
    { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
  );
}
```

---

### 4. Learning Analytics
**File**: `backend/src/infrastructure/MicroserviceClient.js`  
**Method**: `getLearningDashboard()` (lines 223-242)  
**Current Call**: `POST ${LEARNING_ANALYTICS_URL}/api/fill-content-metrics`  
**Purpose**: Get learning dashboard data (progress, activity, deadlines, achievements)  
**Used By**:
- `backend/src/application/GetEmployeeDashboardUseCase.js` (line 38)

**Current Implementation**:
```javascript
async getLearningDashboard(employeeId, companyId) {
  const payload = {
    employee_id: employeeId,
    company_id: companyId
  };
  const responseTemplate = {
    progress_summary: {},
    recent_activity: [],
    upcoming_deadlines: [],
    achievements: []
  };
  return await this.callMicroservice('learningAnalytics', payload, responseTemplate, 'dashboard');
}
```

---

### 5. Generic `callMicroservice()` Method
**File**: `backend/src/infrastructure/MicroserviceClient.js`  
**Method**: `callMicroservice()` (lines 21-117)  
**Current Implementation**: Makes direct HTTP calls to microservice URLs from `config.microservices[microserviceName].baseUrl`

**Current Code**:
```javascript
const response = await axios.post(
  `${microservice.baseUrl}${microservice.endpoint}`,
  requestBody,
  { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
);
```

---

## Configuration Files

### `backend/src/config.js`
**Lines 98-132**: Contains microservice URLs and endpoints
- `skillsEngine.baseUrl`
- `courseBuilder.baseUrl`
- `learnerAI.baseUrl`
- `learningAnalytics.baseUrl`
- `contentStudio.baseUrl`
- `assessment.baseUrl`
- `managementReporting.baseUrl`

**Missing**: Coordinator URL configuration

---

## Inbound Endpoint (Already Implemented ✅)

### `POST /api/fill-content-metrics`
**File**: `backend/src/index.js` (line 381)  
**Controller**: `backend/src/presentation/UniversalEndpointController.js`  
**Use Case**: `backend/src/application/FillContentMetricsUseCase.js`  
**Status**: ✅ Already implemented and working

This endpoint handles requests **from other microservices** (via Coordinator) to Directory.

---

## Summary

**Total Direct Calls Found**: 4 microservices
- Skills Engine
- Course Builder
- Learner AI
- Learning Analytics

**Files to Modify**:
1. `backend/src/config.js` - Add Coordinator URL
2. `backend/src/infrastructure/MicroserviceClient.js` - Refactor to use Coordinator

**Files That Will Automatically Use Refactored Client** (no changes needed):
- `backend/src/application/GetEmployeeSkillsUseCase.js`
- `backend/src/application/GetEmployeeCoursesUseCase.js`
- `backend/src/application/GetEmployeeLearningPathUseCase.js`
- `backend/src/application/GetEmployeeDashboardUseCase.js`
- `backend/src/application/EnrichProfileUseCase.js`

---

## Next Steps

1. ✅ Add Coordinator URL to config.js
2. ✅ Refactor MicroserviceClient to call Coordinator
3. ✅ Update envelope structure to include `action` field
4. ✅ Verify inbound endpoint is correct (already done)
5. ✅ Verify service registration (check consistency)

