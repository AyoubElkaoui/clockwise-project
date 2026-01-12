-- Migration 010: Add allowed_tasks field to users table
-- Configures which tasks (Montage/Tekenkamer) each user is allowed to perform

-- Add the allowed_tasks column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS allowed_tasks VARCHAR(20) DEFAULT 'BOTH';

-- Add constraint to ensure valid values
ALTER TABLE users 
ADD CONSTRAINT valid_allowed_tasks CHECK (allowed_tasks IN ('MONTAGE_ONLY', 'TEKENKAMER_ONLY', 'BOTH'));

-- Set specific restrictions based on the employee matrix
-- BOTH: Can do Montage AND Tekenkamer (only 3 people)
UPDATE users SET allowed_tasks = 'BOTH' 
WHERE medew_gc_id IN (100004, 100008, 100015); -- Hilbert, Katel, Theo

-- MONTAGE_ONLY: Can only do Montage work (only 2 people)
UPDATE users SET allowed_tasks = 'MONTAGE_ONLY' 
WHERE medew_gc_id IN (100006, 100013); -- Jan, Ron

-- TEKENKAMER_ONLY: Can only do Tekenkamer work (rest = 10 people)
UPDATE users SET allowed_tasks = 'TEKENKAMER_ONLY' 
WHERE medew_gc_id IN (100001, 100002, 100003, 100005, 100007, 100009, 100010, 100011, 100012, 100014); 
-- Arno, Engelbert, Frank, Han, Jolanda, Parsa, Paul, Rob vd Wetering, Rob Wijtten, Siegfried

-- Verification: Show all users with their allowed tasks
SELECT 
    medew_gc_id,
    username,
    first_name,
    last_name,
    allowed_tasks
FROM users
ORDER BY last_name;
