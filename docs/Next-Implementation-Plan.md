# Next Implementation Plan

**Date**: Current session
**Status**: Ready to proceed

---

## ✅ Confirmation of Understanding

I understand all requirements:

1. ✅ **All Integration Specifications** - Universal endpoint, envelope structure, fallback mechanisms
2. ✅ **System Logic** - Employee enrichment flow, HR approval workflow, OAuth flows
3. ✅ **API Interaction Rules** - Universal endpoint model, schema mapping, AI query generation
4. ✅ **Authentication** - Dummy mode (testing) with toggle to Auth Service (production)
5. ✅ **OAuth** - LinkedIn & GitHub, employee-initiated on first login
6. ✅ **Gemini AI** - One-time enrichment, bio + project summaries
7. ✅ **CSV Validations** - New fields (passing_grade, max_attempts, etc.), decision_maker_id validation
8. ✅ **HR Access** - HR sees Company Profile on login, not Employee Profile
9. ✅ **Documentation** - All docs in `/docs/*` reviewed and understood

---

## 📋 Current Status

### ✅ Completed (M1):
- F001: Landing Page
- F002: Company Registration Form
- F003: Company Verification System
- F004: CSV Upload & Parsing
- F005: CSV Error Handling & Correction UI
- F006: Company Profile Page

### ✅ Infrastructure Ready:
- Authentication abstraction (AuthProvider with dummy/auth-service toggle)
- Database schema (with new fields documented)
- Universal endpoint structure (ready for implementation)

### ❌ Not Yet Implemented (M2):
- F007: Employee Login (Dummy Authentication) - **NEXT TO IMPLEMENT**
- F008: LinkedIn OAuth
- F009: GitHub OAuth
- F009A: Gemini AI Integration
- F010: Employee Profile Page

---

## 🎯 Next Roadmap Item: F007 - Employee Login (Dummy Authentication)

### Feature Details:
- **ID**: F007
- **Title**: Employee Login (Dummy Authentication)
- **Milestone**: M2 (Employee Profiles & Authentication)
- **Dependencies**: F001 (Landing Page) ✅
- **Description**: Dummy login system for testing using email/password from CSV

### Required Files:
- `frontend/src/pages/LoginPage.js`
- `frontend/src/components/LoginForm.js`
- `frontend/src/services/authService.js`
- `frontend/src/context/AuthContext.js`
- `backend/src/presentation/AuthController.js`
- `backend/src/application/AuthenticateUserUseCase.js`

### Integration Constraints:
1. ✅ **Use AuthProvider abstraction** - Already implemented, just need to wire it up
2. ✅ **Support dummy mode** - Use DummyAuthProvider (default)
3. ✅ **HR routing** - HR employees → Company Profile, Regular employees → Employee Profile
4. ✅ **Employee lookup** - Query employees table by email (from CSV data)
5. ✅ **Session management** - Store token in frontend (localStorage/sessionStorage)
6. ✅ **Protected routes** - Use authMiddleware for protected endpoints

---

## ⚠️ Integration Constraints Check

### Before Starting F007:

1. **Authentication System** ✅
   - AuthProvider abstraction exists
   - DummyAuthProvider ready
   - AuthServiceProvider ready (for future)
   - authMiddleware exists

2. **Employee Data** ✅
   - Employees stored in database from CSV
   - Email field exists
   - Password field exists (from CSV)
   - HR identification logic needed (email match with company.hr_contact_email)

3. **Routing Logic** ✅
   - Need to implement HR detection
   - Redirect HR to `/company/:companyId`
   - Redirect regular employees to `/employee/:employeeId` (or enrichment page if first login)

4. **Frontend Integration** ✅
   - Landing page exists with login link
   - Need to create LoginPage component
   - Need AuthContext for state management
   - Need to integrate with existing routing

### No Blocking Issues Found ✅

---

## 📝 Implementation Plan for F007

### Phase 1: Backend
1. Create `AuthenticateUserUseCase.js` - Use AuthProvider to authenticate
2. Create `AuthController.js` - Handle login endpoint
3. Add login route to `index.js`
4. Implement employee lookup by email
5. Implement HR detection logic

### Phase 2: Frontend
1. Create `LoginPage.js` - Login form UI
2. Create `LoginForm.js` - Form component
3. Create `authService.js` - API calls
4. Create `AuthContext.js` - State management
5. Update routing in `App.js`
6. Add protected route logic

### Phase 3: Integration
1. Wire up AuthProvider in AuthenticateUserUseCase
2. Implement HR routing logic
3. Add session storage for token
4. Test dummy login flow
5. Test HR vs regular employee routing

---

## 🚨 Potential Issues to Watch

1. **HR Identification**: Need to check if employee email matches `companies.hr_contact_email`
2. **Password Storage**: CSV passwords may be plain text - need to handle in dummy mode
3. **First Login Detection**: Need to check if employee has enriched profile (for F008-F009)
4. **Token Storage**: Frontend token storage strategy (localStorage vs sessionStorage)

---

## ✅ Ready to Proceed

**Next Step**: Implement F007 - Employee Login (Dummy Authentication)

**No blocking integration constraints identified.**

**Will notify before committing if any major UI/UX changes are needed.**

