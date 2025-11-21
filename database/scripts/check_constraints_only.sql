-- Quick Check: See constraints on approval_policy column
-- Run this to see which constraint is causing the issue

SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
WHERE conrelid = 'companies'::regclass
  AND a.attname = 'approval_policy'
ORDER BY conname;

