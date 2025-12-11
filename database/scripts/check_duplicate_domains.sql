-- Check for duplicate company domains
-- Run this to see if you have duplicate domains in your companies table

SELECT 
    domain, 
    COUNT(*) as count,
    array_agg(id::text) as company_ids,
    array_agg(company_name) as company_names
FROM companies
GROUP BY domain
HAVING COUNT(*) > 1;

-- If this returns any rows, you have duplicate domains that need to be cleaned up

