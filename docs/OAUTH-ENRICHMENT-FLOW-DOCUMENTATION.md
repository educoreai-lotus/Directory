# OAuth Enrichment Flow - Complete Technical Documentation

## Table of Contents
1. [LinkedIn OAuth Flow - Complete Pipeline](#linkedin-oauth-flow)
2. [GitHub OAuth Flow - Complete Pipeline](#github-oauth-flow)
3. [AI Enrichment Trigger](#ai-enrichment-trigger)
4. [Error Handling](#error-handling)
5. [Data Storage](#data-storage)
6. [Architecture Overview](#architecture-overview)

---

# LinkedIn OAuth Flow - Complete Pipeline

## 🚀 Step 1: User Clicks "Connect LinkedIn" Button

### Frontend Component
**File**: `frontend/src/components/LinkedInConnectButton.js`

**What Happens**:
1. User clicks the "Connect LinkedIn" button on the Enrich Profile page
2. Component calls `handleConnect()` function (line 11)
3. Verifies authentication token exists in `localStorage.getItem('auth_token')` (line 17)
4. If no token, throws error: "You must be logged in to connect LinkedIn"

### API Call
**File**: `frontend/src/services/oauthService.js`

**Function**: `getLinkedInAuthUrl()` (line 10)

**Request Details**:
- **Method**: `GET`
- **Endpoint**: `/oauth/linkedin/authorize`
- **Headers**: 
  - `Authorization: Bearer {token}` (added by `api.js` interceptor)
  - Token is retrieved from `localStorage.getItem('auth_token')`
- **Authentication**: Required (protected by `authMiddleware`)

**What is Sent**:
- No body parameters
- Token is automatically added by API interceptor

**What is Received**:
```json
{
  "authorizationUrl": "https://www.linkedin.com/oauth/v2/authorization?...",
  "state": "base64-encoded-json-string"
}
```

---

## ⬇️ Step 2: Backend Generates Authorization URL

### Route Handler
**File**: `backend/src/index.js` (line 214)

**Route**: `GET /api/v1/oauth/linkedin/authorize`
- **Middleware**: `authMiddleware` (requires valid token)
- **Controller**: `OAuthController.getLinkedInAuthUrl()`

### Controller
**File**: `backend/src/presentation/OAuthController.js` (line 21)

**What Happens**:
1. Extracts `employeeId` from `req.user.id` or `req.user.employeeId` (line 24)
2. Validates employee ID exists (line 26-30)
3. Calls `ConnectLinkedInUseCase.getAuthorizationUrl(employeeId)` (line 33)
4. Returns `{ authorizationUrl, state }` to frontend (line 44)

### Use Case
**File**: `backend/src/application/ConnectLinkedInUseCase.js` (line 20)

**What Happens**:
1. Generates **state parameter** for CSRF protection:
   ```javascript
   const state = Buffer.from(JSON.stringify({
     employeeId: employeeId,
     timestamp: Date.now()
   })).toString('base64');
   ```
   - Contains employee UUID and timestamp
   - Base64 encoded JSON string
   - Used to verify callback authenticity

2. Calls `LinkedInOAuthClient.getAuthorizationUrl(state)` (line 31)

### OAuth Client
**File**: `backend/src/infrastructure/LinkedInOAuthClient.js` (line 64)

**What Happens**:
1. Validates `clientId` and `redirectUri` are configured (lines 65-71)
2. Determines scopes based on environment variable:
   - **Default (Legacy)**: `['r_liteprofile', 'r_emailaddress']` (line 32)
   - **OpenID Connect**: `['openid', 'profile', 'email']` (line 41)
   - Controlled by `LINKEDIN_USE_LEGACY_SCOPES` env var (line 24-25)

3. Builds authorization URL with parameters:
   ```javascript
   const params = new URLSearchParams({
     response_type: 'code',           // OAuth 2.0 authorization code flow
     client_id: this.clientId,        // From LINKEDIN_CLIENT_ID env var
     redirect_uri: this.redirectUri,   // Must match LinkedIn app settings
     state: state,                     // Base64 JSON with employee ID
     scope: scopeParam                 // Space-separated scopes
   });
   ```

4. Returns complete URL:
   ```
   https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=...&redirect_uri=...&state=...&scope=...
   ```

**Configuration**:
- **Authorization URL**: `https://www.linkedin.com/oauth/v2/authorization`
- **Redirect URI**: `${BASE_URL}/api/v1/oauth/linkedin/callback`
- **Client ID**: From `LINKEDIN_CLIENT_ID` environment variable
- **Client Secret**: From `LINKEDIN_CLIENT_SECRET` environment variable (not sent in URL)

---

## ⬇️ Step 3: Frontend Redirects to LinkedIn

### Frontend Action
**File**: `frontend/src/components/LinkedInConnectButton.js` (line 37)

**What Happens**:
1. Receives `{ authorizationUrl, state }` from backend
2. Extracts `authorizationUrl` from response
3. Performs browser redirect:
   ```javascript
   window.location.href = authorizationUrl;
   ```

**Result**: User is redirected to LinkedIn's authorization page

---

## ⬇️ Step 4: LinkedIn Authorization Page

### What User Sees
- LinkedIn login page (if not logged in)
- LinkedIn consent screen showing:
  - App name requesting access
  - Scopes being requested:
    - **Legacy**: "Basic Profile" and "Email Address"
    - **OpenID Connect**: "Sign In with LinkedIn", "Profile", "Email"
  - "Allow" or "Cancel" buttons

### What Happens When User Clicks "Allow"
1. LinkedIn validates:
   - `client_id` matches registered app
   - `redirect_uri` matches exactly (no trailing slashes)
   - Scopes are approved for the app
   - User has granted permissions

2. LinkedIn generates **authorization code**:
   - Short-lived (typically expires in 10 minutes)
   - Single-use (can only be exchanged once)
   - Tied to the `state` parameter

3. LinkedIn redirects back to our callback URL:
   ```
   https://your-backend-url/api/v1/oauth/linkedin/callback?code=AUTHORIZATION_CODE&state=ORIGINAL_STATE
   ```

### What Happens When User Clicks "Cancel" or Error Occurs
LinkedIn redirects with error parameter:
```
https://your-backend-url/api/v1/oauth/linkedin/callback?error=access_denied&state=ORIGINAL_STATE
```

**Common Errors**:
- `access_denied`: User cancelled authorization
- `unauthorized_scope_error`: App doesn't have required product approvals
- `invalid_client`: Client ID is invalid
- `invalid_redirect_uri`: Redirect URI doesn't match

---

## ⬇️ Step 5: Backend Receives Callback

### Route Handler
**File**: `backend/src/index.js` (line 218)

**Route**: `GET /api/v1/oauth/linkedin/callback`
- **Middleware**: **NONE** (public endpoint, called by LinkedIn)
- **Controller**: `OAuthController.handleLinkedInCallback()`

### Controller - Callback Handler
**File**: `backend/src/presentation/OAuthController.js` (line 58)

**What Happens**:
1. Extracts query parameters:
   ```javascript
   const { code, state, error } = req.query;
   ```

2. **Error Handling** (lines 66-81):
   - If `error` parameter exists:
     - Checks for specific error types:
       - `unauthorized_scope_error`: LinkedIn app permissions issue
       - `access_denied`: User cancelled
     - Redirects to frontend with error message:
       ```
       /enrich?error=encoded_error_message
       ```

3. **Validation** (lines 83-85):
   - Checks `code` and `state` exist
   - If missing, redirects with error: `missing_code_or_state`

4. **Process Callback** (line 88):
   - Calls `ConnectLinkedInUseCase.handleCallback(code, state)`

---

## ⬇️ Step 6: Code Exchange for Access Token

### Use Case - Callback Handler
**File**: `backend/src/application/ConnectLinkedInUseCase.js` (line 50)

**What Happens**:
1. **Decode State** (line 53):
   ```javascript
   const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
   const employeeId = stateData.employeeId;
   ```
   - Validates state contains employee ID
   - Verifies employee exists in database (line 61)

2. **One-Time Check** (lines 67-69):
   - Checks if LinkedIn already connected:
     ```javascript
     if (employee.linkedin_data && employee.linkedin_url) {
       throw new Error('LinkedIn is already connected. This is a one-time process.');
     }
     ```

3. **Exchange Code for Token** (line 72):
   - Calls `LinkedInOAuthClient.exchangeCodeForToken(code)`

### OAuth Client - Token Exchange
**File**: `backend/src/infrastructure/LinkedInOAuthClient.js` (line 109)

**What Happens**:
1. Validates credentials configured (line 110-112)

2. **Makes POST Request to LinkedIn**:
   - **Endpoint**: `https://www.linkedin.com/oauth/v2/accessToken`
   - **Method**: `POST`
   - **Headers**: `Content-Type: application/x-www-form-urlencoded`
   - **Body** (URL-encoded):
     ```javascript
     {
       grant_type: 'authorization_code',
       code: code,                    // Authorization code from callback
       redirect_uri: this.redirectUri, // Must match original request
       client_id: this.clientId,      // LinkedIn app client ID
       client_secret: this.clientSecret // LinkedIn app client secret
     }
     ```

3. **What LinkedIn Returns**:
   ```json
   {
     "access_token": "AQV...",
     "expires_in": 5184000,        // Seconds until expiration (~60 days)
     "refresh_token": "AQV...",    // Optional, for refreshing access token
     "token_type": "Bearer"
   }
   ```

4. **Returns Token Response** (lines 132-137):
   ```javascript
   {
     access_token: response.data.access_token,
     expires_in: response.data.expires_in,
     refresh_token: response.data.refresh_token || null,
     token_type: response.data.token_type || 'Bearer'
   }
   ```

**Security Note**: 
- `client_secret` is **NEVER** sent to frontend
- Only sent server-to-server to LinkedIn
- Token exchange happens entirely on backend

---

## ⬇️ Step 7: Fetch LinkedIn Profile Data

### Use Case - Profile Fetch
**File**: `backend/src/application/ConnectLinkedInUseCase.js` (line 77)

**What Happens**:
1. Determines which API endpoints to use based on scopes:
   ```javascript
   const useLegacyScopes = this.oauthClient.useLegacyScopes || false;
   ```

2. Calls `LinkedInAPIClient.getCompleteProfile(accessToken, useLegacyScopes)`

### API Client - Profile Fetch
**File**: `backend/src/infrastructure/LinkedInAPIClient.js` (line 211)

**What Happens**:

#### If Legacy Scopes (`r_liteprofile`, `r_emailaddress`):
1. **Fetch Profile** (line 221):
   - **Endpoint**: `https://api.linkedin.com/v2/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams),headline)`
   - **Method**: `GET`
   - **Headers**: `Authorization: Bearer {access_token}`
   - **Returns**:
     ```json
     {
       "id": "linkedin-user-id",
       "firstName": { "localized": { "en_US": "John" } },
       "lastName": { "localized": { "en_US": "Doe" } },
       "headline": { "localized": { "en_US": "Software Engineer" } },
       "profilePicture": { "displayImage": { "elements": [...] } }
     }
     ```

2. **Fetch Email** (line 222):
   - **Endpoint**: `https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))`
   - **Method**: `GET`
   - **Headers**: `Authorization: Bearer {access_token}`
   - **Returns**:
     ```json
     {
       "elements": [
         { "handle~": { "emailAddress": "john.doe@example.com" } }
       ]
     }
     ```
   - **Note**: Requires "Email Address" product approval in LinkedIn Developer Portal

#### If OpenID Connect Scopes (`openid`, `profile`, `email`):
1. **Fetch User Info** (line 227):
   - **Endpoint**: `https://api.linkedin.com/v2/userinfo`
   - **Method**: `GET`
   - **Headers**: `Authorization: Bearer {access_token}`
   - **Returns**:
     ```json
     {
       "sub": "linkedin-user-id",
       "name": "John Doe",
       "given_name": "John",
       "family_name": "Doe",
       "email": "john.doe@example.com",
       "picture": "https://...",
       "locale": "en_US",
       "email_verified": true
     }
     ```

2. **Fallback to Legacy Email Endpoint** (line 232):
   - Only if email not in userinfo response

3. **Complete Profile Structure** (lines 254-261):
   ```javascript
   {
     id: profile.id || profile.sub,
     name: profile.name,
     given_name: profile.given_name,
     family_name: profile.family_name,
     email: email || profile.email || null,
     picture: pictureUrl,
     headline: profile.headline || null,
     fetched_at: new Date().toISOString()
   }
   ```

**Data Fetched**:
- ✅ User ID (`id` or `sub`)
- ✅ Full name (`name`, `given_name`, `family_name`)
- ✅ Email address (`email`)
- ✅ Profile picture URL (`picture` or `profilePicture`)
- ✅ Professional headline (`headline`) - **Only with legacy scopes**
- ✅ Locale (`locale`)

**What is NOT Fetched**:
- ❌ Work experience (positions) - **Not available via OAuth2**
- ❌ Skills - **Not available via OAuth2**
- ❌ Education - **Not available via OAuth2**
- ❌ Connections - **Not available via OAuth2**

**Note**: LinkedIn OAuth2 API has limited data access. Full profile data (positions, skills) requires LinkedIn Partner API access, which is not available through standard OAuth2.

---

## ⬇️ Step 8: Store LinkedIn Data in Database

### Use Case - Data Storage
**File**: `backend/src/application/ConnectLinkedInUseCase.js` (line 100)

**What Happens**:
1. **Build LinkedIn URL** (lines 82-97):
   - Attempts to construct from profile data
   - Falls back to generic format if ID not available
   - Sets to `null` if construction fails

2. **Prepare Data for Storage** (lines 103-111):
   ```javascript
   {
     ...profileData,                    // All profile fields
     access_token: tokenResponse.access_token,  // Store token for future API calls
     token_expires_at: new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString(),
     refresh_token: tokenResponse.refresh_token || null,
     connected_at: new Date().toISOString()
   }
   ```

3. **Save to Database** (line 100):
   - Calls `EmployeeRepository.updateLinkedInData(employeeId, linkedinUrl, linkedinData)`

### Repository - Database Update
**File**: `backend/src/infrastructure/EmployeeRepository.js` (line 575)

**What Happens**:
1. **Extract Profile Photo** (lines 576-601):
   - Priority order:
     1. `linkedinData.picture` (OpenID Connect)
     2. `linkedinData.profilePicture` (string)
     3. `linkedinData.profilePicture.displayImage`
     4. `linkedinData.profilePicture.url`
   - **Important**: LinkedIn photo **always overwrites** existing photo (line 608)

2. **Update Database** (lines 604-620):
   ```sql
   UPDATE employees
   SET linkedin_url = $1,
       linkedin_data = $2,           -- JSONB column, stores entire profile + tokens
       profile_photo_url = COALESCE($4, profile_photo_url),
       updated_at = CURRENT_TIMESTAMP
   WHERE id = $3
   RETURNING *
   ```

**What is Stored**:
- ✅ `linkedin_url`: Profile URL (or null)
- ✅ `linkedin_data`: **JSONB** column containing:
  - All profile fields (id, name, email, picture, headline)
  - `access_token`: For future API calls
  - `token_expires_at`: Token expiration timestamp
  - `refresh_token`: For token refresh (if provided)
  - `connected_at`: Connection timestamp
- ✅ `profile_photo_url`: Extracted from LinkedIn data (overwrites existing)

**What is NOT Stored Separately**:
- ❌ Access token is stored **inside** `linkedin_data` JSONB, not in separate column
- ❌ No separate `linkedin_token` or `linkedin_token_expires_at` columns

**Database Schema**:
```sql
-- From database/migrations/001_initial_schema.sql
linkedin_url VARCHAR(500),
linkedin_data JSONB,              -- Stores entire profile + tokens as JSON
profile_photo_url VARCHAR(500),  -- Extracted from LinkedIn (or GitHub as fallback)
```

---

## ⬇️ Step 9: Build User Object and Redirect

### Controller - Post-Connection
**File**: `backend/src/presentation/OAuthController.js` (line 91)

**What Happens**:
1. **Fetch Updated Employee** (line 98):
   - Gets employee from database with new LinkedIn data
   - Fetches company data for HR status check (line 104)
   - Fetches employee roles (lines 109-113)

2. **Build User Object** (lines 122-138):
   ```javascript
   {
     id: employee.id,
     email: employee.email,
     employeeId: employee.employee_id,
     companyId: employee.company_id,
     fullName: employee.full_name,
     profilePhotoUrl: employee.profile_photo_url || null,
     isHR: isHR,
     profileStatus: profileStatus,        // 'basic', 'enriched', 'approved'
     isFirstLogin: false,
     isProfileApproved: profileStatus === 'approved',
     hasLinkedIn: !!employee.linkedin_data,  // true if LinkedIn connected
     hasGitHub: !!employee.github_data,      // false if only LinkedIn connected
     bothOAuthConnected: hasLinkedIn && hasGitHub,
     isTrainer: isTrainer,
     isDecisionMaker: isDecisionMaker
   }
   ```

3. **Generate Dummy Token** (line 141):
   ```javascript
   const dummyToken = `dummy-token-${employee.id}-${employee.email}-${Date.now()}`;
   ```
   - Format: `dummy-token-{uuid}-{email}-{timestamp}`
   - Used for session management (dummy authentication)

4. **Encode User Data** (line 145):
   ```javascript
   const userDataEncoded = Buffer.from(JSON.stringify(userObject)).toString('base64');
   ```
   - Base64 encoded JSON
   - Passed in URL query parameter

5. **Check Enrichment Readiness** (line 148):
   - Calls `EnrichProfileUseCase.isReadyForEnrichment(employeeId)`
   - Returns `true` if:
     - ✅ LinkedIn data exists
     - ✅ GitHub data exists
     - ✅ Enrichment not yet completed

6. **Redirect Logic** (lines 152-174):

   **If Both Connected (Ready for Enrichment)**:
   ```javascript
   // Trigger enrichment synchronously (wait for completion)
   const enrichmentResult = await this.enrichProfileUseCase.enrichProfile(employeeId);
   
   // Redirect with enriched status
   return res.redirect(`${frontendUrl}/enrich?linkedin=connected&github=connected&enriched=true&token=${token}&user=${userDataEncoded}`);
   ```

   **If Only LinkedIn Connected**:
   ```javascript
   // Redirect back to enrich page to connect GitHub
   return res.redirect(`${frontendUrl}/enrich?linkedin=connected&token=${token}&user=${userDataEncoded}`);
   ```

**Redirect URL Structure**:
```
/enrich?linkedin=connected&token={dummyToken}&user={base64UserData}
```

---

## ⬇️ Step 10: Frontend Receives Callback

### Frontend - Enrich Profile Page
**File**: `frontend/src/pages/EnrichProfilePage.js` (line 39)

**What Happens**:
1. **Extract URL Parameters** (lines 40-43):
   ```javascript
   const linkedinParam = searchParams.get('linkedin');  // 'connected'
   const tokenParam = searchParams.get('token');        // dummy token
   const userParam = searchParams.get('user');          // base64 user data
   ```

2. **Store Token and User** (lines 50-80):
   ```javascript
   // Decode user data
   const userDataJson = atob(userParam);
   const userData = JSON.parse(userDataJson);
   
   // Store in localStorage
   localStorage.setItem('auth_token', tokenParam);
   localStorage.setItem('user', JSON.stringify(userData));
   localStorage.setItem('oauth_callback_timestamp', Date.now().toString());
   ```

3. **Update Connection Status** (lines 109-113):
   ```javascript
   const newLinkedinStatus = storedUser.hasLinkedIn || false;
   const newGithubStatus = storedUser.hasGitHub || false;
   
   setLinkedinConnected(newLinkedinStatus);
   setGithubConnected(newGithubStatus);
   ```

4. **Show Success Message** (lines 117-127):
   - If only LinkedIn: "✓ LinkedIn connected successfully! Please connect GitHub to continue."
   - If both connected: "✓ Both LinkedIn and GitHub connected! Profile enriched successfully."

5. **Clear URL Parameters** (lines 138-144):
   - Removes `token`, `user`, `linkedin`, `github` from URL for security
   - Keeps data in localStorage

6. **Auto-Redirect** (lines 245-260):
   - If both connected AND enriched: Redirects to `/employee/{userId}?enrichment=complete`
   - If both connected but not enriched: Shows "Enriching your profile..." message

---

# GitHub OAuth Flow - Complete Pipeline

## 🚀 Step 1: User Clicks "Connect GitHub" Button

### Frontend Component
**File**: `frontend/src/components/GitHubConnectButton.js`

**What Happens**:
1. User clicks "Connect GitHub" button
2. Component calls `handleConnect()` function (line 11)
3. Verifies authentication token exists (line 17)
4. Calls `getGitHubAuthUrl()` from `oauthService` (line 25)

### API Call
**File**: `frontend/src/services/oauthService.js` (line 44)

**Request Details**:
- **Method**: `GET`
- **Endpoint**: `/oauth/github/authorize`
- **Headers**: `Authorization: Bearer {token}` (added by interceptor)
- **Authentication**: Required

**What is Received**:
```json
{
  "authorizationUrl": "https://github.com/login/oauth/authorize?...",
  "state": "base64-encoded-json-string"
}
```

---

## ⬇️ Step 2: Backend Generates Authorization URL

### Route Handler
**File**: `backend/src/index.js` (line 223)

**Route**: `GET /api/v1/oauth/github/authorize`
- **Middleware**: `authMiddleware`
- **Controller**: `OAuthController.getGitHubAuthUrl()`

### Controller
**File**: `backend/src/presentation/OAuthController.js` (line 249)

**What Happens**:
1. Extracts `employeeId` from `req.user` (line 252)
2. Calls `ConnectGitHubUseCase.getAuthorizationUrl(employeeId)` (line 260)
3. Returns `{ authorizationUrl, state }` (line 262)

### Use Case
**File**: `backend/src/application/ConnectGitHubUseCase.js` (line 20)

**What Happens**:
1. Generates state parameter (same format as LinkedIn):
   ```javascript
   const state = Buffer.from(JSON.stringify({
     employeeId,
     timestamp: Date.now()
   })).toString('base64');
   ```

2. Calls `GitHubOAuthClient.getAuthorizationUrl(state)` (line 27)

### OAuth Client
**File**: `backend/src/infrastructure/GitHubOAuthClient.js` (line 40)

**What Happens**:
1. Validates `clientId` configured (line 41-43)

2. **Scopes Requested** (line 22):
   ```javascript
   this.scopes = ['user:email', 'read:user', 'repo'];
   ```
   - `user:email`: Read user email addresses
   - `read:user`: Read user profile data
   - `repo`: Read repository data (public and private if user grants)

3. Builds authorization URL:
   ```javascript
   const params = new URLSearchParams({
     client_id: this.clientId,
     redirect_uri: this.redirectUri,
     state: state,
     scope: this.scopes.join(' ')  // 'user:email read:user repo'
   });
   ```

4. Returns URL:
   ```
   https://github.com/login/oauth/authorize?client_id=...&redirect_uri=...&state=...&scope=user:email read:user repo
   ```

**Configuration**:
- **Authorization URL**: `https://github.com/login/oauth/authorize`
- **Redirect URI**: `${BASE_URL}/api/v1/oauth/github/callback`
- **Client ID**: From `GITHUB_CLIENT_ID` environment variable
- **Client Secret**: From `GITHUB_CLIENT_SECRET` environment variable

---

## ⬇️ Step 3: Frontend Redirects to GitHub

**File**: `frontend/src/components/GitHubConnectButton.js` (line 37)

**What Happens**:
```javascript
window.location.href = authorizationUrl;
```

User is redirected to GitHub's authorization page.

---

## ⬇️ Step 4: GitHub Authorization Page

### What User Sees
- GitHub login page (if not logged in)
- GitHub consent screen showing:
  - App name requesting access
  - Permissions:
    - "Read user email addresses"
    - "Read user profile data"
    - "Read repository data"
  - "Authorize" or "Cancel" buttons

### What Happens When User Clicks "Authorize"
1. GitHub validates:
   - `client_id` matches registered OAuth app
   - `redirect_uri` matches exactly
   - User has granted permissions

2. GitHub generates authorization code

3. GitHub redirects back:
   ```
   https://your-backend-url/api/v1/oauth/github/callback?code=AUTHORIZATION_CODE&state=ORIGINAL_STATE
   ```

---

## ⬇️ Step 5: Backend Receives Callback

### Route Handler
**File**: `backend/src/index.js` (line 227)

**Route**: `GET /api/v1/oauth/github/callback`
- **Middleware**: **NONE** (public endpoint)
- **Controller**: `OAuthController.handleGitHubCallback()`

### Controller - Callback Handler
**File**: `backend/src/presentation/OAuthController.js` (line 276)

**What Happens**:
1. Extracts `{ code, state, error }` from query (line 281)
2. Handles errors (lines 284-288)
3. Validates `code` and `state` exist (lines 291-293)
4. Calls `ConnectGitHubUseCase.handleCallback(code, state)` (line 296)

---

## ⬇️ Step 6: Code Exchange for Access Token

### Use Case - Callback Handler
**File**: `backend/src/application/ConnectGitHubUseCase.js` (line 41)

**What Happens**:
1. Decodes state to get `employeeId` (line 44)
2. Verifies employee exists (line 52)
3. Checks if GitHub already connected (one-time only) (lines 58-60)
4. Exchanges code for token (line 63):
   - Calls `GitHubOAuthClient.exchangeCodeForToken(code)`

### OAuth Client - Token Exchange
**File**: `backend/src/infrastructure/GitHubOAuthClient.js` (line 60)

**What Happens**:
1. **Makes POST Request to GitHub**:
   - **Endpoint**: `https://github.com/login/oauth/access_token`
   - **Method**: `POST`
   - **Headers**: 
     - `Accept: application/json`
     - `Content-Type: application/json`
   - **Body** (JSON):
     ```javascript
     {
       client_id: this.clientId,
       client_secret: this.clientSecret,
       code: code,
       redirect_uri: this.redirectUri
     }
     ```

2. **What GitHub Returns**:
   ```json
   {
     "access_token": "gho_...",
     "scope": "user:email,read:user,repo",
     "token_type": "bearer"
   }
   ```

3. **Returns Token Response** (lines 87-91):
   ```javascript
   {
     access_token: response.data.access_token,
     scope: response.data.scope,
     token_type: response.data.token_type || 'Bearer'
   }
   ```

**Note**: GitHub does NOT return `expires_in` or `refresh_token` in standard OAuth flow. Tokens can be revoked by user but don't have explicit expiration.

---

## ⬇️ Step 7: Fetch GitHub Profile Data

### Use Case - Profile Fetch
**File**: `backend/src/application/ConnectGitHubUseCase.js` (line 66)

**What Happens**:
- Calls `GitHubAPIClient.getCompleteProfile(accessToken)`

### API Client - Profile Fetch
**File**: `backend/src/infrastructure/GitHubAPIClient.js` (line 306)

**What Happens**:
1. **Fetches Data in Parallel** (lines 307-315):
   - Profile, Email, Repositories fetched simultaneously

2. **Fetch User Profile** (line 26):
   - **Endpoint**: `https://api.github.com/user`
   - **Method**: `GET`
   - **Headers**: 
     - `Authorization: token {access_token}`
     - `Accept: application/vnd.github.v3+json`
   - **Returns**:
     ```json
     {
       "id": 12345678,
       "login": "johndoe",
       "name": "John Doe",
       "email": "john.doe@example.com",
       "bio": "Software Engineer",
       "avatar_url": "https://avatars.githubusercontent.com/...",
       "company": "Tech Corp",
       "blog": "https://johndoe.dev",
       "location": "San Francisco",
       "public_repos": 42,
       "followers": 100,
       "following": 50,
       "created_at": "2015-01-01T00:00:00Z",
       "updated_at": "2024-01-01T00:00:00Z"
     }
     ```

3. **Fetch User Emails** (line 64):
   - **Endpoint**: `https://api.github.com/user/emails`
   - **Method**: `GET`
   - **Headers**: `Authorization: token {access_token}`
   - **Returns**:
     ```json
     [
       { "email": "john.doe@example.com", "primary": true, "verified": true },
       { "email": "john@users.noreply.github.com", "primary": false, "verified": true }
     ]
     ```
   - **Logic**: Returns primary email, or first verified email, or first email (lines 76-86)

4. **Fetch User Repositories** (line 241):
   - **Endpoint**: `https://api.github.com/user/repos`
   - **Method**: `GET`
   - **Headers**: `Authorization: token {access_token}`
   - **Query Parameters**:
     - `sort: 'updated'`
     - `direction: 'desc'`
     - `per_page: 30`
     - `type: 'all'` (includes private repos if user grants access)
   - **Returns**: Array of repository objects:
     ```json
     [
       {
         "id": 123456,
         "name": "my-project",
         "full_name": "johndoe/my-project",
         "description": "A cool project",
         "html_url": "https://github.com/johndoe/my-project",
         "language": "JavaScript",
         "stargazers_count": 50,
         "forks_count": 10,
         "private": false,
         "fork": false,
         "created_at": "2023-01-01T00:00:00Z",
         "updated_at": "2024-01-01T00:00:00Z",
         "pushed_at": "2024-01-15T00:00:00Z",
         "topics": ["react", "nodejs"]
       }
     ]
     ```

5. **Enhance Top Repositories** (lines 280-291):
   - For top 10 repositories, fetches commit history:
     - **Endpoint**: `https://api.github.com/repos/{owner}/{repo}/commits`
     - **Returns**: Commit frequency, last commit date, sample commit messages

6. **Fetch Contribution Statistics** (line 186):
   - **Endpoint**: `https://api.github.com/users/{username}/events/public`
   - **Returns**: Event types, activity period, last activity date

7. **Complete Profile Structure** (lines 327-333):
   ```javascript
   {
     ...profile,                    // All profile fields
     email: email || profile.email || null,
     repositories: repositories || [],
     contribution_statistics: contributionStats,
     fetched_at: new Date().toISOString()
   }
   ```

**Data Fetched**:
- ✅ User ID (`id`)
- ✅ Username (`login`)
- ✅ Full name (`name`)
- ✅ Email address (`email`)
- ✅ Bio (`bio`)
- ✅ Avatar URL (`avatar_url`)
- ✅ Company (`company`)
- ✅ Blog/Website (`blog`)
- ✅ Location (`location`)
- ✅ Public repos count (`public_repos`)
- ✅ Followers/Following counts
- ✅ **Repositories** (up to 30):
  - Name, description, language
  - Stars, forks, topics
  - Created/updated dates
  - Commit history (for top 10)
- ✅ Contribution statistics

---

## ⬇️ Step 8: Store GitHub Data in Database

### Use Case - Data Storage
**File**: `backend/src/application/ConnectGitHubUseCase.js` (line 74)

**What Happens**:
1. **Build GitHub URL** (lines 69-71):
   ```javascript
   const githubUrl = profileData.login 
     ? `https://github.com/${profileData.login}` 
     : `https://github.com/user/${profileData.id}`;
   ```

2. **Prepare Data for Storage** (lines 77-83):
   ```javascript
   {
     ...profileData,                    // All profile fields
     access_token: tokenResponse.access_token,
     token_type: tokenResponse.token_type || 'Bearer',
     scope: tokenResponse.scope,
     connected_at: new Date().toISOString()
   }
   ```

3. **Save to Database** (line 74):
   - Calls `EmployeeRepository.updateGitHubData(employeeId, githubUrl, githubData)`

### Repository - Database Update
**File**: `backend/src/infrastructure/EmployeeRepository.js` (line 631)

**What Happens**:
1. **Extract Profile Photo** (line 635):
   - Uses `githubData.avatar_url`
   - **Important**: GitHub photo is **only used as fallback** (line 647):
     ```sql
     profile_photo_url = COALESCE(profile_photo_url, $4)
     ```
     - Keeps existing photo if it exists (LinkedIn takes priority)
     - Only uses GitHub photo if no photo exists

2. **Update Database** (lines 643-651):
   ```sql
   UPDATE employees
   SET github_url = $1,
       github_data = $2,           -- JSONB column, stores entire profile + tokens
       profile_photo_url = COALESCE(profile_photo_url, $4),
       updated_at = CURRENT_TIMESTAMP
   WHERE id = $3
   RETURNING *
   ```

**What is Stored**:
- ✅ `github_url`: Profile URL (`https://github.com/{username}`)
- ✅ `github_data`: **JSONB** column containing:
  - All profile fields (id, login, name, email, bio, avatar_url, etc.)
  - All repositories (array of repository objects)
  - Contribution statistics
  - `access_token`: For future API calls
  - `token_type`: "Bearer"
  - `scope`: Granted scopes
  - `connected_at`: Connection timestamp
- ✅ `profile_photo_url`: Only updated if no existing photo (LinkedIn takes priority)

**Database Schema**:
```sql
github_url VARCHAR(500),
github_data JSONB,              -- Stores entire profile + repos + tokens as JSON
profile_photo_url VARCHAR(500),  -- LinkedIn photo (priority) or GitHub photo (fallback)
```

---

## ⬇️ Step 9: Build User Object and Redirect

**File**: `backend/src/presentation/OAuthController.js` (line 299)

**What Happens**:
1. Fetches updated employee with GitHub data
2. Builds user object (same format as LinkedIn callback)
3. Generates dummy token
4. Encodes user data as base64
5. Checks enrichment readiness (line 361)

6. **Redirect Logic** (lines 366-388):

   **If Both Connected (Ready for Enrichment)**:
   ```javascript
   // Trigger enrichment synchronously
   const enrichmentResult = await this.enrichProfileUseCase.enrichProfile(employeeId);
   
   // Redirect with enriched status
   return res.redirect(`${frontendUrl}/enrich?linkedin=connected&github=connected&enriched=true&token=${token}&user=${userDataEncoded}`);
   ```

   **If Only GitHub Connected**:
   ```javascript
   // Redirect back to enrich page to connect LinkedIn
   return res.redirect(`${frontendUrl}/enrich?github=connected&token=${token}&user=${userDataEncoded}`);
   ```

---

## ⬇️ Step 10: Frontend Receives Callback

**File**: `frontend/src/pages/EnrichProfilePage.js`

**What Happens**:
- Same flow as LinkedIn callback
- Extracts `github=connected` parameter
- Updates `githubConnected` state
- If both connected AND enriched: Redirects to profile page

---

# AI Enrichment Trigger

## When Does AI Enrichment Run?

### Automatic Trigger
**File**: `backend/src/presentation/OAuthController.js` (lines 152-169, 366-383)

**Condition**: Both LinkedIn AND GitHub are connected

**What Happens**:
1. **Check Readiness** (line 148, 361):
   ```javascript
   const isReady = await this.enrichProfileUseCase.isReadyForEnrichment(employeeId);
   ```
   - Returns `true` if:
     - ✅ `employee.linkedin_data` exists
     - ✅ `employee.github_data` exists
     - ✅ `employee.enrichment_completed === false`

2. **If Ready, Trigger Enrichment** (line 156, 370):
   ```javascript
   const enrichmentResult = await this.enrichProfileUseCase.enrichProfile(employeeId);
   ```
   - **Synchronous**: Waits for enrichment to complete
   - **Blocks redirect**: Enrichment must finish before redirecting

3. **After Enrichment**:
   - Updates `userObject.profileStatus = 'enriched'` (line 160, 374)
   - Redirects with `enriched=true` parameter (line 164, 378)

### Manual Trigger (Not Implemented)
- There is **NO** separate endpoint to trigger enrichment manually
- There is **NO** "Continue to Profile" button that triggers enrichment
- Enrichment **ONLY** runs automatically when both OAuth connections complete

**Note**: The "Continue to Profile" button in `EnrichProfilePage.js` (line 549) only navigates to the profile page - it does NOT trigger enrichment.

---

## AI Enrichment Process

### Use Case - Enrich Profile
**File**: `backend/src/application/EnrichProfileUseCase.js` (line 25)

**What Happens**:

1. **Validation** (lines 31-52):
   - Verifies employee exists
   - Checks enrichment not already completed (one-time only)
   - Verifies both LinkedIn and GitHub data exist

2. **Parse Stored Data** (lines 57-63):
   ```javascript
   const linkedinData = typeof employee.linkedin_data === 'string' 
     ? JSON.parse(employee.linkedin_data) 
     : employee.linkedin_data;
   
   const githubData = typeof employee.github_data === 'string'
     ? JSON.parse(employee.github_data)
     : employee.github_data;
   ```

3. **Generate Bio** (line 93):
   - **AI Model**: `gpt-4-turbo`
   - **Temperature**: `0.7`
   - **Max Tokens**: `500`
   - **Input**: LinkedIn data + GitHub data + employee basic info
   - **Output**: Professional bio text
   - **File**: `backend/src/infrastructure/OpenAIAPIClient.js:27`

4. **Generate Project Summaries** (line 117):
   - **AI Model**: `gpt-3.5-turbo`
   - **Temperature**: `0.7`
   - **Max Tokens**: `4000`
   - **Input**: GitHub repositories array
   - **Output**: Array of `{ repository_name, summary }`
   - **File**: `backend/src/infrastructure/OpenAIAPIClient.js:174`
   - **Note**: Only runs if repositories exist

5. **Generate Value Proposition** (line 144):
   - **AI Model**: `gpt-4-turbo`
   - **Temperature**: `0.7`
   - **Max Tokens**: `300`
   - **Input**: Employee basic info (name, current role, target role, company)
   - **Output**: Value proposition text
   - **File**: `backend/src/infrastructure/OpenAIAPIClient.js:495`

6. **Update Database** (line 167):
   - Calls `EmployeeRepository.updateEnrichment(employeeId, bio, projectSummaries, valueProposition, true)`
   - Sets `enrichment_completed = TRUE`
   - Sets `profile_status = 'enriched'`
   - Stores bio, value proposition, project summaries

7. **Send to Skills Engine** (lines 176-204):
   - **Non-blocking**: If this fails, enrichment still succeeds
   - Calls `MicroserviceClient.getEmployeeSkills()`
   - Sends LinkedIn + GitHub data for skill normalization
   - **File**: `backend/src/infrastructure/MicroserviceClient.js`

8. **Create Approval Request** (line 208):
   - Creates record in `employee_profile_approvals` table
   - Status: `'pending'`
   - HR must approve before profile becomes `'approved'`

### Repository - Enrichment Update
**File**: `backend/src/infrastructure/EmployeeRepository.js` (line 672)

**What Happens**:
1. **Transaction Start** (line 702):
   ```sql
   BEGIN;
   ```

2. **Update Employee** (line 707):
   ```sql
   UPDATE employees
   SET bio = $1,
       value_proposition = $2,
       enrichment_completed = $3,
       enrichment_completed_at = CASE WHEN $3 THEN CURRENT_TIMESTAMP ELSE enrichment_completed_at END,
       profile_status = CASE WHEN $3 THEN 'enriched' ELSE profile_status END,
       updated_at = CURRENT_TIMESTAMP
   WHERE id = $4
   RETURNING *
   ```

3. **Delete Old Project Summaries** (line 736):
   ```sql
   DELETE FROM employee_project_summaries WHERE employee_id = $1;
   ```

4. **Insert New Project Summaries** (line 745):
   ```sql
   INSERT INTO employee_project_summaries (employee_id, repository_name, repository_url, summary)
   VALUES ($1, $2, $3, $4)
   ON CONFLICT (employee_id, repository_name) DO UPDATE SET
     repository_url = EXCLUDED.repository_url,
     summary = EXCLUDED.summary
   ```

5. **Transaction Commit** (line 762):
   ```sql
   COMMIT;
   ```

**What is Stored**:
- ✅ `bio`: AI-generated professional bio (TEXT)
- ✅ `value_proposition`: AI-generated value proposition (TEXT)
- ✅ `enrichment_completed`: `TRUE`
- ✅ `enrichment_completed_at`: Timestamp
- ✅ `profile_status`: `'enriched'`
- ✅ `employee_project_summaries`: Array of project summaries (separate table)

---

# Error Handling

## Error Scenarios and Handling

### 1. Expired Authorization Code

**When It Happens**:
- Authorization code expires (typically 10 minutes)
- User takes too long between authorization and callback

**How We Handle**:
- **Location**: `LinkedInOAuthClient.exchangeCodeForToken()` (line 109)
- **Error**: LinkedIn returns `400 Bad Request` with `invalid_grant` error
- **Response**: Error is caught, logged, and thrown (line 139-141)
- **Frontend**: Redirects to `/enrich?error=Failed to exchange authorization code for token`

**User Action**: User must click "Connect LinkedIn" again to get new code

---

### 2. Invalid Authorization Code

**When It Happens**:
- Code already used (codes are single-use)
- Code is malformed
- Code doesn't match client_id

**How We Handle**:
- **Location**: `LinkedInOAuthClient.exchangeCodeForToken()` (line 109)
- **Error**: LinkedIn returns `400 Bad Request`
- **Response**: Error logged, thrown with descriptive message
- **Frontend**: Shows error message

---

### 3. Missing Permissions / Unauthorized Scope

**When It Happens**:
- LinkedIn app doesn't have required product approvals
- Scopes not approved in LinkedIn Developer Portal
- User denies specific permissions

**How We Handle**:
- **Location**: `OAuthController.handleLinkedInCallback()` (line 72-74)
- **Error**: `error=unauthorized_scope_error` in callback URL
- **Response**: 
  ```javascript
   if (error === 'unauthorized_scope_error') {
     errorMessage = 'LinkedIn app does not have required permissions. Please check LinkedIn Developer Portal settings.';
   }
   ```
- **Frontend**: Shows detailed error message with instructions

**Fix Required**: Admin must approve products in LinkedIn Developer Portal

---

### 4. LinkedIn API Rate Limits

**When It Happens**:
- Too many API calls in short time
- LinkedIn throttles requests

**How We Handle**:
- **Location**: `LinkedInAPIClient.getCompleteProfile()` (line 211)
- **Error**: `429 Too Many Requests` or rate limit error
- **Response**: Error is caught and thrown (line 237-243)
- **Frontend**: Shows error, user can retry

**Note**: No automatic retry logic currently implemented

---

### 5. Failed Profile Fetch

**When It Happens**:
- LinkedIn API returns error
- Network timeout
- Invalid access token

**How We Handle**:
- **Location**: `LinkedInAPIClient.getUserProfile()` (line 27)
- **Error**: Various (404, 403, network errors)
- **Response**: 
  - Tries fallback to legacy endpoint (line 62-64)
  - If fallback fails, throws error
- **Frontend**: Shows error, user can retry connection

---

### 6. AI Enrichment Failure

**When It Happens**:
- OpenAI API key invalid
- OpenAI rate limit exceeded
- OpenAI API error
- Network timeout

**How We Handle**:
- **Location**: `EnrichProfileUseCase.enrichProfile()` (lines 92-106, 116-131, 143-157)
- **Error**: OpenAI API errors
- **Response**: 
  - **NO FALLBACK**: Enrichment fails completely
  - Error is logged and thrown
  - **Database NOT updated**: `enrichment_completed` remains `FALSE`
- **Frontend**: Redirects with error parameter:
  ```
  /enrich?linkedin=connected&github=connected&error=OpenAI enrichment failed: ...
  ```

**User Action**: User must retry (but enrichment is one-time only, so this is a problem)

**Note**: This is a **critical issue** - if enrichment fails, user cannot retry because of one-time restriction.

---

### 7. Database Update Failure

**When It Happens**:
- Database connection lost
- Constraint violation
- Transaction rollback

**How We Handle**:
- **Location**: `EmployeeRepository.updateLinkedInData()` (line 575)
- **Error**: Database errors
- **Response**: 
  - Transaction rollback (if using transaction)
  - Error thrown and caught by controller
- **Frontend**: Redirects with error

---

### 8. State Parameter Mismatch

**When It Happens**:
- State parameter tampered with
- State doesn't contain employee ID
- State is invalid base64

**How We Handle**:
- **Location**: `ConnectLinkedInUseCase.handleCallback()` (line 53-58)
- **Error**: `Invalid state parameter: employee ID not found`
- **Response**: Error thrown immediately
- **Frontend**: Redirects with error

**Security**: This prevents CSRF attacks - state must match original request

---

### 9. Employee Not Found

**When It Happens**:
- Employee deleted between authorization and callback
- Employee ID in state is invalid

**How We Handle**:
- **Location**: `ConnectLinkedInUseCase.handleCallback()` (line 61-64)
- **Error**: `Employee not found`
- **Response**: Error thrown
- **Frontend**: Redirects with error

---

### 10. Already Connected (One-Time Restriction)

**When It Happens**:
- User tries to connect LinkedIn/GitHub again
- `linkedin_data` or `github_data` already exists

**How We Handle**:
- **Location**: `ConnectLinkedInUseCase.handleCallback()` (line 67-69)
- **Error**: `LinkedIn is already connected. This is a one-time process.`
- **Response**: Error thrown immediately (before token exchange)
- **Frontend**: Shows error message

**Note**: This prevents re-connection, which is intentional (one-time only).

---

# Data Storage

## What is Stored in Database

### LinkedIn Data Storage

**Table**: `employees`
**Columns**:
- `linkedin_url` (VARCHAR(500)): Profile URL or null
- `linkedin_data` (JSONB): Complete profile data + tokens

**linkedin_data JSONB Structure**:
```json
{
  "id": "linkedin-user-id",
  "name": "John Doe",
  "given_name": "John",
  "family_name": "Doe",
  "email": "john.doe@example.com",
  "picture": "https://...",
  "headline": "Software Engineer",
  "locale": "en_US",
  "access_token": "AQV...",
  "token_expires_at": "2024-03-01T00:00:00.000Z",
  "refresh_token": "AQV...",
  "connected_at": "2024-01-01T00:00:00.000Z"
}
```

**What is NOT Stored**:
- ❌ No separate `linkedin_token` column
- ❌ No separate `linkedin_token_expires_at` column
- ❌ Access token is stored **inside** `linkedin_data` JSONB

---

### GitHub Data Storage

**Table**: `employees`
**Columns**:
- `github_url` (VARCHAR(500)): Profile URL
- `github_data` (JSONB): Complete profile data + repositories + tokens

**github_data JSONB Structure**:
```json
{
  "id": 12345678,
  "login": "johndoe",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "bio": "Software Engineer",
  "avatar_url": "https://...",
  "company": "Tech Corp",
  "blog": "https://johndoe.dev",
  "location": "San Francisco",
  "public_repos": 42,
  "followers": 100,
  "following": 50,
  "repositories": [
    {
      "id": 123456,
      "name": "my-project",
      "full_name": "johndoe/my-project",
      "description": "A cool project",
      "html_url": "https://github.com/johndoe/my-project",
      "language": "JavaScript",
      "stargazers_count": 50,
      "forks_count": 10,
      "private": false,
      "fork": false,
      "topics": ["react", "nodejs"],
      "commit_history": {
        "total_commits_analyzed": 10,
        "commit_frequency": "active",
        "last_commit_date": "2024-01-15T00:00:00Z"
      }
    }
  ],
  "contribution_statistics": {
    "total_events": 30,
    "event_types": { "PushEvent": 20, "PullRequestEvent": 10 },
    "last_activity_date": "2024-01-15T00:00:00Z"
  },
  "access_token": "gho_...",
  "token_type": "Bearer",
  "scope": "user:email,read:user,repo",
  "connected_at": "2024-01-01T00:00:00.000Z"
}
```

**What is NOT Stored**:
- ❌ No separate `github_token` column
- ❌ Access token is stored **inside** `github_data` JSONB

---

### Enrichment Data Storage

**Table**: `employees`
**Columns**:
- `bio` (TEXT): AI-generated professional bio
- `value_proposition` (TEXT): AI-generated value proposition
- `enrichment_completed` (BOOLEAN): `TRUE` after successful enrichment
- `enrichment_completed_at` (TIMESTAMP): When enrichment completed
- `profile_status` (VARCHAR): `'basic'` → `'enriched'` → `'approved'`

**Table**: `employee_project_summaries`
**Columns**:
- `employee_id` (UUID): Foreign key to employees
- `repository_name` (VARCHAR): Repository name
- `repository_url` (VARCHAR): Repository URL
- `summary` (TEXT): AI-generated project summary
- `created_at` (TIMESTAMP)

---

## Token Validation

### How Tokens are Validated

**Current Implementation**: **NO TOKEN VALIDATION**

**What This Means**:
- Access tokens are stored but **NOT validated** before use
- If token expires, API calls will fail
- No automatic token refresh implemented
- No token expiration check before making API calls

**Where Tokens Are Used**:
- **LinkedIn**: Token stored in `linkedin_data.access_token`
- **GitHub**: Token stored in `github_data.access_token`
- **Future Use**: Tokens could be used for:
  - Refreshing profile data
  - Fetching additional data (positions, skills)
  - But currently **NOT used** after initial connection

**Token Expiration**:
- **LinkedIn**: `expires_in: 5184000` seconds (~60 days)
- **GitHub**: No explicit expiration (can be revoked by user)

**Refresh Token**:
- **LinkedIn**: `refresh_token` stored in `linkedin_data.refresh_token`
- **GitHub**: No refresh token provided
- **Usage**: `LinkedInOAuthClient.refreshToken()` method exists (line 149) but is **NOT called** anywhere

---

# Architecture Overview

## File Structure and Responsibilities

### Frontend Files

#### `frontend/src/components/LinkedInConnectButton.js`
- **Purpose**: UI button to initiate LinkedIn OAuth
- **Responsibilities**:
  - Display "Connect LinkedIn" button
  - Call `getLinkedInAuthUrl()` service
  - Redirect browser to LinkedIn authorization URL
  - Handle errors and display to user

#### `frontend/src/components/GitHubConnectButton.js`
- **Purpose**: UI button to initiate GitHub OAuth
- **Responsibilities**: Same as LinkedIn button, but for GitHub

#### `frontend/src/services/oauthService.js`
- **Purpose**: API service layer for OAuth
- **Responsibilities**:
  - `getLinkedInAuthUrl()`: GET `/oauth/linkedin/authorize`
  - `getGitHubAuthUrl()`: GET `/oauth/github/authorize`
  - Handles response parsing and error handling

#### `frontend/src/pages/EnrichProfilePage.js`
- **Purpose**: Main enrichment page
- **Responsibilities**:
  - Display connection status for LinkedIn and GitHub
  - Handle OAuth callback URL parameters
  - Store token and user data from callback
  - Auto-redirect when both connected and enriched

---

### Backend Files

#### Routes
**File**: `backend/src/index.js` (lines 214-229)

**Routes Defined**:
```javascript
// LinkedIn OAuth
GET /api/v1/oauth/linkedin/authorize    // Requires authMiddleware
GET /api/v1/oauth/linkedin/callback     // Public (called by LinkedIn)

// GitHub OAuth
GET /api/v1/oauth/github/authorize      // Requires authMiddleware
GET /api/v1/oauth/github/callback       // Public (called by GitHub)
```

---

#### Controllers
**File**: `backend/src/presentation/OAuthController.js`

**Methods**:
1. `getLinkedInAuthUrl(req, res, next)` (line 21)
   - Extracts employee ID from authenticated user
   - Calls `ConnectLinkedInUseCase.getAuthorizationUrl()`
   - Returns `{ authorizationUrl, state }`

2. `handleLinkedInCallback(req, res, next)` (line 58)
   - Receives `code` and `state` from LinkedIn
   - Handles errors
   - Calls `ConnectLinkedInUseCase.handleCallback()`
   - Builds user object
   - Checks enrichment readiness
   - Triggers enrichment if ready
   - Redirects to frontend with token and user data

3. `getGitHubAuthUrl(req, res, next)` (line 249)
   - Same as LinkedIn, but for GitHub

4. `handleGitHubCallback(req, res, next)` (line 276)
   - Same as LinkedIn callback, but for GitHub

---

#### Use Cases
**File**: `backend/src/application/ConnectLinkedInUseCase.js`

**Methods**:
1. `getAuthorizationUrl(employeeId)` (line 20)
   - Generates state parameter with employee ID
   - Calls `LinkedInOAuthClient.getAuthorizationUrl(state)`
   - Returns `{ authorizationUrl, state }`

2. `handleCallback(code, state)` (line 50)
   - Decodes state to get employee ID
   - Validates employee exists
   - Checks one-time connection restriction
   - Exchanges code for token
   - Fetches profile data
   - Stores data in database
   - Returns success result

**File**: `backend/src/application/ConnectGitHubUseCase.js`
- Same structure as LinkedIn use case, but for GitHub

**File**: `backend/src/application/EnrichProfileUseCase.js`

**Methods**:
1. `enrichProfile(employeeId)` (line 25)
   - Validates employee and OAuth data
   - Parses LinkedIn and GitHub data
   - Calls OpenAI API for bio, project summaries, value proposition
   - Updates database with enriched data
   - Sends data to Skills Engine (non-blocking)
   - Creates approval request

2. `isReadyForEnrichment(employeeId)` (line 250)
   - Checks if both LinkedIn and GitHub data exist
   - Checks if enrichment not already completed
   - Returns boolean

---

#### Infrastructure - OAuth Clients
**File**: `backend/src/infrastructure/LinkedInOAuthClient.js`

**Methods**:
1. `getAuthorizationUrl(state)` (line 64)
   - Builds LinkedIn authorization URL
   - Includes client_id, redirect_uri, state, scopes
   - Returns complete URL

2. `exchangeCodeForToken(code)` (line 109)
   - POST to LinkedIn token endpoint
   - Sends client_id, client_secret, code, redirect_uri
   - Returns access_token, expires_in, refresh_token

3. `refreshToken(refreshToken)` (line 149)
   - **NOT CURRENTLY USED**
   - Can refresh expired access token

**File**: `backend/src/infrastructure/GitHubOAuthClient.js`
- Same structure as LinkedIn OAuth client, but for GitHub

---

#### Infrastructure - API Clients
**File**: `backend/src/infrastructure/LinkedInAPIClient.js`

**Methods**:
1. `getUserProfile(accessToken)` (line 27)
   - GET to OpenID Connect userinfo endpoint
   - Returns basic profile data

2. `getLegacyProfile(accessToken)` (line 77)
   - GET to legacy `/v2/me` endpoint
   - Returns profile with headline (if available)

3. `getUserEmail(accessToken)` (line 170)
   - GET to email endpoint
   - Returns email address (requires product approval)

4. `getCompleteProfile(accessToken, useLegacyScopes)` (line 211)
   - Orchestrates fetching profile + email
   - Handles both OpenID Connect and legacy scopes
   - Returns complete profile data

**File**: `backend/src/infrastructure/GitHubAPIClient.js`

**Methods**:
1. `getUserProfile(accessToken)` (line 26)
   - GET to `/user` endpoint
   - Returns profile data

2. `getUserEmails(accessToken)` (line 64)
   - GET to `/user/emails` endpoint
   - Returns email addresses

3. `getUserRepositories(accessToken, limit)` (line 241)
   - GET to `/user/repos` endpoint
   - Returns repositories with commit history (for top 10)

4. `getCommitHistorySummary(accessToken, owner, repo, limit)` (line 114)
   - GET to `/repos/{owner}/{repo}/commits`
   - Returns commit frequency and sample messages

5. `getContributionStatistics(accessToken, username)` (line 186)
   - GET to `/users/{username}/events/public`
   - Returns contribution statistics

6. `getCompleteProfile(accessToken)` (line 306)
   - Orchestrates fetching profile + email + repositories + contributions
   - Returns complete profile data

---

#### Infrastructure - Repository
**File**: `backend/src/infrastructure/EmployeeRepository.js`

**Methods**:
1. `updateLinkedInData(employeeId, linkedinUrl, linkedinData, client)` (line 575)
   - Extracts profile photo from LinkedIn data
   - Updates `linkedin_url`, `linkedin_data`, `profile_photo_url`
   - LinkedIn photo always overwrites existing photo

2. `updateGitHubData(employeeId, githubUrl, githubData, client)` (line 631)
   - Extracts profile photo from GitHub data
   - Updates `github_url`, `github_data`, `profile_photo_url`
   - GitHub photo only used if no existing photo

3. `updateEnrichment(employeeId, bio, projectSummaries, valueProposition, markAsCompleted, client)` (line 672)
   - Updates bio, value_proposition, enrichment flags
   - Deletes old project summaries
   - Inserts new project summaries
   - Runs in transaction

---

#### Infrastructure - AI Client
**File**: `backend/src/infrastructure/OpenAIAPIClient.js`

**Methods**:
1. `generateBio(linkedinData, githubData, employeeBasicInfo)` (line 27)
   - Builds prompt from LinkedIn + GitHub data
   - Calls OpenAI `gpt-4-turbo` model
   - Returns bio text

2. `generateProjectSummaries(repositories)` (line 174)
   - Builds prompt from repository data
   - Calls OpenAI `gpt-3.5-turbo` model
   - Returns array of project summaries

3. `generateValueProposition(employeeBasicInfo)` (line 495)
   - Builds prompt from employee info
   - Calls OpenAI `gpt-4-turbo` model
   - Returns value proposition text

---

## Data Flow Diagram

### LinkedIn OAuth Flow
```
User clicks "Connect LinkedIn"
  ↓
Frontend: LinkedInConnectButton.handleConnect()
  ↓
Frontend: oauthService.getLinkedInAuthUrl()
  ↓
GET /api/v1/oauth/linkedin/authorize (with auth token)
  ↓
Backend: OAuthController.getLinkedInAuthUrl()
  ↓
Backend: ConnectLinkedInUseCase.getAuthorizationUrl()
  ↓
Backend: LinkedInOAuthClient.getAuthorizationUrl()
  ↓
Returns: { authorizationUrl, state }
  ↓
Frontend: window.location.href = authorizationUrl
  ↓
User redirected to LinkedIn
  ↓
User authorizes on LinkedIn
  ↓
LinkedIn redirects: /oauth/linkedin/callback?code=...&state=...
  ↓
Backend: OAuthController.handleLinkedInCallback()
  ↓
Backend: ConnectLinkedInUseCase.handleCallback()
  ↓
Backend: LinkedInOAuthClient.exchangeCodeForToken()
  ↓
POST to LinkedIn: Exchange code for access_token
  ↓
Backend: LinkedInAPIClient.getCompleteProfile()
  ↓
GET to LinkedIn API: Fetch profile data
  ↓
Backend: EmployeeRepository.updateLinkedInData()
  ↓
UPDATE employees SET linkedin_data = ...
  ↓
Backend: Check if ready for enrichment
  ↓
If both connected: Trigger enrichment
  ↓
Backend: EnrichProfileUseCase.enrichProfile()
  ↓
Backend: OpenAIAPIClient.generateBio() + generateProjectSummaries() + generateValueProposition()
  ↓
Backend: EmployeeRepository.updateEnrichment()
  ↓
UPDATE employees SET bio = ..., value_proposition = ..., enrichment_completed = TRUE
  ↓
Backend: Redirect to frontend with token and user data
  ↓
Frontend: Store token and user, update UI, redirect to profile
```

### GitHub OAuth Flow
```
(Same structure as LinkedIn, but with GitHub endpoints and data)
```

---

## Missing or Incorrect Implementations

### 1. Token Validation Missing
**Issue**: Access tokens are stored but never validated before use
**Location**: No validation code exists
**Impact**: If token expires, future API calls will fail silently
**Fix Needed**: Add token expiration check before API calls

### 2. Token Refresh Not Implemented
**Issue**: `LinkedInOAuthClient.refreshToken()` method exists but is never called
**Location**: `backend/src/infrastructure/LinkedInOAuthClient.js:149`
**Impact**: Expired tokens cannot be refreshed automatically
**Fix Needed**: Implement automatic token refresh when token expires

### 3. One-Time Enrichment Restriction Problem
**Issue**: If enrichment fails, user cannot retry (one-time restriction)
**Location**: `EnrichProfileUseCase.enrichProfile()` (line 43-46)
**Impact**: User is stuck if OpenAI API fails
**Fix Needed**: Allow retry if enrichment failed (check error state)

### 4. No Manual Enrichment Trigger
**Issue**: Enrichment only runs automatically when both OAuth complete
**Location**: No endpoint exists for manual trigger
**Impact**: If automatic trigger fails, no way to retry
**Fix Needed**: Add endpoint to manually trigger enrichment

### 5. LinkedIn Work Experience Not Fetched
**Issue**: LinkedIn OAuth2 API doesn't provide work experience/positions
**Location**: `LinkedInAPIClient.getCompleteProfile()` (line 211)
**Impact**: Bio generation has limited data (no work history)
**Note**: This is a LinkedIn API limitation, not a code issue

### 6. Error Recovery Not Implemented
**Issue**: If token exchange fails, no retry mechanism
**Location**: `LinkedInOAuthClient.exchangeCodeForToken()` (line 109)
**Impact**: User must restart entire flow on error
**Fix Needed**: Add retry logic with exponential backoff

---

## Security Considerations

### 1. State Parameter (CSRF Protection)
- ✅ State parameter includes employee ID and timestamp
- ✅ State is validated in callback to ensure authenticity
- ✅ Prevents CSRF attacks

### 2. Client Secret
- ✅ Client secret is NEVER sent to frontend
- ✅ Only used server-to-server in token exchange
- ✅ Stored in environment variables (Railway)

### 3. Access Tokens
- ✅ Tokens stored in database (JSONB column)
- ✅ Tokens not exposed in API responses
- ⚠️ Tokens stored in `linkedin_data` and `github_data` JSONB (could be extracted if database is compromised)

### 4. Redirect URI Validation
- ✅ Redirect URI must match exactly (no trailing slashes)
- ✅ LinkedIn/GitHub validate redirect URI before redirecting
- ✅ Prevents redirect attacks

### 5. One-Time Connection
- ✅ Prevents re-connection (one-time only)
- ✅ Validates before token exchange (saves API calls)

---

## Summary

### Complete Flow (LinkedIn + GitHub + Enrichment)

1. **User clicks "Connect LinkedIn"** → Frontend requests auth URL → Backend generates URL → User redirected to LinkedIn
2. **User authorizes** → LinkedIn redirects with code → Backend exchanges code for token → Backend fetches profile → Backend stores data
3. **User clicks "Connect GitHub"** → Same flow as LinkedIn
4. **Both connected** → Backend automatically triggers enrichment → OpenAI generates bio, summaries, value proposition → Backend stores enriched data
5. **Frontend receives callback** → Stores token and user → Updates UI → Redirects to profile page

### Key Points

- ✅ OAuth flow is **complete and functional**
- ✅ Data is **stored correctly** in database
- ✅ Enrichment **triggers automatically** when both connected
- ⚠️ **No token validation** before use
- ⚠️ **No token refresh** implemented
- ⚠️ **One-time restriction** prevents retry on failure
- ⚠️ **No manual enrichment trigger** endpoint

---

**End of Documentation**

