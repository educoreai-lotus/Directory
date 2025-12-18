# Step-by-Step Migration Instructions

## 🎯 Objective
Add `pdf_data` and `manual_data` columns to `employees` table to consolidate all raw data sources.

---

## ✅ Pre-Migration Checklist

Before starting, verify:

- [ ] You have database access (psql or database GUI tool)
- [ ] You have a database backup (recommended)
- [ ] You know your database connection details
- [ ] You can run SQL commands

---

## 📋 Step-by-Step Instructions

### **STEP 1: Verify Current State** (Optional but Recommended)

Check if columns already exist:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'employees' 
  AND column_name IN ('pdf_data', 'manual_data');
```

**Expected Result:**
- If columns don't exist: Empty result (0 rows)
- If columns exist: 2 rows showing `pdf_data` and `manual_data` as `jsonb`

---

### **STEP 2: Check for Existing Data in Old Table** (Optional)

Check if you have data in `employee_raw_data` table that needs migration:
```sql
SELECT source, COUNT(*) 
FROM employee_raw_data 
WHERE source IN ('pdf', 'manual')
GROUP BY source;
```

**Expected Result:**
- If no data: Empty result (0 rows) → Skip Migration 005
- If data exists: Shows count of PDF/manual records → Run Migration 005 later

---

### **STEP 3: Run Migration 004** ⭐ **REQUIRED**

**This is the critical step - MUST be done before code deployment**

#### Option A: Using psql (Command Line)
```bash
psql -d your_database_name -f database/migrations/004_add_pdf_manual_data_to_employees.sql
```

**Replace `your_database_name` with your actual database name**

#### Option B: Using Database GUI Tool
1. Open your database GUI (pgAdmin, DBeaver, etc.)
2. Connect to your database
3. Open the file: `database/migrations/004_add_pdf_manual_data_to_employees.sql`
4. Copy and paste the SQL into the query editor
5. Execute the query

#### Option C: Direct SQL
```sql
-- Add pdf_data column (stores extracted CV/PDF data)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS pdf_data JSONB;

-- Add manual_data column (stores manually entered form data)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS manual_data JSONB;

-- Add comments for documentation
COMMENT ON COLUMN employees.pdf_data IS 'Stores extracted raw data from uploaded PDF CV (skills, work_experience, education, etc.)';
COMMENT ON COLUMN employees.manual_data IS 'Stores manually entered profile data (skills, work_experience, education)';
```

---

### **STEP 4: Verify Migration Success** ✅

Run this query to confirm columns were added:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'employees' 
  AND column_name IN ('linkedin_data', 'github_data', 'pdf_data', 'manual_data')
ORDER BY column_name;
```

**Expected Result:**
```
column_name   | data_type | is_nullable
--------------|-----------|-------------
github_data   | jsonb     | YES
linkedin_data | jsonb     | YES
manual_data   | jsonb     | YES  ← NEW
pdf_data      | jsonb     | YES  ← NEW
```

**If you see all 4 columns:** ✅ Migration successful!

---

### **STEP 5: Deploy Updated Code** ⭐ **REQUIRED**

**Now you can safely deploy your updated backend code:**

1. **Commit and push your code changes:**
   ```bash
   git add .
   git commit -m "Consolidate raw data to employees table"
   git push origin main
   ```

2. **Deploy to your hosting platform** (Railway, Vercel, etc.)

3. **Wait for deployment to complete**

---

### **STEP 6: Test Critical Endpoints** ✅

After deployment, test these endpoints:

#### Test 1: PDF Upload
```bash
# Test endpoint (replace with your actual employee ID)
POST /api/v1/employees/{employeeId}/upload-cv
```

**Expected:** Should work without errors (if PDF uploaded)

#### Test 2: Manual Data
```bash
# Test endpoint (replace with your actual employee ID)
POST /api/v1/employees/{employeeId}/manual-data
Body: { "skills": "test", "education": "test", "work_experience": "test" }
```

**Expected:** Should work without errors

#### Test 3: Enrichment Status
```bash
# Test endpoint
GET /api/v1/employees/{employeeId}/enrichment-status
```

**Expected:** Should return status (works even if no data)

---

### **STEP 7: (Optional) Migrate Existing Data** 

**Only if you found data in Step 2**

Run Migration 005:
```bash
psql -d your_database_name -f database/migrations/005_migrate_raw_data_to_employees.sql
```

**Verify migration:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE pdf_data IS NOT NULL) as employees_with_pdf,
  COUNT(*) FILTER (WHERE manual_data IS NOT NULL) as employees_with_manual
FROM employees;
```

---

### **STEP 8: (Optional) Drop Old Table** 

**Only after thorough testing and verification**

⚠️ **WARNING:** Only run this after:
- ✅ Migration 004 is complete
- ✅ Migration 005 is complete (if needed)
- ✅ Code is deployed and tested
- ✅ You've verified everything works
- ✅ You're confident you don't need the old table

Run Migration 006:
```bash
psql -d your_database_name -f database/migrations/006_drop_employee_raw_data_table.sql
```

---

## 🚨 Troubleshooting

### Error: "column already exists"
**Solution:** This is OK! Migration uses `IF NOT EXISTS`, so it's safe. Columns already exist, nothing to do.

### Error: "permission denied"
**Solution:** Make sure you're connected as a user with ALTER TABLE permissions.

### Error: "relation does not exist"
**Solution:** Make sure you're connected to the correct database.

### Code fails after deployment
**Solution:** 
1. Check if migration 004 ran successfully (verify columns exist)
2. Check backend logs for specific error
3. Verify database connection is correct

---

## ✅ Success Criteria

You'll know everything worked if:

- ✅ Migration 004 runs without errors
- ✅ Columns `pdf_data` and `manual_data` exist in `employees` table
- ✅ Code deploys successfully
- ✅ PDF upload endpoint works
- ✅ Manual data endpoint works
- ✅ Existing functionality (LinkedIn/GitHub OAuth) still works
- ✅ Skills Engine calls still work

---

## 📝 Quick Reference

**Required Steps:**
1. ✅ Run Migration 004
2. ✅ Verify columns exist
3. ✅ Deploy code
4. ✅ Test endpoints

**Optional Steps:**
5. ⚠️ Run Migration 005 (only if you have existing data)
6. ⚠️ Run Migration 006 (only after thorough testing)

---

## 🆘 Emergency Rollback

If something goes wrong:

```sql
-- Rollback: Remove new columns
ALTER TABLE employees DROP COLUMN IF EXISTS pdf_data;
ALTER TABLE employees DROP COLUMN IF EXISTS manual_data;
```

**Note:** This will lose any data in these columns, but all existing functionality will continue to work.

