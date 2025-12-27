-- Migration: Create leave/vacation workflow tables
-- Similar to time_entries_workflow but for leave bookings

-- Leave requests workflow table
CREATE TABLE IF NOT EXISTS leave_requests_workflow (
    id SERIAL PRIMARY KEY,

    -- Employee details
    medew_gc_id INTEGER NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

    -- Leave details
    taak_gc_id INTEGER NOT NULL,  -- Leave type from AT_TAAK (Z03, Z10, etc)
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    hours_per_day DECIMAL(4,2) NOT NULL DEFAULT 8.00,
    total_hours DECIMAL(6,2) NOT NULL,
    description TEXT,

    -- Workflow status
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED')),

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMP,
    reviewed_at TIMESTAMP,

    -- Review information
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    rejection_reason TEXT,

    -- Links to Firebird (after approval, creates multiple AT_URENBREG records)
    firebird_gc_ids INTEGER[],  -- Array of GC_IDs created in AT_URENBREG

    -- Constraints
    CONSTRAINT valid_date_range CHECK (end_date >= start_date),
    CONSTRAINT valid_hours CHECK (total_hours > 0 AND total_hours <= 365 * 8),
    CONSTRAINT valid_hours_per_day CHECK (hours_per_day > 0 AND hours_per_day <= 24)
);

-- Vacation balance tracking (optional, for showing remaining vacation)
CREATE TABLE IF NOT EXISTS vacation_balance (
    id SERIAL PRIMARY KEY,
    medew_gc_id INTEGER NOT NULL,
    year INTEGER NOT NULL,

    -- Balance
    total_hours DECIMAL(6,2) NOT NULL DEFAULT 0,  -- Total allocated for year
    used_hours DECIMAL(6,2) NOT NULL DEFAULT 0,   -- Already used (approved)
    pending_hours DECIMAL(6,2) NOT NULL DEFAULT 0, -- In review (submitted)

    -- Calculated field
    available_hours DECIMAL(6,2) GENERATED ALWAYS AS (total_hours - used_hours - pending_hours) STORED,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_medew_year UNIQUE (medew_gc_id, year),
    CONSTRAINT valid_year CHECK (year >= 2000 AND year <= 2100)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leave_workflow_medew ON leave_requests_workflow(medew_gc_id);
CREATE INDEX IF NOT EXISTS idx_leave_workflow_user ON leave_requests_workflow(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_workflow_status ON leave_requests_workflow(status);
CREATE INDEX IF NOT EXISTS idx_leave_workflow_dates ON leave_requests_workflow(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_workflow_submitted ON leave_requests_workflow(medew_gc_id, status)
    WHERE status = 'SUBMITTED';

CREATE INDEX IF NOT EXISTS idx_vacation_balance_medew ON vacation_balance(medew_gc_id);
CREATE INDEX IF NOT EXISTS idx_vacation_balance_year ON vacation_balance(year);

-- Auto-update timestamp trigger
CREATE TRIGGER update_leave_requests_workflow_updated_at
    BEFORE UPDATE ON leave_requests_workflow
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vacation_balance_updated_at
    BEFORE UPDATE ON vacation_balance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE leave_requests_workflow IS 'Leave/vacation requests workflow - links to Firebird AT_TAAK for leave types';
COMMENT ON COLUMN leave_requests_workflow.taak_gc_id IS 'Foreign key to Firebird AT_TAAK.GC_ID (leave types with GC_CODE starting with Z)';
COMMENT ON COLUMN leave_requests_workflow.firebird_gc_ids IS 'Array of GC_IDs from AT_URENBREG created when leave is approved (one per day)';
COMMENT ON TABLE vacation_balance IS 'Tracks vacation hours balance per employee per year (calculated + manual adjustments)';
COMMENT ON COLUMN vacation_balance.available_hours IS 'Auto-calculated: total - used - pending';
