# Phase 3 Implementation Plan: Backend Endpoints

## 📋 Overview

Phase 3 adds new backend endpoints for PDF upload and manual data entry, and updates OAuth controllers to save data to the new `employee_raw_data` table. All changes are additive and fully reversible.

---

## 📁 Files to be Created

### 1. `backend/src/presentation/PDFUploadController.js`
**Purpose**: Handle PDF CV uploads, extract and save data  
**Risk Level**: 🟢 **LOW** - New file, isolated controller  
**Reversibility**: ✅ **FULLY REVERSIBLE** - Simply delete the file

### 2. `backend/src/presentation/ManualDataController.js`
**Purpose**: Handle manual profile form submissions  
**Risk Level**: 🟢 **LOW** - New file, isolated controller  
**Reversibility**: ✅ **FULLY REVERSIBLE** - Simply delete the file

### 3. `backend/src/application/UploadCVUseCase.js`
**Purpose**: Orchestrate PDF upload, extraction, and storage  
**Risk Level**: 🟢 **LOW** - New file, isolated use case  
**Reversibility**: ✅ **FULLY REVERSIBLE** - Simply delete the file

### 4. `backend/src/application/SaveManualDataUseCase.js`
**Purpose**: Orchestrate manual data validation and storage  
**Risk Level**: 🟢 **LOW** - New file, isolated use case  
**Reversibility**: ✅ **FULLY REVERSIBLE** - Simply delete the file

---

## 📝 Files to be Modified

### 1. `backend/src/presentation/OAuthController.js`
**Changes**:
- **ADD** new method: `saveOAuthDataToRawDataTable()` - saves LinkedIn/GitHub data to new table
- **MODIFY** `handleLinkedInCallback()`:
  - **AFTER** existing save to `employees.linkedin_data` (keep existing)
  - **ADD** call to save to `employee_raw_data` table (new, additive)
  - **FALLBACK**: If new save fails, continue with existing flow (non-breaking)
- **MODIFY** `handleGitHubCallback()`:
  - **AFTER** existing save to `employees.github_data` (keep existing)
  - **ADD** call to save to `employee_raw_data` table (new, additive)
  - **FALLBACK**: If new save fails, continue with existing flow (non-breaking)

**Risk Level**: 🟡 **MEDIUM** - Modifies OAuth flow, but with fallbacks  
**Reversibility**: ✅ **REVERSIBLE** - Remove Phase 3 additions, keep existing logic

**Rollback Strategy**:
- Remove new `saveOAuthDataToRawDataTable()` method
- Remove calls to save to new table
- Keep all existing OAuth logic intact
- All changes marked with `// PHASE_3:` comments

### 2. `backend/src/index.js` (or route file)
**Changes**:
- **ADD** new routes for PDF upload and manual data
- **KEEP** all existing routes untouched

**Risk Level**: 🟢 **LOW** - Only adds routes, doesn't modify existing  
**Reversibility**: ✅ **FULLY REVERSIBLE** - Remove new route blocks

**Rollback Strategy**:
- Remove new route blocks (marked with `// PHASE_3:`)
- Keep all existing routes

---

## 🔄 Rollback Path for Phase 3

### Step 1: Remove New Files
```bash
# Delete new files
rm backend/src/presentation/PDFUploadController.js
rm backend/src/presentation/ManualDataController.js
rm backend/src/application/UploadCVUseCase.js
rm backend/src/application/SaveManualDataUseCase.js
```

### Step 2: Revert OAuthController.js
**Manual Steps**:
1. Open `backend/src/presentation/OAuthController.js`
2. Remove all lines marked with `// PHASE_3: ...` comments
3. Remove `saveOAuthDataToRawDataTable()` method
4. Restore original `handleLinkedInCallback()` (remove new table save)
5. Restore original `handleGitHubCallback()` (remove new table save)

**Or use git**:
```bash
git checkout HEAD -- backend/src/presentation/OAuthController.js
```

