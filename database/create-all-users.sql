-- Create all users with format voorletter.achternaam
-- Password for all: Altum2026!
-- Hash: $2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq

-- Clear existing users first (except admin if exists)
DELETE FROM users WHERE username != 'admin';

-- Insert all employees as users
INSERT INTO users (medew_gc_id, username, email, password_hash, role, first_name, last_name, created_at, updated_at)
VALUES
-- Format: voorletter.achternaam (lowercase)
(100026, 'accountant', 'accountant@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Accountant', '', NOW(), NOW()),
(100002, 'h.arbaj', 'h.arbaj@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Arbaj', 'H', NOW(), NOW()),
(100066, 'y.atibi', 'y.atibi@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Atibi', 'Y', NOW(), NOW()),
(100070, 'b.claasen', 'b.claasen@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'manager', 'Bas', 'Claasen', NOW(), NOW()),
(100064, 'h.beyleveldt', 'h.beyleveldt@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Beyleveldt', 'H', NOW(), NOW()),
(100021, 'j.bijen', 'j.bijen@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Bijen', 'J.A.C.', NOW(), NOW()),
(100058, 'boers', 'boers@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Boers', '', NOW(), NOW()),
(100030, 'r.boom', 'r.boom@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Boom', 'R vander', NOW(), NOW()),
(100032, 's.bos', 's.bos@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Bos', 'S', NOW(), NOW()),
(100014, 'c.cappellen', 'c.cappellen@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Cappellen', 'C van', NOW(), NOW()),
(100071, 'a.chouk', 'a.chouk@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Chouk', 'A', NOW(), NOW()),
(100031, 'c.coenmans', 'c.coenmans@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Coenmans', 'C', NOW(), NOW()),
(100042, 'r.damrie', 'r.damrie@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Damrie', 'R', NOW(), NOW()),
(100063, 't.dieder', 't.dieder@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Dieder', 'Tim', NOW(), NOW()),
(100041, 'm.doorn', 'm.doorn@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Doorn', 'M', NOW(), NOW()),
(100010, 's.elmargai', 's.elmargai@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Elmargai', 'S.', NOW(), NOW()),
(100003, 'e.hansma', 'e.hansma@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Hansma', 'ing. E.', NOW(), NOW()),
(100005, 'e.hermsen', 'e.hermsen@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Hermsen', 'E', NOW(), NOW()),
(100065, 'm.hilhorst', 'm.hilhorst@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Hilhorst', 'M', NOW(), NOW()),
(100011, 'e.hoogendoorn', 'e.hoogendoorn@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Hoogendoorn', 'E.M.', NOW(), NOW()),
(100006, 'f.jacco', 'f.jacco@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Jacco', 'F.C.J. de', NOW(), NOW()),
(100075, 'b.joosten', 'b.joosten@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Joosten', 'B', NOW(), NOW()),
(100043, 'p.kerkhoven', 'p.kerkhoven@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Kerkhoven', 'P', NOW(), NOW()),
(100024, 'j.kraaij', 'j.kraaij@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Kraaij', 'J', NOW(), NOW()),
(100049, 'r.kraaij', 'r.kraaij@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Kraaij', 'R.', NOW(), NOW()),
(100037, 'm.lachhab', 'm.lachhab@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Lachhab', 'M.', NOW(), NOW()),
(100033, 's.leeuwen', 's.leeuwen@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Leeuwen', 'S van', NOW(), NOW()),
(100048, 'f.lennaerts', 'f.lennaerts@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Lennaerts', 'F.R.', NOW(), NOW()),
(100007, 't.luijtelaar', 't.luijtelaar@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Luijtelaar', 'T van', NOW(), NOW()),
(100036, 'o.margai', 'o.margai@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Margai', 'O. el', NOW(), NOW()),
(100019, 'd.molenaar', 'd.molenaar@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Molenaar', 'D', NOW(), NOW()),
(100059, 'd.nieuwland', 'd.nieuwland@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Nieuwland', 'D', NOW(), NOW()),
(100054, 'i.pacuretu', 'i.pacuretu@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Pacuretu', 'I', NOW(), NOW()),
(100053, 'a.paraschiv', 'a.paraschiv@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Paraschiv', 'A', NOW(), NOW()),
(100081, 'a.parsa', 'a.parsa@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Parsa', 'Amirparsa', NOW(), NOW()),
(100050, 'k.rahakbauw', 'k.rahakbauw@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Rahakbauw', 'K.J.E.', NOW(), NOW()),
(100061, 'r.rodriguez', 'r.rodriguez@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Rodriguez', 'Romero A', NOW(), NOW()),
(100056, 'b.schaffelaar', 'b.schaffelaar@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Schaffelaar', 'B', NOW(), NOW()),
(100038, 's.shangul', 's.shangul@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Shangul', 'S', NOW(), NOW()),
(100073, 'a.sluimer', 'a.sluimer@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Sluimer', 'A', NOW(), NOW()),
(100029, 'l.smink', 'l.smink@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Smink', 'L', NOW(), NOW()),
(100016, 'j.spoor', 'j.spoor@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Spoor', 'J', NOW(), NOW()),
(100001, 'admin', 'admin@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'manager', 'Syntess', 'consultant', NOW(), NOW()),
(100057, 'h.teerstra', 'h.teerstra@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Teerstra', 'HJ', NOW(), NOW()),
(100074, 'h.teertstra', 'h.teertstra@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Teertstra', 'H', NOW(), NOW()),
(100060, 'g.tiemersma', 'g.tiemersma@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Tiemersma', 'g', NOW(), NOW()),
(100035, 'a.torny', 'a.torny@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Torny', 'A', NOW(), NOW()),
(100034, 'h.veen', 'h.veen@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Veen', 'H van', NOW(), NOW()),
(100039, 'b.voorneveld', 'b.voorneveld@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Voorneveld', 'B', NOW(), NOW()),
(100012, 'r.vugt', 'r.vugt@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Vugt', 'R van', NOW(), NOW()),
(100013, 'h.vuurst', 'h.vuurst@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Vuurst', 'H van der', NOW(), NOW()),
(100015, 'r.wijtten', 'r.wijtten@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Wijtten', 'ing. R.W.', NOW(), NOW()),
(100080, 'l.ynema', 'l.ynema@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Ynema', 'L', NOW(), NOW()),
(100072, 'r.zoetebier', 'r.zoetebier@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Zoetebier', 'R', NOW(), NOW()),
(100020, 's.jong', 's.jong@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'de Jong', 'S.', NOW(), NOW()),
(100045, 'r.vries', 'r.vries@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'de Vries', 'R.', NOW(), NOW()),
(100046, 'receptie', 'receptie@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'receptie', '', NOW(), NOW()),
(100051, 'j.berkmortel', 'j.berkmortel@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'van Berkmortel', 'J', NOW(), NOW()),
(100079, 'h.wieren', 'h.wieren@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'van Wieren', 'H', NOW(), NOW()),
(100078, 'e.hoef', 'e.hoef@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'van de Hoef', 'E', NOW(), NOW()),
(100062, 'r.kamp', 'r.kamp@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'van de Kamp', 'Robbert', NOW(), NOW()),
(100076, 'r.wetering', 'r.wetering@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'van de Wetering', 'R', NOW(), NOW()),
(100017, 'o.heuvel', 'o.heuvel@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'van den Heuvel', 'O', NOW(), NOW()),
(100027, 'h.belt', 'h.belt@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'van der Belt', 'H', NOW(), NOW()),
(100018, 'a.burgh', 'a.burgh@clockwise.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'van der Burgh', 'ing. A', NOW(), NOW())
ON CONFLICT (medew_gc_id) DO UPDATE SET
  username = EXCLUDED.username,
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();

-- Verify
SELECT COUNT(*) as total_users, COUNT(CASE WHEN role = 'manager' THEN 1 END) as managers
FROM users;
