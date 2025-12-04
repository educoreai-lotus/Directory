-- Rollback Migration: Remove employee_raw_data table
-- This script reverses migration 002_add_employee_raw_data.sql
-- 
-- WARNING: This will DELETE all data in employee_raw_data table
-- Only run this if you want to completely remove the extended enrichment feature

-- Drop indexes first
DROP INDEX IF EXISTS idx_employee_raw_data_employee_source;
DROP INDEX IF EXISTS idx_employee_raw_data_source;
DROP INDEX IF EXISTS idx_employee_raw_data_employee_id;

-- Drop table
DROP TABLE IF EXISTS employee_raw_data;

-- Drop enum type
DROP TYPE IF EXISTS raw_data_source;

