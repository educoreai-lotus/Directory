-- Check Jasmine Mograby's employee data
-- This script checks the employee's profile status, roles, and trainer status

-- First, find the employee
SELECT 
    id,
    email,
    full_name,
    profile_status,
    enrichment_completed,
    company_id
FROM employees
WHERE email = 'jasmine.mograby@lotustechhub.com'
   OR full_name ILIKE '%jasmine%mograby%';

-- Check roles
SELECT 
    e.id,
    e.full_name,
    e.email,
    er.role_type
FROM employees e
LEFT JOIN employee_roles er ON e.id = er.employee_id
WHERE e.email = 'jasmine.mograby@lotustechhub.com'
   OR e.full_name ILIKE '%jasmine%mograby%'
ORDER BY er.role_type;

-- Check trainer settings
SELECT 
    e.id,
    e.full_name,
    e.email,
    ts.*
FROM employees e
LEFT JOIN trainer_settings ts ON e.id = ts.employee_id
WHERE e.email = 'jasmine.mograby@lotustechhub.com'
   OR e.full_name ILIKE '%jasmine%mograby%';

-- Summary query - all in one
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
    CASE WHEN ts.id IS NOT NULL THEN true ELSE false END as has_trainer_settings,
    ts.ai_enabled,
    ts.public_publish_enable
FROM employees e
LEFT JOIN employee_roles er ON e.id = er.employee_id
LEFT JOIN trainer_settings ts ON e.id = ts.employee_id
WHERE e.email = 'jasmine.mograby@lotustechhub.com'
   OR e.full_name ILIKE '%jasmine%mograby%'
GROUP BY e.id, e.full_name, e.email, e.profile_status, e.enrichment_completed, ts.id, ts.ai_enabled, ts.public_publish_enable;

