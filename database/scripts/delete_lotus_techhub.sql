-- =====================================================
-- SQL Script to Delete LOTUS_TECHHUB Company
-- =====================================================
-- This script will delete LOTUS_TECHHUB and all related data (CASCADE)
-- All other companies will remain untouched
-- =====================================================

-- Preview: Show what will be deleted
SELECT 
    id,
    company_name,
    industry,
    domain,
    created_at
FROM companies
WHERE LOWER(company_name) LIKE '%lotus%techhub%'
ORDER BY company_name;

-- Delete the company (CASCADE will automatically delete all related records:
-- departments, teams, employees, employee_roles, employee_teams, 
-- employee_managers, employee_project_summaries, trainer_settings,
-- employee_profile_approvals, employee_requests, etc.)
DELETE FROM companies
WHERE LOWER(company_name) LIKE '%lotus%techhub%';

-- Verify: Check remaining companies
SELECT 
    company_name, 
    industry, 
    domain,
    created_at
FROM companies 
ORDER BY company_name;

-- Verify: Check that all related data is deleted
SELECT 
    'employees' as table_name,
    COUNT(*) as remaining_rows
FROM employees e
INNER JOIN companies c ON e.company_id = c.id
WHERE LOWER(c.company_name) LIKE '%lotus%techhub%'
UNION ALL
SELECT 'departments', COUNT(*)
FROM departments d
INNER JOIN companies c ON d.company_id = c.id
WHERE LOWER(c.company_name) LIKE '%lotus%techhub%'
UNION ALL
SELECT 'teams', COUNT(*)
FROM teams t
INNER JOIN companies c ON t.company_id = c.id
WHERE LOWER(c.company_name) LIKE '%lotus%techhub%';

-- Expected output: All counts should be 0 (company and all related data deleted)

