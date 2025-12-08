# Postman Testing Guide - Directory Enrollment → Coordinator

## Overview
This guide shows how to test Directory's enrollment endpoint using Postman and verify that requests are being sent to Coordinator.

---

## Step 1: Get Authentication Token

### Login Endpoint
```
POST https://directory3-production.up.railway.app/api/v1/auth/login
```

### Request Body
```json
{
  "email": "your-email@example.com",
  "password": "your-password"
}
```

### Response
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "...",
    "companyId": "...",
    "isHR": true
  }
}
```

**Copy the `token` value** - you'll need it for the enrollment request.

---

## Step 2: Test Enrollment Endpoint

### Request Details

**Method:** `POST`  
**URL:** `https://directory3-production.up.railway.app/api/v1/companies/22550b8e-656f-432b-a0d6-12a0a7a94998/enrollments/career-path`

### Headers
```
Authorization: Bearer dummy-token-ca1ed3d5-c770-4cc5-a8b3-fb0f1f512d25-rola.hassoun@lotustechhub.com-1765234624898
Content-Type: application/json
```

### Request Body
```json
{
  "employeeIds": [
    "ca1ed3d5-c770-4cc5-a8b3-fb0f1f512d25"
  ]
}
```

**Note:** Replace `ca1ed3d5-c770-4cc5-a8b3-fb0f1f512d25` with actual employee UUIDs from your company. You can use the same employee ID (`ca1ed3d5-c770-4cc5-a8b3-fb0f1f512d25`) for testing, or add more employee IDs if you have them.

### Quick Copy-Paste for Postman

**URL:**
```
https://directory3-production.up.railway.app/api/v1/companies/22550b8e-656f-432b-a0d6-12a0a7a94998/enrollments/career-path
```

**Authorization Header:**
```
Bearer dummy-token-ca1ed3d5-c770-4cc5-a8b3-fb0f1f512d25-rola.hassoun@lotustechhub.com-1765234624898
```

**Body (JSON):**
```json
{
  "employeeIds": [
    "ca1ed3d5-c770-4cc5-a8b3-fb0f1f512d25"
  ]
}
```

---

## Step 3: Expected Response

### Success Response (200)
```json
{
  "requester_service": "directory_service",
  "response": {
    "success": true,
    "message": "Enrollment request sent to AI learning pipeline",
    "enrollment_batch_id": "...",
    "failed_employee_ids": [],
    "employees_enrolled": 2
  }
}
```

### Error Response (400/500)
```json
{
  "requester_service": "directory_service",
  "response": {
    "success": false,
    "message": "Failed to enroll employees via AI learning flow",
    "details": "..."
  }
}
```

---

## Step 4: Check Directory Logs

After sending the request, check **Directory's Railway logs** for these log entries:

### Controller Logs
Look for:
```
[EnrollmentController] ===== ENROLLMENT REQUEST RECEIVED =====
[EnrollmentController] Method: POST
[EnrollmentController] Path: /api/v1/companies/.../enrollments/career-path
[EnrollmentController] req.body: {...}
[EnrollmentController] Extracted employeeIds: [...]
```

### Use Case Logs
Look for:
```
[EnrollEmployeesCareerPathUseCase] ===== USE CASE EXECUTE START =====
[EnrollEmployeesCareerPathUseCase] Building Coordinator payload...
[EnrollEmployeesCareerPathUseCase] Coordinator payload structure: {...}
```

### Coordinator Client Logs
Look for:
```
[CoordinatorClient] ===== POST TO COORDINATOR START =====
[CoordinatorClient] Full Coordinator URL: https://coordinator-production-e0a0.up.railway.app/api/fill-content-metrics/
[CoordinatorClient] Envelope being sent: {...}
[CoordinatorClient] Request headers: {...}
[CoordinatorClient] Sending POST request to Coordinator...
[CoordinatorClient] Executing fetch() to Coordinator...
[CoordinatorClient] Fetch completed, response received
[CoordinatorClient] Coordinator response status: 200
[CoordinatorClient] Response data: {...}
```

---

## Step 5: Verify Coordinator Request

### What to Check in Directory Logs

1. **Request Sent:**
   ```
   [CoordinatorClient] Executing fetch() to Coordinator...
   [CoordinatorClient] Fetch completed, response received
   ```

