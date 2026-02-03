-- Debug script voor manager approval probleem
-- Datum: 2026-02-03

-- 1. Check welke users er zijn met medew_gc_id 100003
SELECT id, medew_gc_id, email, first_name, last_name, role
FROM users
WHERE medew_gc_id = 100003;

-- 2. Check welke manager assignments er zijn
SELECT 
    ma.id,
    ma.manager_id,
    ma.employee_id,
    mu.medew_gc_id as manager_medew_gc_id,
    mu.email as manager_email,
    eu.medew_gc_id as employee_medew_gc_id,
    eu.email as employee_email,
    ma.active_from,
    ma.active_until
FROM manager_assignments ma
JOIN users mu ON ma.manager_id = mu.id
JOIN users eu ON ma.employee_id = eu.id
WHERE mu.medew_gc_id = 100003 OR eu.medew_gc_id = 100003;

-- 3. Check de submitted entries voor urenper_gc_id 100436
SELECT 
    id,
    medew_gc_id,
    urenper_gc_id,
    datum,
    aantal,
    status,
    submitted_at
FROM time_entries_workflow
WHERE urenper_gc_id = 100436 
  AND status = 'SUBMITTED'
ORDER BY medew_gc_id, datum;

-- 4. Check de query die de backend gebruikt
-- Dit simuleert de backend query voor manager medew_gc_id 100003
SELECT 
    w.id,
    w.medew_gc_id,
    w.urenper_gc_id,
    w.datum,
    w.aantal,
    w.status
FROM time_entries_workflow w
WHERE w.urenper_gc_id = 100436
  AND w.status = 'SUBMITTED'
  AND w.medew_gc_id IN (
      SELECT u.medew_gc_id 
      FROM manager_assignments ma
      INNER JOIN users u ON ma.employee_id = u.id
      WHERE ma.manager_id = (SELECT id FROM users WHERE medew_gc_id = 100003 LIMIT 1)
        AND (ma.active_until IS NULL OR ma.active_until > CURRENT_DATE)
  )
ORDER BY w.submitted_at ASC;

-- 5. Als er geen resultaten zijn, voeg de manager assignment toe
-- UNCOMMENT DE VOLGENDE REGELS ALS JE DE FIX WILT TOEPASSEN:

-- INSERT INTO manager_assignments (manager_id, employee_id, active_from, active_until)
-- SELECT 
--     (SELECT id FROM users WHERE medew_gc_id = 100003 LIMIT 1),  -- manager_id (100003 is manager)
--     (SELECT id FROM users WHERE medew_gc_id = 100003 LIMIT 1),  -- employee_id (100003 bekijkt zijn eigen entries)
--     CURRENT_DATE,
--     NULL
-- WHERE NOT EXISTS (
--     SELECT 1 FROM manager_assignments
--     WHERE manager_id = (SELECT id FROM users WHERE medew_gc_id = 100003 LIMIT 1)
--       AND employee_id = (SELECT id FROM users WHERE medew_gc_id = 100003 LIMIT 1)
-- );

-- OF als 100003 de entries van ANDERE employees moet kunnen zien, voeg die toe:
-- Bijvoorbeeld als 100003 entries van 100073 moet goedkeuren:

-- INSERT INTO manager_assignments (manager_id, employee_id, active_from, active_until)
-- SELECT 
--     (SELECT id FROM users WHERE medew_gc_id = 100003 LIMIT 1),  -- manager
--     (SELECT id FROM users WHERE medew_gc_id = 100073 LIMIT 1),  -- employee
--     CURRENT_DATE,
--     NULL
-- WHERE NOT EXISTS (
--     SELECT 1 FROM manager_assignments
--     WHERE manager_id = (SELECT id FROM users WHERE medew_gc_id = 100003 LIMIT 1)
--       AND employee_id = (SELECT id FROM users WHERE medew_gc_id = 100073 LIMIT 1)
-- );
