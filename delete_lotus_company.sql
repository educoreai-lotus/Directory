-- SQL Script to Delete All Lotus Techhub Company Data
-- This script deletes all data related to Lotus techhub company
-- Company ID: ba3dff4a-9177-4b74-b77e-6bdd6488de86
-- Company Name: Lotus techhub
-- 
-- NOTE: If CASCADE DELETE is not working, use the explicit deletion order below

BEGIN;

-- ============================================
-- EXPLICIT DELETION ORDER (Required - CASCADE may not be working)
-- ============================================
-- Delete in reverse dependency order (most dependent first)
-- Company ID: ba3dff4a-9177-4b74-b77e-6bdd6488de86

-- Step 1: Delete audit logs (references company_id and user_id)
DELETE FROM audit_logs 
WHERE company_id = 'ba3dff4a-9177-4b74-b77e-6bdd6488de86';

-- Step 2: Delete employee requests (references employee_id and company_id)
DELETE FROM employee_requests 
WHERE company_id = 'ba3dff4a-9177-4b74-b77e-6bdd6488de86';

-- Step 3: Delete employee profile approvals (references employee_id and company_id)
DELETE FROM employee_profile_approvals 
WHERE company_id = 'ba3dff4a-9177-4b74-b77e-6bdd6488de86';

-- Step 4: Delete employee project summaries (references employee_id)
DELETE FROM employee_project_summaries 
WHERE employee_id IN (
    SELECT id FROM employees WHERE company_id = 'ba3dff4a-9177-4b74-b77e-6bdd6488de86'
);

-- Step 5: Delete trainer settings (references employee_id)
DELETE FROM trainer_settings 
WHERE employee_id IN (
    SELECT id FROM employees WHERE company_id = 'ba3dff4a-9177-4b74-b77e-6bdd6488de86'
);

-- Step 6: Delete employee managers (references employee_id and manager_id)
DELETE FROM employee_managers 
WHERE employee_id IN (
    SELECT id FROM employees WHERE company_id = 'ba3dff4a-9177-4b74-b77e-6bdd6488de86'
)
OR manager_id IN (
    SELECT id FROM employees WHERE company_id = 'ba3dff4a-9177-4b74-b77e-6bdd6488de86'
);

-- Step 7: Delete employee teams (references employee_id and team_id)
DELETE FROM employee_teams 
WHERE employee_id IN (
    SELECT id FROM employees WHERE company_id = 'ba3dff4a-9177-4b74-b77e-6bdd6488de86'
);

-- Step 8: Delete employee roles (references employee_id)
DELETE FROM employee_roles 
WHERE employee_id IN (
    SELECT id FROM employees WHERE company_id = 'ba3dff4a-9177-4b74-b77e-6bdd6488de86'
);

-- Step 9: Delete employees (references company_id)
DELETE FROM employees 
WHERE company_id = 'ba3dff4a-9177-4b74-b77e-6bdd6488de86';

-- Step 10: Delete teams (references company_id and department_id)
DELETE FROM teams 
WHERE company_id = 'ba3dff4a-9177-4b74-b77e-6bdd6488de86';

-- Step 11: Delete departments (references company_id)
DELETE FROM departments 
WHERE company_id = 'ba3dff4a-9177-4b74-b77e-6bdd6488de86';

-- Step 12: Delete company registration requests (if exists)
DELETE FROM company_registration_requests 
WHERE company_name = 'Lotus techhub' 
   OR domain LIKE '%lotus%';

-- Step 13: Finally, delete the company itself
DELETE FROM companies 
WHERE id = 'ba3dff4a-9177-4b74-b77e-6bdd6488de86'
   OR company_name = 'Lotus techhub'
   OR domain LIKE '%lotus%';

COMMIT;

-- ============================================
-- VERIFICATION QUERIES (Run after deletion)
-- ============================================
-- Uncomment to verify deletion:

-- SELECT COUNT(*) as remaining_companies FROM companies WHERE company_name = 'Lotus techhub';
-- SELECT COUNT(*) as remaining_employees FROM employees WHERE company_id = 'ba3dff4a-9177-4b74-b77e-6bdd6488de86';
-- SELECT COUNT(*) as remaining_departments FROM departments WHERE company_id = 'ba3dff4a-9177-4b74-b77e-6bdd6488de86';
-- SELECT COUNT(*) as remaining_teams FROM teams WHERE company_id = 'ba3dff4a-9177-4b74-b77e-6bdd6488de86';

