-- Migration: Create activities/notifications tables
-- This tracks user activities and system notifications

-- Activities table (for notifications and audit trail)
CREATE TABLE IF NOT EXISTS activities (
    id SERIAL PRIMARY KEY,

    -- Who triggered this activity
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    medew_gc_id INTEGER NOT NULL,

    -- What happened
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'time_entry',
        'time_entry_approved',
        'time_entry_rejected',
        'leave_request',
        'leave_approved',
        'leave_rejected',
        'project_assignment',
        'system'
    )),
    action VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    details TEXT,

    -- Related entities
    related_id INTEGER,  -- ID of related entity (time entry, leave request, etc)
    related_type VARCHAR(50),  -- Type of related entity

    -- Notification status
    read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP,

    -- Timestamp
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Optional: severity for system alerts
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'success'))
);

-- Activity recipients (for multi-user notifications)
CREATE TABLE IF NOT EXISTS activity_recipients (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Has this recipient read it?
    read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP,

    CONSTRAINT unique_activity_recipient UNIQUE (activity_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_medew_gc_id ON activities(medew_gc_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_read ON activities(read);
CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activities_related ON activities(related_type, related_id);

CREATE INDEX IF NOT EXISTS idx_activity_recipients_activity ON activity_recipients(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_recipients_user ON activity_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_recipients_unread ON activity_recipients(user_id, read) WHERE read = FALSE;

-- Comments for documentation
COMMENT ON TABLE activities IS 'User activities and system notifications';
COMMENT ON COLUMN activities.type IS 'Category of activity for filtering and icons';
COMMENT ON COLUMN activities.related_id IS 'ID of the entity this activity is about (e.g., time_entry.id, leave_request.id)';
COMMENT ON TABLE activity_recipients IS 'Tracks which users should see which activities (for team/manager notifications)';
