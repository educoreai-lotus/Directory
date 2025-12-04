# Phase 4 Rollback Guide

## 🚨 Complete Rollback Instructions

This guide provides step-by-step instructions to completely remove Phase 4 changes and restore the frontend to its pre-Phase 4 state.

---

## ⚠️ Before You Begin

**Verify Current State**:
- Check that Phase 4 is actually deployed
- Ensure you have a backup of the current codebase
- Test that existing OAuth flow works before rollback

---

## 📋 Step-by-Step Rollback

### Step 1: Remove New Files

Delete the three new files created in Phase 4:

```bash
# From project root
rm frontend/src/services/enrichmentService.js
rm frontend/src/components/UploadCVSection.js
rm frontend/src/components/ManualProfileForm.js
```

**Files to delete**:
- ✅ `frontend/src/services/enrichmentService.js`
- ✅ `frontend/src/components/UploadCVSection.js`
- ✅ `frontend/src/components/ManualProfileForm.js`

---

### Step 2: Revert EnrichProfilePage.js

**Option A: Using Git (Recommended)**

If you have the file in git history:

```bash
git checkout HEAD -- frontend/src/pages/EnrichProfilePage.js
```

**Option B: Manual Reversion**

Open `frontend/src/pages/EnrichProfilePage.js` and:

1. **Remove imports** (line ~9):
   
   **Find this block:**
   ```javascript
   import LinkedInConnectButton from '../components/LinkedInConnectButton';
   import GitHubConnectButton from '../components/GitHubConnectButton';
   // PHASE_4: Import new components for extended enrichment flow
   import UploadCVSection from '../components/UploadCVSection';
   import ManualProfileForm from '../components/ManualProfileForm';
   import { triggerEnrichment, getEnrichmentStatus } from '../services/enrichmentService';
   ```
   
   **Replace with:**
   ```javascript
   import LinkedInConnectButton from '../components/LinkedInConnectButton';
   import GitHubConnectButton from '../components/GitHubConnectButton';
   ```

2. **Remove state variables** (line ~23):
   
   **Find this block:**
   ```javascript
   const [successMessage, setSuccessMessage] = useState(null);
   // PHASE_4: State for new enrichment sources
   const [pdfUploaded, setPdfUploaded] = useState(false);
   const [manualDataSaved, setManualDataSaved] = useState(false);
   const [enriching, setEnriching] = useState(false);
   ```
   
   **Replace with:**
   ```javascript
   const [successMessage, setSuccessMessage] = useState(null);
   ```

3. **Restore handleContinue function** (lines ~395-453):
   
   **Find this block:**
   ```javascript
   // PHASE_4: Handle Continue button - trigger enrichment
   const handleContinue = async () => {
     // ... Phase 4 code ...
   };

   // PHASE_4: Handle skip - navigate to profile without enrichment
   const handleSkip = () => {
     // ... Phase 4 code ...
   };
   ```
   
   **Replace with:**
   ```javascript
   const handleContinue = () => {
     // Once both LinkedIn and GitHub are connected, proceed to enrichment
     // For now, just redirect to employee profile
     // In F009A, this will trigger Gemini AI enrichment
     navigate(`/employee/${user.id}`);
   };
   ```
   
   **Delete the `handleSkip` function entirely.**

4. **Remove Data Sources Summary** (lines ~494-520):
   
   **Find this block:**
   ```javascript
          <p 
            className="text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            Connect your LinkedIn and GitHub accounts, upload your CV, or fill details manually to enhance your profile
          </p>
        </div>

        {/* PHASE_4: Data Sources Summary */}
        <div className="mb-6 p-4 rounded-lg" style={{
          // ... entire summary block ...
        }}>
   ```
   
   **Replace with:**
   ```javascript
          <p 
            className="text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            Connect your LinkedIn and GitHub accounts to enhance your profile
          </p>
        </div>
   ```

5. **Remove PDF Upload and Manual Form sections** (lines ~635-657):
   
   **Find this block:**
   ```javascript
        {/* PHASE_4: PDF CV Upload Section */}
        <div className="mb-6">
          <UploadCVSection 
            // ... component props ...
          />
        </div>

        {/* PHASE_4: Manual Profile Form Section */}
        <div className="mb-6">
          <ManualProfileForm 
            // ... component props ...
          />
        </div>
   ```
   
   **Delete both entire sections.**

