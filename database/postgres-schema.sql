-- Clockwise Workflow Database Schema for PostgreSQL/Supabase
-- This database handles the workflow/approval process for time entries and vacation requests
-- Approved entries are synced to Firebird (the source of truth)

-- ============================================================================
-- TIME ENTRIES WORKFLOW TABLE
-- ============================================================================
-- Stores time entries in different workflow states
-- Status flow: concept -> ingeleverd -> goedgekeurd (synced to Firebird) / afgekeurd
CREATE TABLE IF NOT EXISTS time_entries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,                    -- medewGcId from Firebird
    entry_date DATE NOT NULL,
    hours DECIMAL(5,2) NOT NULL,
    project_id INTEGER,                          -- werkGcId from Firebird (nullable for vacation)
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'concept', -- concept, ingeleverd, goedgekeurd, afgekeurd

    -- Additional fields for detailed time tracking
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    break_minutes INTEGER DEFAULT 0,
    distance_km DECIMAL(8,2) DEFAULT 0,
    expenses DECIMAL(10,2) DEFAULT 0,

    -- Workflow metadata
    submitted_at TIMESTAMP,                      -- When status changed to 'ingeleverd'
    reviewed_at TIMESTAMP,                       -- When manager approved/rejected
    reviewed_by INTEGER,                         -- Manager's medewGcId
    rejection_reason TEXT,                       -- Why it was rejected
    firebird_id INTEGER,                         -- ID in Firebird after sync (when approved)

    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('concept', 'ingeleverd', 'goedgekeurd', 'afgekeurd')),
    CONSTRAINT valid_hours CHECK (hours > 0 AND hours <= 24)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_entry_date ON time_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_status ON time_entries(user_id, status);
CREATE INDEX IF NOT EXISTS idx_time_entries_firebird_id ON time_entries(firebird_id);

-- ============================================================================
-- VACATION REQUESTS TABLE
-- ============================================================================
-- Stores vacation/leave requests in workflow
-- Status flow: pending -> approved (optionally synced to Firebird) / rejected
CREATE TABLE IF NOT EXISTS vacation_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,                    -- medewGcId from Firebird
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    vacation_type VARCHAR(50) NOT NULL,          -- Vakantie, Ziekte, Snipperdag, etc.
    total_days DECIMAL(4,1) NOT NULL,            -- Number of days requested
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, rejected

    -- Workflow metadata
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by INTEGER,                         -- Manager's medewGcId
    rejection_reason TEXT,

    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_vacation_status CHECK (status IN ('pending', 'approved', 'rejected')),
    CONSTRAINT valid_date_range CHECK (end_date >= start_date),
    CONSTRAINT valid_total_days CHECK (total_days > 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vacation_user_id ON vacation_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_vacation_status ON vacation_requests(status);
CREATE INDEX IF NOT EXISTS idx_vacation_start_date ON vacation_requests(start_date);
CREATE INDEX IF NOT EXISTS idx_vacation_user_status ON vacation_requests(user_id, status);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
-- Auto-update updated_at timestamp on row changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vacation_requests_updated_at BEFORE UPDATE ON vacation_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================
-- You can uncomment this to add some test data
/*
INSERT INTO time_entries (user_id, entry_date, hours, project_id, notes, status, start_time, end_time)
VALUES
    (100002, CURRENT_DATE, 8, 100001, 'Development work', 'concept', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '8 hours'),
    (100002, CURRENT_DATE - 1, 7.5, 100001, 'Testing', 'ingeleverd', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '7.5 hours');

INSERT INTO vacation_requests (user_id, start_date, end_date, vacation_type, total_days, notes, status)
VALUES
    (100002, CURRENT_DATE + 7, CURRENT_DATE + 11, 'Vakantie', 5, 'Summer vacation', 'pending');
*/
