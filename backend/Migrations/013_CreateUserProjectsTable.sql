-- Migration: 013_CreateUserProjectsTable
-- Creates user_projects table for managing user-project assignments

CREATE TABLE IF NOT EXISTS user_projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_gc_id INTEGER NOT NULL,  -- Firebird project GC_ID
    assigned_by INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, project_gc_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_projects_user_id ON user_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_user_projects_project_gc_id ON user_projects(project_gc_id);

-- Add comment
COMMENT ON TABLE user_projects IS 'Links users to Firebird projects for access control';
