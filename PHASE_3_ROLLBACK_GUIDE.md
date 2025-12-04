# Phase 3 Rollback Guide

## 🚨 Complete Rollback Instructions

This guide provides step-by-step instructions to completely remove Phase 3 changes and restore the system to its pre-Phase 3 state.

---

## ⚠️ Before You Begin

**Verify Current State**:
- Check that Phase 3 is actually deployed
- Ensure you have a backup of the current codebase
- Test that existing OAuth flow works before rollback

---

## 📋 Step-by-Step Rollback

### Step 1: Remove New Files

Delete the four new files created in Phase 3:

```bash
# From project root
rm backend/src/application/UploadCVUseCase.js
rm backend/src/application/SaveManualDataUseCase.js
rm backend/src/presentation/PDFUploadController.js
rm backend/src/presentation/ManualDataController.js
```

**Files to delete**:
- ✅ `backend/src/application/UploadCVUseCase.js`
- ✅ `backend/src/application/SaveManualDataUseCase.js`
- ✅ `backend/src/presentation/PDFUploadController.js`
- ✅ `backend/src/presentation/ManualDataController.js`

---

### Step 2: Revert OAuthController.js

**Option A: Using Git (Recommended)**

If you have the file in git history:

```bash
git checkout HEAD -- backend/src/presentation/OAuthController.js
```

**Option B: Manual Reversion**

Open `backend/src/presentation/OAuthController.js` and:

1. **Remove LinkedIn dual-write block** (lines ~91-114):
   
   **Find this block:**
   ```javascript
   // PHASE_3: Dual-write strategy - also save LinkedIn data to new employee_raw_data table
   // This is non-critical - if it fails, OAuth flow continues normally
   try {
     const EmployeeRepository = require('../infrastructure/EmployeeRepository');
     const EmployeeRawDataRepository = require('../infrastructure/EmployeeRawDataRepository');
     const employeeRepo = new EmployeeRepository();
     const rawDataRepo = new EmployeeRawDataRepository();
     
     // Get the saved LinkedIn data from the employee record
     const employee = await employeeRepo.findById(result.employee.id);
     if (employee && employee.linkedin_data) {
       const linkedinData = typeof employee.linkedin_data === 'string' 
         ? JSON.parse(employee.linkedin_data) 
         : employee.linkedin_data;
       
       await rawDataRepo.createOrUpdate(result.employee.id, 'linkedin', linkedinData);
       console.log('[OAuthController] ✅ PHASE_3: Saved LinkedIn data to employee_raw_data table');
     }
   } catch (error) {
     // PHASE_3: Non-critical - log warning but don't break OAuth flow
     console.warn('[OAuthController] ⚠️  PHASE_3: Failed to save LinkedIn data to new table (non-critical):', error.message);
     // Continue with existing OAuth flow
   }
   ```
   
   **Delete this entire block.**

2. **Remove GitHub dual-write block** (lines ~323-346):
   
   **Find this block:**
   ```javascript
   // PHASE_3: Dual-write strategy - also save GitHub data to new employee_raw_data table
   // This is non-critical - if it fails, OAuth flow continues normally
   try {
     const EmployeeRepository = require('../infrastructure/EmployeeRepository');
     const EmployeeRawDataRepository = require('../infrastructure/EmployeeRawDataRepository');
     const employeeRepo = new EmployeeRepository();
     const rawDataRepo = new EmployeeRawDataRepository();
     
     // Get the saved GitHub data from the employee record
     const employee = await employeeRepo.findById(result.employee.id);
     if (employee && employee.github_data) {
       const githubData = typeof employee.github_data === 'string' 
         ? JSON.parse(employee.github_data) 
         : employee.github_data;
       
       await rawDataRepo.createOrUpdate(result.employee.id, 'github', githubData);
       console.log('[OAuthController] ✅ PHASE_3: Saved GitHub data to employee_raw_data table');
     }
   } catch (error) {
     // PHASE_3: Non-critical - log warning but don't break OAuth flow
     console.warn('[OAuthController] ⚠️  PHASE_3: Failed to save GitHub data to new table (non-critical):', error.message);
     // Continue with existing OAuth flow
   }
   ```
   
   **Delete this entire block.**

---

### Step 3: Revert index.js

**Option A: Using Git (Recommended)**

If you have the file in git history:

```bash
git checkout HEAD -- backend/src/index.js
```

**Option B: Manual Reversion**

Open `backend/src/index.js` and:

1. **Remove imports** (line ~30):
   
   **Find this block:**
   ```javascript
   const UniversalEndpointController = require('./presentation/UniversalEndpointController');
   const AdminController = require('./presentation/AdminController');
   // PHASE_3: Import new controllers for extended enrichment flow
   const PDFUploadController = require('./presentation/PDFUploadController');
   const ManualDataController = require('./presentation/ManualDataController');
   ```
   
   **Replace with:**
   ```javascript
   const UniversalEndpointController = require('./presentation/UniversalEndpointController');
   const AdminController = require('./presentation/AdminController');
   ```

2. **Remove variable declarations** (line ~150):
   
   **Find this block:**
   ```javascript
   // Initialize controllers with error handling
   let companyRegistrationController, companyVerificationController, csvUploadController;
   // PHASE_3: Initialize new controllers for extended enrichment flow
   let pdfUploadController, manualDataController;
   let companyProfileController, employeeController, authController, oauthController;
   ```
   
   **Replace with:**
   ```javascript
   // Initialize controllers with error handling
   let companyRegistrationController, companyVerificationController, csvUploadController;
   let companyProfileController, employeeController, authController, oauthController;
   ```

