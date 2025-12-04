# Database Password Update Instructions

**Date:** 2025-01-20  
**New Password:** `fullstack@1234`  
**Status:** ✅ Password changed in Supabase

---

## ⚠️ ACTION REQUIRED: Update Railway Environment Variables

The database password has been changed in Supabase, but **Railway still has the old password**. The application will fail to connect until you update it.

---

## Step-by-Step Instructions

### 1. Go to Railway Dashboard

1. Open https://railway.app
2. Sign in to your account
3. Navigate to your **Backend Service** (the one running the Directory Service)

### 2. Update Environment Variables

1. Click on your backend service
2. Go to the **Variables** tab
3. Find and update these variables:

   **Option A: If using individual variables (recommended):**
   
   - `DB_PASSWORD` → Change value to: `fullstack@1234`
   - `SUPABASE_PASSWORD` → Change value to: `fullstack@1234`
   
   **Option B: If using DATABASE_URL:**
   
   - `DATABASE_URL` → Update the password in the connection string:
     ```
     postgresql://postgres:fullstack@1234@db.lkxqkytxijlxlxsuystm.supabase.co:5432/postgres
     ```
     (Replace `lkxqkytxijlxlxsuystm` with your actual project reference if different)

### 3. Save and Redeploy

1. Click **Save** or **Update** (Railway may auto-save)
2. Railway will automatically redeploy the service with new variables
3. Wait for deployment to complete (usually 1-2 minutes)

### 4. Verify Connection

1. Check Railway logs for connection errors
2. Test the health endpoint: `https://YOUR_RAILWAY_URL/health`
3. You should see: `{"status":"ok","timestamp":"...","version":"1.0.0"}`
4. If you see connection errors, double-check the password in Railway variables

---

## ✅ Verification Checklist

- [ ] Updated `DB_PASSWORD` in Railway to `fullstack@1234`
- [ ] Updated `SUPABASE_PASSWORD` in Railway to `fullstack@1234`
- [ ] (If applicable) Updated `DATABASE_URL` with new password
- [ ] Railway service redeployed
- [ ] Health endpoint returns `{"status":"ok"}`
- [ ] No connection errors in Railway logs
- [ ] Test company registration (if possible)
- [ ] Test employee login (if possible)

---

## 🔍 Troubleshooting

### If you see connection errors:

1. **Check password format:**
   - Make sure there are no extra spaces: `fullstack@1234` (not ` fullstack@1234 `)
   - The `@` symbol is part of the password - don't remove it

2. **Check which variables are set:**
   - If `DATABASE_URL` is set, it takes priority over individual `DB_*` variables
   - Make sure you're updating the correct variable

3. **Check Railway logs:**
   - Look for error messages like "password authentication failed"
   - This confirms the password is wrong
   - Look for "ECONNREFUSED" - this means connection issue, not password

4. **Verify Supabase password:**
   - Go to Supabase Dashboard → Settings → Database
   - Verify the password shown matches what you set in Railway

---

## 📝 Notes

- **No code changes needed** - The application reads passwords from environment variables
- **Service role key** - Not changed (per your request)
- **Old password** - `fullstack2025` is no longer valid and will be rejected

---

**Last Updated:** 2025-01-20



