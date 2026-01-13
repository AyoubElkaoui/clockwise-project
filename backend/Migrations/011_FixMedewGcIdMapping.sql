-- Migration 011: Fix medew_gc_id mapping
-- Problem: users.medew_gc_id currently contains AT_GEBR.GC_ID (user account IDs)
-- Solution: Update to use AT_MEDEW.GC_ID (employee IDs)

-- Step 1: Check current state
SELECT 
    id,
    medew_gc_id as current_gebr_id,
    username,
    first_name,
    last_name
FROM users
ORDER BY id;

-- Step 2: Manual mapping based on AT_GEBR table analysis
-- From the AT_GEBR data, we need to find the correct AT_MEDEW.GC_ID for each user
-- This assumes AT_MEDEW has similar structure to what we saw in seed.sql

-- IMPORTANT: You need to run this query in Firebird first to get the correct mapping:
/*
SELECT 
    g.GC_ID as GEBR_ID,
    g.GC_CODE,
    g.GC_OMSCHRIJVING,
    g.PRT_MEDEW_GC_ID,
    m.GC_ID as MEDEW_ID,
    m.GC_CODE as MEDEW_CODE,
    m.GC_OMSCHRIJVING as MEDEW_NAME
FROM AT_GEBR g
LEFT JOIN AT_MEDEW m ON g.PRT_MEDEW_GC_ID = m.GC_ID
WHERE g.GC_HISTORISCH_JN = 'N'
ORDER BY g.GC_CODE;
*/

-- Step 3: Create temporary mapping table
CREATE TEMP TABLE IF NOT EXISTS user_id_mapping (
    username VARCHAR(100),
    old_gebr_id INTEGER,
    correct_medew_id INTEGER
);

-- Step 4: Insert known mappings
-- YOU MUST UPDATE THESE VALUES based on your Firebird AT_MEDEW table!
-- The values below are PLACEHOLDERS - run the diagnostic query first!

INSERT INTO user_id_mapping VALUES ('a.sluimer', 100001, NULL);      -- Update with correct AT_MEDEW.GC_ID
INSERT INTO user_id_mapping VALUES ('e.hansma', 100002, NULL);       -- Update with correct AT_MEDEW.GC_ID
INSERT INTO user_id_mapping VALUES ('f.lennaerts', 100003, NULL);    -- Update with correct AT_MEDEW.GC_ID
INSERT INTO user_id_mapping VALUES ('h.teertstra', 100004, NULL);    -- Update with correct AT_MEDEW.GC_ID
INSERT INTO user_id_mapping VALUES ('h.beyleveldt', 100005, NULL);   -- Update with correct AT_MEDEW.GC_ID
INSERT INTO user_id_mapping VALUES ('j.kraaij', 100006, NULL);       -- Update with correct AT_MEDEW.GC_ID
INSERT INTO user_id_mapping VALUES ('j.bijen', 100007, NULL);        -- Update with correct AT_MEDEW.GC_ID
INSERT INTO user_id_mapping VALUES ('k.rahakbauw', 100008, NULL);    -- Update with correct AT_MEDEW.GC_ID
INSERT INTO user_id_mapping VALUES ('p.arefirad', 100009, NULL);     -- Update with correct AT_MEDEW.GC_ID
INSERT INTO user_id_mapping VALUES ('p.kerkhoven', 100010, NULL);    -- Update with correct AT_MEDEW.GC_ID
INSERT INTO user_id_mapping VALUES ('r.vdwetering', 100011, NULL);   -- Update with correct AT_MEDEW.GC_ID
INSERT INTO user_id_mapping VALUES ('r.wijtten', 100012, NULL);      -- Update with correct AT_MEDEW.GC_ID
INSERT INTO user_id_mapping VALUES ('r.kraaij', 100013, NULL);       -- Update with correct AT_MEDEW.GC_ID
INSERT INTO user_id_mapping VALUES ('s.djong', 100014, NULL);        -- Update with correct AT_MEDEW.GC_ID
INSERT INTO user_id_mapping VALUES ('t.vluijtelaar', 100015, NULL);  -- Update with correct AT_MEDEW.GC_ID

-- Step 5: Show what will be updated
SELECT 
    u.id,
    u.username,
    u.medew_gc_id as current_wrong_id,
    m.correct_medew_id as new_correct_id,
    CASE 
        WHEN m.correct_medew_id IS NULL THEN 'NEEDS MANUAL LOOKUP'
        WHEN u.medew_gc_id = m.correct_medew_id THEN 'OK - NO CHANGE'
        ELSE 'WILL UPDATE'
    END as action
FROM users u
LEFT JOIN user_id_mapping m ON u.username = m.username
ORDER BY u.id;

-- Step 6: UNCOMMENT THIS AFTER FILLING IN CORRECT VALUES ABOVE
-- Update users table with correct AT_MEDEW IDs
/*
UPDATE users u
SET 
    medew_gc_id = m.correct_medew_id,
    updated_at = CURRENT_TIMESTAMP
FROM user_id_mapping m
WHERE u.username = m.username
  AND m.correct_medew_id IS NOT NULL
  AND u.medew_gc_id != m.correct_medew_id;
*/

-- Step 7: Verify the changes
SELECT 
    id,
    medew_gc_id as new_medew_id,
    username,
    first_name,
    last_name,
    updated_at
FROM users
ORDER BY id;

-- Clean up
DROP TABLE IF EXISTS user_id_mapping;
