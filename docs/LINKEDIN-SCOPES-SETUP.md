# LinkedIn OAuth Scopes Setup Guide

## Overview

The system supports two LinkedIn OAuth scope configurations:

1. **Legacy Scopes** (Default): `r_liteprofile` + `r_emailaddress`
2. **OpenID Connect Scopes**: `openid`, `profile`, `email`

## Current Configuration (Legacy Scopes)

By default, the system uses **legacy scopes** (`r_liteprofile` + `r_emailaddress`) because they are more reliable for development and testing.

### Why Legacy Scopes?

- ✅ More reliable for development/testing
- ✅ Works immediately without app approval (for developers/testers)
- ✅ Clear error messages if permissions are missing
- ⚠️ `r_liteprofile` is deprecated but still works
- ⚠️ `r_emailaddress` requires "Email Address" product approval

### API Endpoints Used with Legacy Scopes

1. **Profile**: `GET https://api.linkedin.com/v2/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))`
2. **Email**: `GET https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))`

## Switching to OpenID Connect

To use OpenID Connect scopes instead, set this environment variable in Railway:

```
LINKEDIN_USE_LEGACY_SCOPES=false
```

### OpenID Connect Requirements

- ✅ Modern, recommended approach
- ✅ Email included in userinfo endpoint
- ⚠️ May require app approval from LinkedIn
- ⚠️ May not work in development mode

## LinkedIn Developer Portal Setup

### Step 1: Create/Configure LinkedIn App

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
2. Create a new app or select existing app
3. Go to "Auth" tab
4. Add redirect URI: `https://directory3-production.up.railway.app/api/v1/oauth/linkedin/callback`
   - **Important**: No trailing slash, exact match required

### Step 2: Request Products (For Legacy Scopes)

If using legacy scopes (`r_liteprofile` + `r_emailaddress`):

1. Go to "Products" tab in LinkedIn Developer Portal
2. Find "Email Address" product
3. Click "Request access"
4. Fill out the form:
   - **Use case**: "Employee profile enrichment - fetching email for professional profiles"
   - **How will you use this data**: "To display employee email in their professional profile after OAuth connection"
5. Wait for LinkedIn approval (1-2 business days)

### Step 3: Add Test Users (For Development Mode)

If your app is in **Development Mode**:

1. Go to "Auth" tab in LinkedIn Developer Portal
2. Scroll to "Development" section
3. Click "Add test users"
4. Add LinkedIn accounts that will test the OAuth flow
5. Only these users can successfully authorize in development mode

### Step 4: Environment Variables

Set these in Railway:

```
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_REDIRECT_URI=https://directory3-production.up.railway.app/api/v1/oauth/linkedin/callback
LINKEDIN_USE_LEGACY_SCOPES=true  # or false for OpenID Connect
```

## Troubleshooting

### Error: "Not enough permissions to access: emailAddress.FINDER-members.NO_VERSION"

**Cause**: The "Email Address" product is not approved in LinkedIn Developer Portal.

**Solution**:
1. Go to LinkedIn Developer Portal → Products
2. Request "Email Address" product access
3. Wait for approval
4. Or switch to OpenID Connect scopes (set `LINKEDIN_USE_LEGACY_SCOPES=false`)

### Error: "Invalid redirect_uri"

**Cause**: Redirect URI doesn't match exactly what's configured in LinkedIn Developer Portal.

**Solution**:
1. Check redirect URI in LinkedIn Developer Portal (Auth tab)
2. Ensure it matches exactly: `https://directory3-production.up.railway.app/api/v1/oauth/linkedin/callback`
3. No trailing slashes, exact match required

### Error: "User not authorized" (Development Mode)

**Cause**: App is in development mode and user is not added as a test user.

**Solution**:
1. Go to LinkedIn Developer Portal → Auth tab
2. Add the user as a test user in "Development" section
3. Or request app verification to move to production mode

### Profile/Email Not Fetching

**Check Railway Logs**:

If using legacy scopes, you should see:
```
[LinkedInAPIClient] Using legacy endpoints (r_liteprofile, r_emailaddress)
[LinkedInAPIClient] ✅ Legacy profile fetched successfully
[LinkedInAPIClient] ✅ Email retrieved from legacy email endpoint
```

If using OpenID Connect, you should see:
```
[LinkedInAPIClient] ✅ Email retrieved from OpenID Connect userinfo endpoint
```

## Current Status

✅ **Default Configuration**: Legacy scopes (`r_liteprofile` + `r_emailaddress`)
✅ **Fallback**: Automatically falls back to legacy endpoints if OpenID Connect fails
✅ **Error Handling**: Gracefully handles missing email (email is optional)

## Testing

1. **Connect LinkedIn** from employee enrichment page
2. **Authorize** the app in LinkedIn
3. **Check Railway Logs** for:
   - `✅ Legacy profile fetched successfully`
   - `✅ Email retrieved from legacy email endpoint`
4. **Verify** LinkedIn data is stored in `employees.linkedin_data` column

## Next Steps

1. ✅ Code updated to use legacy scopes by default
2. ⚠️ Request "Email Address" product approval in LinkedIn Developer Portal
3. ⚠️ Add test users if app is in development mode
4. ✅ Test LinkedIn connection flow

