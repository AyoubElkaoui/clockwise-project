-- Auto-assign all users to the first manager
-- This is for TESTING purposes only!

DO $$
DECLARE
    v_manager_id INT;
    v_employee RECORD;
    v_count INT := 0;
BEGIN
    -- Find the first manager
    SELECT id INTO v_manager_id
    FROM users
    WHERE role = 'manager'
    LIMIT 1;

    IF v_manager_id IS NULL THEN
        RAISE NOTICE 'No manager found! Please create a manager user first.';
        RETURN;
    END IF;

    RAISE NOTICE 'Found manager with ID: %', v_manager_id;

    -- Delete existing assignments for this manager
    DELETE FROM manager_assignments WHERE manager_id = v_manager_id;

    -- Assign all non-admin, non-manager users to this manager
    FOR v_employee IN 
        SELECT id, username, first_name, last_name
        FROM users
        WHERE role = 'user'
        AND id != v_manager_id
    LOOP
        INSERT INTO manager_assignments (manager_id, employee_id, active_from)
        VALUES (v_manager_id, v_employee.id, CURRENT_DATE);
        
        v_count := v_count + 1;
        RAISE NOTICE 'Assigned employee % (ID: %) to manager', v_employee.username, v_employee.id;
    END LOOP;

    RAISE NOTICE 'Total assignments created: %', v_count;
    
    -- Show results
    RAISE NOTICE '---';
    RAISE NOTICE 'Current manager assignments:';
    FOR v_employee IN
        SELECT 
            m.username as manager_name,
            u.username as employee_name,
            ma.active_from
        FROM manager_assignments ma
        JOIN users m ON ma.manager_id = m.id
        JOIN users u ON ma.employee_id = u.id
        WHERE ma.manager_id = v_manager_id
    LOOP
        RAISE NOTICE '  % manages % (from %)', v_employee.manager_name, v_employee.employee_name, v_employee.active_from;
    END LOOP;
END $$;

-- Verify the assignments
SELECT 
    m.id as manager_id,
    m.username as manager,
    COUNT(ma.employee_id) as team_size,
    STRING_AGG(u.username, ', ' ORDER BY u.username) as team_members
FROM manager_assignments ma
JOIN users m ON ma.manager_id = m.id
JOIN users u ON ma.employee_id = u.id
WHERE ma.active_until IS NULL OR ma.active_until >= CURRENT_DATE
GROUP BY m.id, m.username;
