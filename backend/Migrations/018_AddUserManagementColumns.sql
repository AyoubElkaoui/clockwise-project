-- Migration: Add columns for team management
-- Run this in Supabase SQL Editor

-- Add phone column if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Add contract_hours column if not exists (default 40 hours per week)
ALTER TABLE users ADD COLUMN IF NOT EXISTS contract_hours INTEGER DEFAULT 40;

-- Add vacation_days column if not exists (default 25 days per year)
ALTER TABLE users ADD COLUMN IF NOT EXISTS vacation_days INTEGER DEFAULT 25;

-- Add used_vacation_days column if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS used_vacation_days INTEGER DEFAULT 0;

-- Add updated_at column if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Verify columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
