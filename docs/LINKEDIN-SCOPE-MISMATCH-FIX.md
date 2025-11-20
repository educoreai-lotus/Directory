# LinkedIn Scope Mismatch Fix

## The Problem

You're seeing `unauthorized_scope_error` because:

1. **Your OAuth URL is requesting**: `r_liteprofile+r_emailaddress` (legacy scopes)
2. **Your LinkedIn app is configured for**: `openid profile email` (OpenID Connect scopes)
3. **LinkedIn rejects the mismatch** → `unauthorized_scope_error`

## Why This Happens

The system defaults to **OpenID Connect** scopes, but if `LINKEDIN_USE_LEGACY_SCOPES=true` is set in Railway, it uses legacy scopes instead.

Your Railway logs show:
```
scopes: [ 'r_liteprofile', 'r_emailaddress' ]
```

This means the environment variable is set to `true`, forcing legacy scopes.

## The Fix

### Step 1: Check Railway Environment Variables

1. Go to Railway dashboard
2. Select your backend service
3. Go to "Variables" tab
4. Look for `LINKEDIN_USE_LEGACY_SCOPES`

### Step 2: Remove or Update the Variable

**Option A: Delete it** (Recommended)
- If `LINKEDIN_USE_LEGACY_SCOPES` exists, **delete it completely**
- System will default to OpenID Connect

**Option B: Set to false**
- Change `LINKEDIN_USE_LEGACY_SCOPES=true` to `LINKEDIN_USE_LEGACY_SCOPES=false`
- Explicitly uses OpenID Connect

### Step 3: Verify After Redeploy

After Railway redeploys, check the logs. You should see:

```
[LinkedInOAuthClient] ✅ Using OpenID Connect scopes: openid, profile, email (DEFAULT)
[LinkedInOAuthClient] Requesting scopes: openid profile email
```

Instead of:

```
[LinkedInOAuthClient] ⚠️  Using legacy scopes: r_liteprofile, r_emailaddress
[LinkedInOAuthClient] Requesting scopes: r_liteprofile r_emailaddress
```

## Expected OAuth URL After Fix

**Before (Wrong - Legacy Scopes)**:
```
https://www.linkedin.com/oauth/v2/authorization?
  response_type=code
  &client_id=77p3yqar3ao4mc
  &redirect_uri=...
  &state=...
  &scope=r_liteprofile+r_emailaddress
```

**After (Correct - OpenID Connect)**:
```
https://www.linkedin.com/oauth/v2/authorization?
  response_type=code
  &client_id=77p3yqar3ao4mc
  &redirect_uri=...
  &state=...
  &scope=openid+profile+email
```

## Verify LinkedIn App Configuration

Your app should have:

1. **Products Tab**:
   - ✅ "Sign In with LinkedIn using OpenID Connect" - **Approved** or **Standard Tier**

2. **Auth Tab**:
   - ✅ Redirect URI: `https://directory3-production.up.railway.app/api/v1/oauth/linkedin/callback`
   - ✅ OAuth 2.0 scopes showing: `openid`, `profile`, `email`

3. **No Legacy Products Needed**:
   - ❌ You do NOT need "Email Address" product (that's for legacy scopes)
   - ❌ You do NOT need "Sign In with LinkedIn" product (legacy)

## Test After Fix

1. **Remove the env var** from Railway
2. **Wait for redeploy** (or trigger manually)
3. **Clear browser cache** (or use incognito)
4. **Try connecting LinkedIn** with a new employee
5. **Check Railway logs** for OpenID Connect messages
6. **Verify OAuth URL** in browser network tab shows `scope=openid+profile+email`

## Why OpenID Connect is Better

- ✅ **No product approvals needed** (Standard Tier is automatic)
- ✅ **More reliable** - LinkedIn's recommended approach
- ✅ **Matches your app configuration** - no scope mismatch
- ✅ **Email included** - automatically available from userinfo endpoint

## Summary

- **Problem**: OAuth URL requests legacy scopes, app configured for OpenID Connect
- **Root Cause**: `LINKEDIN_USE_LEGACY_SCOPES=true` in Railway
- **Solution**: Remove the env var (or set to false)
- **Result**: System uses OpenID Connect scopes that match your app

