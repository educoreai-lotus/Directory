# Phase 2 Modified Lines Reference

This document lists all lines modified in Phase 2 for easy verification and rollback.

---

## 📄 File: `backend/src/application/EnrichProfileUseCase.js`

### Line ~9: Added Import
**Original**:
```javascript
const CompanyRepository = require('../infrastructure/CompanyRepository');
```

**Modified** (Phase 2):
```javascript
const CompanyRepository = require('../infrastructure/CompanyRepository');
// PHASE_2: Import MergeRawDataUseCase for extended enrichment flow
const MergeRawDataUseCase = require('./MergeRawDataUseCase');
```

**Action for Rollback**: Delete the 2 new lines (comment + require).

---

### Line ~17: Added to Constructor
**Original**:
```javascript
    this.companyRepository = new CompanyRepository();
  }
```

**Modified** (Phase 2):
```javascript
    this.companyRepository = new CompanyRepository();
    // PHASE_2: Initialize MergeRawDataUseCase for extended enrichment flow
    this.mergeRawDataUseCase = new MergeRawDataUseCase();
  }
```

**Action for Rollback**: Delete the 2 new lines (comment + initialization).

---

### Lines ~48-64: Modified enrichProfile() - Data Source Logic
**Original**:
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

**Modified** (Phase 2):
```javascript
      // PHASE_2: Try to merge raw data from new sources (PDF, manual, LinkedIn, GitHub)
      // This allows enrichment with PDF/manual data even without OAuth
      let mergedData = null;
      let linkedinData = null;
      let githubData = null;
      
      try {
        mergedData = await this.mergeRawDataBeforeEnrichment(employeeId);
        console.log('[EnrichProfileUseCase] ✅ Merged raw data available from new sources');
        
        // Extract LinkedIn and GitHub data from merged result
        if (mergedData?.linkedin_profile) {
          linkedinData = mergedData.linkedin_profile;
        }
        if (mergedData?.github_profile) {
          githubData = mergedData.github_profile;
        }
      } catch (error) {
        console.warn('[EnrichProfileUseCase] ⚠️  Merge failed, falling back to existing OAuth data:', error.message);
        // Fall through to existing logic below
      }

      // PHASE_2: Fallback to existing OAuth data if merge failed or no new sources exist
      // This ensures backward compatibility with existing OAuth-only flow
      if (!mergedData) {
        // Check if both LinkedIn and GitHub are connected (existing requirement)
        if (!employee.linkedin_data || !employee.github_data) {
          console.error('[EnrichProfileUseCase] ❌ Missing OAuth data - LinkedIn:', !!employee.linkedin_data, 'GitHub:', !!employee.github_data);
          throw new Error('Both LinkedIn and GitHub must be connected before enrichment, or provide PDF/manual data');
        }
        
        // Parse stored data (existing logic)
        linkedinData = typeof employee.linkedin_data === 'string' 
          ? JSON.parse(employee.linkedin_data) 
          : employee.linkedin_data;
        
        githubData = typeof employee.github_data === 'string'
          ? JSON.parse(employee.github_data)
          : employee.github_data;
      }
      
      console.log('[EnrichProfileUseCase] ✅ All checks passed, proceeding with enrichment...');
```

**Action for Rollback**: Replace entire Phase 2 block with original code above.

---

### Line ~185: Modified Skills Engine rawData
**Original**:
```javascript
        // Prepare raw data for Skills Engine
        const rawData = {
          linkedin: linkedinData,
          github: githubData
        };
```

**Modified** (Phase 2):
```javascript
        // PHASE_2: Prepare raw data for Skills Engine (use merged data if available, otherwise OAuth data)
        const rawData = mergedData ? {
          linkedin: mergedData.linkedin_profile || linkedinData,
          github: mergedData.github_profile || githubData,
          work_experience: mergedData.work_experience || [],
          skills: mergedData.skills || [],
          education: mergedData.education || [],
          languages: mergedData.languages || [],
          projects: mergedData.projects || []
        } : {
          linkedin: linkedinData,
          github: githubData
        };
```

**Action for Rollback**: Replace with original code above.

---

