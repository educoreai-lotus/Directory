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

-- Step 3: DELETE the company and all related data
-- WARNING: This will permanently delete the company and ALL related data
-- IMPORTANT: Delete in correct order to avoid foreign key constraint violations

-- First, get the company ID(s) - use this in the queries below
-- Replace 'YOUR_COMPANY_ID' with the actual UUID from Step 1, or use the WHERE clause

BEGIN;

-- Delete in reverse order of dependencies (most dependent tables first)

-- 1. Delete employee-related child tables (most dependent)
DELETE FROM employee_requests 
WHERE company_id IN (
    SELECT id FROM companies 
    WHERE company_name = 'TechCorp Global' OR domain = 'techcorp.global'
);

DELETE FROM employee_profile_approvals 
WHERE company_id IN (
    SELECT id FROM companies 
    WHERE company_name = 'TechCorp Global' OR domain = 'techcorp.global'
);

DELETE FROM employee_raw_data 
WHERE employee_id IN (
    SELECT id FROM employees 
    WHERE company_id IN (
        SELECT id FROM companies 
        WHERE company_name = 'TechCorp Global' OR domain = 'techcorp.global'
    )
);

DELETE FROM trainer_settings 
WHERE employee_id IN (
    SELECT id FROM employees 
    WHERE company_id IN (
        SELECT id FROM companies 
        WHERE company_name = 'TechCorp Global' OR domain = 'techcorp.global'
    )
);

DELETE FROM employee_project_summaries 
WHERE employee_id IN (
    SELECT id FROM employees 
    WHERE company_id IN (
        SELECT id FROM companies 
        WHERE company_name = 'TechCorp Global' OR domain = 'techcorp.global'
    )
);

DELETE FROM employee_managers 
WHERE employee_id IN (
    SELECT id FROM employees 
    WHERE company_id IN (
        SELECT id FROM companies 
        WHERE company_name = 'TechCorp Global' OR domain = 'techcorp.global'
    )
) OR manager_id IN (
    SELECT id FROM employees 
    WHERE company_id IN (
        SELECT id FROM companies 
        WHERE company_name = 'TechCorp Global' OR domain = 'techcorp.global'
    )
);

DELETE FROM employee_teams 
WHERE employee_id IN (
    SELECT id FROM employees 
    WHERE company_id IN (
        SELECT id FROM companies 
        WHERE company_name = 'TechCorp Global' OR domain = 'techcorp.global'
    )
);

DELETE FROM employee_roles 
WHERE employee_id IN (
    SELECT id FROM employees 
    WHERE company_id IN (
        SELECT id FROM companies 
        WHERE company_name = 'TechCorp Global' OR domain = 'techcorp.global'
    )
);

-- 2. Delete employees (depends on companies)
DELETE FROM employees 
WHERE company_id IN (
    SELECT id FROM companies 
    WHERE company_name = 'TechCorp Global' OR domain = 'techcorp.global'
);

-- 3. Delete teams (depends on departments and companies)
DELETE FROM teams 
WHERE company_id IN (
    SELECT id FROM companies 
    WHERE company_name = 'TechCorp Global' OR domain = 'techcorp.global'
);

-- 4. Delete departments (depends on companies) - THIS WAS THE ISSUE!
DELETE FROM departments 
WHERE company_id IN (
    SELECT id FROM companies 
    WHERE company_name = 'TechCorp Global' OR domain = 'techcorp.global'
);

-- 5. Delete audit logs (depends on companies and employees)
DELETE FROM audit_logs 
WHERE company_id IN (
    SELECT id FROM companies 
    WHERE company_name = 'TechCorp Global' OR domain = 'techcorp.global'
);

-- 6. Delete company registration requests (if any)
DELETE FROM company_registration_requests 
WHERE domain = 'techcorp.global';

-- 7. Finally, delete the company itself
DELETE FROM companies
WHERE company_name = 'TechCorp Global'
   OR domain = 'techcorp.global';

COMMIT;

-- Alternative: If you know the exact company ID, use this simpler version:
-- BEGIN;
-- DELETE FROM employee_requests WHERE company_id = 'YOUR_COMPANY_ID_HERE';
-- DELETE FROM employee_profile_approvals WHERE company_id = 'YOUR_COMPANY_ID_HERE';
-- DELETE FROM employee_raw_data WHERE employee_id IN (SELECT id FROM employees WHERE company_id = 'YOUR_COMPANY_ID_HERE');
-- DELETE FROM trainer_settings WHERE employee_id IN (SELECT id FROM employees WHERE company_id = 'YOUR_COMPANY_ID_HERE');
-- DELETE FROM employee_project_summaries WHERE employee_id IN (SELECT id FROM employees WHERE company_id = 'YOUR_COMPANY_ID_HERE');
-- DELETE FROM employee_managers WHERE employee_id IN (SELECT id FROM employees WHERE company_id = 'YOUR_COMPANY_ID_HERE') OR manager_id IN (SELECT id FROM employees WHERE company_id = 'YOUR_COMPANY_ID_HERE');
-- DELETE FROM employee_teams WHERE employee_id IN (SELECT id FROM employees WHERE company_id = 'YOUR_COMPANY_ID_HERE');
-- DELETE FROM employee_roles WHERE employee_id IN (SELECT id FROM employees WHERE company_id = 'YOUR_COMPANY_ID_HERE');
-- DELETE FROM employees WHERE company_id = 'YOUR_COMPANY_ID_HERE';
-- DELETE FROM teams WHERE company_id = 'YOUR_COMPANY_ID_HERE';
-- DELETE FROM departments WHERE company_id = 'YOUR_COMPANY_ID_HERE';
-- DELETE FROM audit_logs WHERE company_id = 'YOUR_COMPANY_ID_HERE';
-- DELETE FROM companies WHERE id = 'YOUR_COMPANY_ID_HERE';
-- COMMIT;

-- Step 4: Verify deletion
SELECT 
    id,
    company_name,
    domain
FROM companies
WHERE company_name ILIKE '%TechCorp Global%' 
   OR domain ILIKE '%techcorp.global%';
-- Should return 0 rows if deletion was successful

