# Enrichment Feature Protection

## Overview
This document protects the core enrichment feature (LinkedIn + GitHub OAuth → Gemini AI → Profile Enrichment) from accidental breakage during future development.

## Critical Flow

### 1. OAuth Connection Flow
- **LinkedIn OAuth**: User clicks "Connect LinkedIn" → Redirects to LinkedIn → User authorizes → Backend fetches LinkedIn data → Stores in `employees.linkedin_data`
- **GitHub OAuth**: User clicks "Connect GitHub" → Redirects to GitHub → User authorizes → Backend fetches GitHub data → Stores in `employees.github_data`
- **Token Management**: OAuth callbacks return dummy token + user data in URL params → Frontend stores both in localStorage
- **State Management**: Frontend tracks `linkedinConnected` and `githubConnected` state separately

### 2. Enrichment Trigger
- **Condition**: Both `linkedin_data` AND `github_data` must exist in database
- **Trigger**: Automatically triggered when second OAuth connection completes
- **Location**: `backend/src/presentation/OAuthController.js` → `handleLinkedInCallback()` or `handleGitHubCallback()`

### 3. Gemini AI Enrichment
- **Bio Generation**: `GeminiAPIClient.generateBio(linkedinData, githubData, employeeBasicInfo)`
- **Project Summaries**: `GeminiAPIClient.generateProjectSummaries(repositories)`
- **Fallback**: If Gemini fails, uses `MockDataService` (generic mock data)
- **Storage**: Results stored in `employees.bio` and `employee_project_summaries` table

### 4. Profile Status Flow
- **basic** → Initial state
- **enrichment_pending** → Not used currently
- **enriched** → After Gemini enrichment completes
- **approved** → After HR approves the enriched profile

## Critical Files (DO NOT BREAK)

### Backend
1. **`backend/src/presentation/OAuthController.js`**
   - Handles OAuth callbacks
   - Generates dummy tokens
   - Builds user objects
   - Triggers enrichment
   - **DO NOT MODIFY** without testing OAuth flow end-to-end

2. **`backend/src/application/EnrichProfileUseCase.js`**
   - Orchestrates enrichment
   - Calls Gemini API
   - Updates database
   - Creates approval requests
   - **DO NOT MODIFY** without testing enrichment flow

3. **`backend/src/infrastructure/GeminiAPIClient.js`**
   - Gemini API integration
   - Prompt building
   - Response parsing
   - **DO NOT MODIFY** prompts without testing output quality

4. **`backend/src/infrastructure/EmployeeRepository.js`**
   - `updateLinkedInData()` - Stores LinkedIn data
   - `updateGitHubData()` - Stores GitHub data
   - `updateEnrichment()` - Stores bio and project summaries
   - **DO NOT MODIFY** these methods without testing data persistence

### Frontend
1. **`frontend/src/pages/EnrichProfilePage.js`**
   - OAuth callback handling
   - Token and user extraction from URL
   - Connection state management
   - Redirect logic
   - **DO NOT MODIFY** without testing OAuth redirects

2. **`frontend/src/context/AuthContext.js`**
   - Token persistence during OAuth
   - User state management
   - OAuth callback detection
   - **DO NOT MODIFY** without testing token persistence

3. **`frontend/src/components/LinkedInConnectButton.js`**
4. **`frontend/src/components/GitHubConnectButton.js`**
   - OAuth initiation
   - **DO NOT MODIFY** without testing OAuth redirects

## Common Issues and Solutions

### Issue 1: Token Lost During OAuth Redirect
**Symptoms**: User redirected to login page after OAuth callback
**Solution**: 
- OAuth callbacks must include token + user data in redirect URL (even on errors!)
- Frontend must extract and store both before any validation
- AuthContext must skip validation during OAuth callbacks
- **CRITICAL**: OAuth errors are still OAuth callbacks - must preserve token/user
- Use `!!errorParam` (boolean coercion) not just `errorParam` (string value)
- See: `docs/OAUTH-TOKEN-PERSISTENCE-FIX.md`

### Issue 2: Premature Redirect to Profile
**Symptoms**: Redirects to profile before GitHub connection
**Solution**:
- Check for active OAuth callback in URL params
- Don't redirect during OAuth callbacks
- Check actual connection state, not just `user.bothOAuthConnected`
- See commit: `0cbd85f`

### Issue 3: Generic Bio/Project Summaries
**Symptoms**: All profiles have same bio, uses "they" instead of "he/she"
**Solution**:
- Check if Gemini API is actually being called (check Railway logs)
- Verify GEMINI_API_KEY is configured
- Improve prompts to use correct pronouns and be more specific
- See: Current issue being fixed

### Issue 4: Enrichment Not Triggering
**Symptoms**: Both OAuth connected but no enrichment
**Solution**:
- Check `isReadyForEnrichment()` - both `linkedin_data` and `github_data` must exist
- Check Railway logs for enrichment errors
- Verify Gemini API key is configured

### Issue 5: OAuth Errors Cause Redirect to Login
**Symptoms**: When LinkedIn/GitHub returns error (e.g., "already connected"), user gets redirected to login
**Solution**:
- Backend must include token + user in error redirects (preserve session)
- Frontend must treat error params as OAuth callbacks (`!!errorParam`)
- Never redirect to login during OAuth callbacks (including errors)
- Show error message on enrich page, don't clear session
- See commits: `c93e844`, `607e907`, `24ecb9a`

