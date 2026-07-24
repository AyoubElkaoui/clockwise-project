-- One-time generator alignment for the switch from MAX(GC_ID)+1 to GEN_ID().
--
-- Why: the app historically inserted AT_URENBREG / AT_DOCUMENT rows with MAX(GC_ID)+1,
-- which does NOT advance the Atrium generators. As a result a generator can sit BELOW the
-- real MAX id (measured: AG_URENBREG was 1 behind). The new backend uses GEN_ID(), so the
-- generators must first be lifted to at least their table MAX, otherwise GEN_ID would hand
-- out an id that already exists -> primary-key collision on a payroll row.
--
-- Safe: only ever bumps a generator UP (never down), so it cannot disturb Syntess if Syntess
-- has already advanced the generator beyond MAX.
--
-- RUN THIS ONCE against the Atrium database (isql / FlameRobin), during a quiet moment,
-- BEFORE starting the new backend.

SET TERM ^ ;
EXECUTE BLOCK AS
  DECLARE g BIGINT;
  DECLARE m BIGINT;
BEGIN
  m = (SELECT MAX(GC_ID) FROM AT_URENBREG);
  g = GEN_ID(AG_URENBREG, 0);
  IF (m > g) THEN g = GEN_ID(AG_URENBREG, m - g);

  m = (SELECT MAX(GC_ID) FROM AT_DOCUMENT);
  g = GEN_ID(AG_DOCUMENT, 0);
  IF (m > g) THEN g = GEN_ID(AG_DOCUMENT, m - g);
END^
SET TERM ; ^

-- Verify: both gen_* must now be >= their max_*.
SELECT (SELECT MAX(GC_ID) FROM AT_URENBREG) AS max_urenbreg, GEN_ID(AG_URENBREG, 0) AS gen_urenbreg,
       (SELECT MAX(GC_ID) FROM AT_DOCUMENT) AS max_document, GEN_ID(AG_DOCUMENT, 0) AS gen_document
FROM RDB$DATABASE;