2. **Coordinator URL:**
   ```
   [CoordinatorClient] Full Coordinator URL: https://coordinator-production-e0a0.up.railway.app/api/fill-content-metrics/
   ```

3. **Envelope Structure:**
   ```
   [CoordinatorClient] Envelope being sent: {
     "requester_service": "directory-service",
     "payload": {
       "action": "enroll_employees_career_path",
       "learning_flow": "CAREER_PATH_DRIVEN",
       "learners": [...]
     },
     "response": {...}
   }
   ```

4. **Response Status:**
   ```
   [CoordinatorClient] Coordinator response status: 200
   [CoordinatorClient] Response data: {...}
   ```

---

## Step 6: Troubleshooting

### Issue: No logs in Coordinator

**Possible Causes:**
1. **Request not reaching Coordinator:**
   - Check Directory logs for `[CoordinatorClient] Fetch completed`
   - If missing, check for network errors: `ENOTFOUND`, `ECONNREFUSED`

2. **Coordinator URL incorrect:**
   - Verify `COORDINATOR_URL` environment variable in Directory
   - Should be: `https://coordinator-production-e0a0.up.railway.app`

3. **Request blocked by Coordinator:**
   - Check Coordinator logs for incoming requests
   - Verify signature validation (if PRIVATE_KEY is required)

### Issue: 500 Error from Directory

**Check Directory logs for:**
```
[EnrollmentController] ===== ENROLLMENT ERROR =====
[EnrollmentController] Error message: ...
```

**Common errors:**
- `COORDINATOR_URL environment variable is not set`
- `Cannot connect to Coordinator at ...`
- `Failed to generate signature`

### Issue: 403 Forbidden

**Cause:** User doesn't have HR or Admin permissions

**Solution:** Use an account with `isHR: true` or `isAdmin: true`

---

## Step 7: Direct Coordinator Test (Optional)

To verify Coordinator is receiving requests, you can also test Coordinator directly:

### Request to Coordinator
```
POST https://coordinator-production-e0a0.up.railway.app/api/fill-content-metrics/
```

### Headers
```
Content-Type: application/json
X-Service-Name: directory-service
X-Signature: <signature-if-required>
```

### Body
```json
{
  "requester_service": "directory-service",
  "payload": {
    "action": "enroll_employees_career_path",
    "learning_flow": "CAREER_PATH_DRIVEN",
    "company_id": "...",
    "company_name": "...",
    "learners": [
      {
        "learner_id": "...",
        "learner_name": "...",
        "company_id": "...",
        "learning_flow_tag": "CAREER_PATH_DRIVEN",
        "preferred_language": "en"
      }
    ]
  },
  "response": {
    "success": false,
    "message": "",
    "enrollment_batch_id": "",
    "failed_employee_ids": []
  }
}
```

**Note:** This bypasses Directory and tests Coordinator directly. Use this only for debugging Coordinator routing.

---

## Quick Test Checklist

- [ ] Got authentication token from login
- [ ] Set Authorization header: `Bearer <token>`
- [ ] Set Content-Type: `application/json`
- [ ] Used correct company ID in URL
- [ ] Provided valid employee IDs in body
- [ ] Checked Directory logs for request processing
- [ ] Checked Directory logs for Coordinator call
- [ ] Verified Coordinator response in Directory logs
- [ ] Checked Coordinator logs (if accessible)

---

## Example Postman Collection

### Collection Structure
```
Directory Enrollment Tests
├── 1. Login
│   └── POST /api/v1/auth/login
├── 2. Enroll Employees
│   └── POST /api/v1/companies/:companyId/enrollments/career-path
└── 3. Direct Coordinator Test (Optional)
    └── POST https://coordinator-production-e0a0.up.railway.app/api/fill-content-metrics/
```

### Environment Variables
Create a Postman environment with:
- `directory_url`: `https://directory3-production.up.railway.app`
- `coordinator_url`: `https://coordinator-production-e0a0.up.railway.app`
- `token`: (set from login response)
- `company_id`: (your test company UUID)
- `employee_id_1`: (test employee UUID)
- `employee_id_2`: (test employee UUID)

---

**Last Updated:** $(date)  
**Status:** Ready for testing

