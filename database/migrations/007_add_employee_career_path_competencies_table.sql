-- Migration: Add employee_career_path_competencies table to store career path competencies from Skills Engine
-- This stores competencies received via Coordinator POST request with action "Update user career path competencies"

CREATE TABLE IF NOT EXISTS employee_career_path_competencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    competencies JSONB NOT NULL, -- Array of { competency_id, competency_name }
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_career_path_competencies_employee_id ON employee_career_path_competencies(employee_id);

