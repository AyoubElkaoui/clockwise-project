-- Migration: Add contract hours to users and extra fields to time entries
-- Date: 2026-01-07

-- Add contract_hours_per_week to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS contract_hours_per_week DECIMAL(5,2) DEFAULT 40.00;

-- Add extra fields to time_entries_workflow table
ALTER TABLE time_entries_workflow
ADD COLUMN IF NOT EXISTS evening_night_hours DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS travel_hours DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS distance_km DECIMAL(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS travel_costs DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_expenses DECIMAL(10,2) DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN users.contract_hours_per_week IS 'Contract uren per week - minimaal aantal uren dat medewerker moet werken';

COMMENT ON COLUMN time_entries_workflow.evening_night_hours IS 'Avond/nacht uren - tellen mee voor contract uren totaal';
COMMENT ON COLUMN time_entries_workflow.travel_hours IS 'Reisuren (was W-W KM veld)';
COMMENT ON COLUMN time_entries_workflow.distance_km IS 'Afstand in kilometers';
COMMENT ON COLUMN time_entries_workflow.travel_costs IS 'Reiskosten (OV, taxi, parkeren, etc.)';
COMMENT ON COLUMN time_entries_workflow.other_expenses IS 'Onkosten (materiaal, maaltijden, overige uitgaven)';

-- Note: Contract hours per user worden ingesteld via migration 009_SyncUsersFromFirebird.sql
-- Werk type (Tekenkamer/Montage) wordt bepaald door taak_gc_id bij het invoeren van uren:
--   - taak_gc_id 100032 = Tekenkamer (code 40)
--   - taak_gc_id 100256 = Montage (code 30)
