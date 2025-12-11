-- Fix Duplicate Company Domains
-- This script helps clean up duplicate domains in the companies table
-- Run check_duplicate_domains.sql first to see what duplicates exist

-- Step 1: Show all companies with duplicate domains
SELECT 
    domain, 
    COUNT(*) as count,
    array_agg(id::text ORDER BY created_at) as company_ids,
    array_agg(company_name ORDER BY created_at) as company_names,
    array_agg(created_at::text ORDER BY created_at) as created_dates
FROM companies
GROUP BY domain
HAVING COUNT(*) > 1;

-- Step 2: Delete duplicate companies (keeps the oldest one)
-- WARNING: This will delete companies! Review the results from Step 1 first.
-- Uncomment the code below only after reviewing Step 1 results

/*
DO $$
DECLARE
    dup_record RECORD;
    company_to_keep UUID;
    company_to_delete UUID;
BEGIN
    -- For each duplicate domain, keep the oldest company and delete the rest
    FOR dup_record IN 
        SELECT domain, array_agg(id ORDER BY created_at) as ids
        FROM companies
        GROUP BY domain
        HAVING COUNT(*) > 1
    LOOP
        -- Keep the first (oldest) company
        company_to_keep := dup_record.ids[1];
        
        -- Delete all other companies with the same domain
        FOR i IN 2..array_length(dup_record.ids, 1) LOOP
            company_to_delete := dup_record.ids[i];
            RAISE NOTICE 'Deleting company % (domain: %) - keeping company %', 
                company_to_delete, dup_record.domain, company_to_keep;
            
            -- Delete the duplicate company (CASCADE will handle related records)
            DELETE FROM companies WHERE id = company_to_delete;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Duplicate cleanup completed';
END $$;
*/

-- Alternative: Manual deletion (safer - do one at a time)
-- Replace COMPANY_ID_TO_DELETE with the actual UUID
-- DELETE FROM companies WHERE id = 'COMPANY_ID_TO_DELETE';

