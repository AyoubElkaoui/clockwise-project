-- Script to seed manager_assignments table
-- This assigns employees to managers for testing

-- First, let's check what users we have
-- SELECT id, username, role, medew_gc_id FROM users ORDER BY role, id;

-- Delete existing assignments
DELETE FROM manager_assignments;

-- Assign employees to managers
-- Replace these IDs with actual IDs from your database!
-- 
-- Example: If you have:
--   Manager ID 1 (role='manager', medew_gc_id=101)
--   Employee ID 2 (role='user', medew_gc_id=102)
--   Employee ID 3 (role='user', medew_gc_id=103)
--
-- Then uncomment and adjust:
-- INSERT INTO manager_assignments (manager_id, employee_id, active_from) VALUES
-- (1, 2, '2024-01-01'),
-- (1, 3, '2024-01-01');

-- To find managers and employees, run this query first:
SELECT 
    id,
    username,
    role,
    first_name,
    last_name,
    medew_gc_id
FROM users
ORDER BY 
    CASE role 
        WHEN 'admin' THEN 1 
        WHEN 'manager' THEN 2 
        ELSE 3 
    END,
    id;

-- After finding the IDs, uncomment and fill in:
-- 
-- INSERT INTO manager_assignments (manager_id, employee_id, active_from) VALUES
-- (MANAGER_USER_ID, EMPLOYEE_USER_ID, CURRENT_DATE);
--
-- Example for multiple employees under one manager:
-- INSERT INTO manager_assignments (manager_id, employee_id, active_from) VALUES
-- (1, 2, CURRENT_DATE),  -- Manager 1 manages Employee 2
-- (1, 3, CURRENT_DATE),  -- Manager 1 manages Employee 3
-- (1, 4, CURRENT_DATE);  -- Manager 1 manages Employee 4
