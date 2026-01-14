-- Migration 012: Create Holidays and Closed Days Table
-- Purpose: Allow managers to mark holidays and company closed days
-- Date: 2026-01-14

-- Create holidays table for national and company holidays
CREATE TABLE IF NOT EXISTS holidays (
    id SERIAL PRIMARY KEY,
    holiday_date DATE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('national', 'company', 'closed')),
    is_work_allowed BOOLEAN DEFAULT FALSE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    UNIQUE(holiday_date, type)
);

-- Create index for faster date lookups
CREATE INDEX idx_holidays_date ON holidays(holiday_date);
CREATE INDEX idx_holidays_type ON holidays(type);

-- Insert Dutch national holidays for 2026 (placeholder - these dates are approximate)
INSERT INTO holidays (holiday_date, name, type, is_work_allowed, created_by) VALUES
('2026-01-01', 'Nieuwjaarsdag', 'national', false, NULL),
('2026-04-03', 'Goede Vrijdag', 'national', false, NULL),
('2026-04-05', 'Eerste Paasdag', 'national', false, NULL),
('2026-04-06', 'Tweede Paasdag', 'national', false, NULL),
('2026-04-27', 'Koningsdag', 'national', false, NULL),
('2026-05-05', 'Bevrijdingsdag', 'national', false, NULL),
('2026-05-14', 'Hemelvaartsdag', 'national', false, NULL),
('2026-05-24', 'Eerste Pinksterdag', 'national', false, NULL),
('2026-05-25', 'Tweede Pinksterdag', 'national', false, NULL),
('2026-12-25', 'Eerste Kerstdag', 'national', false, NULL),
('2026-12-26', 'Tweede Kerstdag', 'national', false, NULL),

-- Islamitische feestdagen 2026 (exact dates depend on moon sighting)
('2026-03-23', 'Ramadan Begint', 'national', false, NULL),
('2026-04-21', 'Suikerfeest (Eid al-Fitr)', 'national', false, NULL),
('2026-04-22', 'Suikerfeest Dag 2', 'national', false, NULL),
('2026-04-23', 'Suikerfeest Dag 3', 'national', false, NULL),
('2026-06-28', 'Offerfeest (Eid al-Adha)', 'national', false, NULL),
('2026-06-29', 'Offerfeest Dag 2', 'national', false, NULL),
('2026-06-30', 'Offerfeest Dag 3', 'national', false, NULL),
('2026-07-18', 'Islamitisch Nieuwjaar', 'national', false, NULL),

-- Andere belangrijke bedrijfsdagen
('2026-12-24', 'Kerstavond', 'national', false, NULL),
('2026-12-31', 'Oudejaarsavond', 'national', false, NULL)
ON CONFLICT (holiday_date, type) DO NOTHING;

-- Add comments
COMMENT ON TABLE holidays IS 'Stores national holidays and company closed days - Managers can toggle is_work_allowed for all days including national holidays';
COMMENT ON COLUMN holidays.type IS 'Type: national (predefined but editable), company (manager defined), closed (manager closed day)';
COMMENT ON COLUMN holidays.is_work_allowed IS 'Whether employees can register hours on this day - Can be toggled by managers for all holiday types';
