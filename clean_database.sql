-- =====================================================
-- CLEAN DATABASE FOR TESTING
-- =====================================================
-- This script deletes all data from all tables
-- Admin accounts (directory_admins) are preserved
-- =====================================================

BEGIN;

-- Delete in reverse order of dependencies to avoid foreign key violations

-- Employee-related child tables
DELETE FROM employee_requests;
DELETE FROM employee_profile_approvals;
DELETE FROM trainer_settings;
DELETE FROM employee_project_summaries;
DELETE FROM employee_managers;
DELETE FROM employee_teams;
DELETE FROM employee_roles;

-- Employee main table
DELETE FROM employees;

-- Team and Department tables
DELETE FROM teams;
DELETE FROM departments;

-- Company-related tables
DELETE FROM company_registration_requests;
DELETE FROM companies;

-- Audit logs (if exists)
DO $$
BEGIN
    DELETE FROM audit_logs;
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Table audit_logs does not exist, skipping...';
END $$;

-- NOTE: directory_admins table is NOT deleted - admin accounts are preserved

COMMIT;

-- Verify deletion - show remaining row counts
SELECT 
    'companies' as table_name, 
    COUNT(*) as remaining_rows
FROM companies
UNION ALL
SELECT 'employees', COUNT(*)
FROM employees
UNION ALL
SELECT 'departments', COUNT(*)
FROM departments
UNION ALL
SELECT 'teams', COUNT(*)
FROM teams
UNION ALL
SELECT 'employee_roles', COUNT(*)
FROM employee_roles
UNION ALL
SELECT 'employee_teams', COUNT(*)
FROM employee_teams
UNION ALL
SELECT 'employee_managers', COUNT(*)
FROM employee_managers
UNION ALL
SELECT 'employee_project_summaries', COUNT(*)
FROM employee_project_summaries
UNION ALL
SELECT 'trainer_settings', COUNT(*)
FROM trainer_settings
UNION ALL
SELECT 'employee_profile_approvals', COUNT(*)
FROM employee_profile_approvals
UNION ALL
SELECT 'employee_requests', COUNT(*)
FROM employee_requests
UNION ALL
SELECT 'company_registration_requests', COUNT(*)
FROM company_registration_requests
ORDER BY table_name;

-- Expected output: All tables should show 0 remaining_rows
-- directory_admins will still have admin accounts (not deleted)