## Testing Checklist

Before making changes to enrichment-related code:

- [ ] OAuth callbacks return token + user data
- [ ] Frontend stores token + user in localStorage
- [ ] No redirect to login during OAuth flow
- [ ] Both LinkedIn and GitHub can be connected
- [ ] Enrichment triggers after both connections
- [ ] Gemini API is called (check Railway logs)
- [ ] Bio is unique per employee (not generic)
- [ ] Project summaries are unique per repository
- [ ] Profile status updates to 'enriched'
- [ ] Approval request is created
- [ ] HR can see approval request

## Protection Rules

1. **Never remove OAuth callback token/user data** - Always include both in redirect URLs (even on errors!)
2. **Never skip OAuth callback detection** - Always check URL params before redirecting
3. **Always use boolean coercion for OAuth detection** - Use `!!errorParam`, not `errorParam` (prevents string values)
4. **Never redirect to login during OAuth callbacks** - Including errors - show error on enrich page instead
5. **Always preserve session on OAuth errors** - Backend must return token + user even when OAuth fails
6. **Never remove Gemini fallback** - Always have MockDataService as backup
7. **Never modify enrichment trigger logic** - Both OAuth must be connected
8. **Always test end-to-end** - OAuth → Enrichment → Profile → Approval

## Critical Code Patterns

### OAuth Callback Detection (MUST USE THIS PATTERN)

```javascript
// ✅ CORRECT - Always use boolean coercion
const linkedinParam = searchParams.get('linkedin');
const githubParam = searchParams.get('github');
const errorParam = searchParams.get('error');
const tokenParam = searchParams.get('token');
const enrichedParam = searchParams.get('enriched');

const isOAuthCallback = linkedinParam === 'connected' || 
                        githubParam === 'connected' || 
                        !!errorParam ||  // ✅ Boolean coercion
                        !!tokenParam ||   // ✅ Boolean coercion
                        enrichedParam === 'true';
```

```javascript
// ❌ WRONG - Don't use string values directly
const isOAuthCallback = linkedinParam === 'connected' || 
                        githubParam === 'connected' || 
                        errorParam ||  // ❌ Returns string, not boolean
                        enrichedParam === 'true';
```

### Backend Error Redirects (MUST INCLUDE TOKEN + USER)

```javascript
// ✅ CORRECT - Always include token + user on errors
catch (error) {
  // Extract employee from state
  // Build user object
  // Generate dummy token
  return res.redirect(`${frontendUrl}/enrich?error=${encodeURIComponent(errorMessage)}&token=${encodeURIComponent(dummyToken)}&user=${encodeURIComponent(userDataEncoded)}`);
}
```

```javascript
// ❌ WRONG - Don't redirect without token/user
catch (error) {
  return res.redirect(`${frontendUrl}/enrich?error=${encodeURIComponent(errorMessage)}`);
}
```

## Documentation Log

### 2025-01-20: Token Persistence Fix
- **Issue**: Token lost during OAuth redirects
- **Solution**: Include token + user in OAuth callback URLs, extract and store in frontend
- **Files Modified**: `OAuthController.js`, `EnrichProfilePage.js`, `AuthContext.js`
- **Commit**: `dc4e836`, `d40d304`, `0cbd85f`

### 2025-01-20: Premature Redirect Fix
- **Issue**: Redirected to profile before GitHub connection
- **Solution**: Check for active OAuth callback, don't redirect during OAuth flow
- **Files Modified**: `EnrichProfilePage.js`
- **Commit**: `0cbd85f`

### 2025-01-20: Generic Bio Issue
- **Issue**: All profiles have same bio, uses "they" instead of "he/she"
- **Solution**: Improved Gemini prompts with pronoun detection and personalization
- **Files Modified**: `GeminiAPIClient.js`, `EnrichProfileUseCase.js`
- **Commit**: `f3ab5da`

### 2025-01-20: OAuth Error Redirect Fix
- **Issue**: OAuth errors (e.g., "already connected") caused redirect to login page
- **Root Cause**: 
  - Backend didn't include token + user in error redirects
  - Frontend used `errorParam` (string) instead of `!!errorParam` (boolean)
  - Token validation cleared storage during OAuth errors
- **Solution**: 
  - Backend now includes token + user in all OAuth error redirects
  - Frontend uses boolean coercion (`!!errorParam`) for OAuth callback detection
  - AuthContext preserves token/user during OAuth errors
  - Never redirect to login during OAuth callbacks (including errors)
- **Files Modified**: `OAuthController.js`, `AuthContext.js`, `EnrichProfilePage.js`
- **Commits**: `c93e844`, `607e907`, `24ecb9a`

### 2025-01-20: LinkedIn Scope Mismatch
- **Issue**: `unauthorized_scope_error` - OAuth URL requesting legacy scopes, app configured for OpenID Connect
- **Solution**: 
  - Default to OpenID Connect scopes (`openid`, `profile`, `email`)
  - Remove `LINKEDIN_USE_LEGACY_SCOPES` from Railway to use OpenID Connect
  - Improved error messages and documentation
- **Files Modified**: `LinkedInOAuthClient.js`, `LinkedInAPIClient.js`
- **Commits**: `9c861a7`, `01faad1`, `123a878`

