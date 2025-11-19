-- Quick fix: Add logo_url column to companies table
-- Run this in Supabase SQL Editor if you're getting errors about logo_url

-- Add logo_url column if it doesn't exist
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);

-- Add profile_photo_url column to employees if it doesn't exist
ALTER TABLE employees ADD COLUMN IF NOT EXISTS profile_photo_url VARCHAR(500);

-- Verify columns were added
SELECT 
  column_name, 
  data_type, 
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'companies' AND column_name = 'logo_url'
   OR table_name = 'employees' AND column_name = 'profile_photo_url';

