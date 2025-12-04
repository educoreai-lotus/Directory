# Phase 3 Modified Lines Reference

This document lists all lines modified in Phase 3 for easy verification and rollback.

---

## 📄 File: `backend/src/presentation/OAuthController.js`

### Lines ~91-114: Added Dual-Write for LinkedIn Data

**Location**: After `handleLinkedInCallback()` receives result from `connectLinkedInUseCase.handleCallback()`

**Original**:
```javascript
      // Handle callback
      const result = await this.connectLinkedInUseCase.handleCallback(code, state);
      console.log('[OAuthController] LinkedIn connected successfully for employee:', result.employee.id);

      // Get full employee data to build user object
```

**Modified** (Phase 3):
```javascript
      // Handle callback
      const result = await this.connectLinkedInUseCase.handleCallback(code, state);
      console.log('[OAuthController] LinkedIn connected successfully for employee:', result.employee.id);

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

      // Get full employee data to build user object
```

**Action for Rollback**: Delete the entire `// PHASE_3:` block (lines ~91-114).

---

### Lines ~323-346: Added Dual-Write for GitHub Data

**Location**: After `handleGitHubCallback()` receives result from `connectGitHubUseCase.handleCallback()`

**Original**:
```javascript
      // Handle callback
      const result = await this.connectGitHubUseCase.handleCallback(code, state);
      console.log('[OAuthController] GitHub connected successfully for employee:', result.employee.id);

      // Get full employee data to build user object
```

**Modified** (Phase 3):
```javascript
      // Handle callback
      const result = await this.connectGitHubUseCase.handleCallback(code, state);
      console.log('[OAuthController] GitHub connected successfully for employee:', result.employee.id);

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

      // Get full employee data to build user object
```

**Action for Rollback**: Delete the entire `// PHASE_3:` block (lines ~323-346).

---

## 📄 File: `backend/src/index.js`

### Line ~30: Added Imports

**Original**:
```javascript
const UniversalEndpointController = require('./presentation/UniversalEndpointController');
const AdminController = require('./presentation/AdminController');
```

**Modified** (Phase 3):
```javascript
const UniversalEndpointController = require('./presentation/UniversalEndpointController');
const AdminController = require('./presentation/AdminController');
// PHASE_3: Import new controllers for extended enrichment flow
const PDFUploadController = require('./presentation/PDFUploadController');
const ManualDataController = require('./presentation/ManualDataController');
```

**Action for Rollback**: Delete the 3 new lines (comment + 2 requires).

---

### Line ~150-151: Added Controller Variable Declarations

**Original**:
```javascript
// Initialize controllers with error handling
let companyRegistrationController, companyVerificationController, csvUploadController;
let companyProfileController, employeeController, authController, oauthController;
```

**Modified** (Phase 3):
```javascript
// Initialize controllers with error handling
let companyRegistrationController, companyVerificationController, csvUploadController;
// PHASE_3: Initialize new controllers for extended enrichment flow
let pdfUploadController, manualDataController;
let companyProfileController, employeeController, authController, oauthController;
```

**Action for Rollback**: Delete the 2 new lines (comment + variable declaration).

---

### Lines ~183-184: Added Controller Initialization

**Original**:
```javascript
universalEndpointController = initController('UniversalEndpointController', () => new UniversalEndpointController());
adminController = initController('AdminController', () => new AdminController());
console.log('[Init] Controller initialization complete');
```

**Modified** (Phase 3):
```javascript
universalEndpointController = initController('UniversalEndpointController', () => new UniversalEndpointController());
adminController = initController('AdminController', () => new AdminController());
// PHASE_3: Initialize new controllers for extended enrichment flow
pdfUploadController = initController('PDFUploadController', () => new PDFUploadController());
manualDataController = initController('ManualDataController', () => new ManualDataController());
console.log('[Init] Controller initialization complete');
```

**Action for Rollback**: Delete the 3 new lines (comment + 2 initializations).

---

### Lines ~329-352: Added New Routes

**Original**:
```javascript
apiRouter.get('/employees/:employeeId/enrichment-status', authMiddleware, (req, res, next) => {
  enrichmentController.getEnrichmentStatus(req, res, next);
});

// Profile Approval Routes (HR only)
```

**Modified** (Phase 3):
```javascript
apiRouter.get('/employees/:employeeId/enrichment-status', authMiddleware, (req, res, next) => {
  enrichmentController.getEnrichmentStatus(req, res, next);
});

// PHASE_3: Extended enrichment flow - PDF upload and manual data endpoints
const multer = require('multer');
const upload = multer({ 
  dest: 'uploads/', // Temporary directory for file uploads
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Only accept PDF files
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

**Action for Rollback**: Delete the entire `// PHASE_3:` block (lines ~329-352), including multer setup and both routes.

---

## 📊 Summary

**Total Files Modified**: 2
- `backend/src/presentation/OAuthController.js` (2 locations)
- `backend/src/index.js` (4 locations)

**Total Lines Added**: ~80 lines
**Total Lines Modified**: ~10 lines
**Total Lines Deleted**: 0 (all changes are additive)

**All Changes Marked With**: `// PHASE_3:` comments

---

## ✅ Verification Commands

To verify all Phase 3 changes are present:

```bash
# Count Phase 3 comments
grep -c "PHASE_3:" backend/src/presentation/OAuthController.js
grep -c "PHASE_3:" backend/src/index.js

# List all Phase 3 changes
grep -n "PHASE_3:" backend/src/presentation/OAuthController.js
grep -n "PHASE_3:" backend/src/index.js

# Check for new controller references
grep -n "PDFUploadController" backend/src/index.js
grep -n "ManualDataController" backend/src/index.js
```

---

## 🔄 Quick Rollback Reference

1. **Delete new files**: `PDFUploadController.js`, `ManualDataController.js`, `UploadCVUseCase.js`, `SaveManualDataUseCase.js`
2. **Remove imports** (index.js line ~30): Delete 3 lines
3. **Remove variable declarations** (index.js line ~150): Delete 2 lines
4. **Remove controller initialization** (index.js line ~183): Delete 3 lines
5. **Remove routes** (index.js lines ~329-352): Delete entire block (~24 lines)
6. **Remove LinkedIn dual-write** (OAuthController lines ~91-114): Delete entire block
7. **Remove GitHub dual-write** (OAuthController lines ~323-346): Delete entire block

