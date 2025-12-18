-- Migration: Add pdf_data and manual_data columns to employees table
-- This consolidates all raw data sources into the employees table
-- 
-- REVERSIBLE: Can be dropped with: 
--   ALTER TABLE employees DROP COLUMN IF EXISTS pdf_data;
--   ALTER TABLE employees DROP COLUMN IF EXISTS manual_data;

-- Add pdf_data column (stores extracted CV/PDF data)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS pdf_data JSONB;

-- Add manual_data column (stores manually entered form data)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS manual_data JSONB;

-- Add comments for documentation
COMMENT ON COLUMN employees.pdf_data IS 'Stores extracted raw data from uploaded PDF CV (skills, work_experience, education, etc.)';
COMMENT ON COLUMN employees.manual_data IS 'Stores manually entered profile data (skills, work_experience, education)';

-- Note: linkedin_data and github_data columns already exist in employees table
-- All 4 raw data sources are now in one place: employees table

