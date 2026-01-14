-- Create all users with format voorletter.achternaam
-- Password for all: Altum2026!
-- Hash: $2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq

-- Clear existing users first (except admin if exists)
DELETE FROM users WHERE username != 'admin';

-- Insert all employees as users
INSERT INTO users (medew_gc_id, username, email, password_hash, role, first_name, last_name, created_at, updated_at)
VALUES
-- Format: voorletter.achternaam (lowercase)
(100026, 'accountant', 'accountant@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Accountant', '', NOW(), NOW()),
(100002, 'h.arbaj', 'h.arbaj@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Arbaj', 'H', NOW(), NOW()),
(100066, 'y.atibi', 'y.atibi@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Atibi', 'Y', NOW(), NOW()),
(100070, 'b.claasen', 'b.claasen@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'manager', 'Bas', 'Claasen', NOW(), NOW()),
(100064, 'h.beyleveldt', 'h.beyleveldt@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Beyleveldt', 'H', NOW(), NOW()),
(100021, 'j.bijen', 'j.bijen@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Bijen', 'J.A.C.', NOW(), NOW()),
(100058, 'boers', 'boers@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Boers', '', NOW(), NOW()),
(100030, 'r.boom', 'r.boom@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Boom', 'R vander', NOW(), NOW()),
(100032, 's.bos', 's.bos@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Bos', 'S', NOW(), NOW()),
(100014, 'c.cappellen', 'c.cappellen@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Cappellen', 'C van', NOW(), NOW()),
(100071, 'a.chouk', 'a.chouk@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Chouk', 'A', NOW(), NOW()),
(100031, 'c.coenmans', 'c.coenmans@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Coenmans', 'C', NOW(), NOW()),
(100042, 'r.damrie', 'r.damrie@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Damrie', 'R', NOW(), NOW()),
(100063, 't.dieder', 't.dieder@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Dieder', 'Tim', NOW(), NOW()),
(100041, 'm.doorn', 'm.doorn@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Doorn', 'M', NOW(), NOW()),
(100010, 's.elmargai', 's.elmargai@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Elmargai', 'S.', NOW(), NOW()),
(100003, 'e.hansma', 'e.hansma@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Hansma', 'ing. E.', NOW(), NOW()),
(100005, 'e.hermsen', 'e.hermsen@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Hermsen', 'E', NOW(), NOW()),
(100065, 'm.hilhorst', 'm.hilhorst@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Hilhorst', 'M', NOW(), NOW()),
(100011, 'e.hoogendoorn', 'e.hoogendoorn@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Hoogendoorn', 'E.M.', NOW(), NOW()),
(100006, 'f.jacco', 'f.jacco@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Jacco', 'F.C.J. de', NOW(), NOW()),
(100075, 'b.joosten', 'b.joosten@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Joosten', 'B', NOW(), NOW()),
(100043, 'p.kerkhoven', 'p.kerkhoven@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Kerkhoven', 'P', NOW(), NOW()),
(100024, 'j.kraaij', 'j.kraaij@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Kraaij', 'J', NOW(), NOW()),
(100049, 'r.kraaij', 'r.kraaij@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Kraaij', 'R.', NOW(), NOW()),
(100037, 'm.lachhab', 'm.lachhab@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Lachhab', 'M.', NOW(), NOW()),
(100033, 's.leeuwen', 's.leeuwen@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Leeuwen', 'S van', NOW(), NOW()),
(100048, 'f.lennaerts', 'f.lennaerts@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Lennaerts', 'F.R.', NOW(), NOW()),
(100007, 't.luijtelaar', 't.luijtelaar@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Luijtelaar', 'T van', NOW(), NOW()),
(100036, 'o.margai', 'o.margai@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Margai', 'O. el', NOW(), NOW()),
(100019, 'd.molenaar', 'd.molenaar@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Molenaar', 'D', NOW(), NOW()),
(100059, 'd.nieuwland', 'd.nieuwland@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Nieuwland', 'D', NOW(), NOW()),
(100054, 'i.pacuretu', 'i.pacuretu@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Pacuretu', 'I', NOW(), NOW()),
(100053, 'a.paraschiv', 'a.paraschiv@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Paraschiv', 'A', NOW(), NOW()),
(100081, 'a.parsa', 'a.parsa@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Parsa', 'Amirparsa', NOW(), NOW()),
(100050, 'k.rahakbauw', 'k.rahakbauw@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Rahakbauw', 'K.J.E.', NOW(), NOW()),
(100061, 'r.rodriguez', 'r.rodriguez@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Rodriguez', 'Romero A', NOW(), NOW()),
(100056, 'b.schaffelaar', 'b.schaffelaar@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Schaffelaar', 'B', NOW(), NOW()),
(100038, 's.shangul', 's.shangul@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Shangul', 'S', NOW(), NOW()),
(100073, 'a.sluimer', 'a.sluimer@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Sluimer', 'A', NOW(), NOW()),
(100029, 'l.smink', 'l.smink@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Smink', 'L', NOW(), NOW()),
(100016, 'j.spoor', 'j.spoor@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Spoor', 'J', NOW(), NOW()),
(100001, 'admin', 'admin@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'manager', 'Syntess', 'consultant', NOW(), NOW()),
(100057, 'h.teerstra', 'h.teerstra@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Teerstra', 'HJ', NOW(), NOW()),
(100074, 'h.teertstra', 'h.teertstra@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Teertstra', 'H', NOW(), NOW()),
(100060, 'g.tiemersma', 'g.tiemersma@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Tiemersma', 'g', NOW(), NOW()),
(100035, 'a.torny', 'a.torny@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Torny', 'A', NOW(), NOW()),
(100034, 'h.veen', 'h.veen@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Veen', 'H van', NOW(), NOW()),
(100039, 'b.voorneveld', 'b.voorneveld@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Voorneveld', 'B', NOW(), NOW()),
(100012, 'r.vugt', 'r.vugt@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Vugt', 'R van', NOW(), NOW()),
(100013, 'h.vuurst', 'h.vuurst@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Vuurst', 'H van der', NOW(), NOW()),
(100015, 'r.wijtten', 'r.wijtten@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Wijtten', 'ing. R.W.', NOW(), NOW()),
(100080, 'l.ynema', 'l.ynema@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Ynema', 'L', NOW(), NOW()),
(100072, 'r.zoetebier', 'r.zoetebier@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'Zoetebier', 'R', NOW(), NOW()),
(100020, 's.jong', 's.jong@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'de Jong', 'S.', NOW(), NOW()),
(100045, 'r.vries', 'r.vries@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'de Vries', 'R.', NOW(), NOW()),
(100046, 'receptie', 'receptie@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'receptie', '', NOW(), NOW()),
(100051, 'j.berkmortel', 'j.berkmortel@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'van Berkmortel', 'J', NOW(), NOW()),
(100079, 'h.wieren', 'h.wieren@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'van Wieren', 'H', NOW(), NOW()),
(100078, 'e.hoef', 'e.hoef@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'van de Hoef', 'E', NOW(), NOW()),
(100062, 'r.kamp', 'r.kamp@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'van de Kamp', 'Robbert', NOW(), NOW()),
(100076, 'r.wetering', 'r.wetering@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'van de Wetering', 'R', NOW(), NOW()),
(100017, 'o.heuvel', 'o.heuvel@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'van den Heuvel', 'O', NOW(), NOW()),
(100027, 'h.belt', 'h.belt@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'van der Belt', 'H', NOW(), NOW()),
(100018, 'a.burgh', 'a.burgh@timr.nl', '$2a$11$OSN9zoc8rBM3AOFOZCcBM.Jjpbq7Wq3gBzNRcPDm4EOVVpeNt82Aq', 'user', 'van der Burgh', 'ing. A', NOW(), NOW())
ON CONFLICT (medew_gc_id) DO UPDATE SET
  username = EXCLUDED.username,
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();

-- Verify
SELECT COUNT(*) as total_users, COUNT(CASE WHEN role = 'manager' THEN 1 END) as managers
FROM users;
