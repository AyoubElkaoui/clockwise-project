-- Migration: 019_AddEmployeeManagementColumns
-- Adds columns for employee management: hours per project, ATV, disability

-- Add hours_per_week to user_projects (how many hours this user works on this specific project)
ALTER TABLE user_projects ADD COLUMN IF NOT EXISTS hours_per_week DECIMAL(4,1) DEFAULT NULL;
ALTER TABLE user_projects ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add employee management columns to users table
-- ATV (Arbeidstijdverkorting) - time reduction hours per week
ALTER TABLE users ADD COLUMN IF NOT EXISTS atv_hours_per_week DECIMAL(4,1) DEFAULT 0;

-- Disability percentage (arbeidsongeschiktheid)
ALTER TABLE users ADD COLUMN IF NOT EXISTS disability_percentage INTEGER DEFAULT 0;

-- Expected work hours per week (can be different from contract_hours due to disability/ATV)
ALTER TABLE users ADD COLUMN IF NOT EXISTS effective_hours_per_week DECIMAL(4,1);

-- Employment start/end dates
ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_start_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_end_date DATE;

-- Notes field for special circumstances
ALTER TABLE users ADD COLUMN IF NOT EXISTS hr_notes TEXT;

-- Update effective hours to be calculated (contract - atv - disability reduction)
-- This is just a placeholder, actual calculation happens in application
UPDATE users
SET effective_hours_per_week = COALESCE(contract_hours, 40) - COALESCE(atv_hours_per_week, 0)
WHERE effective_hours_per_week IS NULL;

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('atv_hours_per_week', 'disability_percentage', 'effective_hours_per_week', 'hr_notes')
ORDER BY column_name;

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_projects' AND column_name IN ('hours_per_week', 'notes')
ORDER BY column_name;
