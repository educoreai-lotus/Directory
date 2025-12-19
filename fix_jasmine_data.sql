-- Fix Jasmine Mograby's employee data
-- This script ensures the employee has the correct roles and profile status

-- Step 1: Get the employee ID
DO $$
DECLARE
    v_employee_id UUID;
    v_company_id UUID;
BEGIN
    -- Find the employee
    SELECT id, company_id INTO v_employee_id, v_company_id
    FROM employees
    WHERE email = 'jasmine.mograby@lotustechhub.com'
       OR full_name ILIKE '%jasmine%mograby%'
    LIMIT 1;

    IF v_employee_id IS NULL THEN
        RAISE EXCEPTION 'Employee not found';
    END IF;

    RAISE NOTICE 'Found employee: % (ID: %)', v_employee_id, v_company_id;

    -- Step 2: Ensure profile is approved
    UPDATE employees
    SET profile_status = 'approved',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_employee_id
      AND profile_status != 'approved';

    -- Step 3: Ensure roles exist (TRAINER, DEPARTMENT_MANAGER, DECISION_MAKER)
    -- Check and add TRAINER role
    IF NOT EXISTS (
        SELECT 1 FROM employee_roles 
        WHERE employee_id = v_employee_id AND role_type = 'TRAINER'
    ) THEN
        INSERT INTO employee_roles (employee_id, role_type, created_at)
        VALUES (v_employee_id, 'TRAINER', CURRENT_TIMESTAMP);
        RAISE NOTICE 'Added TRAINER role';
    END IF;

    -- Check and add DEPARTMENT_MANAGER role
    IF NOT EXISTS (
        SELECT 1 FROM employee_roles 
        WHERE employee_id = v_employee_id AND role_type = 'DEPARTMENT_MANAGER'
    ) THEN
        INSERT INTO employee_roles (employee_id, role_type, created_at)
        VALUES (v_employee_id, 'DEPARTMENT_MANAGER', CURRENT_TIMESTAMP);
        RAISE NOTICE 'Added DEPARTMENT_MANAGER role';
    END IF;

    -- Check and add DECISION_MAKER role
    IF NOT EXISTS (
        SELECT 1 FROM employee_roles 
        WHERE employee_id = v_employee_id AND role_type = 'DECISION_MAKER'
    ) THEN
        INSERT INTO employee_roles (employee_id, role_type, created_at)
        VALUES (v_employee_id, 'DECISION_MAKER', CURRENT_TIMESTAMP);
        RAISE NOTICE 'Added DECISION_MAKER role';
    END IF;

    -- Step 4: Ensure trainer settings exist
    IF NOT EXISTS (
        SELECT 1 FROM trainer_settings WHERE employee_id = v_employee_id
    ) THEN
        INSERT INTO trainer_settings (employee_id, ai_enabled, public_publish_enable, created_at, updated_at)
        VALUES (v_employee_id, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        RAISE NOTICE 'Created trainer settings';
    END IF;

    RAISE NOTICE 'Fix completed for employee: %', v_employee_id;
END $$;

-- Verify the fix
SELECT 
    e.id,
    e.full_name,
    e.email,
    e.profile_status,
    e.enrichment_completed,
    COALESCE(
        json_agg(DISTINCT er.role_type) FILTER (WHERE er.role_type IS NOT NULL),
        '[]'::json
    ) as roles,
    CASE WHEN ts.id IS NOT NULL THEN true ELSE false END as has_trainer_settings
FROM employees e
LEFT JOIN employee_roles er ON e.id = er.employee_id
LEFT JOIN trainer_settings ts ON e.id = ts.employee_id
WHERE e.email = 'jasmine.mograby@lotustechhub.com'
   OR e.full_name ILIKE '%jasmine%mograby%'
GROUP BY e.id, e.full_name, e.email, e.profile_status, e.enrichment_completed, ts.id;

