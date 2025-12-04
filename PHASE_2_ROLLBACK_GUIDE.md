# Phase 2 Rollback Guide

## 🚨 Complete Rollback Instructions

This guide provides step-by-step instructions to completely remove Phase 2 changes and restore the system to its pre-Phase 2 state.

---

## ⚠️ Before You Begin

**Verify Current State**:
- Check that Phase 2 is actually deployed
- Ensure you have a backup of the current codebase
- Test that existing OAuth flow works before rollback

---

## 📋 Step-by-Step Rollback

### Step 1: Remove New Files

Delete the two new files created in Phase 2:

```bash
# From project root
rm backend/src/application/MergeRawDataUseCase.js
rm backend/src/infrastructure/PDFExtractionService.js
```

**Files to delete**:
- ✅ `backend/src/application/MergeRawDataUseCase.js`
- ✅ `backend/src/infrastructure/PDFExtractionService.js`

---

### Step 2: Revert EnrichProfileUseCase.js

**Option A: Using Git (Recommended)**

If you have the file in git history:

```bash
git checkout HEAD -- backend/src/application/EnrichProfileUseCase.js
```

**Option B: Manual Reversion**

Open `backend/src/application/EnrichProfileUseCase.js` and:

1. **Remove the import** (line ~9):
   ```javascript
   // PHASE_2: Import MergeRawDataUseCase for extended enrichment flow
   const MergeRawDataUseCase = require('./MergeRawDataUseCase');
   ```
   **Delete this entire line.**

2. **Remove from constructor** (line ~17):
   ```javascript
   // PHASE_2: Initialize MergeRawDataUseCase for extended enrichment flow
   this.mergeRawDataUseCase = new MergeRawDataUseCase();
   ```
   **Delete this entire line.**

3. **Remove mergeRawDataBeforeEnrichment method** (lines ~245-256):
   ```javascript
   /**
    * PHASE_2: Merge raw data before enrichment
    * ...
    */
   async mergeRawDataBeforeEnrichment(employeeId) {
     // ... entire method ...
   }
   ```
   **Delete this entire method.**

4. **Restore enrichProfile method** (lines ~48-64):
   
   **Find this block:**
   ```javascript
   // PHASE_2: Try to merge raw data from new sources...
   let mergedData = null;
   let linkedinData = null;
   let githubData = null;
   
   try {
     mergedData = await this.mergeRawDataBeforeEnrichment(employeeId);
     // ... more Phase 2 code ...
   } catch (error) {
     // ... fallback code ...
   }

   // PHASE_2: Fallback to existing OAuth data...
   if (!mergedData) {
     // ... existing OAuth checks ...
   }
   ```
   
   **Replace with original:**
   ```javascript
   // Check if both LinkedIn and GitHub are connected
   if (!employee.linkedin_data || !employee.github_data) {
     console.error('[EnrichProfileUseCase] ❌ Missing OAuth data - LinkedIn:', !!employee.linkedin_data, 'GitHub:', !!employee.github_data);
     throw new Error('Both LinkedIn and GitHub must be connected before enrichment');
   }
   
   console.log('[EnrichProfileUseCase] ✅ All checks passed, proceeding with enrichment...');

   // Parse stored data
   const linkedinData = typeof employee.linkedin_data === 'string' 
     ? JSON.parse(employee.linkedin_data) 
     : employee.linkedin_data;
   
   const githubData = typeof employee.github_data === 'string'
     ? JSON.parse(employee.github_data)
     : employee.github_data;
   ```

5. **Restore Skills Engine rawData** (line ~185):
   
   **Find this block:**
   ```javascript
   // PHASE_2: Prepare raw data for Skills Engine...
   const rawData = mergedData ? {
     linkedin: mergedData.linkedin_profile || linkedinData,
     github: mergedData.github_profile || githubData,
     // ... more fields ...
   } : {
     linkedin: linkedinData,
     github: githubData
   };
   ```
   
   **Replace with original:**
   ```javascript
   // Prepare raw data for Skills Engine
   const rawData = {
     linkedin: linkedinData,
     github: githubData
   };
   ```

