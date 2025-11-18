# LinkedIn OAuth Setup Guide

This guide explains how to set up LinkedIn OAuth for employee profile enrichment.

---

## 1. Create LinkedIn OAuth App

### Step 1: Go to LinkedIn Developers
1. Visit: https://www.linkedin.com/developers/apps
2. Sign in with your LinkedIn account
3. Click **"Create app"**

### Step 2: Fill in App Details
- **App name**: Your app name (e.g., "EDUCORE Directory")
- **LinkedIn Page**: Select or create a LinkedIn page for your company
- **Privacy Policy URL**: Your privacy policy URL (required)
- **App logo**: Upload a logo (optional but recommended)
- **App usage**: Select "Sign In with LinkedIn using OpenID Connect"

### Step 3: Get Credentials
After creating the app, you'll see:
- **Client ID** (also called "Client identifier")
- **Client Secret** (click "Show" to reveal)

**Save these credentials** - you'll need them for Railway environment variables.

---

## 2. Configure Redirect URI

### Step 1: Add Redirect URI
1. In your LinkedIn app settings, go to **"Auth"** tab
2. Under **"Redirect URLs"**, click **"Add redirect URL"**
3. Add your callback URL:
   - **Production**: `https://directory3-production.up.railway.app/api/v1/oauth/linkedin/callback`
   - **Local Development**: `http://localhost:3001/api/v1/oauth/linkedin/callback`
4. Click **"Update"**

### Step 2: Request Scopes
1. In the **"Auth"** tab, under **"Products"**
2. Request access to:
   - **Sign In with LinkedIn using OpenID Connect** (if not already enabled)
3. Wait for approval (usually instant for basic scopes)

---

## 3. Set Environment Variables in Railway

### Step 1: Go to Railway Dashboard
1. Open your Railway project: https://railway.app
2. Select your backend service
3. Go to **"Variables"** tab

### Step 2: Add Environment Variables
Add the following variables:

```env
LINKEDIN_CLIENT_ID=your_client_id_here
LINKEDIN_CLIENT_SECRET=your_client_secret_here
LINKEDIN_REDIRECT_URI=https://directory3-production.up.railway.app/api/v1/oauth/linkedin/callback
FRONTEND_URL=https://your-frontend-url.vercel.app
```

**Important Notes:**
- Replace `your_client_id_here` with your actual Client ID from LinkedIn
- Replace `your_client_secret_here` with your actual Client Secret
- Update `FRONTEND_URL` to match your frontend deployment URL
- The redirect URI must **exactly match** what you configured in LinkedIn app settings

### Step 3: Redeploy
After adding variables, Railway will automatically redeploy your service.

---

## 4. Verify Setup

### Check Backend Logs
After redeploy, check Railway logs. You should see:
- ✅ No warning about "LinkedIn OAuth credentials not configured"
- ✅ Server starts successfully

### Test OAuth Flow
1. Log in as an employee (first login)
2. You should be redirected to `/enrich` page
3. Click "Connect LinkedIn"
4. You should be redirected to LinkedIn authorization page
5. After authorizing, you should be redirected back to the app

---

## 5. Troubleshooting

### Issue: "LinkedIn OAuth credentials not configured"
**Solution**: Make sure `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` are set in Railway variables.

### Issue: "Invalid redirect_uri"
**Solution**: 
- Check that the redirect URI in Railway matches exactly what's in LinkedIn app settings
- Make sure there are no trailing slashes or extra characters
- The redirect URI must be HTTPS in production

### Issue: "Invalid client_id"
**Solution**: 
- Verify the Client ID is correct (no extra spaces)
- Make sure you copied the full Client ID

### Issue: "Invalid client_secret"
**Solution**: 
- Verify the Client Secret is correct
- Make sure you clicked "Show" in LinkedIn to reveal the full secret
- Secrets are case-sensitive

### Issue: OAuth callback redirects to wrong URL
**Solution**: 
- Check `FRONTEND_URL` environment variable
- Make sure it matches your frontend deployment URL
- Update LinkedIn redirect URI if needed

---

## 6. Local Development Setup

For local development, add to your `.env` file (if using one):

```env
LINKEDIN_CLIENT_ID=your_client_id_here
LINKEDIN_CLIENT_SECRET=your_client_secret_here
LINKEDIN_REDIRECT_URI=http://localhost:3001/api/v1/oauth/linkedin/callback
FRONTEND_URL=http://localhost:3000
```

**Note**: Make sure to add `http://localhost:3001/api/v1/oauth/linkedin/callback` to your LinkedIn app's redirect URIs.

---

## 7. Security Best Practices

1. **Never commit credentials** to version control
2. **Use Railway environment variables** for production secrets
3. **Rotate secrets** if they're ever exposed
4. **Use HTTPS** in production (Railway handles this)
5. **Limit redirect URIs** to only your production and development URLs

---

## 8. Required Scopes

The app uses the following LinkedIn scopes:
- `openid` - OpenID Connect authentication
- `profile` - Basic profile information
- `email` - Email address

These are automatically requested during the OAuth flow.

---

## Next Steps

After setting up LinkedIn OAuth:
1. Test the OAuth flow with a real employee account
2. Verify LinkedIn data is stored in the database
3. Proceed with F009 (GitHub OAuth) setup
4. Then F009A (Gemini AI Integration)

---

## Support

If you encounter issues:
1. Check Railway logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test the redirect URI in LinkedIn app settings
4. Check that the LinkedIn app is approved and active

