# Create Test Users

## Step 1: Run Supabase Migrations

1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/ynajasnxfvgtlbjatlbw/sql/new)
2. Run each migration file in order:

### Migration 002: Users Tables

```sql
-- Migration: Create users and related tables
-- This creates the authentication system

-- Users table (PostgreSQL shadow DB)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    medew_gc_id INTEGER NOT NULL UNIQUE,  -- Links to Firebird AT_MEDEW.GC_ID
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    email VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'manager', 'admin')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(10) DEFAULT 'nl',
    timezone VARCHAR(50) DEFAULT 'Europe/Amsterdam',
    theme VARCHAR(20) DEFAULT 'light',
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    weekly_reports BOOLEAN DEFAULT TRUE,
    default_hours_per_day DECIMAL(4,2) DEFAULT 8.00,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_settings UNIQUE (user_id)
);

-- Manager assignments (who manages whom)
CREATE TABLE IF NOT EXISTS manager_assignments (
    id SERIAL PRIMARY KEY,
    manager_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    active_from DATE NOT NULL DEFAULT CURRENT_DATE,
    active_until DATE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_active_assignment UNIQUE (employee_id, active_from),
    CONSTRAINT no_self_management CHECK (manager_id != employee_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_medew_gc_id ON users(medew_gc_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_manager_assignments_manager ON manager_assignments(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_assignments_employee ON manager_assignments(employee_id);

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update timestamp triggers
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts with authentication - shadow DB for Firebird AT_MEDEW';
COMMENT ON COLUMN users.medew_gc_id IS 'Foreign key to Firebird AT_MEDEW.GC_ID';
COMMENT ON TABLE user_settings IS 'User preferences and settings';
COMMENT ON TABLE manager_assignments IS 'Manager-employee relationships for approval workflow';
```

### Migration 003: Activities Tables

```sql
-- Migration: Create activities and notifications tables

-- Activities feed (for notifications and updates)
CREATE TABLE IF NOT EXISTS activities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    activity_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    metadata JSONB,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Activity recipients (who should see this activity)
CREATE TABLE IF NOT EXISTS activity_recipients (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_activity_recipient UNIQUE (activity_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_recipients_user ON activity_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_recipients_unread ON activity_recipients(user_id, is_read)
    WHERE is_read = FALSE;

-- Comments for documentation
COMMENT ON TABLE activities IS 'Activity feed for notifications and user actions';
COMMENT ON TABLE activity_recipients IS 'Tracks which users should see which activities';
```

### Migration 004: Leave Workflow Tables

```sql
-- Migration: Create leave/vacation workflow tables

-- Leave requests workflow table
CREATE TABLE IF NOT EXISTS leave_requests_workflow (
    id SERIAL PRIMARY KEY,
    medew_gc_id INTEGER NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    taak_gc_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    hours_per_day DECIMAL(4,2) NOT NULL DEFAULT 8.00,
    total_hours DECIMAL(6,2) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    firebird_gc_ids INTEGER[],
    CONSTRAINT valid_date_range CHECK (end_date >= start_date),
    CONSTRAINT valid_hours CHECK (total_hours > 0 AND total_hours <= 365 * 8),
    CONSTRAINT valid_hours_per_day CHECK (hours_per_day > 0 AND hours_per_day <= 24)
);

-- Vacation balance tracking
CREATE TABLE IF NOT EXISTS vacation_balance (
    id SERIAL PRIMARY KEY,
    medew_gc_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    total_hours DECIMAL(6,2) NOT NULL DEFAULT 0,
    used_hours DECIMAL(6,2) NOT NULL DEFAULT 0,
    pending_hours DECIMAL(6,2) NOT NULL DEFAULT 0,
    available_hours DECIMAL(6,2) GENERATED ALWAYS AS (total_hours - used_hours - pending_hours) STORED,
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

-- Auto-update timestamp triggers
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
```

### Migration 005: System Tables

```sql
-- Migration: Create system and settings tables

-- System settings (global configuration)
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'string' CHECK (type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Audit log (track important changes)
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    medew_gc_id INTEGER,
    username VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Session management
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
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

-- Auto cleanup expired sessions
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
```

## Step 2: Generate Password Hashes

Start the backend and use the hash-password endpoint:

```bash
cd backend
dotnet run
```

Then in another terminal or using curl/Postman:

```bash
# Hash "admin123" for admin user
curl -X POST http://localhost:5000/api/auth/hash-password \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"admin123\"}"

# Hash "user123" for regular user
curl -X POST http://localhost:5000/api/auth/hash-password \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"user123\"}"
```

## Step 3: Insert Test Users

Use the password hashes from Step 2 to insert test users in Supabase SQL Editor:

```sql
-- Insert test admin user (replace <ADMIN_HASH> with actual hash from step 2)
INSERT INTO users (medew_gc_id, username, password_hash, email, role, first_name, last_name, is_active)
VALUES (
    1,  -- Make sure this matches an actual GC_ID from Firebird AT_MEDEW table
    'admin',
    '<ADMIN_HASH>',  -- Replace with actual BCrypt hash
    'admin@clockwise.local',
    'admin',
    'Admin',
    'User',
    TRUE
);

-- Insert test regular user (replace <USER_HASH> with actual hash from step 2)
INSERT INTO users (medew_gc_id, username, password_hash, email, role, first_name, last_name, is_active)
VALUES (
    2,  -- Make sure this matches an actual GC_ID from Firebird AT_MEDEW table
    'testuser',
    '<USER_HASH>',  -- Replace with actual BCrypt hash
    'user@clockwise.local',
    'user',
    'Test',
    'User',
    TRUE
);
```

**IMPORTANT**: The `medew_gc_id` values (1 and 2 above) must match actual `GC_ID` values from your Firebird `AT_MEDEW` table. Check your Firebird database first:

```sql
-- Run this in your Firebird database to see available employee IDs
SELECT GC_ID, GC_NAAM FROM AT_MEDEW WHERE GC_ACTIEF = 1 ORDER BY GC_ID;
```

Then use the actual GC_ID values in the INSERT statements above.

## Step 4: Test Authentication

Test the login endpoint:

```bash
# Test admin login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}"

# Test user login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"testuser\",\"password\":\"user123\"}"
```

You should receive a response with a JWT token and user info:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "medew_gc_id": 1,
    "email": "admin@clockwise.local",
    "role": "admin",
    "first_name": "Admin",
    "last_name": "User"
  }
}
```

## Next Steps

Once authentication is working:

1. Update the frontend to use the new `/api/auth/login` endpoint
2. Store the JWT token in localStorage
3. Include the token in subsequent API requests: `Authorization: Bearer <token>`
4. Test the full leave booking workflow
