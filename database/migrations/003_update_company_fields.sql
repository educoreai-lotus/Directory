-- Migration: Update company fields for existing databases
-- This migration renames learning_path_approval to approval_policy and primary_kpis to kpis
-- Run this if you have an existing database with the old column names

-- Step 1: Check if learning_path_approval exists, if so rename it to approval_policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'learning_path_approval'
  ) THEN
    ALTER TABLE companies RENAME COLUMN learning_path_approval TO approval_policy;
    RAISE NOTICE 'Renamed learning_path_approval to approval_policy';
  END IF;
END $$;

-- Step 2: Update approval_policy constraint to use 'manual' or 'auto'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'companies' AND constraint_name = 'companies_approval_policy_check'
  ) THEN
    ALTER TABLE companies DROP CONSTRAINT companies_approval_policy_check;
  END IF;
END $$;

ALTER TABLE companies 
  DROP CONSTRAINT IF EXISTS companies_approval_policy_check;

ALTER TABLE companies 
  ADD CONSTRAINT companies_approval_policy_check 
  CHECK (approval_policy IN ('manual', 'auto'));

-- Step 3: Update existing 'automatic' values to 'auto'
UPDATE companies 
SET approval_policy = 'auto' 
WHERE approval_policy = 'automatic';

-- Step 4: Check if primary_kpis exists, if so rename it to kpis
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'primary_kpis'
  ) THEN
    ALTER TABLE companies RENAME COLUMN primary_kpis TO kpis;
    RAISE NOTICE 'Renamed primary_kpis to kpis';
  END IF;
END $$;

-- Step 5: Make kpis mandatory (NOT NULL)
-- First, set default value for any NULL kpis
UPDATE companies 
SET kpis = 'Not specified' 
WHERE kpis IS NULL;

-- Then add NOT NULL constraint if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'kpis'
  ) THEN
    ALTER TABLE companies ALTER COLUMN kpis SET NOT NULL;
    RAISE NOTICE 'Set kpis to NOT NULL';
  END IF;
END $$;

-- Step 6: If approval_policy doesn't exist, add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'approval_policy'
  ) THEN
    ALTER TABLE companies ADD COLUMN approval_policy VARCHAR(50) DEFAULT 'manual' CHECK (approval_policy IN ('manual', 'auto'));
    RAISE NOTICE 'Added approval_policy column';
  END IF;
END $$;

-- Step 7: If kpis doesn't exist, add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'kpis'
  ) THEN
    ALTER TABLE companies ADD COLUMN kpis TEXT NOT NULL DEFAULT 'Not specified';
    RAISE NOTICE 'Added kpis column';
  END IF;
END $$;

-- Step 8: Add company settings columns for microservice integration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'passing_grade'
  ) THEN
    ALTER TABLE companies ADD COLUMN passing_grade INTEGER;
    RAISE NOTICE 'Added passing_grade column';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'max_attempts'
  ) THEN
    ALTER TABLE companies ADD COLUMN max_attempts INTEGER;
    RAISE NOTICE 'Added max_attempts column';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'exercises_limited'
  ) THEN
    ALTER TABLE companies ADD COLUMN exercises_limited BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added exercises_limited column';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'num_of_exercises'
  ) THEN
    ALTER TABLE companies ADD COLUMN num_of_exercises INTEGER;
    RAISE NOTICE 'Added num_of_exercises column';
  END IF;
END $$;

