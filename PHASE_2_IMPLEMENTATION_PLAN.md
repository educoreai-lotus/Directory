# Phase 2 Implementation Plan: Core Backend Logic

## 📋 Overview

Phase 2 adds the core logic for merging raw data and extracting PDF content, without breaking existing enrichment flow.

---

## 📁 Files to be Created

### 1. `backend/src/application/MergeRawDataUseCase.js`
**Purpose**: Intelligently merge raw data from all sources (PDF, manual, LinkedIn, GitHub)  
**Risk Level**: 🟢 **LOW** - New file, no dependencies on existing code  
**Reversibility**: ✅ **FULLY REVERSIBLE** - Simply delete the file

### 2. `backend/src/infrastructure/PDFExtractionService.js`
**Purpose**: Extract and parse text from PDF files, sanitize PII  
**Risk Level**: 🟢 **LOW** - New file, isolated service  
**Reversibility**: ✅ **FULLY REVERSIBLE** - Simply delete the file

### 3. `backend/src/application/MergeRawDataUseCase_ROLLBACK.md`
**Purpose**: Documentation on how to remove MergeRawDataUseCase  
**Risk Level**: 🟢 **NONE** - Documentation only

### 4. `backend/src/infrastructure/PDFExtractionService_ROLLBACK.md`
**Purpose**: Documentation on how to remove PDFExtractionService  
**Risk Level**: 🟢 **NONE** - Documentation only

---

## 📝 Files to be Modified

### 1. `backend/src/application/EnrichProfileUseCase.js`
**Changes**:
- **ADD** new method: `mergeRawDataBeforeEnrichment(employeeId)` - calls MergeRawDataUseCase
- **MODIFY** `enrichProfile()` method:
  - **BEFORE** existing logic: Call merge method IF new table has data
  - **FALLBACK**: If merge fails or no new data, use existing `linkedin_data` + `github_data` (backward compatible)
- **MODIFY** `isReadyForEnrichment()` method:
  - **ADD** check for new raw_data sources (PDF, manual)
  - **KEEP** existing LinkedIn/GitHub checks (backward compatible)

**Risk Level**: 🟡 **MEDIUM** - Modifies existing use case, but with fallbacks  
**Reversibility**: ✅ **REVERSIBLE** - Changes are additive with fallbacks

**Rollback Strategy**:
- Remove merge method call
- Restore original `enrichProfile()` logic
- Restore original `isReadyForEnrichment()` logic
- All changes will be clearly marked with comments: `// PHASE_2: ...`

### 2. `backend/package.json`
**Changes**:
- **ADD** dependency: `pdf-parse` (for PDF text extraction)

**Risk Level**: 🟢 **LOW** - Only adds dependency, doesn't break existing code  
**Reversibility**: ✅ **FULLY REVERSIBLE** - Remove dependency line

---

## 🔄 Rollback Path for Phase 2

### Step 1: Remove New Files
```bash
# Delete new files
rm backend/src/application/MergeRawDataUseCase.js
rm backend/src/infrastructure/PDFExtractionService.js
```

### Step 2: Revert EnrichProfileUseCase.js
**Manual Steps**:
1. Open `backend/src/application/EnrichProfileUseCase.js`
2. Remove all lines marked with `// PHASE_2: ...` comments
3. Restore original `enrichProfile()` method (remove merge call)
4. Restore original `isReadyForEnrichment()` method (remove new source checks)

**Or use git**:
```bash
git checkout HEAD -- backend/src/application/EnrichProfileUseCase.js
```

### Step 3: Remove Dependency
```bash
# Remove pdf-parse from package.json
npm uninstall pdf-parse
```

### Step 4: Verify Rollback
- Existing OAuth flow should work exactly as before
- No references to MergeRawDataUseCase or PDFExtractionService
- All Phase 2 code removed

---

## 🛡️ Safety Measures

### 1. Backward Compatibility
- **EnrichProfileUseCase** will check for new data sources FIRST
- **If new sources exist**: Use merged data
- **If new sources don't exist**: Fall back to existing `linkedin_data` + `github_data`
- **Result**: Existing OAuth flow continues to work unchanged

### 2. Code Marking
- All Phase 2 changes will be marked with `// PHASE_2: ...` comments
- Easy to identify and remove during rollback

### 3. No Breaking Changes
- No removal of existing methods
- No changes to method signatures
- No changes to existing database columns
- No changes to existing API contracts

