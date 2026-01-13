-- Query to check AT_GEBR to AT_MEDEW mapping
-- Run this in your Firebird database to understand the relationship

-- 1. Show all AT_GEBR user accounts (active only)
SELECT 
    'AT_GEBR' as SOURCE,
    GC_ID,
    GC_CODE,
    GC_OMSCHRIJVING,
    GEBR_GC_ID as PARENT_USER,
    SOORT as TYPE
FROM AT_GEBR
WHERE GC_HISTORISCH_JN = 'N'
ORDER BY GC_CODE;

-- 2. Show all AT_MEDEW employees (active only)
SELECT 
    'AT_MEDEW' as SOURCE,
    GC_ID,
    GC_CODE,
    GC_OMSCHRIJVING as NAME,
    ACTIEF_JN as ACTIVE
FROM AT_MEDEW
WHERE ACTIEF_JN = 'J'
ORDER BY GC_CODE;

-- 3. Try to match by code similarity
SELECT 
    g.GC_ID as GEBR_ID,
    g.GC_CODE as GEBR_CODE,
    g.GC_OMSCHRIJVING as GEBR_NAME,
    m.GC_ID as MEDEW_ID,
    m.GC_CODE as MEDEW_CODE,
    m.GC_OMSCHRIJVING as MEDEW_NAME
FROM AT_GEBR g
LEFT JOIN AT_MEDEW m ON (
    g.GC_CODE = m.GC_CODE 
    OR g.GC_OMSCHRIJVING CONTAINING m.GC_OMSCHRIJVING
    OR m.GC_OMSCHRIJVING CONTAINING g.GC_OMSCHRIJVING
)
WHERE g.GC_HISTORISCH_JN = 'N'
  AND (m.ACTIEF_JN = 'J' OR m.ACTIEF_JN IS NULL)
ORDER BY g.GC_CODE;

-- 4. Check AT_URENSTAT to see which MEDEW_GC_ID values are actually used
SELECT DISTINCT 
    s.MEDEW_GC_ID,
    m.GC_CODE as MEDEW_CODE,
    m.GC_OMSCHRIJVING as MEDEW_NAME,
    COUNT(*) as DOCUMENTS
FROM AT_URENSTAT s
LEFT JOIN AT_MEDEW m ON s.MEDEW_GC_ID = m.GC_ID
GROUP BY s.MEDEW_GC_ID, m.GC_CODE, m.GC_OMSCHRIJVING
ORDER BY s.MEDEW_GC_ID;

-- 5. Sample: Check specific users
-- Replace 100006 with the AT_GEBR.GC_ID you want to check
SELECT 
    'Checking AT_GEBR 100006 (S.DEJONG):' as INFO,
    g.GC_ID as GEBR_ID,
    g.GC_CODE as GEBR_CODE,
    g.GC_OMSCHRIJVING as GEBR_NAME
FROM AT_GEBR g
WHERE g.GC_ID = 100006;

-- Look for matching employee
SELECT 
    'Looking for matching AT_MEDEW:' as INFO,
    m.GC_ID as MEDEW_ID,
    m.GC_CODE as MEDEW_CODE,
    m.GC_OMSCHRIJVING as MEDEW_NAME
FROM AT_MEDEW m
WHERE m.GC_CODE CONTAINING 'DEJONG'
   OR m.GC_OMSCHRIJVING CONTAINING 'Siegfried'
   OR m.GC_OMSCHRIJVING CONTAINING 'de Jong';

-- 6. KEY INSIGHT: In many Atrium setups:
-- - AT_GEBR = Login accounts (can be shared, or have many sub-accounts)
-- - AT_MEDEW = Individual employees who perform work
-- - The link is often NOT a direct FK, but based on naming convention
-- - OR there's a custom field (check for fields like MEDEW_GC_ID in AT_GEBR)

-- 7. Check if AT_GEBR has any MEDEW reference fields:
-- (This query may fail if columns don't exist - that's expected)
-- Uncomment to test:
-- SELECT 
--     GC_ID,
--     GC_CODE,
--     GC_OMSCHRIJVING,
--     PRT_MEDEW_GC_ID,  -- Sometimes exists
--     MEDEW_GC_ID       -- Sometimes exists
-- FROM AT_GEBR
-- WHERE GC_HISTORISCH_JN = 'N'
-- ORDER BY GC_CODE;
