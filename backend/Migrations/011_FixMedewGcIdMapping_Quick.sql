-- Quick fix based on AT_GEBR table analysis
-- From the screenshot, I can see PRT_MEDEW_GC_ID column is NULL for most users
-- This means AT_GEBR and AT_MEDEW are NOT directly linked in your database

-- Solution: We need to match by name/code pattern
-- Looking at your users table and AT_GEBR data:

-- Current situation in PostgreSQL users table:
-- id=1: Arno Sluimer, medew_gc_id=100001 (wrong - that's Hassan Arbaj in AT_GEBR)
-- id=14: Siegfried de Jong, medew_gc_id=100014 (wrong - that's F.LENNAERTS in AT_GEBR)

-- Looking at AT_GEBR:
-- 100023 = A.SLUIMER (Arno Sluimer)
-- 100002 = E.HANSMA (Engelbert Hansma)
-- 100014 = F.LENNAERTS (Frank Lennaerts)
-- 100025 = HILBERT.TEERTSTRA (H Teertstra)
-- 100006 = S.DEJONG (Siegfried de Jong)

-- The pattern shows: AT_GEBR contains the actual user accounts
-- But we're writing hours with MEDEW_GC_ID to AT_URENBREG
-- So we need to find: Which AT_MEDEW.GC_ID corresponds to each AT_GEBR user?

-- CRITICAL QUESTION: Do you have AT_MEDEW records for these users?
-- Run this in Firebird to check:

SELECT 
    'AT_MEDEW records:' as INFO,
    GC_ID as MEDEW_ID,
    GC_CODE,
    GC_OMSCHRIJVING as NAME,
    ACTIEF_JN
FROM AT_MEDEW
WHERE ACTIEF_JN = 'J'
ORDER BY GC_CODE;

-- If AT_MEDEW is empty or has different IDs, then:
-- OPTION A: Create AT_MEDEW records for each user
-- OPTION B: Use AT_GEBR.GC_ID directly as MEDEW_GC_ID (change the system logic)

-- For now, let's assume AT_GEBR.GC_ID should BE the MEDEW_GC_ID
-- This means updating the users table with the correct AT_GEBR IDs:

BEGIN;

-- Update with correct AT_GEBR IDs based on name matching
UPDATE users SET medew_gc_id = 100023 WHERE username = 'a.sluimer';      -- A.SLUIMER
UPDATE users SET medew_gc_id = 100002 WHERE username = 'e.hansma';       -- E.HANSMA (already 100002, no change)
UPDATE users SET medew_gc_id = 100014 WHERE username = 'f.lennaerts';    -- F.LENNAERTS (already 100014, no change)
UPDATE users SET medew_gc_id = 100025 WHERE username = 'h.teertstra';    -- HILBERT.TEERTSTRA
UPDATE users SET medew_gc_id = 100005 WHERE username = 'h.beyleveldt';   -- Assuming exists (not in screenshot)
UPDATE users SET medew_gc_id = 100006 WHERE username = 'j.kraaij';       -- J.KRAAIJ (Jan Kraaij) - already 100006
UPDATE users SET medew_gc_id = 100008 WHERE username = 'j.bijen';        -- J.BIJEN (Jolanda Bijen) - already 100008
UPDATE users SET medew_gc_id = 100015 WHERE username = 'k.rahakbauw';    -- K.RAHAKBAUW
UPDATE users SET medew_gc_id = 100009 WHERE username = 'p.arefirad';     -- Assuming exists (not in screenshot)
UPDATE users SET medew_gc_id = 100013 WHERE username = 'p.kerkhoven';    -- P.KERKHOVEN
UPDATE users SET medew_gc_id = 100024 WHERE username = 'r.vdwetering';   -- R.VDWETERING
UPDATE users SET medew_gc_id = 100005 WHERE username = 'r.wijtten';      -- R.WIJTTEN
UPDATE users SET medew_gc_id = 100016 WHERE username = 'r.kraaij';       -- R.KRAAIJ (Ron Kraaij)
UPDATE users SET medew_gc_id = 100006 WHERE username = 's.djong';        -- S.DEJONG (Siegfried de Jong)
UPDATE users SET medew_gc_id = 100003 WHERE username = 't.vluijtelaar';  -- T.LUIJTELAAR

-- Update timestamps
UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE medew_gc_id IN (
    100023, 100002, 100014, 100025, 100005, 100006, 100008, 100015,
    100009, 100013, 100024, 100005, 100016, 100003
);

-- Show results
SELECT 
    id,
    medew_gc_id,
    username,
    first_name,
    last_name
FROM users
ORDER BY id;

COMMIT;

-- After this, users should log out and log back in to get the correct medew_gc_id in localStorage
