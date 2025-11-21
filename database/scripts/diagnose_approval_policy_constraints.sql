-- Diagnostic Script: Check approval_policy Constraints
-- This script checks which constraints exist on the approval_policy column
-- Run this FIRST to see what's in your database

-- Check all constraints on the companies table
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'companies'::regclass
ORDER BY conname;

-- Specifically check constraints on approval_policy column
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition,
    a.attname AS column_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
WHERE conrelid = 'companies'::regclass
  AND a.attname IN ('approval_policy', 'learning_path_approval')
ORDER BY conname;

-- Check if learning_path_approval column still exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'companies'
  AND column_name IN ('approval_policy', 'learning_path_approval')
ORDER BY column_name;

