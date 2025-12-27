-- Migration: Create system and settings tables

-- System settings (global configuration)
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'string' CHECK (type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Audit log (track important changes)
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,

    -- Who did it
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    medew_gc_id INTEGER,
    username VARCHAR(50),

    -- What happened
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,  -- 'user', 'leave_request', 'time_entry', etc
    entity_id INTEGER,

    -- Details
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,

    -- When
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Session management (optional, for tracking active sessions)
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Session info
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_session_period CHECK (expires_at > created_at)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- Auto-update timestamp trigger
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto cleanup expired sessions (optional)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Insert default system settings
INSERT INTO system_settings (key, value, type, description, category) VALUES
    ('app_name', 'Clockwise', 'string', 'Application name', 'general'),
    ('default_hours_per_day', '8.00', 'number', 'Default working hours per day', 'time_tracking'),
    ('auto_approve_enabled', 'false', 'boolean', 'Auto-approve time entries', 'workflow'),
    ('max_leave_days_per_request', '30', 'number', 'Maximum leave days per single request', 'leave'),
    ('notification_email_enabled', 'true', 'boolean', 'Enable email notifications', 'notifications'),
    ('maintenance_mode', 'false', 'boolean', 'Put system in maintenance mode', 'system')
ON CONFLICT (key) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE system_settings IS 'Global application settings and configuration';
COMMENT ON TABLE audit_log IS 'Audit trail of important system changes';
COMMENT ON TABLE user_sessions IS 'Active user sessions for security and session management';
