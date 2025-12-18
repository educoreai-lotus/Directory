-- Migration: Migrate existing data from employee_raw_data table to employees table
-- This migration moves any existing PDF and manual data from employee_raw_data to employees table columns
-- 
-- IMPORTANT: Run this AFTER migration 004_add_pdf_manual_data_to_employees.sql
-- This is OPTIONAL - only needed if you have existing data in employee_raw_data table

-- Migrate PDF data from employee_raw_data to employees.pdf_data
UPDATE employees e
SET pdf_data = erd.data
FROM employee_raw_data erd
WHERE e.id = erd.employee_id 
  AND erd.source = 'pdf'
  AND e.pdf_data IS NULL; -- Only update if pdf_data is empty

-- Migrate manual data from employee_raw_data to employees.manual_data
UPDATE employees e
SET manual_data = erd.data
FROM employee_raw_data erd
WHERE e.id = erd.employee_id 
  AND erd.source = 'manual'
  AND e.manual_data IS NULL; -- Only update if manual_data is empty

-- Log migration results
DO $$
DECLARE
  pdf_count INTEGER;
  manual_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO pdf_count 
  FROM employee_raw_data 
  WHERE source = 'pdf';
  
  SELECT COUNT(*) INTO manual_count 
  FROM employee_raw_data 
  WHERE source = 'manual';
  
  RAISE NOTICE 'Migration complete:';
  RAISE NOTICE '  PDF records found: %', pdf_count;
  RAISE NOTICE '  Manual records found: %', manual_count;
  RAISE NOTICE '  Data migrated to employees.pdf_data and employees.manual_data';
END $$;

