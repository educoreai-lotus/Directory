-- =====================================================
-- CLEAR ALL DATA - Start Fresh for Testing
-- =====================================================
-- This script deletes ALL data from the database
-- Use with caution - this is IRREVERSIBLE!
-- 
-- Run this in Supabase SQL Editor or your PostgreSQL client
-- =====================================================

-- Delete in reverse order of dependencies to avoid foreign key violations

-- 1. Delete employee requests (depends on employees and companies)
DELETE FROM employee_requests;

-- 2. Delete employee profile approvals (depends on employees and companies)
DELETE FROM employee_profile_approvals;

-- 3. Delete trainer settings (depends on employees)
DELETE FROM trainer_settings;

-- 4. Delete employee project summaries (depends on employees)
DELETE FROM employee_project_summaries;

-- 5. Delete employee managers (depends on employees)
DELETE FROM employee_managers;

-- 6. Delete employee teams (depends on employees and teams)
DELETE FROM employee_teams;

-- 7. Delete employee roles (depends on employees)
DELETE FROM employee_roles;

-- 8. Delete audit logs (depends on companies and employees)
DELETE FROM audit_logs;

-- 9. Delete employees (depends on companies)
DELETE FROM employees;

-- 10. Delete teams (depends on departments and companies)
DELETE FROM teams;

-- 11. Delete departments (depends on companies)
DELETE FROM departments;

-- 12. Delete company registration requests
DELETE FROM company_registration_requests;

-- 13. Delete companies (this will cascade delete any remaining dependencies)
DELETE FROM companies;

-- =====================================================
-- VERIFICATION: Check that all tables are empty
-- =====================================================
SELECT 
    'companies' as table_name, COUNT(*) as remaining_rows FROM companies
UNION ALL
SELECT 'employees', COUNT(*) FROM employees
UNION ALL
SELECT 'departments', COUNT(*) FROM departments
UNION ALL
SELECT 'teams', COUNT(*) FROM teams
UNION ALL
SELECT 'employee_roles', COUNT(*) FROM employee_roles
UNION ALL
SELECT 'employee_teams', COUNT(*) FROM employee_teams
UNION ALL
SELECT 'employee_managers', COUNT(*) FROM employee_managers
UNION ALL
SELECT 'employee_project_summaries', COUNT(*) FROM employee_project_summaries
UNION ALL
SELECT 'trainer_settings', COUNT(*) FROM trainer_settings
UNION ALL
SELECT 'employee_profile_approvals', COUNT(*) FROM employee_profile_approvals
UNION ALL
SELECT 'employee_requests', COUNT(*) FROM employee_requests
UNION ALL
SELECT 'audit_logs', COUNT(*) FROM audit_logs
UNION ALL
SELECT 'company_registration_requests', COUNT(*) FROM company_registration_requests
ORDER BY table_name;

-- Expected result: All tables should show 0 rows
-- If any table shows > 0, there may be a foreign key constraint issue



