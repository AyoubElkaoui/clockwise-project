-- Clockwise Workflow Database Schema for PostgreSQL/Supabase
-- This database handles the workflow/approval process for time entries and vacation requests
-- Approved entries are synced to Firebird (the source of truth)

-- ============================================================================
-- TIME ENTRIES WORKFLOW TABLE
-- ============================================================================
-- Stores time entries in different workflow states
-- Status flow: DRAFT -> SUBMITTED -> APPROVED (synced to Firebird) / REJECTED
CREATE TABLE IF NOT EXISTS time_entries_workflow (
    id SERIAL PRIMARY KEY,
    medew_gc_id INTEGER NOT NULL,               -- medewGcId from Firebird
    urenper_gc_id INTEGER NOT NULL,             -- period ID
    taak_gc_id INTEGER NOT NULL,                -- task ID
    werk_gc_id INTEGER,                         -- project ID (nullable)
    datum DATE NOT NULL,
    aantal DECIMAL(5,2) NOT NULL,               -- hours
    omschrijving TEXT,                          -- notes
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT, SUBMITTED, APPROVED, REJECTED

    -- Workflow metadata
    submitted_at TIMESTAMP,                      -- When status changed to SUBMITTED
    reviewed_at TIMESTAMP,                       -- When manager approved/rejected
    reviewed_by INTEGER,                         -- Manager's medewGcId
    rejection_reason TEXT,                       -- Why it was rejected
    firebird_gc_id INTEGER,                      -- GC_ID in Firebird after sync (when approved)

    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED')),
    CONSTRAINT valid_hours CHECK (aantal > 0 AND aantal <= 24)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_entries_workflow_medew ON time_entries_workflow(medew_gc_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_workflow_status ON time_entries_workflow(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_workflow_datum ON time_entries_workflow(datum);
CREATE INDEX IF NOT EXISTS idx_time_entries_workflow_medew_status ON time_entries_workflow(medew_gc_id, status);
CREATE INDEX IF NOT EXISTS idx_time_entries_workflow_firebird ON time_entries_workflow(firebird_gc_id);

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

CREATE TRIGGER update_time_entries_workflow_updated_at BEFORE UPDATE ON time_entries_workflow
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vacation_requests_updated_at BEFORE UPDATE ON vacation_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================
-- You can uncomment this to add some test data
/*
INSERT INTO time_entries_workflow (medew_gc_id, urenper_gc_id, taak_gc_id, werk_gc_id, datum, aantal, omschrijving, status)
VALUES
    (100002, 1, 1, 100001, CURRENT_DATE, 8, 'Development work', 'DRAFT'),
    (100002, 1, 1, 100001, CURRENT_DATE - 1, 7.5, 'Testing', 'SUBMITTED');

INSERT INTO vacation_requests (user_id, start_date, end_date, vacation_type, total_days, notes, status)
VALUES
    (100002, CURRENT_DATE + 7, CURRENT_DATE + 11, 'Vakantie', 5, 'Summer vacation', 'pending');
*/
