# Language Selection Feature - Proposal

## Overview
Allow employees to choose/change their preferred language AFTER profile enrichment but BEFORE HR approval, so the correct language is sent to Skills Engine when the profile is approved.

## Current Flow
1. Employee enriches profile → `enrichment_completed = true`, `profile_status = 'enriched'`
2. Employee is redirected to profile page (waiting for HR approval)
3. HR approves → `preferred_language` is sent to Skills Engine via Coordinator
4. Employee can change language later in "Edit Profile" (but this happens after Skills Engine call)

## Problem
- If employee changes language after HR approval, the Skills Engine already received the old/default language
- We want employee to set their preferred language BEFORE it's sent to Skills Engine

## Proposed Solution: Modal After Enrichment

### When Modal Appears
- **Condition 1**: `profile_status === 'enriched'` (NOT after approval)
- **Condition 2**: Employee is viewing their own profile (`user.id === employeeId`)
- **Condition 3**: Only once per enrichment cycle
- **Timing**: Immediately after enrichment redirect (when landing on profile page)

### Modal Content
- **Message**: "Your default learning language is set to [English/Arabic/etc.]. You can change it for your preference."
  - Convert CSV language code (e.g., "en") to readable name (e.g., "English")
- **Language Dropdown**: All available languages
- **Buttons**:
  - "Save" - Updates `preferred_language` in database and closes modal
  - "Skip" - Closes modal without changing (uses CSV default)

### Flow Diagram
```
1. Employee enriches profile
   ↓
2. Status = 'enriched'
   ↓
3. Redirect to profile page
   ↓
4. Modal appears (if status = 'enriched' AND own profile)
   ↓
5. Employee chooses:
   - Save → Updates preferred_language → Modal closes
   - Skip → Modal closes, keeps CSV default
   ↓
6. HR approves profile
   ↓
7. preferred_language (saved or CSV default) sent to Skills Engine
   ↓
8. Status = 'approved' → Modal never shows again
```

### Implementation Details

#### Frontend (EmployeeProfilePage.js)
- Check on profile page load:
  ```javascript
  if (profile_status === 'enriched' && isOwnProfile && !languageModalShown) {
    showLanguageModal();
  }
  ```
- Language mapping: Convert codes to display names
  - "en" → "English"
  - "ar" → "Arabic"
  - etc.
- API call: Update `preferred_language` when "Save" is clicked
- Modal state: Use component state to track if modal was shown (or localStorage)

#### Backend
- Endpoint: Reuse existing employee update endpoint or create specific endpoint
- Update: `preferred_language` field in employees table
- When approval happens: Use current `preferred_language` value (saved or CSV default)

### Important Constraints
1. ✅ Modal ONLY shows when `profile_status === 'enriched'` (before approval)
2. ✅ Once approved, modal NEVER shows (status is 'approved')
3. ✅ Language is "locked" at approval time (what's saved or CSV default gets sent to Skills Engine)
4. ✅ Employee can still change language later in edit profile, but it won't affect the Skills Engine call that already happened
5. ✅ Modal appears only once per enrichment cycle
6. ✅ Allow "Skip" option (employee can change later in edit profile)
7. ✅ Show all available languages in dropdown
8. ✅ Only for employee's own profile

### Language Options
Need to define all available languages. Common options:
- English (en)
- Arabic (ar)
- Spanish (es)
- French (fr)
- German (de)
- etc.

### Questions to Resolve
1. What languages should be available in the dropdown? (List all)
2. Should we use localStorage to track if modal was shown, or rely on status change?
3. Should the modal be dismissible by clicking outside, or only via buttons?
4. What happens if employee refreshes page after skipping? (Show again or remember skip?)

### Files to Modify
1. `frontend/src/pages/EmployeeProfilePage.js` - Add modal component and logic
2. `frontend/src/components/LanguageSelectionModal.js` - New component (if created separately)
3. `frontend/src/services/employeeService.js` - Add/update method to update preferred_language
4. `backend/src/presentation/EmployeeController.js` - Ensure update endpoint handles preferred_language
5. `backend/src/infrastructure/EmployeeRepository.js` - Update method for preferred_language

### Status
**PENDING APPROVAL** - Waiting for review and decision before implementation.

