-- Script to assign ALL employees to ALL managers
-- This ensures every manager can see and approve hours for every employee
-- Run this in Supabase SQL Editor (PostgreSQL)

-- First, show current state
SELECT
    'Current Managers' as info,
    id,
    username,
    first_name,
    last_name,
    medew_gc_id,
    role
FROM users
WHERE role = 'manager';

-- Show current manager assignments
SELECT
    'Current Assignments' as info,
    m.username as manager,
    u.username as employee,
    ma.active_from
FROM manager_assignments ma
JOIN users m ON ma.manager_id = m.id
JOIN users u ON ma.employee_id = u.id
WHERE ma.active_until IS NULL OR ma.active_until > CURRENT_DATE;

-- Now assign all employees to all managers
DO $$
DECLARE
    v_manager RECORD;
    v_employee RECORD;
    v_count INT := 0;
BEGIN
    -- Loop through all managers
    FOR v_manager IN
        SELECT id, username, first_name, last_name
        FROM users
        WHERE role = 'manager'
    LOOP
        RAISE NOTICE 'Processing manager: % % (ID: %)', v_manager.first_name, v_manager.last_name, v_manager.id;

        -- Assign all employees (role = 'user') to this manager
        FOR v_employee IN
            SELECT id, username, first_name, last_name
            FROM users
            WHERE role = 'user'
              AND id != v_manager.id
        LOOP
            -- Only insert if not already assigned
            INSERT INTO manager_assignments (manager_id, employee_id, active_from)
            VALUES (v_manager.id, v_employee.id, CURRENT_DATE)
            ON CONFLICT DO NOTHING;

            v_count := v_count + 1;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Total potential assignments processed: %', v_count;
END $$;

-- Show final state
SELECT
    'Final Assignments' as info,
    m.id as manager_id,
    m.username as manager,
    m.first_name || ' ' || m.last_name as manager_name,
    m.medew_gc_id as manager_medew_gc_id,
    COUNT(ma.employee_id) as team_size,
    STRING_AGG(u.first_name || ' ' || u.last_name, ', ' ORDER BY u.last_name) as team_members
FROM users m
LEFT JOIN manager_assignments ma ON ma.manager_id = m.id
    AND (ma.active_until IS NULL OR ma.active_until >= CURRENT_DATE)
LEFT JOIN users u ON ma.employee_id = u.id
WHERE m.role = 'manager'
GROUP BY m.id, m.username, m.first_name, m.last_name, m.medew_gc_id
ORDER BY m.username;
