-- Script om alle users.medew_gc_id te corrigeren
-- Gebaseerd op AT_GEBR data uit Firebird

-- Backup huidige state
CREATE TABLE IF NOT EXISTS users_backup_20260113 AS 
SELECT * FROM users;

-- Toon huidige state
SELECT 
    id,
    username,
    medew_gc_id as oude_id,
    first_name,
    last_name
FROM users
ORDER BY id;

-- Update alle users met correcte AT_GEBR.GC_ID waarden
BEGIN;

-- 1. Arno Sluimer: 100001 → 100023 (A.SLUIMER)
UPDATE users SET medew_gc_id = 100023, updated_at = CURRENT_TIMESTAMP 
WHERE username = 'a.sluimer';

-- 2. Engelbert Hansma: 100002 → 100002 (correct, geen wijziging)
-- UPDATE users SET medew_gc_id = 100002 WHERE username = 'e.hansma';

-- 3. Frank Lennaerts: 100003 → 100014 (F.LENNAERTS)
UPDATE users SET medew_gc_id = 100014, updated_at = CURRENT_TIMESTAMP 
WHERE username = 'f.lennaerts';

-- 4. Hilbert Teertstra: 100004 → 100025 (HILBERT.TEERTSTRA)
UPDATE users SET medew_gc_id = 100025, updated_at = CURRENT_TIMESTAMP 
WHERE username = 'h.teertstra';

-- 5. Han Beyleveldt: 100005 → 100005 (correct, geen wijziging)
-- UPDATE users SET medew_gc_id = 100005 WHERE username = 'h.beyleveldt';

-- 6. Jan Kraaij: 100006 → 100006 (correct, geen wijziging)
-- UPDATE users SET medew_gc_id = 100006 WHERE username = 'j.kraaij';

-- 7. Jolanda Bijen: 100007 → 100008 (J.BIJEN)
UPDATE users SET medew_gc_id = 100008, updated_at = CURRENT_TIMESTAMP 
WHERE username = 'j.bijen';

-- 8. Katel Rahakbauw: 100008 → 100015 (K.RAHAKBAUW)
UPDATE users SET medew_gc_id = 100015, updated_at = CURRENT_TIMESTAMP 
WHERE username = 'k.rahakbauw';

-- 9. Parsa Arefi Rad: 100009 → 100009 (correct, geen wijziging)
-- UPDATE users SET medew_gc_id = 100009 WHERE username = 'p.arefirad';

-- 10. Paul Kerkhoven: 100010 → 100013 (P.KERKHOVEN)
UPDATE users SET medew_gc_id = 100013, updated_at = CURRENT_TIMESTAMP 
WHERE username = 'p.kerkhoven';

-- 11. Rob van de Wetering: 100011 → 100024 (R.VDWETERING)
UPDATE users SET medew_gc_id = 100024, updated_at = CURRENT_TIMESTAMP 
WHERE username = 'r.vdwetering';

-- 12. Rob Wijtten: 100012 → 100005 (R.WIJTTEN)
UPDATE users SET medew_gc_id = 100005, updated_at = CURRENT_TIMESTAMP 
WHERE username = 'r.wijtten';

-- 13. Ron Kraaij: 100013 → 100016 (R.KRAAIJ - Ron)
UPDATE users SET medew_gc_id = 100016, updated_at = CURRENT_TIMESTAMP 
WHERE username = 'r.kraaij';

-- 14. Siegfried de Jong: 100014 → 100006 (S.DEJONG)
UPDATE users SET medew_gc_id = 100006, updated_at = CURRENT_TIMESTAMP 
WHERE username = 's.djong';

-- 15. Theo van Luijtelaar: 100015 → 100003 (T.LUIJTELAAR)
UPDATE users SET medew_gc_id = 100003, updated_at = CURRENT_TIMESTAMP 
WHERE username = 't.vluijtelaar';

-- Toon nieuwe state
SELECT 
    id,
    username,
    medew_gc_id as nieuwe_id,
    first_name,
    last_name,
    updated_at
FROM users
ORDER BY id;

-- Toon welke IDs zijn gewijzigd
SELECT 
    u.id,
    u.username,
    b.medew_gc_id as oud,
    u.medew_gc_id as nieuw,
    CASE 
        WHEN b.medew_gc_id != u.medew_gc_id THEN '✓ GEWIJZIGD'
        ELSE 'geen wijziging'
    END as status,
    u.first_name || ' ' || u.last_name as naam
FROM users u
LEFT JOIN users_backup_20260113 b ON u.id = b.id
ORDER BY u.id;

COMMIT;

-- Instructies na uitvoeren:
-- 1. Alle users moeten UITLOGGEN
-- 2. Opnieuw INLOGGEN zodat localStorage wordt bijgewerkt
-- 3. Check of uren nu bij de juiste gebruiker komen
