-- Migration: Drop employee_raw_data table (OPTIONAL - only after verifying everything works)
-- 
-- ⚠️  WARNING: Only run this migration AFTER:
--   1. Migration 004 has been run (adds pdf_data and manual_data columns)
--   2. Migration 005 has been run (migrates existing data, if any)
--   3. All code has been deployed and tested
--   4. You've verified that no code is using employee_raw_data table anymore
--
-- This migration is REVERSIBLE but requires recreating the table and enum type

-- Drop indexes first
DROP INDEX IF EXISTS idx_employee_raw_data_employee_id;
DROP INDEX IF EXISTS idx_employee_raw_data_source;
DROP INDEX IF EXISTS idx_employee_raw_data_employee_source;

-- Drop the table
DROP TABLE IF EXISTS employee_raw_data;

-- Drop the enum type
DROP TYPE IF EXISTS raw_data_source;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'employee_raw_data table and raw_data_source enum have been dropped';
  RAISE NOTICE 'All raw data is now stored in employees table columns (linkedin_data, github_data, pdf_data, manual_data)';
END $$;