### Step 3: Revert Routes
**Manual Steps**:
1. Open route file (`backend/src/index.js` or similar)
2. Remove all route blocks marked with `// PHASE_3:`
3. Keep all existing routes

### Step 4: Verify Rollback
- Existing OAuth flow should work exactly as before
- No references to new controllers
- All Phase 3 code removed

---

## 🛡️ Safety Measures

### 1. Backward Compatibility
- **OAuthController** will save to BOTH old columns AND new table
- **If new table save fails**: Continue with existing flow (non-breaking)
- **Existing OAuth flow**: Completely unchanged behavior
- **Result**: OAuth works with or without Phase 3

### 2. Code Marking
- All Phase 3 changes marked with `// PHASE_3: ...` comments
- Easy to identify and remove during rollback

### 3. No Breaking Changes
- No removal of existing methods
- No changes to existing method signatures
- No changes to existing routes
- No changes to existing API contracts
- New endpoints are additive only

### 4. Graceful Degradation
- If PDF upload fails → Return error, don't break existing flow
- If manual data save fails → Return error, don't break existing flow
- If new table save fails in OAuth → Log warning, continue with existing flow

### 5. Isolated Files
- New controllers are self-contained
- New use cases are self-contained
- Can be deleted without affecting existing code

---

## 📊 Risk Assessment

| Component | Risk Level | Impact if Broken | Rollback Time |
|-----------|------------|------------------|---------------|
| PDFUploadController | 🟢 LOW | New feature doesn't work | < 1 min |
| ManualDataController | 🟢 LOW | New feature doesn't work | < 1 min |
| UploadCVUseCase | 🟢 LOW | PDF upload doesn't work | < 1 min |
| SaveManualDataUseCase | 🟢 LOW | Manual form doesn't work | < 1 min |
| OAuthController changes | 🟡 MEDIUM | OAuth might fail to save to new table | < 5 min |
| Route additions | 🟢 LOW | New endpoints unavailable | < 1 min |

**Overall Risk**: 🟡 **MEDIUM-LOW**
- New code is isolated and reversible
- OAuth changes have fallbacks
- No database changes
- No API contract changes for existing endpoints

---

## 🔍 What Will NOT Change

✅ **Existing OAuth flow** - Saves to old columns AND new table (dual-write)  
✅ **Existing `employees.linkedin_data` column** - Still written to (backward compatible)  
✅ **Existing `employees.github_data` column** - Still written to (backward compatible)  
✅ **Existing OAuth redirects** - Completely unchanged  
✅ **Existing enrichment logic** - Unchanged  
✅ **Existing API endpoints** - No modifications  
✅ **Existing frontend** - No changes in Phase 3 (backend only)  

---

## 📋 Implementation Details

### PDFUploadController.js Structure
```javascript
class PDFUploadController {
  constructor() {
    this.uploadCVUseCase = new UploadCVUseCase();
  }
  
  async uploadCV(req, res, next) {
    // PHASE_3: Handle PDF upload
    // - Validate file
    // - Extract and parse
    // - Save to employee_raw_data
  }
}
```

**Key Features**:
- Validates PDF file type
- Uses multer for file upload
- Calls UploadCVUseCase
- Returns success/error response

### ManualDataController.js Structure
```javascript
class ManualDataController {
  constructor() {
    this.saveManualDataUseCase = new SaveManualDataUseCase();
  }
  
  async saveManualData(req, res, next) {
    // PHASE_3: Handle manual form submission
    // - Validate body
    // - Structure data
    // - Save to employee_raw_data
  }
}
```

**Key Features**:
- Validates request body
- Structures data (work_experience, skills, etc.)
- Calls SaveManualDataUseCase
- Returns success/error response

### UploadCVUseCase.js Structure
```javascript
class UploadCVUseCase {
  constructor() {
    this.pdfExtractionService = new PDFExtractionService();
    this.rawDataRepository = new EmployeeRawDataRepository();
  }
  
  async execute(employeeId, fileBuffer) {
    // PHASE_3: Process PDF upload
    // 1. Extract text
    // 2. Parse CV
    // 3. Sanitize PII
    // 4. Save to employee_raw_data
  }
}
```

