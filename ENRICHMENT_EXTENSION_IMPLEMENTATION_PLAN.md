# Implementation Plan: Extended Enrichment Flow with PDF/Manual/Skip Options

## 📋 Overview

Extend the current OAuth-only enrichment flow to support:
1. **PDF CV Upload** - Extract structured data from PDF
2. **Manual Profile Form** - User fills fields directly
3. **Skip Enrichment** - Allow users to skip and enrich later
4. **Data Merging** - Intelligently merge all available data sources
5. **Manual Enrichment Trigger** - Only enrich when user clicks "Continue"

---

## 🗄️ DATABASE CHANGES

### 1. New Table: `employee_raw_data`

**Migration File**: `database/migrations/002_add_employee_raw_data.sql`

```sql
CREATE TYPE raw_data_source AS ENUM ('pdf', 'manual', 'linkedin', 'github', 'merged');

CREATE TABLE employee_raw_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    source raw_data_source NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, source)
);

CREATE INDEX idx_employee_raw_data_employee_id ON employee_raw_data(employee_id);
CREATE INDEX idx_employee_raw_data_source ON employee_raw_data(source);
```

**Key Points**:
- Each source (PDF/manual/LinkedIn/GitHub) has its own row
- Merged data is stored as a separate row with `source='merged'`
- `UNIQUE(employee_id, source)` ensures one row per source per employee

### 2. Remove Raw Data from Employees Table

**Migration**: Remove `linkedin_data` and `github_data` JSONB columns from `employees` table

**Note**: This is a breaking change. Migration should:
- Copy existing `linkedin_data` → `employee_raw_data` (source='linkedin')
- Copy existing `github_data` → `employee_raw_data` (source='github')
- Then drop the columns

**Alternative (Safer)**: Keep columns for now, but stop using them. Mark for removal in future migration.

---

## 🔧 BACKEND IMPLEMENTATION

### 1. New Repository: `EmployeeRawDataRepository`

**File**: `backend/src/infrastructure/EmployeeRawDataRepository.js`

**Methods**:
- `create(employeeId, source, data)` - Save raw data
- `findByEmployeeId(employeeId)` - Get all raw data for employee
- `findByEmployeeIdAndSource(employeeId, source)` - Get specific source
- `update(employeeId, source, data)` - Update existing raw data
- `deleteByEmployeeIdAndSource(employeeId, source)` - Delete specific source
- `deleteByEmployeeId(employeeId)` - Delete all raw data for employee

### 2. PDF Processing Service

**File**: `backend/src/infrastructure/PDFExtractionService.js`

**Dependencies**: Need to add PDF parsing library (e.g., `pdf-parse` or `pdfjs-dist`)

**Methods**:
- `extractTextFromPDF(buffer)` - Extract raw text from PDF
- `parseCVText(text)` - Parse text into structured JSON:
  ```javascript
  {
    work_experience: [...],
    skills: [...],
    education: [...],
    languages: [...]
  }
  ```
- `sanitizePII(data)` - Remove phone, email, ID number, address

**Note**: PDF parsing is complex. For MVP, use simple text extraction + regex patterns. Can enhance later with AI.

### 3. New Use Case: `MergeRawDataUseCase`

**File**: `backend/src/application/MergeRawDataUseCase.js`

**Logic**:
1. Load all raw_data entries for employee (PDF, manual, LinkedIn, GitHub)
2. Merge intelligently:
   - **Manual data** overrides missing fields from PDF
   - **LinkedIn** adds: profile headline, summary, experience, skills
   - **GitHub** adds: repositories (as projects), languages, contributions
   - **PDF** adds: work experience, education, skills, languages
3. Create merged object:
   ```javascript
   {
     work_experience: [...], // From PDF + LinkedIn + Manual
     skills: [...],           // Combined from all sources
     education: [...],        // From PDF + LinkedIn + Manual
     languages: [...],       // Combined from all sources
     projects: [...],        // From GitHub repositories
     linkedin_profile: {...}, // LinkedIn-specific data
     github_profile: {...}    // GitHub-specific data
   }
   ```
4. Save to `employee_raw_data` with `source='merged'`
5. Return merged data

### 4. Updated Use Case: `EnrichProfileUseCase`

**Changes**:
- **Remove requirement** for both LinkedIn AND GitHub
- **Before enrichment**: Always call `MergeRawDataUseCase.execute(employeeId)`
- **Use merged data** instead of `linkedin_data` + `github_data`
- **Send merged data** to OpenAI for bio/project summaries
- **After enrichment**: Mark `enrichment_completed = TRUE`

**New Method**: `isReadyForEnrichment(employeeId)`
- Returns `true` if:
  - At least ONE data source exists (PDF OR manual OR LinkedIn OR GitHub)
  - `enrichment_completed = FALSE`

### 5. New Controllers

#### A. PDF Upload Controller

**File**: `backend/src/presentation/PDFUploadController.js`

