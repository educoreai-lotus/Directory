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
-- Dynamically find company ID by name

DO $$
DECLARE
    _company_id UUID;
BEGIN
    -- Find company ID by name or domain
    SELECT id INTO _company_id 
    FROM companies 
    WHERE company_name = 'Lotus techhub' 
       OR company_name ILIKE '%lotus%'
       OR domain ILIKE '%lotus%'
    LIMIT 1;

    IF _company_id IS NULL THEN
        RAISE NOTICE 'Company "Lotus techhub" not found. Please check the company name.';
        RETURN;
    END IF;

    RAISE NOTICE 'Found company ID: %', _company_id;

    -- Step 1: Delete audit logs (references company_id and user_id)
    DELETE FROM audit_logs 
    WHERE company_id = _company_id;
    RAISE NOTICE 'Deleted audit logs';

    -- Step 2: Delete employee requests (references employee_id and company_id)
    DELETE FROM employee_requests 
    WHERE company_id = _company_id;
    RAISE NOTICE 'Deleted employee requests';

    -- Step 3: Delete employee profile approvals (references employee_id and company_id)
    DELETE FROM employee_profile_approvals 
    WHERE company_id = _company_id;
    RAISE NOTICE 'Deleted employee profile approvals';

    -- Step 4: Delete employee project summaries (references employee_id)
    DELETE FROM employee_project_summaries 
    WHERE employee_id IN (
        SELECT id FROM employees WHERE company_id = _company_id
    );
    RAISE NOTICE 'Deleted employee project summaries';

    -- Step 5: Delete trainer settings (references employee_id)
    DELETE FROM trainer_settings 
    WHERE employee_id IN (
        SELECT id FROM employees WHERE company_id = _company_id
    );
    RAISE NOTICE 'Deleted trainer settings';

    -- Step 5.5: Delete employee skills (references employee_id)
    DELETE FROM employee_skills 
    WHERE employee_id IN (
        SELECT id FROM employees WHERE company_id = _company_id
    );
    RAISE NOTICE 'Deleted employee skills';

    -- Step 5.6: Delete employee career path competencies (references employee_id)
    DELETE FROM employee_career_path_competencies 
    WHERE employee_id IN (
        SELECT id FROM employees WHERE company_id = _company_id
    );
    RAISE NOTICE 'Deleted employee career path competencies';

    -- Step 6: Delete employee managers (references employee_id and manager_id)
    DELETE FROM employee_managers 
    WHERE employee_id IN (
        SELECT id FROM employees WHERE company_id = _company_id
    )
    OR manager_id IN (
        SELECT id FROM employees WHERE company_id = _company_id
    );
    RAISE NOTICE 'Deleted employee managers';

    -- Step 7: Delete employee teams (references employee_id and team_id)
    DELETE FROM employee_teams 
    WHERE employee_id IN (
        SELECT id FROM employees WHERE company_id = _company_id
    );
    RAISE NOTICE 'Deleted employee teams';

    -- Step 8: Delete employee roles (references employee_id)
    DELETE FROM employee_roles 
    WHERE employee_id IN (
        SELECT id FROM employees WHERE company_id = _company_id
    );
    RAISE NOTICE 'Deleted employee roles';

    -- Step 9: Delete employees (references company_id)
    DELETE FROM employees 
    WHERE company_id = _company_id;
    RAISE NOTICE 'Deleted employees';

    -- Step 10: Delete teams (references company_id and department_id)
    DELETE FROM teams 
    WHERE company_id = _company_id;
    RAISE NOTICE 'Deleted teams';

    -- Step 11: Delete departments (references company_id)
    DELETE FROM departments 
    WHERE company_id = _company_id;
    RAISE NOTICE 'Deleted departments';

    -- Step 12: Delete company registration requests (if exists)
    DELETE FROM company_registration_requests 
    WHERE company_name = 'Lotus techhub' 
       OR domain LIKE '%lotus%';
    RAISE NOTICE 'Deleted company registration requests';

    -- Step 13: Finally, delete the company itself
    DELETE FROM companies 
    WHERE id = _company_id;
    RAISE NOTICE 'Deleted company';

    RAISE NOTICE '✅ Successfully deleted all Lotus techhub company data';
END $$;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES (Run after deletion)
-- ============================================
-- Uncomment to verify deletion:

-- SELECT COUNT(*) as remaining_companies FROM companies WHERE company_name = 'Lotus techhub';
-- SELECT COUNT(*) as remaining_employees FROM employees WHERE company_id = 'ba3dff4a-9177-4b74-b77e-6bdd6488de86';
-- SELECT COUNT(*) as remaining_departments FROM departments WHERE company_id = 'ba3dff4a-9177-4b74-b77e-6bdd6488de86';
-- SELECT COUNT(*) as remaining_teams FROM teams WHERE company_id = 'ba3dff4a-9177-4b74-b77e-6bdd6488de86';

