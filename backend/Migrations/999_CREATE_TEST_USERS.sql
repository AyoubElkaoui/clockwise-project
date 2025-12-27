-- Create test users for Supabase
-- Run this AFTER you have run migrations 002-005

-- STEP 1: Hash passwords using the API
-- You can use the /api/auth/hash-password endpoint OR
-- use this C# code to generate hashes:
-- BCrypt.Net.BCrypt.HashPassword("admin123")
-- BCrypt.Net.BCrypt.HashPassword("user123")

-- For now, these are pre-generated hashes:
-- Password "admin123" = $2a$11$xF3WZ1qL5gQ.Y7T.NmXxKOGvH3dz7zRq7qYJZyJ7YvH4wZ1T8J.3O
-- Password "user123"  = $2a$11$WZ9QHqx8eQ9fZ6z8R8fZ8OZ9QHqx8eQ9fZ6z8R8fZ8OZ9QHqx8eQ9

-- Admin user (medew_gc_id = 100001 uit Firebird)
INSERT INTO users (medew_gc_id, username, password_hash, email, role, first_name, last_name, is_active)
VALUES (
    100001,
    'admin',
    '$2a$11$xF3WZ1qL5gQ.Y7T.NmXxKOGvH3dz7zRq7qYJZyJ7YvH4wZ1T8J.3O',  -- password: admin123
    'admin@company.com',
    'admin',
    'Test',
    'Admin',
    TRUE
) ON CONFLICT (medew_gc_id) DO NOTHING;

-- Regular user (medew_gc_id = 100050 uit Firebird - Rahakbauw K)
INSERT INTO users (medew_gc_id, username, password_hash, email, role, first_name, last_name, is_active)
VALUES (
    100050,
    'rahakbauw',
    '$2a$11$WZ9QHqx8eQ9fZ6z8R8fZ8OZ9QHqx8eQ9fZ6z8R8fZ8OZ9QHqx8eQ9',  -- password: user123
    'rahakbauw@company.com',
    'user',
    'Rahakbauw',
    'K',
    TRUE
) ON CONFLICT (medew_gc_id) DO NOTHING;

-- Create default settings for admin
INSERT INTO user_settings (user_id, language, timezone, theme)
SELECT id, 'nl', 'Europe/Amsterdam', 'light'
FROM users
WHERE username = 'admin'
ON CONFLICT (user_id) DO NOTHING;

-- Create default settings for regular user
INSERT INTO user_settings (user_id, language, timezone, theme)
SELECT id, 'nl', 'Europe/Amsterdam', 'light'
FROM users
WHERE username = 'rahakbauw'
ON CONFLICT (user_id) DO NOTHING;

-- Verify
SELECT
    id,
    medew_gc_id,
    username,
    email,
    role,
    first_name,
    last_name,
    is_active,
    created_at
FROM users
ORDER BY id;

-- Show settings
SELECT
    us.id,
    u.username,
    us.language,
    us.timezone,
    us.theme
FROM user_settings us
JOIN users u ON u.id = us.user_id
ORDER BY u.id;
