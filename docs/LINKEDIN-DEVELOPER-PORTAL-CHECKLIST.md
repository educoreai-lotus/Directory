# LinkedIn Developer Portal Checklist

## How to Verify LinkedIn App Configuration

This guide helps you verify that your LinkedIn app has the correct permissions and settings to allow OAuth connections with `r_liteprofile` and `r_emailaddress` scopes.

---

## Step 1: Access LinkedIn Developer Portal

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
2. Sign in with your LinkedIn account
3. Select your app (the one with Client ID matching `LINKEDIN_CLIENT_ID` in Railway)

---

## Step 2: Check App Status

### Location: App Dashboard

1. **App Status**: Check if app is in "Development" or "Production" mode
   - **Development Mode**: Only test users can authorize
   - **Production Mode**: Any LinkedIn user can authorize

2. **If in Development Mode**:
   - You MUST add test users (see Step 5)
   - Only added test users can successfully connect LinkedIn

---

## Step 3: Verify Auth Settings

### Location: "Auth" Tab

1. **Redirect URLs**:
   - ✅ Must include: `https://directory3-production.up.railway.app/api/v1/oauth/linkedin/callback`
   - ✅ **Exact match required** - no trailing slashes, exact URL
   - ✅ Check that the URL is listed and enabled

2. **OAuth 2.0 Settings**:
   - ✅ "Authorized redirect URLs for your app" should show your callback URL
   - ✅ If not listed, click "Add redirect URL" and add it

3. **OpenID Connect** (if using OpenID Connect scopes):
   - ✅ Should be enabled
   - ✅ Redirect URI should match exactly

---

## Step 4: Check Products and Permissions

### Location: "Products" Tab

This is **CRITICAL** for `r_emailaddress` scope to work.

### Required Products:

1. **Sign In with LinkedIn using OpenID Connect** (if using OpenID Connect):
   - Status: Should show "Approved" or "Request access"
   - If not approved, click "Request access"

2. **Email Address** (REQUIRED for `r_emailaddress` scope):
   - Status: Should show "Approved" or "Request access"
   - If showing "Request access":
     - Click "Request access"
     - Fill out the form:
       - **Use case**: "Employee profile enrichment - fetching email for professional profiles"
       - **How will you use this data**: "To display employee email in their professional profile after OAuth connection"
       - **Data usage**: "Email will be stored in employee profile database for profile enrichment"
     - Submit and wait for LinkedIn approval (1-2 business days)
   - ⚠️ **Without this approval, `r_emailaddress` scope will fail with `unauthorized_scope_error`**

3. **Sign In with LinkedIn** (if using legacy scopes):
   - Status: Should show "Approved" or "Request access"
   - This is required for `r_liteprofile` scope

### How to Check Product Status:

1. Go to "Products" tab
2. Look for each product listed above
3. Check the status column:
   - ✅ **"Approved"** = Ready to use
   - ⚠️ **"Request access"** = Need to request approval
   - ❌ **"Not available"** = Product not available for your app

---

## Step 5: Add Test Users (Development Mode Only)

### Location: "Auth" Tab → "Development" Section

**Only needed if app is in Development Mode**

1. Scroll to "Development" section
2. Find "Test users" or "Authorized redirect URLs for your app"
3. Click "Add test user" or similar button
4. Add LinkedIn email addresses of users who will test the OAuth flow
5. **Important**: Only these users can successfully authorize in Development Mode

### How to Check if Test Users are Added:

1. Go to "Auth" tab
2. Scroll to "Development" section
3. Look for list of test users
4. Verify the email addresses are listed

---

## Step 6: Verify Scopes Configuration

### Current Scopes Being Requested:

The system requests these scopes:
- `r_liteprofile` - Basic profile information
- `r_emailaddress` - Email address

### How LinkedIn Validates Scopes:

