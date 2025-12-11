-- Fix Schema Mismatch Script
-- This script fixes databases that were created with the old schema.sql
-- Run this in your Supabase SQL Editor if you're getting errors when registering companies
--
-- NOTE: If you get a duplicate key error, it means you already have duplicate domains
-- in your companies table. Run check_duplicate_domains.sql first to identify them.

-- Step 1: Fix companies table column names
-- Rename primary_kpis to kpis if it exists
DO $$
BEGIN
    -- Check if primary_kpis column exists and rename it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'primary_kpis'
    ) THEN
        ALTER TABLE companies RENAME COLUMN primary_kpis TO kpis;
        -- Set default value if not already set
        ALTER TABLE companies ALTER COLUMN kpis SET DEFAULT 'Not specified';
        ALTER TABLE companies ALTER COLUMN kpis SET NOT NULL;
    END IF;
END $$;

-- Rename learning_path_approval to approval_policy if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'learning_path_approval'
    ) THEN
        ALTER TABLE companies RENAME COLUMN learning_path_approval TO approval_policy;
        -- Update constraint values from 'automatic' to 'auto'
        UPDATE companies SET approval_policy = 'auto' WHERE approval_policy = 'automatic';
        -- Drop old constraint if it exists
        ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_learning_path_approval_check;
        -- Add correct constraint
        ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_approval_policy_check;
        ALTER TABLE companies ADD CONSTRAINT companies_approval_policy_check 
            CHECK (approval_policy IN ('manual', 'auto'));
    END IF;
END $$;

-- Step 2: Add missing columns to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS passing_grade INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS max_attempts INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS exercises_limited BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS num_of_exercises INTEGER;

-- Step 3: Fix employees table - add missing columns
ALTER TABLE employees ADD COLUMN IF NOT EXISTS profile_photo_url VARCHAR(500);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS profile_status VARCHAR(50) DEFAULT 'basic';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS value_proposition TEXT;

-- Add profile_status constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'employees_profile_status_check'
    ) THEN
        ALTER TABLE employees ADD CONSTRAINT employees_profile_status_check 
            CHECK (profile_status IN ('basic', 'enriched', 'approved', 'rejected'));
    END IF;
END $$;

-- Step 4: Ensure employees table has correct NOT NULL constraints
-- Note: Only add NOT NULL if column doesn't have NULL values
DO $$
BEGIN
    -- Check if password_hash has NULLs before making it NOT NULL
    IF NOT EXISTS (SELECT 1 FROM employees WHERE password_hash IS NULL) THEN
        ALTER TABLE employees ALTER COLUMN password_hash SET NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM employees WHERE current_role_in_company IS NULL) THEN
        ALTER TABLE employees ALTER COLUMN current_role_in_company SET NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM employees WHERE target_role_in_company IS NULL) THEN
        ALTER TABLE employees ALTER COLUMN target_role_in_company SET NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM employees WHERE preferred_language IS NULL) THEN
        ALTER TABLE employees ALTER COLUMN preferred_language SET NOT NULL;
    END IF;
END $$;

-- Step 5: Create missing tables if they don't exist
CREATE TABLE IF NOT EXISTS employee_profile_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    enriched_at TIMESTAMP,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id)
);

CREATE TABLE IF NOT EXISTS employee_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('learn-new-skills', 'apply-trainer', 'self-learning', 'other')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'in_progress', 'completed')),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    response_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS directory_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'DIRECTORY_ADMIN' CHECK (role = 'DIRECTORY_ADMIN'),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Check if employee_raw_data table exists (it might be missing)
-- Create ENUM type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'raw_data_source') THEN
        CREATE TYPE raw_data_source AS ENUM ('pdf', 'manual', 'linkedin', 'github', 'merged');
    END IF;
END $$;

-- Create employee_raw_data table if it doesn't exist
CREATE TABLE IF NOT EXISTS employee_raw_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    source raw_data_source NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, source)
);

-- Create indexes for employee_raw_data
CREATE INDEX IF NOT EXISTS idx_employee_raw_data_employee_id ON employee_raw_data(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_raw_data_source ON employee_raw_data(source);
CREATE INDEX IF NOT EXISTS idx_employee_raw_data_employee_source ON employee_raw_data(employee_id, source);

-- Step 6: Create missing indexes
CREATE INDEX IF NOT EXISTS idx_employees_profile_status ON employees(profile_status);
CREATE INDEX IF NOT EXISTS idx_employee_profile_approvals_company_status ON employee_profile_approvals(company_id, status);
CREATE INDEX IF NOT EXISTS idx_employee_profile_approvals_employee ON employee_profile_approvals(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_requests_employee ON employee_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_requests_company_status ON employee_requests(company_id, status);
CREATE INDEX IF NOT EXISTS idx_employee_requests_type ON employee_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_directory_admins_email ON directory_admins(email);

-- Step 7: Check for duplicate domains (informational only)
DO $$
DECLARE
    dup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO dup_count
    FROM (
        SELECT domain, COUNT(*) as cnt
        FROM companies
        GROUP BY domain
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF dup_count > 0 THEN
        RAISE WARNING 'Found % duplicate domain(s) in companies table. Run check_duplicate_domains.sql to see details.', dup_count;
    END IF;
END $$;

-- Step 8: Verify the fix
DO $$
BEGIN
    RAISE NOTICE 'Schema fix completed. Please verify:';
    RAISE NOTICE '1. companies table should have: approval_policy, kpis (not learning_path_approval, primary_kpis)';
    RAISE NOTICE '2. companies table should have: logo_url, passing_grade, max_attempts, exercises_limited, num_of_exercises';
    RAISE NOTICE '3. employees table should have: profile_status, profile_photo_url, value_proposition';
    RAISE NOTICE '4. All required tables should exist';
    RAISE NOTICE '';
    RAISE NOTICE 'If you see duplicate domain warnings above, run check_duplicate_domains.sql to identify them.';
END $$;

