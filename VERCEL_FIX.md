# 🔧 Vercel Environment Variable Fix

## Issue
You set the Vercel environment variable to:
```
https://directory3-production.up.railway.app
```

But it should include the API path:
```
https://directory3-production.up.railway.app/api/v1
```

## Fix Steps

### 1. Update Vercel Environment Variable

1. Go to **Vercel Dashboard**: https://vercel.com
2. Select your project: **DIRECTORY3**
3. Go to **Settings** → **Environment Variables**
4. Find `REACT_APP_API_BASE_URL`
5. Click **Edit** or **Remove** and add new one
6. Set the value to:
   ```
   https://directory3-production.up.railway.app/api/v1
   ```
7. Make sure it's set for **Production** environment
8. Click **Save**

### 2. Redeploy Vercel

After updating the environment variable:

1. Go to **Deployments** tab in Vercel
2. Find the latest deployment
3. Click the **three dots (⋯)** menu
4. Click **Redeploy**
5. Wait for deployment to complete

### 3. Verify

1. Visit your Vercel URL
2. Open browser Developer Tools (F12)
3. Go to **Network** tab
4. Check if API calls are going to: `https://directory3-production.up.railway.app/api/v1`

---

## Correct Environment Variable

**Key:** `REACT_APP_API_BASE_URL`  
**Value:** `https://directory3-production.up.railway.app/api/v1`

**Important:** Must include `/api/v1` at the end!

