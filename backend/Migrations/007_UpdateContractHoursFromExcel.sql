-- Migration 007: Update contract hours per week from Excel data
-- Based on Excel row 32: Contract uren/week

-- Update contract hours for all employees based on Excel data
-- Format: UPDATE users SET contract_hours_per_week = XX WHERE id = (SELECT id FROM users WHERE name = 'Name');

-- Arno Sluimer: 35
UPDATE users SET contract_hours_per_week = 35 WHERE LOWER(first_name || ' ' || last_name) LIKE '%arno%sluimer%';

-- Engelbert Hansma: 40
UPDATE users SET contract_hours_per_week = 40 WHERE LOWER(first_name || ' ' || last_name) LIKE '%engelbert%hansma%';

-- Frank Lennaerts: 40
UPDATE users SET contract_hours_per_week = 40 WHERE LOWER(first_name || ' ' || last_name) LIKE '%frank%lennaert%';

-- Hilbert Teerstra: 40
UPDATE users SET contract_hours_per_week = 40 WHERE LOWER(first_name || ' ' || last_name) LIKE '%hilbert%teerstra%';

-- Han Beyleveldt: 8
UPDATE users SET contract_hours_per_week = 8 WHERE LOWER(first_name || ' ' || last_name) LIKE '%han%beyleveldt%';

-- Jan Kraaij: 1
UPDATE users SET contract_hours_per_week = 1 WHERE LOWER(first_name || ' ' || last_name) LIKE '%jan%kraaij%';

-- Jolanda Bijen: 24
UPDATE users SET contract_hours_per_week = 24 WHERE LOWER(first_name || ' ' || last_name) LIKE '%jolanda%bijen%';

-- Katel Rahabbauw: 40
UPDATE users SET contract_hours_per_week = 40 WHERE LOWER(first_name || ' ' || last_name) LIKE '%katel%rahab%';

-- Parsa Arefi Rad: 8
UPDATE users SET contract_hours_per_week = 8 WHERE LOWER(first_name || ' ' || last_name) LIKE '%parsa%arefi%';

-- Paul Kerkhoven: 40
UPDATE users SET contract_hours_per_week = 40 WHERE LOWER(first_name || ' ' || last_name) LIKE '%paul%kerkhoven%';

-- Rob van de Wetering: 40
UPDATE users SET contract_hours_per_week = 40 WHERE LOWER(first_name || ' ' || last_name) LIKE '%rob%wetering%';

-- Rob Wijtten: 40
UPDATE users SET contract_hours_per_week = 40 WHERE LOWER(first_name || ' ' || last_name) LIKE '%rob%wijtten%';

-- Ron Kraaij: 40
UPDATE users SET contract_hours_per_week = 40 WHERE LOWER(first_name || ' ' || last_name) LIKE '%ron%kraaij%';

-- Siegfried de Jong: 8
UPDATE users SET contract_hours_per_week = 8 WHERE LOWER(first_name || ' ' || last_name) LIKE '%siegfried%jong%';

-- Theo van Luijtelaar: 40
UPDATE users SET contract_hours_per_week = 40 WHERE LOWER(first_name || ' ' || last_name) LIKE '%theo%luijtelaar%';

-- Verification: Show all updated contract hours
SELECT id, first_name, last_name, contract_hours_per_week 
FROM users 
ORDER BY contract_hours_per_week DESC, last_name;