**Endpoint**: `POST /api/v1/employees/:id/upload-cv`

**Flow**:
1. Validate file is PDF (check MIME type + extension)
2. Extract text using `PDFExtractionService`
3. Parse and structure data
4. Sanitize PII
5. Save to `employee_raw_data` (source='pdf')
6. Return success

**Middleware**: `multer` for file upload (already in project)

#### B. Manual Data Controller

**File**: `backend/src/presentation/ManualDataController.js`

**Endpoint**: `POST /api/v1/employees/:id/manual-data`

**Body**:
```json
{
  work_experience: "string",
  skills: "comma,separated,list",
  languages: "English, Spanish",
  education: "string"
}
```

**Flow**:
1. Validate body
2. Structure as JSON:
   ```javascript
   {
     work_experience: [...], // Split by newlines or bullets
     skills: [...],           // Split by comma
     languages: [...],       // Split by comma
     education: [...]
   }
   ```
3. Save to `employee_raw_data` (source='manual')
4. Return success

### 6. Update OAuth Controllers

**Files**: 
- `backend/src/presentation/OAuthController.js` (LinkedIn callback)
- `backend/src/presentation/OAuthController.js` (GitHub callback)

**Changes**:
- After fetching LinkedIn/GitHub data, save to `employee_raw_data`:
  - LinkedIn → `source='linkedin'`
  - GitHub → `source='github'`
- **DO NOT** auto-trigger enrichment
- **DO NOT** save to `employees.linkedin_data` / `employees.github_data` (deprecated)

### 7. Update Routes

**File**: `backend/src/index.js`

**Add**:
```javascript
// PDF Upload
apiRouter.post('/employees/:id/upload-cv', authMiddleware, upload.single('cv'), (req, res, next) => {
  pdfUploadController.uploadCV(req, res, next);
});

// Manual Data
apiRouter.post('/employees/:id/manual-data', authMiddleware, (req, res, next) => {
  manualDataController.saveManualData(req, res, next);
});
```

---

## 🎨 FRONTEND IMPLEMENTATION

### 1. Update `EnrichProfilePage.js`

**Changes**:
- Add state for:
  - `pdfUploaded` (boolean)
  - `manualDataCompleted` (boolean)
  - `enrichmentStatus` ('not_started' | 'in_progress' | 'completed')
- Add sections:
  - **Upload CV Section** (new component)
  - **Manual Form Section** (new component)
  - **Skip Link** (simple link to `/employee/:id`)
- Update connection status display:
  - Show checkmarks for: LinkedIn ✓, GitHub ✓, PDF ✓, Manual ✓
- Update "Continue" button:
  - Only enabled if at least ONE data source exists
  - On click: Call `POST /api/v1/employees/:id/enrich` (triggers enrichment)
  - Show loading state during enrichment
  - Redirect to profile after completion

### 2. New Component: `UploadCVSection.js`

**File**: `frontend/src/components/UploadCVSection.js`

**Features**:
- File input (accept PDF only)
- Upload button
- Progress indicator
- Success/error messages
- Show uploaded file name if already uploaded

**API Call**: `POST /api/v1/employees/:id/upload-cv` (multipart/form-data)

### 3. New Component: `ManualProfileForm.js`

**File**: `frontend/src/components/ManualProfileForm.js`

**Fields**:
- Work Experience (textarea)
- Skills (textarea, comma-separated)
- Languages (textarea, comma-separated)
- Education (textarea)
- Save button

**API Call**: `POST /api/v1/employees/:id/manual-data`

**State Management**:
- Show "Saved" indicator if data exists
- Allow editing (updates existing data)

### 4. Update Employee Profile Page

**File**: `frontend/src/pages/EmployeeProfilePage.js` (or similar)

**Changes**:
- Check `enrichment_completed` status
- If `false`, show banner:
  ```
  "Complete Profile Enrichment"
  [Link to /enrich]
  ```
- Profile displays normally (with or without enriched data)

### 5. New Service: `enrichmentService.js`

**File**: `frontend/src/services/enrichmentService.js`

**Methods**:
- `uploadCV(employeeId, file)` - Upload PDF
- `saveManualData(employeeId, data)` - Save manual form
- `getEnrichmentStatus(employeeId)` - Check status
- `triggerEnrichment(employeeId)` - Call enrich endpoint

---

## 🔄 FLOW DIAGRAMS

### Current Flow (OAuth Only)
```
User → EnrichProfilePage → Connect LinkedIn → Connect GitHub → Auto-enrich → Profile
```

### New Flow (Multiple Sources)
```
User → EnrichProfilePage
  ├─→ Connect LinkedIn (optional)
  ├─→ Connect GitHub (optional)
  ├─→ Upload PDF (optional)
  ├─→ Fill Manual Form (optional)
  └─→ Skip for now (optional)

User clicks "Continue" → Merge all data → AI Enrichment → Profile
```

