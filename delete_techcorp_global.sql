-- SQL Queries to Delete TechCorp Global Company
-- Run these queries in your Supabase SQL Editor or PostgreSQL client

-- Step 1: Find the company ID(s) for TechCorp Global
-- This helps verify which company will be deleted
SELECT 
    id,
    company_name,
    domain,
    verification_status,
    created_at
FROM companies
WHERE company_name ILIKE '%TechCorp Global%' 
   OR domain ILIKE '%techcorp.global%'
ORDER BY created_at DESC;

-- Step 2: Verify related data that will be deleted (CASCADE)
-- Count employees
SELECT 
    c.id as company_id,
    c.company_name,
    COUNT(DISTINCT e.id) as employee_count,
    COUNT(DISTINCT d.id) as department_count,
    COUNT(DISTINCT t.id) as team_count
FROM companies c
LEFT JOIN employees e ON e.company_id = c.id
LEFT JOIN departments d ON d.company_id = c.id
LEFT JOIN teams t ON t.company_id = c.id
WHERE c.company_name ILIKE '%TechCorp Global%' 
   OR c.domain ILIKE '%techcorp.global%'
GROUP BY c.id, c.company_name;

-- Step 3: DELETE the company (this will CASCADE delete all related data)
-- WARNING: This will permanently delete the company and ALL related data:
--   - All employees
--   - All departments
--   - All teams
--   - All employee roles
--   - All employee teams
--   - All employee managers
--   - All trainer settings
--   - All profile approvals
--   - All employee requests
--   - All audit logs
--   - All employee raw data
--   - Everything else linked to this company

-- Option A: Delete by company name (if you have multiple TechCorp Global companies)
DELETE FROM companies
WHERE company_name = 'TechCorp Global'
   OR domain = 'techcorp.global';

-- Option B: Delete by specific company ID (safer - use the ID from Step 1)
-- Replace 'YOUR_COMPANY_ID_HERE' with the actual UUID from Step 1
-- DELETE FROM companies WHERE id = 'YOUR_COMPANY_ID_HERE';

-- Option C: Delete all TechCorp Global companies (if you have multiple)
-- DELETE FROM companies
-- WHERE company_name ILIKE '%TechCorp Global%'
--    OR domain ILIKE '%techcorp.global%';

-- Step 4: Verify deletion
SELECT 
    id,
    company_name,
    domain
FROM companies
WHERE company_name ILIKE '%TechCorp Global%' 
   OR domain ILIKE '%techcorp.global%';
-- Should return 0 rows if deletion was successful