### SaveManualDataUseCase.js Structure
```javascript
class SaveManualDataUseCase {
  constructor() {
    this.rawDataRepository = new EmployeeRawDataRepository();
  }
  
  async execute(employeeId, manualData) {
    // PHASE_3: Process manual data
    // 1. Validate data
    // 2. Structure data
    // 3. Save to employee_raw_data
  }
}
```

### OAuthController.js Changes
```javascript
// PHASE_3: Add method to save OAuth data to new table
async saveOAuthDataToRawDataTable(employeeId, source, data) {
  try {
    const EmployeeRawDataRepository = require('../infrastructure/EmployeeRawDataRepository');
    const rawDataRepo = new EmployeeRawDataRepository();
    await rawDataRepo.createOrUpdate(employeeId, source, data);
    console.log(`[OAuthController] ✅ Saved ${source} data to employee_raw_data table`);
  } catch (error) {
    // PHASE_3: Non-critical - log warning but don't break OAuth flow
    console.warn(`[OAuthController] ⚠️  Failed to save ${source} to new table (non-critical):`, error.message);
    // Continue with existing flow
  }
}

// In handleLinkedInCallback():
// ... existing save to employees.linkedin_data (KEEP THIS) ...
// PHASE_3: Also save to new table (additive, non-breaking)
await this.saveOAuthDataToRawDataTable(employeeId, 'linkedin', linkedinProfileData);

// In handleGitHubCallback():
// ... existing save to employees.github_data (KEEP THIS) ...
// PHASE_3: Also save to new table (additive, non-breaking)
await this.saveOAuthDataToRawDataTable(employeeId, 'github', githubProfileData);
```

### Routes (backend/src/index.js or api.js)
```javascript
// PHASE_3: Add new routes for PDF upload and manual data
const pdfUploadController = require('./presentation/PDFUploadController');
const manualDataController = require('./presentation/ManualDataController');
const upload = require('multer')({ dest: 'uploads/' }); // Already exists

// PHASE_3: PDF upload route
apiRouter.post('/employees/:id/upload-cv', authMiddleware, upload.single('cv'), (req, res, next) => {
  pdfUploadController.uploadCV(req, res, next);
});

// PHASE_3: Manual data route
apiRouter.post('/employees/:id/manual-data', authMiddleware, (req, res, next) => {
  manualDataController.saveManualData(req, res, next);
});
```

---

## ✅ Rollback Verification Checklist

After rollback, verify:
- [ ] `OAuthController.handleLinkedInCallback()` works as before
- [ ] `OAuthController.handleGitHubCallback()` works as before
- [ ] No references to `PDFUploadController` in codebase
- [ ] No references to `ManualDataController` in codebase
- [ ] No references to `UploadCVUseCase` in codebase
- [ ] No references to `SaveManualDataUseCase` in codebase
- [ ] Existing OAuth flow unchanged
- [ ] No errors in logs

---

## 🚦 Approval Required

**Before I proceed with Phase 3 implementation, please confirm:**

1. ✅ File creation plan is acceptable (4 new files)
2. ✅ File modification plan is acceptable (OAuthController + routes, with fallbacks)
3. ✅ Rollback path is clear and safe
4. ✅ Risk level is acceptable
5. ✅ Backward compatibility measures are sufficient
6. ✅ Dual-write strategy (old columns + new table) is acceptable

**Type "APPROVED" to proceed with Phase 3 implementation.**

---

## 📝 Summary

**New Files**: 4 (2 controllers, 2 use cases)  
**Modified Files**: 2 (OAuthController, routes)  
**Rollback Time**: < 5 minutes  
**Risk Level**: 🟡 Medium-Low  
**Breaking Changes**: ❌ None  
**Backward Compatible**: ✅ Yes (dual-write strategy)