### Lines ~245-256: Added mergeRawDataBeforeEnrichment() Method
**New Method** (Phase 2):
```javascript
  /**
   * PHASE_2: Merge raw data before enrichment
   * Attempts to merge data from all sources (PDF, manual, LinkedIn, GitHub)
   * Returns null if no new sources exist (allows fallback to OAuth-only flow)
   * @param {string} employeeId - Employee UUID
   * @returns {Promise<Object|null>} Merged data or null
   */
  async mergeRawDataBeforeEnrichment(employeeId) {
    try {
      return await this.mergeRawDataUseCase.execute(employeeId);
    } catch (error) {
      console.warn('[EnrichProfileUseCase] Merge failed, will use fallback:', error.message);
      return null; // Signal to use fallback
    }
  }
```

**Action for Rollback**: Delete entire method.

---

### Lines ~250-290: Modified isReadyForEnrichment() Method
**Original**:
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

**Modified** (Phase 2):
```javascript
  /**
   * Check if employee is ready for enrichment
   * PHASE_2: Now checks for new data sources (PDF, manual) OR existing OAuth data
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

    // PHASE_2: Check for new data sources (PDF, manual, LinkedIn, GitHub in new table)
    let hasNewDataSources = false;
    try {
      const EmployeeRawDataRepository = require('../infrastructure/EmployeeRawDataRepository');
      const rawDataRepo = new EmployeeRawDataRepository();
      hasNewDataSources = await rawDataRepo.hasAnyData(employeeId);
      console.log('[EnrichProfileUseCase] Has new data sources (PDF/manual/OAuth in new table):', hasNewDataSources);
    } catch (error) {
      console.warn('[EnrichProfileUseCase] Could not check new data sources, using fallback:', error.message);
      // Fall through to existing checks
    }

    // Existing OAuth checks (backward compatible)
    const hasLinkedIn = !!employee.linkedin_data;
    const hasGitHub = !!employee.github_data;
    const notCompleted = !employee.enrichment_completed;
    
    console.log('[EnrichProfileUseCase] Employee:', employee.email);
    console.log('[EnrichProfileUseCase] Has LinkedIn data (old):', hasLinkedIn);
    console.log('[EnrichProfileUseCase] Has GitHub data (old):', hasGitHub);
    console.log('[EnrichProfileUseCase] Enrichment not completed:', notCompleted);
    
    // PHASE_2: Ready if new sources exist OR both OAuth connected (backward compatible)
    const isReady = !!(hasNewDataSources || (hasLinkedIn && hasGitHub)) && notCompleted;
    console.log('[EnrichProfileUseCase] Ready for enrichment:', isReady);
    
    return isReady;
  }
```

**Action for Rollback**: Replace entire method with original code above.

---

## 📄 File: `backend/package.json`

### Line ~25: Added Dependency
**Original**:
```json
    "node-fetch": "^2.6.9"
  },
```

**Modified** (Phase 2):
```json
    "node-fetch": "^2.6.9",
    "pdf-parse": "^1.1.1"
  },
```

**Action for Rollback**: Delete the `"pdf-parse": "^1.1.1",` line.

---

## 📊 Summary

**Total Files Modified**: 2
- `backend/src/application/EnrichProfileUseCase.js` (6 locations)
- `backend/package.json` (1 location)

**Total Lines Added**: ~80 lines
**Total Lines Modified**: ~20 lines
**Total Lines Deleted**: 0 (all changes are additive)

**All Changes Marked With**: `// PHASE_2:` comments

---

## ✅ Verification Commands

To verify all Phase 2 changes are present:

```bash
# Count Phase 2 comments
grep -c "PHASE_2:" backend/src/application/EnrichProfileUseCase.js

# List all Phase 2 changes
grep -n "PHASE_2:" backend/src/application/EnrichProfileUseCase.js

# Check for MergeRawDataUseCase references
grep -n "MergeRawDataUseCase" backend/src/application/EnrichProfileUseCase.js

# Check for pdf-parse dependency
grep "pdf-parse" backend/package.json
```

---

## 🔄 Quick Rollback Reference

1. **Delete new files**: `MergeRawDataUseCase.js`, `PDFExtractionService.js`
2. **Remove import** (line ~9): Delete 2 lines
3. **Remove constructor init** (line ~17): Delete 2 lines
4. **Restore data source logic** (lines ~48-64): Replace with original
5. **Restore Skills Engine data** (line ~185): Replace with original
6. **Delete mergeRawDataBeforeEnrichment method** (lines ~245-256): Delete entire method
7. **Restore isReadyForEnrichment** (lines ~250-290): Replace with original
8. **Remove dependency** (package.json): Delete `pdf-parse` line

