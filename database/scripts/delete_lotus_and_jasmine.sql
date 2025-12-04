-- SQL Script to Delete LOTUS_TECHHUB and Jasmine-related Companies
-- This script will delete these companies and all related data (CASCADE)
-- NOVA, Sapiens, and AU10TIX will remain untouched

-- Step 1: Preview what will be deleted (for verification)
SELECT 
    id,
    company_name,
    industry,
    domain,
    created_at
FROM companies
WHERE LOWER(company_name) LIKE '%lotus%' 
   OR LOWER(company_name) LIKE '%jasmine%'
ORDER BY company_name;

-- Step 2: Count related records that will be deleted (for verification)
SELECT 
    c.company_name,
    COUNT(DISTINCT d.id) as departments_count,
    COUNT(DISTINCT t.id) as teams_count,
    COUNT(DISTINCT e.id) as employees_count
FROM companies c
LEFT JOIN departments d ON d.company_id = c.id
LEFT JOIN teams t ON t.company_id = c.id
LEFT JOIN employees e ON e.company_id = c.id
WHERE LOWER(c.company_name) LIKE '%lotus%' 
   OR LOWER(c.company_name) LIKE '%jasmine%'
GROUP BY c.id, c.company_name;

-- Step 3: Delete the companies (CASCADE will automatically delete all related records:
-- departments, teams, employees, employee_roles, employee_teams, 
-- employee_managers, employee_project_summaries, trainer_settings,
-- employee_profile_approvals, employee_requests, etc.)
DELETE FROM companies
WHERE LOWER(company_name) LIKE '%lotus%' 
   OR LOWER(company_name) LIKE '%jasmine%';

-- Step 4: Verify deletion (run after DELETE)
-- Should show NOVA, Sapiens, AU10TIX, and any others (but not LOTUS or Jasmine)
SELECT company_name, industry, domain 
FROM companies 
ORDER BY company_name;

