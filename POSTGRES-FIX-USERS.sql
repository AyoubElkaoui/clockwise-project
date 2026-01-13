-- PostgreSQL script om users.medew_gc_id te corrigeren
-- Voer dit uit in Supabase SQL Editor

-- Stap 1: Toon huidige situatie
SELECT 
    id,
    username,
    medew_gc_id as huidig_verkeerd_id,
    first_name,
    last_name
FROM users
ORDER BY id;

-- Stap 2: Maak backup (optioneel maar aanbevolen)
CREATE TABLE IF NOT EXISTS users_backup_20260113 AS 
SELECT * FROM users;

-- Stap 3: Voer alle correcties uit (in twee stappen om conflicten te voorkomen)
BEGIN;

-- STAP A: Verplaats ALLE users naar tijdelijke negatieve IDs
UPDATE users SET medew_gc_id = -1, updated_at = CURRENT_TIMESTAMP WHERE username = 'a.sluimer';      -- id=1
UPDATE users SET medew_gc_id = -2, updated_at = CURRENT_TIMESTAMP WHERE username = 'e.hansma';       -- id=2
UPDATE users SET medew_gc_id = -3, updated_at = CURRENT_TIMESTAMP WHERE username = 'f.lennaerts';    -- id=3
UPDATE users SET medew_gc_id = -4, updated_at = CURRENT_TIMESTAMP WHERE username = 'h.teertstra';    -- id=4
UPDATE users SET medew_gc_id = -5, updated_at = CURRENT_TIMESTAMP WHERE username = 'h.beyleveldt';   -- id=5
UPDATE users SET medew_gc_id = -6, updated_at = CURRENT_TIMESTAMP WHERE username = 'j.kraaij';       -- id=6
UPDATE users SET medew_gc_id = -7, updated_at = CURRENT_TIMESTAMP WHERE username = 'j.bijen';        -- id=7
UPDATE users SET medew_gc_id = -8, updated_at = CURRENT_TIMESTAMP WHERE username = 'k.rahakbauw';    -- id=8
UPDATE users SET medew_gc_id = -9, updated_at = CURRENT_TIMESTAMP WHERE username = 'p.arefirad';     -- id=9
UPDATE users SET medew_gc_id = -10, updated_at = CURRENT_TIMESTAMP WHERE username = 'p.kerkhoven';   -- id=10
UPDATE users SET medew_gc_id = -11, updated_at = CURRENT_TIMESTAMP WHERE username = 'r.vdwetering';  -- id=11
UPDATE users SET medew_gc_id = -12, updated_at = CURRENT_TIMESTAMP WHERE username = 'r.wijtten';     -- id=12
UPDATE users SET medew_gc_id = -13, updated_at = CURRENT_TIMESTAMP WHERE username = 'r.kraaij';      -- id=13
UPDATE users SET medew_gc_id = -14, updated_at = CURRENT_TIMESTAMP WHERE username = 's.djong';       -- id=14
UPDATE users SET medew_gc_id = -15, updated_at = CURRENT_TIMESTAMP WHERE username = 't.vluijtelaar'; -- id=15

-- STAP B: Verplaats naar correcte IDs op basis van AT_MEDEW tabel
UPDATE users SET medew_gc_id = 100073, updated_at = CURRENT_TIMESTAMP WHERE username = 'a.sluimer';      -- Arno Sluimer (ALTE022)
UPDATE users SET medew_gc_id = 100003, updated_at = CURRENT_TIMESTAMP WHERE username = 'e.hansma';       -- Engelbert Hansma (ALTE002)
UPDATE users SET medew_gc_id = 100048, updated_at = CURRENT_TIMESTAMP WHERE username = 'f.lennaerts';    -- Frank Lennaerts (ALTE015)
UPDATE users SET medew_gc_id = 100074, updated_at = CURRENT_TIMESTAMP WHERE username = 'h.teertstra';    -- Hilbert Teertstra (ALTE023)
UPDATE users SET medew_gc_id = 100064, updated_at = CURRENT_TIMESTAMP WHERE username = 'h.beyleveldt';   -- Han Beyleveldt (ALTEZ001)
UPDATE users SET medew_gc_id = 100040, updated_at = CURRENT_TIMESTAMP WHERE username = 'j.kraaij';       -- Jan Kraaij (GC_ID 100040)
UPDATE users SET medew_gc_id = 100021, updated_at = CURRENT_TIMESTAMP WHERE username = 'j.bijen';        -- Jolanda Bijen (ALTE007)
UPDATE users SET medew_gc_id = 100050, updated_at = CURRENT_TIMESTAMP WHERE username = 'k.rahakbauw';    -- Katel Rahakbauw (ALTE017)
UPDATE users SET medew_gc_id = 100081, updated_at = CURRENT_TIMESTAMP WHERE username = 'p.arefirad';     -- Parsa Arefi Rad (ALTE032)
UPDATE users SET medew_gc_id = 100043, updated_at = CURRENT_TIMESTAMP WHERE username = 'p.kerkhoven';    -- Paul Kerkhoven (ALTE014)
UPDATE users SET medew_gc_id = 100076, updated_at = CURRENT_TIMESTAMP WHERE username = 'r.vdwetering';   -- Rob van de Wetering (ALTE024)
UPDATE users SET medew_gc_id = 100015, updated_at = CURRENT_TIMESTAMP WHERE username = 'r.wijtten';      -- Rob Wijtten (ALTE005)
UPDATE users SET medew_gc_id = 100049, updated_at = CURRENT_TIMESTAMP WHERE username = 'r.kraaij';       -- Ron Kraaij (ALTE016)
UPDATE users SET medew_gc_id = 100020, updated_at = CURRENT_TIMESTAMP WHERE username = 's.djong';        -- Siegfried de Jong (ALTE006)
UPDATE users SET medew_gc_id = 100008, updated_at = CURRENT_TIMESTAMP WHERE username = 't.vluijtelaar';  -- Theo van Luijtelaar (ALTE003)

