# Supabase Configuration Guide

## ⚠️ SECURITY NOTICE

**DO NOT commit actual credentials to Git!** This file contains placeholders only.

All sensitive credentials must be stored in environment variables in your deployment platform (Railway, Vercel, etc.).

---

## Getting Your Supabase Credentials

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **Settings** → **API**
3. Copy the following values:

### Project Information

**Project URL:** `https://YOUR_PROJECT_REF.supabase.co`  
*(Replace `YOUR_PROJECT_REF` with your actual project reference)*

**Database Host:** `db.YOUR_PROJECT_REF.supabase.co`

**Database Password:** Get this from **Settings** → **Database** → **Connection string** → **URI**  
*(The password is in the connection string after `postgres:`)*

### API Keys

**Anon/Public Key:**  
Get from **Settings** → **API** → **Project API keys** → **anon public**

**Service Role Key (SECRET - Keep Safe):**  
Get from **Settings** → **API** → **Project API keys** → **service_role secret**  
⚠️ **NEVER commit this to Git!**

### Connection Strings

**Direct Connection:**
```
postgresql://postgres:YOUR_DB_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres
```

**Session Pooler:**
```
postgresql://postgres.YOUR_PROJECT_REF:YOUR_DB_PASSWORD@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
```

---

## Railway Environment Variables

Add these in **Railway → Your Backend Service → Variables** tab:

```
PORT=3001
NODE_ENV=production

# Supabase Configuration
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE

# Database Connection
DB_HOST=db.YOUR_PROJECT_REF.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=YOUR_DATABASE_PASSWORD_HERE
DB_SSL=true

# Also set these for compatibility
SUPABASE_DB_NAME=postgres
SUPABASE_USER=postgres
SUPABASE_PASSWORD=YOUR_DATABASE_PASSWORD_HERE
SUPABASE_SSL=true
SUPABASE_PROJECT_REF=YOUR_PROJECT_REF_HERE
```

**Replace all placeholders with your actual values from Supabase dashboard.**

---

## Tables Status

All tables are created and marked as "Unrestricted":
- ✅ audit_logs
- ✅ companies
- ✅ company_registration_requests
- ✅ departments
- ✅ employee_managers
- ✅ employee_project_summaries
- ✅ employee_roles
- ✅ employee_teams
- ✅ employees
- ✅ teams
- ✅ trainer_settings

---

## Next Steps

1. ✅ Database is ready
2. ⏭️ Deploy backend to Railway (use credentials above)
3. ⏭️ Deploy frontend to Vercel
4. ⏭️ Test connections

