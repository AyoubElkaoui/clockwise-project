-- Migration: Create favorite_projects table for storing user's favorite projects
-- Run this on your PostgreSQL database (Supabase)

CREATE TABLE IF NOT EXISTS favorite_projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    project_gc_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_favorite_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_user_project UNIQUE (user_id, project_gc_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_favorite_projects_user_id ON favorite_projects(user_id);

-- Comment explaining the table
COMMENT ON TABLE favorite_projects IS 'Stores user favorite projects for quick access in time registration';
COMMENT ON COLUMN favorite_projects.project_gc_id IS 'References the Firebird AT_WERK.GC_ID';