6. **Restore isReadyForEnrichment method** (lines ~250-290):
   
   **Find this block:**
   ```javascript
   /**
    * Check if employee is ready for enrichment
    * PHASE_2: Now checks for new data sources...
    */
   async isReadyForEnrichment(employeeId) {
     // ... Phase 2 code with new data source checks ...
   }
   ```
   
   **Replace with original:**
   ```javascript
   /**
    * Check if employee is ready for enrichment (both OAuth connections complete)
    * @param {string} employeeId - Employee UUID
    * @returns {Promise<boolean>} True if ready for enrichment
    */
   async isReadyForEnrichment(employeeId) {
     console.log('[EnrichProfileUseCase] Checking if ready for enrichment...');
     console.log('[EnrichProfileUseCase] Employee ID:', employeeId);
     
     const employee = await this.employeeRepository.findById(employeeId);
     if (!employee) {
       console.log('[EnrichProfileUseCase] ❌ Employee not found');
       return false;
     }

     const hasLinkedIn = !!employee.linkedin_data;
     const hasGitHub = !!employee.github_data;
     const notCompleted = !employee.enrichment_completed;
     
     console.log('[EnrichProfileUseCase] Employee:', employee.email);
     console.log('[EnrichProfileUseCase] Has LinkedIn data:', hasLinkedIn);
     console.log('[EnrichProfileUseCase] Has GitHub data:', hasGitHub);
     console.log('[EnrichProfileUseCase] Enrichment not completed:', notCompleted);
     
     const isReady = !!(hasLinkedIn && hasGitHub && notCompleted);
     console.log('[EnrichProfileUseCase] Ready for enrichment:', isReady);
     
     return isReady;
   }
   ```

---

### Step 3: Remove Dependency from package.json

Remove the `pdf-parse` dependency:

```bash
cd backend
npm uninstall pdf-parse
```

**Or manually edit `backend/package.json`**:

Find this line:
```json
"pdf-parse": "^1.1.1"
```

**Delete this entire line** (including the comma before it if it's not the last dependency).

---

### Step 4: Verify Rollback

1. **Check for remaining Phase 2 references**:
   ```bash
   grep -r "PHASE_2" backend/src/
   ```
   Should return no results (or only in documentation files).

2. **Check for MergeRawDataUseCase references**:
   ```bash
   grep -r "MergeRawDataUseCase" backend/src/
   ```
   Should return no results.

3. **Check for PDFExtractionService references**:
   ```bash
   grep -r "PDFExtractionService" backend/src/
   ```
   Should return no results.

4. **Verify code compiles**:
   ```bash
   node -c backend/src/application/EnrichProfileUseCase.js
   ```
   Should exit with code 0 (no errors).

5. **Test OAuth flow**:
   - Connect LinkedIn
   - Connect GitHub
   - Verify enrichment works as before Phase 2

---

## ✅ Rollback Verification Checklist

After completing all steps, verify:

- [ ] `MergeRawDataUseCase.js` file deleted
- [ ] `PDFExtractionService.js` file deleted
- [ ] `EnrichProfileUseCase.js` has no `PHASE_2:` comments (except in docs)
- [ ] `EnrichProfileUseCase.js` has no `MergeRawDataUseCase` references
- [ ] `EnrichProfileUseCase.js` has no `PDFExtractionService` references
- [ ] `package.json` has no `pdf-parse` dependency
- [ ] Code compiles without errors
- [ ] Existing OAuth enrichment flow works
- [ ] `isReadyForEnrichment()` only checks LinkedIn + GitHub (old behavior)
- [ ] `enrichProfile()` only uses `linkedin_data` + `github_data` (old behavior)

---

## 🔄 Expected Behavior After Rollback

- ✅ OAuth flow works exactly as before Phase 2
- ✅ Enrichment requires both LinkedIn AND GitHub (no PDF/manual option)
- ✅ `isReadyForEnrichment()` returns true only if both OAuth connected
- ✅ No errors in logs related to Phase 2 components
- ✅ System behaves identically to pre-Phase 2 state

---

## ⚠️ Important Notes

1. **Database**: The `employee_raw_data` table from Phase 1 remains untouched. It will simply be unused after rollback.

2. **No Data Loss**: Existing `employees.linkedin_data` and `employees.github_data` columns are preserved and will be used again.

3. **Dependencies**: After removing `pdf-parse`, run `npm install` to update `package-lock.json`.

4. **Testing**: Thoroughly test the OAuth flow after rollback to ensure everything works.

---

## 📞 Support

If rollback encounters issues:

1. Check git history for original file versions
2. Verify all `PHASE_2:` comments are removed
3. Ensure no syntax errors after manual edits
4. Test compilation: `node -c backend/src/application/EnrichProfileUseCase.js`

---

**Rollback Time Estimate**: 5-10 minutes

