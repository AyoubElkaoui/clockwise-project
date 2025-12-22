-- Migration: Create workflow tables for time entry draft/submit/approval flow
-- This allows workflow without modifying the Firebird schema

-- Time entries workflow table
CREATE TABLE IF NOT EXISTS time_entries_workflow (
    id SERIAL PRIMARY KEY,

    -- Employee and time entry details
    medew_gc_id INTEGER NOT NULL,
    urenper_gc_id INTEGER NOT NULL,
    taak_gc_id INTEGER NOT NULL,
    werk_gc_id INTEGER,
    datum DATE NOT NULL,
    aantal DECIMAL(5,2) NOT NULL CHECK (aantal > 0 AND aantal < 24),
    omschrijving TEXT,

    -- Workflow status
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED')),

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMP,
    reviewed_at TIMESTAMP,

    -- Review information
    reviewed_by INTEGER,
    rejection_reason TEXT,

    -- Link to Firebird after approval
    firebird_gc_id INTEGER,

    -- Prevent duplicates for same day/task/project in DRAFT/SUBMITTED state
    CONSTRAINT unique_draft_entry UNIQUE (medew_gc_id, datum, taak_gc_id, werk_gc_id, urenper_gc_id)
        WHERE (status IN ('DRAFT', 'SUBMITTED'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_medew ON time_entries_workflow(medew_gc_id);
CREATE INDEX IF NOT EXISTS idx_workflow_status ON time_entries_workflow(status);
CREATE INDEX IF NOT EXISTS idx_workflow_datum ON time_entries_workflow(datum);
CREATE INDEX IF NOT EXISTS idx_workflow_urenper ON time_entries_workflow(urenper_gc_id);
CREATE INDEX IF NOT EXISTS idx_workflow_submitted ON time_entries_workflow(medew_gc_id, status)
    WHERE status = 'SUBMITTED';

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_time_entries_workflow_updated_at
    BEFORE UPDATE ON time_entries_workflow
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE time_entries_workflow IS 'Workflow table for time entry drafts, submissions, and approvals';
COMMENT ON COLUMN time_entries_workflow.status IS 'DRAFT: User can edit, SUBMITTED: Awaiting manager review, APPROVED: Copied to Firebird, REJECTED: Needs user revision';
COMMENT ON COLUMN time_entries_workflow.firebird_gc_id IS 'GC_ID from AT_URENBREG after approval (NULL until approved)';
