# Railway Database Connection Fix

## Issue
The backend is trying to connect to `localhost:5432` instead of Supabase, causing `ECONNREFUSED` errors.

## Solution
The config now automatically builds the database connection string from individual environment variables.

## Required Railway Environment Variables

Make sure these are set in **Railway → Your Backend Service → Variables**:

```
PORT=3001
NODE_ENV=production

# Database Connection (Required)
DB_HOST=db.lkxqkytxijlxlxsuystm.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=fullstack2025
DB_SSL=true
```

## How to Set in Railway

1. Go to **Railway Dashboard** → Your Backend Service
2. Click on **Variables** tab
3. Add/Update each variable:
   - `DB_HOST` = `db.lkxqkytxijlxlxsuystm.supabase.co`
   - `DB_PORT` = `5432`
   - `DB_NAME` = `postgres`
   - `DB_USER` = `postgres`
   - `DB_PASSWORD` = `fullstack2025`
   - `DB_SSL` = `true`
4. **Redeploy** the service after adding variables

## Alternative: Use DATABASE_URL

You can also set a single `DATABASE_URL` instead:

```
DATABASE_URL=postgresql://postgres:fullstack2025@db.lkxqkytxijlxlxsuystm.supabase.co:5432/postgres
```

## Verification

After setting the variables and redeploying, check the Railway logs. You should see:
- `Server running on port 3001` (no connection errors)
- When you try to register a company, it should connect successfully

## Connection String Format

The config will automatically build:
```
postgresql://postgres:fullstack2025@db.lkxqkytxijlxlxsuystm.supabase.co:5432/postgres
```

From the individual `DB_*` variables.

