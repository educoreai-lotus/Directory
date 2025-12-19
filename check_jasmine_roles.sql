-- Check Jasmine Mograby's roles in the database
-- Run this to verify roles are saved correctly

-- 1. Find the employee
SELECT 
    id,
    email,
    full_name,
    profile_status,
    enrichment_completed
FROM employees
WHERE email = 'jasmine.mograby@lotustechhub.com'
   OR full_name ILIKE '%jasmine%mograby%';

-- 2. Check all roles for this employee
SELECT 
    e.id,
    e.email,
    e.full_name,
    er.role_type,
    er.created_at
FROM employees e
INNER JOIN employee_roles er ON e.id = er.employee_id
WHERE e.email = 'jasmine.mograby@lotustechhub.com'
   OR e.full_name ILIKE '%jasmine%mograby%'
ORDER BY er.role_type;

-- 3. Check trainer settings
SELECT 
    e.id,
    e.email,
    e.full_name,
    ts.*
FROM employees e
LEFT JOIN trainer_settings ts ON e.id = ts.employee_id
WHERE e.email = 'jasmine.mograby@lotustechhub.com'
   OR e.full_name ILIKE '%jasmine%mograby%';

-- 4. Summary - all data in one query
SELECT 
    e.id,
    e.email,
    e.full_name,
    e.profile_status,
    e.enrichment_completed,
    COALESCE(
        json_agg(DISTINCT er.role_type) FILTER (WHERE er.role_type IS NOT NULL),
        '[]'::json
    ) as roles,
    CASE WHEN ts.id IS NOT NULL THEN true ELSE false END as has_trainer_settings,
    ts.ai_enabled,
    ts.public_publish_enable,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM employee_roles er2 
            WHERE er2.employee_id = e.id AND er2.role_type = 'TRAINER'
        ) THEN true 
        ELSE false 
    END as is_trainer_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM employee_roles er2 
            WHERE er2.employee_id = e.id AND er2.role_type = 'DECISION_MAKER'
        ) THEN true 
        ELSE false 
    END as is_decision_maker_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM employee_roles er2 
            WHERE er2.employee_id = e.id 
            AND (er2.role_type = 'DEPARTMENT_MANAGER' OR er2.role_type = 'TEAM_MANAGER')
        ) THEN true 
        ELSE false 
    END as is_manager_check
FROM employees e
LEFT JOIN employee_roles er ON e.id = er.employee_id
LEFT JOIN trainer_settings ts ON e.id = ts.employee_id
WHERE e.email = 'jasmine.mograby@lotustechhub.com'
   OR e.full_name ILIKE '%jasmine%mograby%'
GROUP BY e.id, e.email, e.full_name, e.profile_status, e.enrichment_completed, ts.id, ts.ai_enabled, ts.public_publish_enable;

