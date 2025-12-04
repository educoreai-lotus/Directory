# Phase 4 Modified Lines Reference

This document lists all lines modified in Phase 4 for easy verification and rollback.

---

## 📄 File: `frontend/src/pages/EnrichProfilePage.js`

### Line ~9: Added Imports
**Original**:
```javascript
import LinkedInConnectButton from '../components/LinkedInConnectButton';
import GitHubConnectButton from '../components/GitHubConnectButton';
```

**Modified** (Phase 4):
```javascript
import LinkedInConnectButton from '../components/LinkedInConnectButton';
import GitHubConnectButton from '../components/GitHubConnectButton';
// PHASE_4: Import new components for extended enrichment flow
import UploadCVSection from '../components/UploadCVSection';
import ManualProfileForm from '../components/ManualProfileForm';
import { triggerEnrichment, getEnrichmentStatus } from '../services/enrichmentService';
```

**Action for Rollback**: Delete the 4 new lines (comment + 3 imports).

---

### Line ~23: Added State Variables
**Original**:
```javascript
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
```

**Modified** (Phase 4):
```javascript
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  // PHASE_4: State for new enrichment sources
  const [pdfUploaded, setPdfUploaded] = useState(false);
  const [manualDataSaved, setManualDataSaved] = useState(false);
  const [enriching, setEnriching] = useState(false);
```

**Action for Rollback**: Delete the 4 new lines (comment + 3 state declarations).

---

### Lines ~395-453: Modified handleContinue and Added handleSkip
**Original**:
```javascript
  const handleContinue = () => {
    // Once both LinkedIn and GitHub are connected, proceed to enrichment
    // For now, just redirect to employee profile
    // In F009A, this will trigger Gemini AI enrichment
    navigate(`/employee/${user.id}`);
  };
```

**Modified** (Phase 4):
```javascript
  // PHASE_4: Handle Continue button - trigger enrichment
  const handleContinue = async () => {
    if (!user?.id) {
      setError('User ID is missing');
      return;
    }

    // Check if at least one source is available
    const hasAnySource = linkedinConnected || githubConnected || pdfUploaded || manualDataSaved;
    if (!hasAnySource) {
      setError('Please connect at least one data source (LinkedIn, GitHub, upload CV, or fill manual form)');
      return;
    }

    try {
      setEnriching(true);
      setError(null);
      setSuccessMessage('Enriching your profile... This may take a moment.');

      // PHASE_4: Trigger enrichment via backend
      const result = await triggerEnrichment(user.id);

      if (result?.success || result?.employee) {
        setSuccessMessage('✓ Profile enriched successfully! Redirecting to your profile...');
        
        // Redirect after short delay
        setTimeout(() => {
          navigate(`/employee/${user.id}?enrichment=complete`);
        }, 2000);
      } else {
        throw new Error('Enrichment failed - no success response');
      }
    } catch (err) {
      console.error('[EnrichProfilePage] Enrichment error:', err);
      const errorMessage = err.response?.data?.response?.error 
        || err.response?.data?.error 
        || err.message 
        || 'Failed to enrich profile. Please try again.';
      setError(errorMessage);
      setSuccessMessage(null);
    } finally {
      setEnriching(false);
    }
  };

  // PHASE_4: Handle skip - navigate to profile without enrichment
  const handleSkip = () => {
    if (user?.id) {
      navigate(`/employee/${user.id}`);
    }
  };
```

**Action for Rollback**: Replace entire Phase 4 block with original `handleContinue` function above. Delete `handleSkip` function.

---

### Lines ~433-520: Added Data Sources Summary Section
**New Section** (Phase 4):
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
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)'
        }}>
          <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Data Sources Status
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span style={{ color: linkedinConnected ? 'rgb(34, 197, 94)' : 'var(--text-muted)' }}>
                {linkedinConnected ? '✓' : '✗'}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>LinkedIn</span>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ color: githubConnected ? 'rgb(34, 197, 94)' : 'var(--text-muted)' }}>
                {githubConnected ? '✓' : '✗'}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>GitHub</span>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ color: pdfUploaded ? 'rgb(34, 197, 94)' : 'var(--text-muted)' }}>
                {pdfUploaded ? '✓' : '✗'}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>CV Uploaded</span>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ color: manualDataSaved ? 'rgb(34, 197, 94)' : 'var(--text-muted)' }}>
                {manualDataSaved ? '✓' : '✗'}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>Manual Data</span>
            </div>
          </div>
        </div>
```

**Action for Rollback**: Delete entire `// PHASE_4: Data Sources Summary` block. Restore original description text.

---

### Lines ~635-657: Added PDF Upload and Manual Form Sections
**New Sections** (Phase 4):
```javascript
        {/* PHASE_4: PDF CV Upload Section */}
        <div className="mb-6">
          <UploadCVSection 
            employeeId={user?.id}
            onUploaded={(result) => {
              setPdfUploaded(true);
              setSuccessMessage('✓ CV uploaded successfully!');
              setTimeout(() => setSuccessMessage(null), 3000);
            }}
          />
        </div>

        {/* PHASE_4: Manual Profile Form Section */}
        <div className="mb-6">
          <ManualProfileForm 
            employeeId={user?.id}
            onSaved={(result) => {
              setManualDataSaved(true);
              setSuccessMessage('✓ Manual data saved successfully!');
              setTimeout(() => setSuccessMessage(null), 3000);
            }}
          />
        </div>
```