LinkedIn checks:
1. ✅ Is the app approved for the required products?
2. ✅ Does the redirect URI match exactly?
3. ✅ Is the user a test user (if in Development Mode)?
4. ✅ Are the scopes valid and available?

### Common Issues:

1. **`unauthorized_scope_error`**:
   - ❌ "Email Address" product not approved
   - ❌ App doesn't have required permissions
   - ❌ Scopes are invalid or deprecated

2. **`access_denied`**:
   - ❌ User cancelled authorization
   - ❌ User is not a test user (Development Mode)

3. **`invalid_redirect_uri`**:
   - ❌ Redirect URI doesn't match exactly
   - ❌ Redirect URI not added to app settings

---

## Step 7: Check App Credentials

### Location: "Auth" Tab

1. **Client ID**: Should match `LINKEDIN_CLIENT_ID` in Railway
2. **Client Secret**: Should match `LINKEDIN_CLIENT_SECRET` in Railway
3. **Verify**: Copy these values and compare with Railway environment variables

---

## Step 8: Test the Configuration

### After Making Changes:

1. **Wait for Product Approvals** (if requested):
   - Email Address product approval can take 1-2 business days
   - You'll receive an email when approved

2. **Test with a New Employee**:
   - Use an employee account that hasn't connected LinkedIn yet
   - Try connecting LinkedIn
   - Check Railway logs for success/error messages

3. **Check Railway Logs**:
   - Look for: `✅ Using legacy scopes: r_liteprofile, r_emailaddress`
   - Look for: `✅ Legacy profile fetched successfully`
   - Look for: `✅ Email retrieved from legacy email endpoint`
   - If you see errors, check the error message

---

## Quick Checklist

Before testing LinkedIn OAuth, verify:

- [ ] App is created in LinkedIn Developer Portal
- [ ] Client ID and Secret match Railway environment variables
- [ ] Redirect URI is added and matches exactly: `https://directory3-production.up.railway.app/api/v1/oauth/linkedin/callback`
- [ ] "Email Address" product is approved (or requested)
- [ ] "Sign In with LinkedIn" product is approved (if using legacy scopes)
- [ ] Test users are added (if app is in Development Mode)
- [ ] App status is correct (Development or Production)

---

## Troubleshooting

### Error: `unauthorized_scope_error`

**Cause**: LinkedIn app doesn't have required product approvals.

**Solution**:
1. Go to Products tab
2. Request "Email Address" product access
3. Wait for approval (1-2 business days)
4. Or switch to OpenID Connect scopes (set `LINKEDIN_USE_LEGACY_SCOPES=false` in Railway)

### Error: `access_denied`

**Cause**: User cancelled or is not authorized.

**Solution**:
1. If in Development Mode, add user as test user
2. Try again with authorization

### Error: `invalid_redirect_uri`

**Cause**: Redirect URI doesn't match.

**Solution**:
1. Check redirect URI in Auth tab
2. Ensure exact match: `https://directory3-production.up.railway.app/api/v1/oauth/linkedin/callback`
3. No trailing slashes, exact match required

---

## Alternative: Switch to OpenID Connect

If legacy scopes continue to fail, you can switch to OpenID Connect:

1. **Set Environment Variable in Railway**:
   ```
   LINKEDIN_USE_LEGACY_SCOPES=false
   ```

2. **Verify OpenID Connect Product**:
   - Go to Products tab
   - Ensure "Sign In with LinkedIn using OpenID Connect" is approved

3. **Test Again**:
   - The system will use `openid`, `profile`, `email` scopes instead
   - These may work better if legacy scopes are having issues

---

## Need Help?

If you continue to see `unauthorized_scope_error` after:
1. ✅ Verifying all settings above
2. ✅ Requesting product approvals
3. ✅ Adding test users (if needed)

Then:
- Check Railway logs for detailed error messages
- Verify environment variables are correct
- Consider switching to OpenID Connect scopes
- Contact LinkedIn Developer Support if product approvals are pending