-- STAP C: Corrigeer allowed_tasks voor alle users
UPDATE users SET allowed_tasks = 'TEKENKAMER_ONLY', updated_at = CURRENT_TIMESTAMP WHERE username = 'a.sluimer';      -- Arno
UPDATE users SET allowed_tasks = 'TEKENKAMER_ONLY', updated_at = CURRENT_TIMESTAMP WHERE username = 'e.hansma';       -- Engelbert
UPDATE users SET allowed_tasks = 'TEKENKAMER_ONLY', updated_at = CURRENT_TIMESTAMP WHERE username = 'f.lennaerts';    -- Frank
UPDATE users SET allowed_tasks = 'TEKENKAMER_ONLY', updated_at = CURRENT_TIMESTAMP WHERE username = 'h.beyleveldt';   -- Han
UPDATE users SET allowed_tasks = 'TEKENKAMER_ONLY', updated_at = CURRENT_TIMESTAMP WHERE username = 'j.bijen';        -- Jolanda
UPDATE users SET allowed_tasks = 'TEKENKAMER_ONLY', updated_at = CURRENT_TIMESTAMP WHERE username = 'p.arefirad';     -- Parsa
UPDATE users SET allowed_tasks = 'TEKENKAMER_ONLY', updated_at = CURRENT_TIMESTAMP WHERE username = 'p.kerkhoven';    -- Paul
UPDATE users SET allowed_tasks = 'TEKENKAMER_ONLY', updated_at = CURRENT_TIMESTAMP WHERE username = 'r.vdwetering';   -- Rob vd Wetering
UPDATE users SET allowed_tasks = 'TEKENKAMER_ONLY', updated_at = CURRENT_TIMESTAMP WHERE username = 'r.wijtten';      -- Rob Wijtten
UPDATE users SET allowed_tasks = 'TEKENKAMER_ONLY', updated_at = CURRENT_TIMESTAMP WHERE username = 's.djong';        -- Siegfried

UPDATE users SET allowed_tasks = 'BOTH', updated_at = CURRENT_TIMESTAMP WHERE username = 't.vluijtelaar';  -- Theo
UPDATE users SET allowed_tasks = 'BOTH', updated_at = CURRENT_TIMESTAMP WHERE username = 'k.rahakbauw';    -- Katel
UPDATE users SET allowed_tasks = 'BOTH', updated_at = CURRENT_TIMESTAMP WHERE username = 'h.teertstra';    -- Hilbert

UPDATE users SET allowed_tasks = 'MONTAGE_ONLY', updated_at = CURRENT_TIMESTAMP WHERE username = 'j.kraaij';  -- Jan
UPDATE users SET allowed_tasks = 'MONTAGE_ONLY', updated_at = CURRENT_TIMESTAMP WHERE username = 'r.kraaij';  -- Ron Kraaij

COMMIT;

-- Stap 4: Verificatie - toon resultaat
SELECT 
    id,
    username,
    medew_gc_id as nieuw_gecorrigeerd_id,
    first_name || ' ' || last_name as naam,
    updated_at
FROM users
ORDER BY id;

-- Stap 5: Toon vergelijking oud vs nieuw
SELECT 
    u.id,
    u.username,
    b.medew_gc_id as oud_id,
    u.medew_gc_id as nieuw_id,
    CASE 
        WHEN b.medew_gc_id != u.medew_gc_id THEN '✓ GEWIJZIGD'
        ELSE '  geen wijziging'
    END as status,
    u.first_name || ' ' || u.last_name as naam
FROM users u
LEFT JOIN users_backup_20260113 b ON u.id = b.id
ORDER BY u.id;

-- KLAAR!
-- BELANGRIJK: Alle users moeten nu UITLOGGEN en OPNIEUW INLOGGEN