### Data Merging Flow
```
MergeRawDataUseCase.execute(employeeId):
  1. Load: PDF data, Manual data, LinkedIn data, GitHub data
  2. Merge intelligently (manual overrides, combine arrays)
  3. Save merged object (source='merged')
  4. Return merged data
```

### Enrichment Flow
```
EnrichProfileUseCase.enrichProfile(employeeId):
  1. Check: enrichment_completed = FALSE
  2. Call: MergeRawDataUseCase.execute(employeeId)
  3. Get: merged raw data
  4. Send to OpenAI: Generate bio, project summaries, value proposition
  5. Update: employees table (bio, project_summaries, value_proposition)
  6. Mark: enrichment_completed = TRUE
  7. Create: approval request
```

---

## 📦 DEPENDENCIES

### Backend
- `pdf-parse` or `pdfjs-dist` - PDF text extraction
- `multer` - Already installed, for file uploads

### Frontend
- No new dependencies (use existing React patterns)

---

## ✅ TESTING CHECKLIST

### Backend
- [ ] PDF upload accepts only PDF files
- [ ] PDF extraction works for various CV formats
- [ ] PII sanitization removes sensitive data
- [ ] Manual form saves correctly
- [ ] OAuth saves to new table (not old columns)
- [ ] MergeRawDataUseCase merges correctly:
  - [ ] Manual overrides PDF
  - [ ] LinkedIn + GitHub combined
  - [ ] Empty sources handled
- [ ] EnrichProfileUseCase works with merged data
- [ ] Enrichment can be re-triggered (if data changes)

### Frontend
- [ ] EnrichProfilePage shows all sections
- [ ] PDF upload works
- [ ] Manual form saves
- [ ] Skip link navigates correctly
- [ ] Continue button triggers enrichment
- [ ] Profile page shows "Complete Enrichment" if not done
- [ ] OAuth flow still works (backward compatible)

---

## 🚨 BREAKING CHANGES & MIGRATION

### Breaking Changes
1. **OAuth auto-enrichment removed** - Enrichment only happens on "Continue" click
2. **`employees.linkedin_data` / `github_data` deprecated** - Data now in `employee_raw_data` table

### Migration Strategy
1. **Phase 1**: Add new table, keep old columns
2. **Phase 2**: Copy existing data to new table
3. **Phase 3**: Update code to use new table
4. **Phase 4**: (Future) Remove old columns

---

## 📝 IMPLEMENTATION ORDER

### Phase 1: Database & Repository
1. Create migration for `employee_raw_data` table
2. Create `EmployeeRawDataRepository`
3. Test repository methods

### Phase 2: Backend Core Logic
4. Create `MergeRawDataUseCase`
5. Update `EnrichProfileUseCase` to use merged data
6. Create `PDFExtractionService`
7. Test merging logic

### Phase 3: Backend Endpoints
8. Create `PDFUploadController`
9. Create `ManualDataController`
10. Update `OAuthController` to save to new table
11. Add routes
12. Test endpoints

### Phase 4: Frontend Components
13. Create `UploadCVSection` component
14. Create `ManualProfileForm` component
15. Create `enrichmentService`
16. Update `EnrichProfilePage`
17. Update Employee Profile page
18. Test UI flows

### Phase 5: Integration & Testing
19. End-to-end testing
20. Edge case handling
21. Error handling
22. Documentation updates

---

## ⚠️ IMPORTANT NOTES

1. **Backward Compatibility**: OAuth flow must still work for existing users
2. **Data Migration**: Existing `linkedin_data` / `github_data` must be preserved
3. **PDF Parsing**: Start simple (text extraction), can enhance with AI later
4. **PII Sanitization**: Critical for privacy - remove phone, email, ID, address
5. **Re-enrichment**: Users can update data and re-trigger enrichment
6. **Skip Option**: Users can skip and return later (no forced enrichment)

---

## 📄 FILES TO CREATE/MODIFY

### New Files (Backend)
- `database/migrations/002_add_employee_raw_data.sql`
- `backend/src/infrastructure/EmployeeRawDataRepository.js`
- `backend/src/infrastructure/PDFExtractionService.js`
- `backend/src/application/MergeRawDataUseCase.js`
- `backend/src/presentation/PDFUploadController.js`
- `backend/src/presentation/ManualDataController.js`

### Modified Files (Backend)
- `backend/src/application/EnrichProfileUseCase.js`
- `backend/src/presentation/OAuthController.js`
- `backend/src/index.js` (routes)
- `backend/package.json` (add pdf-parse dependency)

### New Files (Frontend)
- `frontend/src/components/UploadCVSection.js`
- `frontend/src/components/ManualProfileForm.js`
- `frontend/src/services/enrichmentService.js`

### Modified Files (Frontend)
- `frontend/src/pages/EnrichProfilePage.js`
- `frontend/src/pages/EmployeeProfilePage.js` (or similar)

---

**Ready for Implementation?** Please confirm this plan before I proceed with code.

