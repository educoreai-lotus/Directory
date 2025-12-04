-- Find a valid test employee for Coordinator endpoint testing
-- Run this query in your Supabase SQL Editor or Railway Database Console
-- 
-- This query returns the UUIDs needed for the endpoint:
-- GET /api/v1/companies/:companyId/employees/:employeeId/skills
--
-- Where:
--   - companyId = e.company_id (UUID)
--   - employeeId = e.id (UUID, not e.employee_id which is the employee code)

SELECT 
  e.id AS "employeeId",           -- UUID for endpoint parameter
  e.company_id AS "companyId",    -- UUID for endpoint parameter
  e.full_name AS "fullName",
  e.email,
  true AS "approved",
  e.employee_id AS employee_code,  -- For reference (not used in endpoint)
  c.company_name                   -- For reference
FROM employees e
INNER JOIN companies c ON e.company_id = c.id
WHERE 
  e.profile_status = 'approved'
  AND e.employee_id IS NOT NULL      -- Must have employee_id (code) for Skills Engine
  AND e.employee_id != ''
  AND e.company_id IS NOT NULL       -- Must have valid company UUID
  AND c.id IS NOT NULL               -- Company must exist
ORDER BY e.created_at DESC
LIMIT 1;

-- Expected JSON output format:
-- {
--   "companyId": "<UUID>",
--   "employeeId": "<UUID>",
--   "fullName": "...",
--   "email": "...",
--   "approved": true
-- }
--
-- Example test URL:
-- GET /api/v1/companies/{companyId}/employees/{employeeId}/skills

