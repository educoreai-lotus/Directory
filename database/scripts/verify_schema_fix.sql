-- Verify Schema Fix - Check all required columns exist
-- Run this to confirm your schema is correct

-- Check companies table
SELECT 
    'companies' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name IN (
    'approval_policy',
    'kpis',
    'logo_url',
    'passing_grade',
    'max_attempts',
    'exercises_limited',
    'num_of_exercises'
)
ORDER BY column_name;

-- Check employees table
SELECT 
    'employees' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'employees' 
AND column_name IN (
    'profile_status',
    'profile_photo_url',
    'value_proposition'
)
ORDER BY column_name;

-- Summary
SELECT 
    CASE 
        WHEN COUNT(*) = 7 THEN '✅ Companies table: All required columns present'
        ELSE '❌ Companies table: Missing ' || (7 - COUNT(*)) || ' column(s)'
    END as status
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name IN ('approval_policy', 'kpis', 'logo_url', 'passing_grade', 'max_attempts', 'exercises_limited', 'num_of_exercises')

UNION ALL

SELECT 
    CASE 
        WHEN COUNT(*) = 3 THEN '✅ Employees table: All required columns present'
        ELSE '❌ Employees table: Missing ' || (3 - COUNT(*)) || ' column(s)'
    END as status
FROM information_schema.columns 
WHERE table_name = 'employees' 
AND column_name IN ('profile_status', 'profile_photo_url', 'value_proposition');