**Action for Rollback**: Delete both entire sections.

---

### Lines ~660-713: Modified Continue Button and Added Skip Link
**Original**:
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

**Modified** (Phase 4):
```javascript
        {/* Continue Button */}
        {/* PHASE_4: Updated to check for any source, not just both OAuth */}
        {(linkedinConnected || githubConnected || pdfUploaded || manualDataSaved) && (
          <div className="mt-8">
            <button
              onClick={handleContinue}
              disabled={enriching}
              className="btn btn-primary w-full"
              style={{
                opacity: enriching ? 0.6 : 1,
                cursor: enriching ? 'not-allowed' : 'pointer'
              }}
            >
              {enriching ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></span>
                  Enriching Profile...
                </>
              ) : (
                'Continue to Your Profile'
              )}
            </button>
            <p 
              className="text-xs text-center mt-4"
              style={{ color: 'var(--text-muted)' }}
            >
              {linkedinConnected && githubConnected 
                ? 'Both LinkedIn and GitHub are connected. Your profile will be enriched with AI-generated content.'
                : 'Your profile will be enriched with AI-generated content using the data you provided.'
              }
            </p>
          </div>
        )}
        
        {/* PHASE_4: Show message if no sources connected yet */}
        {!linkedinConnected && !githubConnected && !pdfUploaded && !manualDataSaved && (
          <div className="mt-8">
            <p 
              className="text-sm text-center mb-4"
              style={{ color: 'var(--text-secondary)' }}
            >
              Please connect at least one data source (LinkedIn, GitHub, upload CV, or fill manual form) to continue.
            </p>
          </div>
        )}

        {/* PHASE_4: Skip for now link */}
        <div className="mt-6 text-center">
          <button
            onClick={handleSkip}
            className="text-sm underline"
            style={{ color: 'var(--text-muted)' }}
          >
            Skip for now
          </button>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            You can complete enrichment later from your profile page
          </p>
        </div>
```

**Action for Rollback**: Replace entire Phase 4 block with original code above.

---

## 📄 File: `frontend/src/pages/EmployeeProfilePage.js`

### Lines ~142-160: Added Enrichment Banner
**New Section** (Phase 4):
```javascript
        {/* PHASE_4: Banner if enrichment not completed */}
        {!enrichmentComplete && isOwnProfile && (
          <div 
            className="mb-6 p-4 rounded-lg flex items-center justify-between"
            style={{
              background: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid rgb(251, 191, 36)',
              color: 'rgb(251, 191, 36)'
            }}
          >
            <div>
              <p className="text-sm font-medium mb-1">Your profile is not enriched yet</p>
              <p className="text-xs">Enrich your profile to unlock AI-generated content and better visibility.</p>
            </div>
            <button
              onClick={() => navigate('/enrich')}
              className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors text-sm"
            >
              Enrich Profile
            </button>
          </div>
        )}
```

**Action for Rollback**: Delete entire `// PHASE_4: Banner` block.

---

## 📊 Summary

**Total Files Modified**: 2
- `frontend/src/pages/EnrichProfilePage.js` (7 locations)
- `frontend/src/pages/EmployeeProfilePage.js` (1 location)

**Total Lines Added**: ~400 lines
**Total Lines Modified**: ~50 lines
**Total Lines Deleted**: 0 (all changes are additive)

**All Changes Marked With**: `// PHASE_4:` comments

---

## ✅ Verification Commands

To verify all Phase 4 changes are present:

```bash
# Count Phase 4 comments
grep -c "PHASE_4:" frontend/src/pages/EnrichProfilePage.js
grep -c "PHASE_4:" frontend/src/pages/EmployeeProfilePage.js

# List all Phase 4 changes
grep -n "PHASE_4:" frontend/src/pages/EnrichProfilePage.js
grep -n "PHASE_4:" frontend/src/pages/EmployeeProfilePage.js

# Check for new component references
grep -n "UploadCVSection" frontend/src/pages/EnrichProfilePage.js
grep -n "ManualProfileForm" frontend/src/pages/EnrichProfilePage.js
grep -n "enrichmentService" frontend/src/pages/EnrichProfilePage.js
```

---

## 🔄 Quick Rollback Reference

1. **Delete new files**: `enrichmentService.js`, `UploadCVSection.js`, `ManualProfileForm.js`
2. **Remove imports** (EnrichProfilePage line ~9): Delete 4 lines
3. **Remove state variables** (EnrichProfilePage line ~23): Delete 4 lines
4. **Restore handleContinue** (EnrichProfilePage lines ~395-453): Replace with original
5. **Remove Data Sources Summary** (EnrichProfilePage lines ~494-520): Delete entire block
6. **Remove PDF/Manual sections** (EnrichProfilePage lines ~635-657): Delete both sections
7. **Restore Continue button** (EnrichProfilePage lines ~660-713): Replace with original
8. **Remove banner** (EmployeeProfilePage lines ~142-160): Delete entire block

