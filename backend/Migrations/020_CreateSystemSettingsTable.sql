-- Migration 020: Create System Settings Table
-- This table stores global system configuration including 2FA requirements

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Insert default settings
INSERT INTO system_settings (key, value, description) VALUES
    ('require_2fa', 'false', 'Verplicht 2FA voor alle gebruikers'),
    ('session_timeout_minutes', '60', 'Sessie timeout in minuten'),
    ('max_login_attempts', '5', 'Maximum aantal login pogingen voordat account wordt geblokkeerd'),
    ('allow_password_reset', 'true', 'Sta wachtwoord reset via email toe')
ON CONFLICT (key) DO NOTHING;

-- Grant permissions
GRANT ALL ON system_settings TO authenticated;
GRANT ALL ON system_settings TO anon;
