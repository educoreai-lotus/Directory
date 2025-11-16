# DEPLOYMENT GUIDE - EDUCORE Directory Management System

This guide provides step-by-step instructions for deploying the application to GitHub, Vercel, Railway, and Supabase.

## Prerequisites

- GitHub account
- Vercel account (free tier available)
- Railway account (free tier available)
- Supabase account (free tier available)
- Git installed locally
- Node.js 18+ installed locally

---

## STEP 1: GitHub Repository Setup

### 1.1 Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon in the top right → "New repository"
3. Repository name: `educore-directory-system`
4. Description: "EDUCORE Directory Management System - Multi-tenant company directory platform"
5. Visibility: **Private** (recommended) or Public
6. **DO NOT** initialize with README, .gitignore, or license (we already have these)
7. Click "Create repository"

### 1.2 Push Code to GitHub

Run these commands in your project directory:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Foundation setup with dark emerald design system"

# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/educore-directory-system.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Verification**: Check your GitHub repository - you should see all project files.

---

## STEP 2: Supabase Database Setup

### 2.1 Create Supabase Project

1. Go to [Supabase](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - **Name**: `educore-directory`
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is sufficient for development
4. Click "Create new project"
5. Wait 2-3 minutes for project to initialize

### 2.2 Get Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values (you'll need them later):
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (keep this secret!)

### 2.3 Run Database Migrations

**Option A: Using Supabase Dashboard (Recommended for first time)**

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Open `database/schema.sql` from this project
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click "Run" (or press Ctrl+Enter)
7. Verify tables were created by checking **Table Editor**

**Option B: Using Supabase CLI**

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project (replace PROJECT_REF with your project reference)
supabase link --project-ref PROJECT_REF

# Run migrations
supabase db push
```

### 2.4 Verify Database Setup

1. In Supabase dashboard, go to **Table Editor**
2. You should see these tables:
   - companies
   - departments
   - teams
   - employees
   - employee_roles
   - employee_teams
   - employee_managers
   - employee_project_summaries
   - trainer_settings
   - audit_logs
   - company_registration_requests

**Verification**: All tables should be visible in Table Editor.

---

## STEP 3: Vercel Frontend Deployment

### 3.1 Connect GitHub Repository to Vercel

1. Go to [Vercel](https://vercel.com) and sign in (use GitHub account)
2. Click "Add New..." → "Project"
3. Import your GitHub repository: `educore-directory-system`
4. Configure project:
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Install Command**: `npm install`
5. Click "Deploy"

### 3.2 Configure Environment Variables

1. In Vercel project dashboard, go to **Settings** → **Environment Variables**
2. Add the following variables:

```
REACT_APP_API_BASE_URL=https://your-railway-app.railway.app/api/v1
```

(Replace `your-railway-app` with your actual Railway app URL - you'll get this in Step 4)

3. Click "Save"

### 3.3 Redeploy After Adding Environment Variables

1. Go to **Deployments** tab
2. Click the three dots (⋯) on the latest deployment
3. Click "Redeploy"

**Verification**: 
- Visit your Vercel URL (e.g., `https://educore-directory-system.vercel.app`)
- You should see the Landing Page with dark emerald styling

---

## STEP 4: Railway Backend Deployment

### 4.1 Create Railway Project

1. Go to [Railway](https://railway.app) and sign in (use GitHub account)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository: `educore-directory-system`
5. Railway will detect the project

### 4.2 Configure Backend Service

1. In Railway dashboard, click "New" → "Service"
2. Select "GitHub Repo" → Choose your repository
3. Railway will auto-detect Node.js
4. Configure service:
   - **Root Directory**: `/backend`
   - **Start Command**: `npm start`
   - **Build Command**: `npm install`

### 4.3 Set Environment Variables in Railway

1. In your Railway service, go to **Variables** tab
2. Add the following environment variables:

```
PORT=3001
NODE_ENV=production

# Database (from Supabase)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_DB_NAME=postgres
SUPABASE_USER=postgres
SUPABASE_PASSWORD=your_supabase_password
SUPABASE_SSL=true
DB_HOST=db.xxxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_supabase_password
DB_SSL=true

# OAuth (get these from LinkedIn/GitHub developer portals)
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Gemini AI (get from Google AI Studio)
GEMINI_API_KEY=your_gemini_api_key
```

**Important**: Replace all placeholder values with actual credentials.

### 4.4 Get Railway Deployment URL

1. In Railway service, go to **Settings** → **Networking**
2. Click "Generate Domain" to create a public URL
3. Copy the URL (e.g., `https://educore-backend-production.up.railway.app`)
4. This is your backend API URL

### 4.5 Update Vercel Environment Variable

1. Go back to Vercel dashboard
2. Update `REACT_APP_API_BASE_URL` with your Railway URL:
   ```
   REACT_APP_API_BASE_URL=https://educore-backend-production.up.railway.app/api/v1
   ```
3. Redeploy Vercel frontend

**Verification**:
- Visit Railway URL: `https://your-app.railway.app/health`
- You should see: `{"status":"ok","timestamp":"...","version":"1.0.0"}`

---

## STEP 5: Configure GitHub Secrets for CI/CD

### 5.1 Get Required Tokens

**Vercel Token:**
1. Go to Vercel → **Settings** → **Tokens**
2. Click "Create Token"
3. Name: `github-actions`
4. Copy the token (you'll only see it once!)

**Railway Token:**
1. Go to Railway → **Account Settings** → **Tokens**
2. Click "New Token"
3. Name: `github-actions`
4. Copy the token

### 5.2 Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click "New repository secret"
4. Add these secrets:

```
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
RAILWAY_TOKEN=your_railway_token
```

**To get Vercel Org/Project IDs:**
- Go to Vercel project → Settings → General
- Copy "Organization ID" and "Project ID"

---

## STEP 6: Verify Complete Deployment

### 6.1 Frontend (Vercel)
- ✅ Landing page loads
- ✅ Dark emerald styling applied
- ✅ Buttons are clickable
- ✅ Responsive design works

### 6.2 Backend (Railway)
- ✅ Health check endpoint works: `/health`
- ✅ Returns JSON response
- ✅ CORS enabled

### 6.3 Database (Supabase)
- ✅ All tables created
- ✅ Can query tables via Supabase dashboard
- ✅ Connection works from Railway

### 6.4 CI/CD (GitHub Actions)
- ✅ Push to main triggers workflow
- ✅ Tests run (when implemented)
- ✅ Deployment succeeds

---

## Troubleshooting

### Frontend Issues

**Problem**: Vercel build fails
- **Solution**: Check build logs in Vercel dashboard
- Ensure `package.json` has correct scripts
- Verify Node.js version (18+)

**Problem**: API calls fail
- **Solution**: Check `REACT_APP_API_BASE_URL` is set correctly
- Verify Railway backend is running
- Check CORS settings in backend

### Backend Issues

**Problem**: Railway deployment fails
- **Solution**: Check deployment logs
- Verify `package.json` exists in `/backend`
- Ensure start command is correct

**Problem**: Database connection fails
- **Solution**: Verify Supabase credentials
- Check network settings in Supabase
- Ensure IP allowlist allows Railway IPs

### Database Issues

**Problem**: Migrations fail
- **Solution**: Run migrations manually in Supabase SQL Editor
- Check for syntax errors in `schema.sql`
- Verify UUID extension is enabled

---

## Next Steps

After successful deployment:

1. ✅ Test all endpoints
2. ✅ Verify environment variables are set
3. ✅ Test frontend-backend communication
4. ✅ Set up monitoring (optional)
5. ✅ Configure custom domains (optional)

---

## Security Checklist

- [ ] All secrets stored in platform dashboards (not in code)
- [ ] No `.env` files committed to GitHub
- [ ] Supabase service_role key is secret
- [ ] OAuth credentials are secure
- [ ] API keys are protected
- [ ] CORS configured correctly
- [ ] Database credentials are secure

---

## Support

If you encounter issues:
1. Check deployment logs in each platform
2. Verify all environment variables are set
3. Check network connectivity
4. Review error messages carefully

For platform-specific help:
- Vercel: https://vercel.com/docs
- Railway: https://docs.railway.app
- Supabase: https://supabase.com/docs

