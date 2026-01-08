-- Migration: Create users and authentication tables
-- This allows modern auth while linking to Firebird AT_MEDEW via medew_gc_id

-- Users table (authentication & authorization)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,

    -- Link to Firebird AT_MEDEW
    medew_gc_id INTEGER NOT NULL UNIQUE,

    -- Authentication
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    email VARCHAR(255),

    -- Authorization
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'manager', 'admin')),

    -- Profile
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR email IS NULL)
);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Preferences
    language VARCHAR(10) DEFAULT 'nl',
    timezone VARCHAR(50) DEFAULT 'Europe/Amsterdam',
    theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),

    -- Notifications
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    weekly_reports BOOLEAN DEFAULT TRUE,

    -- Work settings
    default_hours_per_day DECIMAL(4,2) DEFAULT 8.00,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_user_settings UNIQUE (user_id)
);

-- Manager assignments (which managers manage which employees)
CREATE TABLE IF NOT EXISTS manager_assignments (
    id SERIAL PRIMARY KEY,
    manager_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Period
    active_from DATE NOT NULL DEFAULT CURRENT_DATE,
    active_until DATE,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_active_assignment UNIQUE (employee_id, active_from),
    CONSTRAINT no_self_management CHECK (manager_id != employee_id),
    CONSTRAINT valid_period CHECK (active_until IS NULL OR active_until > active_from)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_medew_gc_id ON users(medew_gc_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

CREATE INDEX IF NOT EXISTS idx_manager_assignments_manager ON manager_assignments(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_assignments_employee ON manager_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_manager_assignments_active ON manager_assignments(active_from, active_until);

-- Auto-update timestamp triggers (function created in migration 001)
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE users IS 'User authentication and authorization - links to Firebird AT_MEDEW via medew_gc_id';
COMMENT ON COLUMN users.medew_gc_id IS 'Foreign key to Firebird AT_MEDEW.GC_ID (immutable)';
COMMENT ON COLUMN users.role IS 'user: normal employee, manager: can approve team hours, admin: full access';
COMMENT ON TABLE manager_assignments IS 'Defines which managers are responsible for which employees';
