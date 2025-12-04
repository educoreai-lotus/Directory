-- SQL Script to Delete LOTUS_TECHHUB and TECHFLOW Companies
-- This script will delete these companies and all related data (CASCADE)
-- NOVA, Sapiens, and AU10TIX will remain untouched

-- Preview: Show what will be deleted
SELECT 
    id,
    company_name,
    industry,
    domain,
    created_at
FROM companies
WHERE LOWER(company_name) LIKE '%lotus%techhub%' 
   OR LOWER(company_name) LIKE '%techflow%'
ORDER BY company_name;

-- Delete the companies (CASCADE will automatically delete all related records:
-- departments, teams, employees, employee_roles, employee_teams, 
-- employee_managers, employee_project_summaries, trainer_settings,
-- employee_profile_approvals, employee_requests, etc.)
DELETE FROM companies
WHERE LOWER(company_name) LIKE '%lotus%techhub%' 
   OR LOWER(company_name) LIKE '%techflow%';

-- Verify: Check remaining companies (should show NOVA, Sapiens, AU10TIX, and any others)
SELECT company_name, industry, domain 
FROM companies 
ORDER BY company_name;
