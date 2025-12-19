-- SQL Script to Reset Jasmine Mograby's Profile for Re-Enrichment
-- This script resets all enrichment-related data so the employee can go through enrichment flow again

BEGIN;

-- Find Jasmine Mograby's employee record
DO $$
DECLARE
    _employee_id UUID;
    _employee_uuid UUID;
BEGIN
    -- Get employee UUID by email (assuming email is jasmine.mograby@lotustechhub.com or similar)
    SELECT id INTO _employee_id 
    FROM employees 
    WHERE LOWER(full_name) LIKE '%jasmine%mograby%' 
       OR LOWER(email) LIKE '%jasmine%mograby%'
    LIMIT 1;

    IF _employee_id IS NULL THEN
        RAISE NOTICE 'Employee "Jasmine Mograby" not found. Please check the name/email.';
        RETURN;
    END IF;

    _employee_uuid := _employee_id;
    RAISE NOTICE 'Found employee ID: %', _employee_uuid;

    -- 1. Delete project summaries (AI-generated from GitHub)
    DELETE FROM employee_project_summaries 
    WHERE employee_id = _employee_uuid;
    RAISE NOTICE 'Deleted project summaries';

    -- 2. Delete approval requests
    DELETE FROM employee_profile_approvals 
    WHERE employee_id = _employee_uuid;
    RAISE NOTICE 'Deleted approval requests';

    -- 3. Reset enrichment flags and clear enrichment data
    UPDATE employees
    SET 
        enrichment_completed = FALSE,
        enrichment_completed_at = NULL,
        profile_status = 'basic',
        bio = NULL,
        value_proposition = NULL,
        -- Optionally clear OAuth data to force re-connection
        -- Uncomment the lines below if you want to force re-connecting LinkedIn/GitHub
        -- linkedin_data = NULL,
        -- linkedin_url = NULL,
        -- github_data = NULL,
        -- github_url = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = _employee_uuid;
    RAISE NOTICE 'Reset enrichment flags and cleared enrichment data';

    -- 4. Optionally clear OAuth data (uncomment if you want to force re-connection)
    -- UPDATE employees
    -- SET 
    --     linkedin_data = NULL,
    --     linkedin_url = NULL,
    --     github_data = NULL,
    --     github_url = NULL,
    --     updated_at = CURRENT_TIMESTAMP
    -- WHERE id = _employee_uuid;
    -- RAISE NOTICE 'Cleared OAuth data (LinkedIn and GitHub)';

    RAISE NOTICE '✅ Successfully reset Jasmine Mograby profile for re-enrichment';
    RAISE NOTICE 'Employee can now log in and go through enrichment flow again';
END $$;

COMMIT;

-- Verification query (run after the script to verify)
-- SELECT 
--     id,
--     full_name,
--     email,
--     enrichment_completed,
--     enrichment_completed_at,
--     profile_status,
--     linkedin_url,
--     github_url,
--     CASE WHEN linkedin_data IS NOT NULL THEN 'Yes' ELSE 'No' END as has_linkedin_data,
--     CASE WHEN github_data IS NOT NULL THEN 'Yes' ELSE 'No' END as has_github_data
-- FROM employees 
-- WHERE LOWER(full_name) LIKE '%jasmine%mograby%' 
--    OR LOWER(email) LIKE '%jasmine%mograby%';

