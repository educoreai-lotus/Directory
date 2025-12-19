-- Fix Jasmine Mograby's roles if they're missing
-- This script ensures all roles are present: TRAINER, DEPARTMENT_MANAGER, DECISION_MAKER

DO $$
DECLARE
    v_employee_id UUID;
BEGIN
    -- Find the employee
    SELECT id INTO v_employee_id
    FROM employees
    WHERE email = 'jasmine.mograby@lotustechhub.com'
       OR full_name ILIKE '%jasmine%mograby%'
    LIMIT 1;

    IF v_employee_id IS NULL THEN
        RAISE EXCEPTION 'Employee not found';
    END IF;

    RAISE NOTICE 'Found employee ID: %', v_employee_id;

    -- Ensure TRAINER role exists
    IF NOT EXISTS (
        SELECT 1 FROM employee_roles 
        WHERE employee_id = v_employee_id AND role_type = 'TRAINER'
    ) THEN
        INSERT INTO employee_roles (employee_id, role_type, created_at)
        VALUES (v_employee_id, 'TRAINER', CURRENT_TIMESTAMP);
        RAISE NOTICE 'Added TRAINER role';
    ELSE
        RAISE NOTICE 'TRAINER role already exists';
    END IF;

    -- Ensure DEPARTMENT_MANAGER role exists
    IF NOT EXISTS (
        SELECT 1 FROM employee_roles 
        WHERE employee_id = v_employee_id AND role_type = 'DEPARTMENT_MANAGER'
    ) THEN
        INSERT INTO employee_roles (employee_id, role_type, created_at)
        VALUES (v_employee_id, 'DEPARTMENT_MANAGER', CURRENT_TIMESTAMP);
        RAISE NOTICE 'Added DEPARTMENT_MANAGER role';
    ELSE
        RAISE NOTICE 'DEPARTMENT_MANAGER role already exists';
    END IF;

    -- Ensure DECISION_MAKER role exists
    IF NOT EXISTS (
        SELECT 1 FROM employee_roles 
        WHERE employee_id = v_employee_id AND role_type = 'DECISION_MAKER'
    ) THEN
        INSERT INTO employee_roles (employee_id, role_type, created_at)
        VALUES (v_employee_id, 'DECISION_MAKER', CURRENT_TIMESTAMP);
        RAISE NOTICE 'Added DECISION_MAKER role';
    ELSE
        RAISE NOTICE 'DECISION_MAKER role already exists';
    END IF;

    -- Ensure trainer settings exist
    IF NOT EXISTS (
        SELECT 1 FROM trainer_settings WHERE employee_id = v_employee_id
    ) THEN
        INSERT INTO trainer_settings (employee_id, ai_enabled, public_publish_enable, created_at, updated_at)
        VALUES (v_employee_id, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        RAISE NOTICE 'Created trainer settings';
    ELSE
        RAISE NOTICE 'Trainer settings already exist';
    END IF;

    -- Ensure profile is approved
    UPDATE employees
    SET profile_status = 'approved',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_employee_id
      AND profile_status != 'approved';

    RAISE NOTICE '✅ Fix completed for employee: %', v_employee_id;
END $$;

-- Verify the fix
SELECT 
    e.id,
    e.email,
    e.full_name,
    e.profile_status,
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
GROUP BY e.id, e.email, e.full_name, e.profile_status, ts.id;

