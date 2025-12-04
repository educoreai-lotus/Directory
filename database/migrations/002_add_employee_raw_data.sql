-- Migration: Add employee_raw_data table for extended enrichment flow
-- This migration adds support for PDF, manual, and merged data sources
-- 
-- REVERSIBLE: Can be dropped with: DROP TABLE IF EXISTS employee_raw_data; DROP TYPE IF EXISTS raw_data_source;

-- Create enum type for data sources
CREATE TYPE raw_data_source AS ENUM ('pdf', 'manual', 'linkedin', 'github', 'merged');

-- Create employee_raw_data table
CREATE TABLE IF NOT EXISTS employee_raw_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    source raw_data_source NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, source)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_employee_raw_data_employee_id ON employee_raw_data(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_raw_data_source ON employee_raw_data(source);
CREATE INDEX IF NOT EXISTS idx_employee_raw_data_employee_source ON employee_raw_data(employee_id, source);

-- Add comment for documentation
COMMENT ON TABLE employee_raw_data IS 'Stores raw data from various sources (PDF, manual form, LinkedIn, GitHub) before merging and enrichment';
COMMENT ON COLUMN employee_raw_data.source IS 'Source of the raw data: pdf, manual, linkedin, github, or merged (after combining all sources)';
COMMENT ON COLUMN employee_raw_data.data IS 'JSONB field containing the structured raw data from the source';

