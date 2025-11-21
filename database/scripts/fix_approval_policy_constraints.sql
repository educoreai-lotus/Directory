-- Fix Script: Remove Old Constraint from approval_policy Column
-- This script fixes the approval_policy constraint issue
-- 
-- WHAT THIS SCRIPT DOES:
-- 1. Drops the old constraint (companies_learning_path_approval_check) that expects 'automatic'
-- 2. Keeps the correct constraint (companies_approval_policy_check) that allows 'auto'
--
-- SAFETY: Uses IF EXISTS checks, safe to run multiple times
-- IMPACT: Only affects constraint definitions, does NOT modify data
-- 
-- PROBLEM IDENTIFIED:
-- Two constraints exist on approval_policy column:
--   - companies_approval_policy_check: allows 'manual' or 'auto' ✅ (correct)
--   - companies_learning_path_approval_check: allows 'manual' or 'automatic' ❌ (old/wrong)
-- 
-- Both constraints must pass, so only 'manual' works. 'auto' fails because the old constraint expects 'automatic'.

BEGIN;

-- Drop the old constraint that expects 'automatic' instead of 'auto'
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_learning_path_approval_check;

-- Verify the old constraint was removed
DO $$
DECLARE
    old_constraint_exists BOOLEAN;
    correct_constraint_exists BOOLEAN;
BEGIN
    -- Check if old constraint still exists
    SELECT EXISTS (
        SELECT 1 
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        WHERE conrelid = 'companies'::regclass
          AND conname = 'companies_learning_path_approval_check'
          AND a.attname = 'approval_policy'
    ) INTO old_constraint_exists;
    
    -- Check if correct constraint exists
    SELECT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conrelid = 'companies'::regclass
          AND conname = 'companies_approval_policy_check'
    ) INTO correct_constraint_exists;
    
    IF old_constraint_exists THEN
        RAISE EXCEPTION '❌ Old constraint still exists. Please check manually.';
    ELSIF NOT correct_constraint_exists THEN
        RAISE EXCEPTION '❌ Correct constraint missing. Please check manually.';
    ELSE
        RAISE NOTICE '✅ Successfully removed old constraint';
        RAISE NOTICE '✅ Correct constraint (companies_approval_policy_check) is in place';
    END IF;
END $$;

COMMIT;

-- Final verification query
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'companies'::regclass
  AND conname LIKE '%approval%'
ORDER BY conname;

