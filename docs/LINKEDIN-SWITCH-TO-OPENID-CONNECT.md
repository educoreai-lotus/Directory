# How to Switch LinkedIn OAuth to OpenID Connect

## Current Issue

Your Railway logs show the system is using **legacy scopes** (`r_liteprofile`, `r_emailaddress`) even though you have OpenID Connect set up in LinkedIn Developer Portal:

```
scopes: [ 'r_liteprofile', 'r_emailaddress' ]
```

This causes `unauthorized_scope_error` because legacy scopes require different product approvals.

## Solution: Remove Legacy Scopes Environment Variable

The system defaults to **OpenID Connect** scopes, but if `LINKEDIN_USE_LEGACY_SCOPES=true` is set in Railway, it will use legacy scopes instead.

### Step 1: Check Railway Environment Variables

1. Go to your Railway project dashboard
2. Select your backend service
3. Go to "Variables" tab
4. Look for `LINKEDIN_USE_LEGACY_SCOPES`

### Step 2: Remove or Update the Variable

**Option A: Remove the variable** (Recommended)
- If `LINKEDIN_USE_LEGACY_SCOPES` exists, **delete it**
- This will make the system use OpenID Connect (default)

**Option B: Set it to false**
- Change `LINKEDIN_USE_LEGACY_SCOPES=true` to `LINKEDIN_USE_LEGACY_SCOPES=false`
- This explicitly uses OpenID Connect

### Step 3: Redeploy

After removing/updating the variable:
1. Railway will automatically redeploy
2. Or manually trigger a redeploy if needed

### Step 4: Verify

After redeploy, check Railway logs. You should see:

```
[LinkedInOAuthClient] ✅ Using OpenID Connect scopes: openid, profile, email (DEFAULT)
[LinkedInOAuthClient] ℹ️  These scopes require "Sign In with LinkedIn using OpenID Connect" product
```

Instead of:

```
[LinkedInOAuthClient] ⚠️  Using legacy scopes: r_liteprofile, r_emailaddress
```

## Verify LinkedIn Developer Portal

Since you already have OpenID Connect set up, verify:

1. **Products Tab**:
   - ✅ "Sign In with LinkedIn using OpenID Connect" should show "Approved" or "Standard Tier"

2. **Auth Tab**:
   - ✅ Redirect URI: `https://directory3-production.up.railway.app/api/v1/oauth/linkedin/callback`
   - ✅ Exact match, no trailing slashes

3. **OAuth 2.0 Scopes** (should show):
   - ✅ `openid` - Use your name and photo
   - ✅ `profile` - Use your name and photo
   - ✅ `email` - Use the primary email address associated with your LinkedIn account

## Test After Changes

1. **Clear browser cache** (or use incognito)
2. **Log in** as a new employee (one that hasn't connected LinkedIn)
3. **Click "Connect LinkedIn"**
4. **Authorize** in LinkedIn
5. **Check Railway logs** for OpenID Connect success messages

## Expected Behavior

After switching to OpenID Connect:

- ✅ No more `unauthorized_scope_error`
- ✅ LinkedIn connection should work smoothly
- ✅ Email will be retrieved from OpenID Connect userinfo endpoint
- ✅ Profile data will be fetched successfully

## If You Still See Legacy Scopes

If Railway logs still show legacy scopes after removing the env var:

1. **Check for typos** in the environment variable name
2. **Verify the variable is actually deleted** (refresh Railway dashboard)
3. **Check if there are multiple services** with different env vars
4. **Redeploy manually** to ensure changes take effect

## Summary

- **Current**: Using legacy scopes (causing errors)
- **Fix**: Remove `LINKEDIN_USE_LEGACY_SCOPES` from Railway
- **Result**: System will use OpenID Connect (which you already have set up)
- **Test**: Try connecting LinkedIn again