3. **Remove controller initialization** (line ~183):
   
   **Find this block:**
   ```javascript
   universalEndpointController = initController('UniversalEndpointController', () => new UniversalEndpointController());
   adminController = initController('AdminController', () => new AdminController());
   // PHASE_3: Initialize new controllers for extended enrichment flow
   pdfUploadController = initController('PDFUploadController', () => new PDFUploadController());
   manualDataController = initController('ManualDataController', () => new ManualDataController());
   console.log('[Init] Controller initialization complete');
   ```
   
   **Replace with:**
   ```javascript
   universalEndpointController = initController('UniversalEndpointController', () => new UniversalEndpointController());
   adminController = initController('AdminController', () => new AdminController());
   console.log('[Init] Controller initialization complete');
   ```

4. **Remove routes** (lines ~329-352):
   
   **Find this block:**
   ```javascript
   apiRouter.get('/employees/:employeeId/enrichment-status', authMiddleware, (req, res, next) => {
     enrichmentController.getEnrichmentStatus(req, res, next);
   });

   // PHASE_3: Extended enrichment flow - PDF upload and manual data endpoints
   const multer = require('multer');
   const upload = multer({ 
     dest: 'uploads/',
     limits: { fileSize: 10 * 1024 * 1024 },
     fileFilter: (req, file, cb) => {
       if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
         cb(null, true);
       } else {
         cb(new Error('Only PDF files are allowed'), false);
       }
     }
   });

   // PHASE_3: PDF CV upload endpoint
   apiRouter.post('/employees/:id/upload-cv', authMiddleware, upload.single('cv'), (req, res, next) => {
     try {
       checkController(pdfUploadController, 'PDFUploadController');
       pdfUploadController.uploadCV(req, res, next);
     } catch (error) {
       next(error);
     }
   });

   // PHASE_3: Manual profile data endpoint
   apiRouter.post('/employees/:id/manual-data', authMiddleware, (req, res, next) => {
     try {
       checkController(manualDataController, 'ManualDataController');
       manualDataController.saveManualData(req, res, next);
     } catch (error) {
       next(error);
     }
   });

   // Profile Approval Routes (HR only)
   ```
   
   **Replace with:**
   ```javascript
   apiRouter.get('/employees/:employeeId/enrichment-status', authMiddleware, (req, res, next) => {
     enrichmentController.getEnrichmentStatus(req, res, next);
   });

   // Profile Approval Routes (HR only)
   ```

---

### Step 4: Verify Rollback

1. **Check for remaining Phase 3 references**:
   ```bash
   grep -r "PHASE_3" backend/src/
   ```
   Should return no results (or only in documentation files).

2. **Check for new controller references**:
   ```bash
   grep -r "PDFUploadController" backend/src/
   grep -r "ManualDataController" backend/src/
   grep -r "UploadCVUseCase" backend/src/
   grep -r "SaveManualDataUseCase" backend/src/
   ```
   Should return no results.

3. **Verify code compiles**:
   ```bash
   node -c backend/src/presentation/OAuthController.js
   node -c backend/src/index.js
   ```
   Should exit with code 0 (no errors).

4. **Test OAuth flow**:
   - Connect LinkedIn
   - Connect GitHub
   - Verify enrichment works as before Phase 3
   - Verify data is saved to old columns only

---

## ✅ Rollback Verification Checklist

After completing all steps, verify:

- [ ] `UploadCVUseCase.js` file deleted
- [ ] `SaveManualDataUseCase.js` file deleted
- [ ] `PDFUploadController.js` file deleted
- [ ] `ManualDataController.js` file deleted
- [ ] `OAuthController.js` has no `PHASE_3:` comments (except in docs)
- [ ] `index.js` has no `PHASE_3:` comments (except in docs)
- [ ] `index.js` has no `PDFUploadController` references
- [ ] `index.js` has no `ManualDataController` references
- [ ] Code compiles without errors
- [ ] Existing OAuth enrichment flow works
- [ ] OAuth data saved to old columns only (no new table writes)
- [ ] New endpoints (`/upload-cv`, `/manual-data`) are removed

---

## 🔄 Expected Behavior After Rollback

- ✅ OAuth flow works exactly as before Phase 3
- ✅ OAuth data saved to `employees.linkedin_data` and `employees.github_data` only
- ✅ No dual-write to `employee_raw_data` table
- ✅ No errors in logs related to Phase 3 components
- ✅ System behaves identically to pre-Phase 3 state
- ✅ New endpoints are unavailable (404 errors expected)

---

## ⚠️ Important Notes

1. **Database**: The `employee_raw_data` table from Phase 1 remains untouched. It will simply be unused after rollback.

2. **No Data Loss**: Existing `employees.linkedin_data` and `employees.github_data` columns are preserved and will be used again.

3. **File Uploads**: The `uploads/` directory may contain temporary files. You can clean it up:
   ```bash
   rm -rf backend/uploads/*
   ```

4. **Testing**: Thoroughly test the OAuth flow after rollback to ensure everything works.

---

## 📞 Support

If rollback encounters issues:

1. Check git history for original file versions
2. Verify all `PHASE_3:` comments are removed
3. Ensure no syntax errors after manual edits
4. Test compilation: `node -c backend/src/presentation/OAuthController.js` and `node -c backend/src/index.js`

---

**Rollback Time Estimate**: 5-10 minutes

