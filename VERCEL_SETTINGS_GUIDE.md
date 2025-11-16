# 🔧 Vercel Settings Guide

## Finding Production Branch Setting

Vercel automatically uses `main` as the production branch by default. Here's how to verify/change it:

### Method 1: Project Settings

1. Go to **Vercel Dashboard**: https://vercel.com
2. Select your project: **DIRECTORY3**
3. Go to **Settings** tab (gear icon in top right)
4. Click **"Git"** in the left sidebar
5. You'll see:
   - **Production Branch**: Should show `main` (or you can change it)
   - **Root Directory**: Should be `frontend`
   - **Build Command**: Should be `npm run build`
   - **Output Directory**: Should be `build`

### Method 2: General Settings

1. Go to **Settings** → **General**
2. Look for **"Production Branch"** section
3. It should show `main` as the production branch
4. If it's different, click **"Edit"** and change to `main`

### Method 3: Check Deployments

1. Go to **Deployments** tab
2. Look at the branch column
3. Deployments from `main` branch are production deployments
4. They'll have a "Production" badge

---

## If Production Branch Setting is Missing

If you don't see "Production Branch" setting:

1. **Vercel auto-detects it**: Vercel uses `main` or `master` by default
2. **Check Git connection**: 
   - Settings → Git
   - Ensure repository is connected
   - If not connected, click "Connect Git Repository"
3. **Manual trigger**: 
   - Go to Deployments
   - Click "Redeploy"
   - Select latest commit from `main` branch

---

## Verify Vercel is Connected to GitHub

1. Go to **Settings** → **Git**
2. You should see:
   - **Repository**: `jasminemograby/DIRECTORY3`
   - **Production Branch**: `main` (or auto-detected)
3. If not connected:
   - Click **"Connect Git Repository"**
   - Select your GitHub repository
   - Configure:
     - Root Directory: `frontend`
     - Framework: Create React App
   - Click **"Deploy"**

---

## Trigger Production Deployment

### Option 1: Push to Main Branch
```bash
# Any push to main will trigger Vercel deployment
git push origin main
```

### Option 2: Manual Redeploy
1. Go to **Deployments** tab
2. Click **"Redeploy"** button
3. Select latest commit
4. Click **"Redeploy"**

### Option 3: Create New Commit
```bash
# Make a small change
echo "" >> README.md
git add README.md
git commit -m "Trigger Vercel deployment"
git push
```

---

## Environment Variables Check

1. Go to **Settings** → **Environment Variables**
2. Verify `REACT_APP_API_BASE_URL` is set:
   ```
   https://directory3-production.up.railway.app/api/v1
   ```
3. Make sure it's enabled for:
   - ✅ Production
   - ✅ Preview (optional)
   - ✅ Development (optional)

---

## Common Issues

**No deployments showing:**
- Vercel might not be connected to GitHub
- Check Settings → Git
- Reconnect if needed

**Deployments from wrong branch:**
- Check Production Branch setting
- Ensure you're pushing to `main` branch
- Vercel only auto-deploys production branch

**Build fails:**
- Check build logs in deployment
- Verify Root Directory is `frontend`
- Check environment variables are set

---

## Quick Checklist

- [ ] Vercel connected to GitHub: `jasminemograby/DIRECTORY3`
- [ ] Production Branch: `main` (or auto-detected)
- [ ] Root Directory: `frontend`
- [ ] Environment Variable: `REACT_APP_API_BASE_URL` set correctly
- [ ] Latest commit pushed to `main` branch
- [ ] Deployment visible in Vercel dashboard

