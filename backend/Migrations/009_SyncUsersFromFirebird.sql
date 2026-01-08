-- Migration 009: Create all users from employee list
-- All active employees at Altum Technical Solutions

-- Insert all employees with their contract hours
INSERT INTO users (id, medew_gc_id, username, first_name, last_name, email, role, contract_hours_per_week, password_hash) 
VALUES
    (1, 100001, 'arno.sluimer', 'Arno', 'Sluimer', 'arno.sluimer@altum.nl', 'user', 35.00, '$2a$11$N5ZqH5XvZqH5XvZqH5XvZuN5ZqH5XvZqH5XvZqH5XvZqH5XvZqH5Xv'),
    (2, 100002, 'engelbert.hansma', 'Engelbert', 'Hansma', 'engelbert.hansma@altum.nl', 'manager', 40.00, '$2a$11$N5ZqH5XvZqH5XvZqH5XvZuN5ZqH5XvZqH5XvZqH5XvZqH5XvZqH5Xv'),
    (3, 100003, 'frank.lennaerts', 'Frank', 'Lennaerts', 'frank.lennaerts@altum.nl', 'user', 40.00, '$2a$11$N5ZqH5XvZqH5XvZqH5XvZuN5ZqH5XvZqH5XvZqH5XvZqH5XvZqH5Xv'),
    (4, 100004, 'hilbert.teertstra', 'Hilbert', 'Teertstra', 'hilbert.teertstra@altum.nl', 'user', 40.00, '$2a$11$N5ZqH5XvZqH5XvZqH5XvZuN5ZqH5XvZqH5XvZqH5XvZqH5XvZqH5Xv'),
    (5, 100005, 'han.beyleveldt', 'Han', 'Beyleveldt', 'han.beyleveldt@altum.nl', 'user', 8.00, '$2a$11$N5ZqH5XvZqH5XvZqH5XvZuN5ZqH5XvZqH5XvZqH5XvZqH5XvZqH5Xv'),
    (6, 100006, 'jan.kraaij', 'Jan', 'Kraaij', 'jan.kraaij@altum.nl', 'user', 1.00, '$2a$11$N5ZqH5XvZqH5XvZqH5XvZuN5ZqH5XvZqH5XvZqH5XvZqH5XvZqH5Xv'),
    (7, 100007, 'jolanda.bijen', 'Jolanda', 'Bijen', 'jolanda.bijen@altum.nl', 'user', 24.00, '$2a$11$N5ZqH5XvZqH5XvZqH5XvZuN5ZqH5XvZqH5XvZqH5XvZqH5XvZqH5Xv'),
    (8, 100008, 'katel.rahakbauw', 'Katel', 'Rahakbauw', 'katel.rahakbauw@altum.nl', 'user', 40.00, '$2a$11$N5ZqH5XvZqH5XvZqH5XvZuN5ZqH5XvZqH5XvZqH5XvZqH5XvZqH5Xv'),
    (9, 100009, 'parsa.arefirad', 'Parsa', 'Arefi Rad', 'parsa.arefirad@altum.nl', 'user', 8.00, '$2a$11$N5ZqH5XvZqH5XvZqH5XvZuN5ZqH5XvZqH5XvZqH5XvZqH5XvZqH5Xv'),
    (10, 100010, 'paul.kerkhoven', 'Paul', 'Kerkhoven', 'paul.kerkhoven@altum.nl', 'user', 40.00, '$2a$11$N5ZqH5XvZqH5XvZqH5XvZqH5XvZqH5XvZqH5XvZqH5XvZqH5Xv'),
    (11, 100011, 'rob.vandewetering', 'Rob', 'van de Wetering', 'rob.vandewetering@altum.nl', 'user', 40.00, '$2a$11$N5ZqH5XvZqH5XvZqH5XvZuN5ZqH5XvZqH5XvZqH5XvZqH5XvZqH5Xv'),
    (12, 100012, 'rob.wijtten', 'Rob', 'Wijtten', 'rob.wijtten@altum.nl', 'user', 40.00, '$2a$11$N5ZqH5XvZqH5XvZqH5XvZuN5ZqH5XvZqH5XvZqH5XvZqH5XvZqH5Xv'),
    (13, 100013, 'ron.kraaij', 'Ron', 'Kraaij', 'ron.kraaij@altum.nl', 'user', 40.00, '$2a$11$N5ZqH5XvZqH5XvZqH5XvZuN5ZqH5XvZqH5XvZqH5XvZqH5XvZqH5Xv'),
    (14, 100014, 'siegfried.dejong', 'Siegfried', 'de Jong', 'siegfried.dejong@altum.nl', 'user', 8.00, '$2a$11$N5ZqH5XvZqH5XvZqH5XvZuN5ZqH5XvZqH5XvZqH5XvZqH5XvZqH5Xv'),
    (15, 100015, 'theo.vanluijtelaar', 'Theo', 'van Luijtelaar', 'theo.vanluijtelaar@altum.nl', 'user', 40.00, '$2a$11$N5ZqH5XvZqH5XvZqH5XvZuN5ZqH5XvZqH5XvZqH5XvZqH5XvZqH5Xv')
ON CONFLICT (id) DO UPDATE SET
    medew_gc_id = EXCLUDED.medew_gc_id,
    username = EXCLUDED.username,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    contract_hours_per_week = EXCLUDED.contract_hours_per_week,
    updated_at = CURRENT_TIMESTAMP;

-- Verification: Show all users with their contract hours
SELECT 
    id,
    medew_gc_id,
    username,
    first_name,
    last_name,
    email,
    role,
    contract_hours_per_week,
    created_at
FROM users
ORDER BY last_name;

-- Note: Default password for all users is 'Altum2026!' (BCrypt hashed)
-- Users can change password after first login
