-- Migration: Add employee_skills table to store Skills Engine response
-- This prevents duplicate calls to Skills Engine when viewing profile

CREATE TABLE IF NOT EXISTS employee_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    competencies JSONB NOT NULL,
    relevance_score NUMERIC DEFAULT 0,
    gap JSONB, -- Missing skills data
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_skills_employee_id ON employee_skills(employee_id);