6. **Restore Continue button** (lines ~660-713):
   
   **Find this block:**
   ```javascript
        {/* Continue Button */}
        {/* PHASE_4: Updated to check for any source, not just both OAuth */}
        {(linkedinConnected || githubConnected || pdfUploaded || manualDataSaved) && (
          // ... Phase 4 button code ...
        )}
        
        {/* PHASE_4: Show message if no sources connected yet */}
        {!linkedinConnected && !githubConnected && !pdfUploaded && !manualDataSaved && (
          // ... Phase 4 message ...
        )}

        {/* PHASE_4: Skip for now link */}
        <div className="mt-6 text-center">
          // ... Phase 4 skip link ...
        </div>
   ```
   
   **Replace with:**
   ```javascript
        {/* Continue Button */}
        {linkedinConnected && githubConnected && (
          <div className="mt-8">
            <button
              onClick={handleContinue}
              className="btn btn-primary w-full"
            >
              Continue to Profile
            </button>
            <p 
              className="text-xs text-center mt-4"
              style={{ color: 'var(--text-muted)' }}
            >
              Both LinkedIn and GitHub are connected. Your profile will be enriched with AI-generated content.
            </p>
          </div>
        )}
        
        {linkedinConnected && !githubConnected && (
          <div className="mt-8">
            <p 
              className="text-sm text-center mb-4"
              style={{ color: 'var(--text-secondary)' }}
            >
              Please connect your GitHub account to complete profile enrichment.
            </p>
          </div>
        )}

        {githubConnected && !linkedinConnected && (
          <div className="mt-8">
            <p 
              className="text-sm text-center mb-4"
              style={{ color: 'var(--text-secondary)' }}
            >
              Please connect your LinkedIn account to complete profile enrichment.
            </p>
          </div>
        )}
   ```

---

### Step 3: Revert EmployeeProfilePage.js

**Option A: Using Git (Recommended)**

If you have the file in git history:

```bash
git checkout HEAD -- frontend/src/pages/EmployeeProfilePage.js
```

**Option B: Manual Reversion**

Open `frontend/src/pages/EmployeeProfilePage.js` and:

1. **Remove enrichment banner** (lines ~142-160):
   
   **Find this block:**
   ```javascript
        {/* PHASE_4: Banner if enrichment not completed */}
        {!enrichmentComplete && isOwnProfile && (
          <div 
            className="mb-6 p-4 rounded-lg flex items-center justify-between"
            // ... entire banner block ...
          >
          </div>
        )}
   ```
   
   **Delete this entire block.**

---

### Step 4: Verify Rollback

1. **Check for remaining Phase 4 references**:
   ```bash
   grep -r "PHASE_4" frontend/src/
   ```
   Should return no results (or only in documentation files).

2. **Check for new component references**:
   ```bash
   grep -r "UploadCVSection" frontend/src/
   grep -r "ManualProfileForm" frontend/src/
   grep -r "enrichmentService" frontend/src/
   ```
   Should return no results.

3. **Verify code compiles**:
   ```bash
   # Check for syntax errors (if you have a build command)
   cd frontend
   npm run build
   ```

4. **Test OAuth flow**:
   - Connect LinkedIn
   - Connect GitHub
   - Verify enrichment works as before Phase 4
   - Verify Continue button redirects (doesn't trigger enrichment)

---

## ✅ Rollback Verification Checklist

After completing all steps, verify:

- [ ] `enrichmentService.js` file deleted
- [ ] `UploadCVSection.js` file deleted
- [ ] `ManualProfileForm.js` file deleted
- [ ] `EnrichProfilePage.js` has no `PHASE_4:` comments (except in docs)
- [ ] `EmployeeProfilePage.js` has no `PHASE_4:` comments (except in docs)
- [ ] `EnrichProfilePage.js` has no `UploadCVSection` references
- [ ] `EnrichProfilePage.js` has no `ManualProfileForm` references
- [ ] `EnrichProfilePage.js` has no `enrichmentService` references
- [ ] Code compiles without errors
- [ ] Existing OAuth enrichment flow works
- [ ] Continue button redirects (doesn't trigger enrichment)
- [ ] No PDF upload or manual form sections visible

---

## 🔄 Expected Behavior After Rollback

- ✅ OAuth flow works exactly as before Phase 4
- ✅ Continue button redirects to profile (doesn't trigger enrichment)
- ✅ No PDF upload section visible
- ✅ No manual form section visible
- ✅ No "Skip for now" link visible
- ✅ No data sources summary visible
- ✅ No enrichment banner on profile page
- ✅ System behaves identically to pre-Phase 4 state

---

## ⚠️ Important Notes

1. **Backend**: Phase 1-3 backend changes remain untouched. Only frontend is rolled back.

2. **No Data Loss**: Existing OAuth data and enrichment data remain in database.

3. **Testing**: Thoroughly test the OAuth flow after rollback to ensure everything works.

4. **Build**: If you have a build process, run it after rollback to ensure no compilation errors.

---

## 📞 Support

If rollback encounters issues:

1. Check git history for original file versions
2. Verify all `PHASE_4:` comments are removed
3. Ensure no syntax errors after manual edits
4. Check browser console for any import errors

---

**Rollback Time Estimate**: 5-10 minutes

