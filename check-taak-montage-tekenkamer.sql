-- SQL Script om te begrijpen hoe Montage en Tekenkamer uren worden geschreven
-- Gebruik dit in DBeaver

-- 1. Bekijk AT_TAAK codes 30 en 40 (de nieuwe codes)
SELECT 
    GC_ID,
    GC_CODE,
    GC_OMSCHRIJVING,
    GC_HISTORISCH_JN
FROM AT_TAAK
WHERE GC_CODE IN ('30', '40')
ORDER BY GC_CODE;

-- 2. Bekijk recente Montage uren (TAAK 30)
SELECT FIRST 20
    u.GC_ID,
    u.DOCUMENT_GC_ID,
    u.GC_REGEL_NR,
    u.DATUM,
    u.AANTAL,
    u.TAAK_GC_ID,
    t.GC_CODE as TAAK_CODE,
    u.WERK_GC_ID,
    w.GC_CODE as WERK_CODE,
    w.GC_OMSCHRIJVING as WERK_OMSCHRIJVING,
    u.KOSTSRT_GC_ID,
    k.GC_CODE as KOSTSRT_CODE
FROM AT_URENBREG u
LEFT JOIN AT_TAAK t ON u.TAAK_GC_ID = t.GC_ID
LEFT JOIN AT_WERK w ON u.WERK_GC_ID = w.GC_ID
LEFT JOIN AT_KOSTSRT k ON u.KOSTSRT_GC_ID = k.GC_ID
WHERE t.GC_CODE = '30'  -- Montage
AND u.DATUM >= '2025-01-01'
ORDER BY u.DATUM DESC;

-- 3. Bekijk recente Tekenkamer uren (TAAK 40)
SELECT FIRST 20
    u.GC_ID,
    u.DOCUMENT_GC_ID,
    u.GC_REGEL_NR,
    u.DATUM,
    u.AANTAL,
    u.TAAK_GC_ID,
    t.GC_CODE as TAAK_CODE,
    u.WERK_GC_ID,
    w.GC_CODE as WERK_CODE,
    w.GC_OMSCHRIJVING as WERK_OMSCHRIJVING,
    u.KOSTSRT_GC_ID,
    k.GC_CODE as KOSTSRT_CODE
FROM AT_URENBREG u
LEFT JOIN AT_TAAK t ON u.TAAK_GC_ID = t.GC_ID
LEFT JOIN AT_WERK w ON u.WERK_GC_ID = w.GC_ID
LEFT JOIN AT_KOSTSRT k ON u.KOSTSRT_GC_ID = k.GC_ID
WHERE t.GC_CODE = '40'  -- Tekenkamer
AND u.DATUM >= '2025-01-01'
ORDER BY u.DATUM DESC;

-- 4. Bekijk welke projecten (WERK) het meest gebruikt worden voor Montage
SELECT 
    w.GC_ID as WERK_GC_ID,
    w.GC_CODE as WERK_CODE,
    w.GC_OMSCHRIJVING as WERK_OMSCHRIJVING,
    COUNT(*) as AANTAL_REGISTRATIES
FROM AT_URENBREG u
INNER JOIN AT_TAAK t ON u.TAAK_GC_ID = t.GC_ID
INNER JOIN AT_WERK w ON u.WERK_GC_ID = w.GC_ID
WHERE t.GC_CODE = '30'  -- Montage
AND u.DATUM >= '2024-01-01'
GROUP BY w.GC_ID, w.GC_CODE, w.GC_OMSCHRIJVING
ORDER BY COUNT(*) DESC;

-- 5. Bekijk welke projecten (WERK) het meest gebruikt worden voor Tekenkamer
SELECT 
    w.GC_ID as WERK_GC_ID,
    w.GC_CODE as WERK_CODE,
    w.GC_OMSCHRIJVING as WERK_OMSCHRIJVING,
    COUNT(*) as AANTAL_REGISTRATIES
FROM AT_URENBREG u
INNER JOIN AT_TAAK t ON u.TAAK_GC_ID = t.GC_ID
INNER JOIN AT_WERK w ON u.WERK_GC_ID = w.GC_ID
WHERE t.GC_CODE = '40'  -- Tekenkamer
AND u.DATUM >= '2024-01-01'
GROUP BY w.GC_ID, w.GC_CODE, w.GC_OMSCHRIJVING
ORDER BY COUNT(*) DESC;

-- 6. Controleer KOSTSRT 5569 (Reis en verblijfskosten)
SELECT 
    GC_ID,
    GC_CODE,
    GC_OMSCHRIJVING,
    GC_HISTORISCH_JN,
    CATEGORIE,
    TYPE_KOSTENSOORT
FROM AT_KOSTSRT
WHERE GC_CODE = '5569';

-- 7. Bekijk hoe medewerkers gekoppeld zijn aan Montage vs Tekenkamer
-- Zoek in AT_MEDEW of er een veld is dat aangeeft of iemand montage of tekenkamer is
SELECT FIRST 10 * FROM AT_MEDEW;