### 4. Graceful Degradation
- If PDF extraction fails → Continue without PDF data
- If merge fails → Fall back to existing OAuth data
- If new repository fails → Use existing columns

---

## 📊 Risk Assessment

| Component | Risk Level | Impact if Broken | Rollback Time |
|-----------|------------|------------------|---------------|
| MergeRawDataUseCase | 🟢 LOW | New feature doesn't work | < 1 min |
| PDFExtractionService | 🟢 LOW | PDF upload doesn't work | < 1 min |
| EnrichProfileUseCase changes | 🟡 MEDIUM | Existing enrichment might break | < 5 min |
| package.json dependency | 🟢 LOW | No impact on existing code | < 1 min |

**Overall Risk**: 🟡 **MEDIUM-LOW**
- New code is isolated and reversible
- Existing code has fallbacks
- No database changes
- No API contract changes

---

## 🔍 What Will NOT Change

✅ **Existing OAuth flow** - Completely untouched  
✅ **Existing `employees.linkedin_data` column** - Still used as fallback  
✅ **Existing `employees.github_data` column** - Still used as fallback  
✅ **Existing `EnrichProfileUseCase.enrichProfile()` signature** - Unchanged  
✅ **Existing API endpoints** - No changes  
✅ **Existing frontend** - No changes in Phase 2  

---

## 📋 Implementation Details

### MergeRawDataUseCase.js Structure
```javascript
class MergeRawDataUseCase {
  constructor() {
    this.rawDataRepository = new EmployeeRawDataRepository();
  }
  
  async execute(employeeId) {
    // 1. Load all raw data sources
    // 2. Merge intelligently
    // 3. Save merged result
    // 4. Return merged data
  }
}
```

**Key Features**:
- Handles missing sources gracefully
- Manual data overrides PDF data
- Combines arrays intelligently
- Returns null if no data exists (allows fallback)

### PDFExtractionService.js Structure
```javascript
class PDFExtractionService {
  async extractTextFromPDF(buffer) { }
  async parseCVText(text) { }
  sanitizePII(data) { }
}
```

**Key Features**:
- Uses `pdf-parse` library
- Simple regex-based parsing (can enhance later)
- Removes phone, email, ID, address
- Returns structured JSON

### EnrichProfileUseCase.js Changes
```javascript
// PHASE_2: Add merge method
async mergeRawDataBeforeEnrichment(employeeId) {
  try {
    const mergeUseCase = new MergeRawDataUseCase();
    return await mergeUseCase.execute(employeeId);
  } catch (error) {
    console.warn('[EnrichProfileUseCase] Merge failed, using fallback:', error);
    return null; // Signal to use fallback
  }
}

// PHASE_2: Modify enrichProfile (with fallback)
async enrichProfile(employeeId) {
  // ... existing checks ...
  
  // PHASE_2: Try to merge new raw data sources
  let mergedData = await this.mergeRawDataBeforeEnrichment(employeeId);
  
  // PHASE_2: Fallback to existing columns if merge failed or no new data
  if (!mergedData) {
    // Use existing linkedin_data + github_data (backward compatible)
    mergedData = {
      linkedin: linkedinData,
      github: githubData
    };
  }
  
  // ... rest of existing logic uses mergedData ...
}
```

---

## ✅ Rollback Verification Checklist

After rollback, verify:
- [ ] `EnrichProfileUseCase.enrichProfile()` works with OAuth only
- [ ] No references to `MergeRawDataUseCase` in codebase
- [ ] No references to `PDFExtractionService` in codebase
- [ ] `isReadyForEnrichment()` works as before
- [ ] Existing OAuth flow unchanged
- [ ] No errors in logs

---

## 🚦 Approval Required

**Before I proceed with Phase 2 implementation, please confirm:**

1. ✅ File creation plan is acceptable
2. ✅ File modification plan is acceptable (with fallbacks)
3. ✅ Rollback path is clear and safe
4. ✅ Risk level is acceptable
5. ✅ Backward compatibility measures are sufficient

**Type "APPROVED" to proceed with Phase 2 implementation.**

---

## 📝 Summary

**New Files**: 2 (MergeRawDataUseCase, PDFExtractionService)  
**Modified Files**: 2 (EnrichProfileUseCase, package.json)  
**Rollback Time**: < 5 minutes  
**Risk Level**: 🟡 Medium-Low  
**Breaking Changes**: ❌ None  
**Backward Compatible**: ✅ Yes (with fallbacks)

