#!/usr/bin/env bash
# ============================================================
# Clockd — Supabase → Neon migratie-script
# Fase 1: schema-dump (voor repo) + full dump + restore op Neon
#
# Gebruik:
#   1. Zet NEON_PASSWORD in je shell: export NEON_PASSWORD=...
#   2. Controleer dat Supabase project NIET gepauzeerd is (dashboard)
#   3. Draai: bash backend/Scripts/migrate_supabase_to_neon.sh
# ============================================================
set -euo pipefail

# ---- Supabase (bron) ----------------------------------------
# Gebruik de DIRECTE host (niet pooler) voor pg_dump
SUPABASE_HOST="db.ynajasnxfvgtlbjatlbw.supabase.co"
SUPABASE_PORT="5432"
SUPABASE_DB="postgres"
SUPABASE_USER="postgres"
# Wachtwoord via env var zodat het niet in de shell-history belandt
: "${SUPABASE_PASSWORD:?Stel SUPABASE_PASSWORD in als env var}"

SUPABASE_URL="postgresql://${SUPABASE_USER}:${SUPABASE_PASSWORD}@${SUPABASE_HOST}:${SUPABASE_PORT}/${SUPABASE_DB}?sslmode=require"

# ---- Neon (doel) --------------------------------------------
NEON_HOST="ep-hidden-thunder-adh5jqva-pooler.c-2.us-east-1.aws.neon.tech"
NEON_PORT="5432"
NEON_DB="neondb"
NEON_USER="neondb_owner"
: "${NEON_PASSWORD:?Stel NEON_PASSWORD in als env var}"

NEON_URL="postgresql://${NEON_USER}:${NEON_PASSWORD}@${NEON_HOST}:${NEON_PORT}/${NEON_DB}?sslmode=require"

# ---- Output files -------------------------------------------
SCHEMA_ONLY="backend/Migrations/_full_schema_dump.sql"
FULL_DUMP="clockd_full.sql"

echo ""
echo "=== Clockd: Supabase → Neon migratie ==="
echo ""

# ---- Stap 0: versie-check -----------------------------------
echo "[0/5] Versie check..."
LOCAL_VER=$(pg_dump --version | grep -oP '\d+\.\d+' | head -1)
REMOTE_VER=$(PGPASSWORD="${SUPABASE_PASSWORD}" psql "${SUPABASE_URL}" -t -c "SHOW server_version;" 2>&1 | tr -d ' ')
echo "  Lokale pg_dump : ${LOCAL_VER}"
echo "  Supabase server: ${REMOTE_VER}"
# pg_dump mag altijd een oudere server dumpen; warning alleen als lokaal < remote
LOCAL_MAJOR=$(echo "${LOCAL_VER}" | cut -d. -f1)
REMOTE_MAJOR=$(echo "${REMOTE_VER}" | cut -d. -f1)
if [ "${LOCAL_MAJOR}" -lt "${REMOTE_MAJOR}" ]; then
  echo "  WAARSCHUWING: lokale pg_dump (${LOCAL_VER}) is ouder dan server (${REMOTE_VER})"
  echo "  Upgrade pg_dump eerst."
  exit 1
fi
echo "  OK — pg_dump versie is compatibel."

# ---- Stap 1: schema-only dump (voor repo) -------------------
echo ""
echo "[1/5] Schema-only dump → ${SCHEMA_ONLY}"
PGPASSWORD="${SUPABASE_PASSWORD}" pg_dump \
  --schema-only \
  --no-owner \
  --no-privileges \
  --schema=public \
  "${SUPABASE_URL}" \
  > "${SCHEMA_ONLY}"
echo "  OK — $(wc -l < "${SCHEMA_ONLY}") regels geschreven."

# ---- Stap 2: volledige dump (schema + data) -----------------
echo ""
echo "[2/5] Volledige dump (schema + data) → ${FULL_DUMP}"
PGPASSWORD="${SUPABASE_PASSWORD}" pg_dump \
  --no-owner \
  --no-privileges \
  --schema=public \
  "${SUPABASE_URL}" \
  > "${FULL_DUMP}"
echo "  OK — $(wc -c < "${FULL_DUMP}") bytes geschreven."

# ---- Stap 3: restore op Neon --------------------------------
echo ""
echo "[3/5] Restore op Neon..."
PGPASSWORD="${NEON_PASSWORD}" psql "${NEON_URL}" < "${FULL_DUMP}"
echo "  OK — restore klaar."

# ---- Stap 4: rij-aantallen vergelijken ----------------------
echo ""
echo "[4/5] Rij-aantallen vergelijken (Supabase vs Neon)..."

TABLES=(
  users
  user_settings
  manager_assignments
  time_entries_workflow
  leave_requests_workflow
  vacation_balance
  activities
  activity_recipients
  system_settings
  audit_log
  user_sessions
  holidays
  user_projects
  periods
  notifications
  favorite_projects
  user_hour_allocations
)

printf "%-35s %12s %12s %s\n" "Tabel" "Supabase" "Neon" "Match?"
printf "%-35s %12s %12s %s\n" "-----" "--------" "----" "------"

ALL_MATCH=true
for TABLE in "${TABLES[@]}"; do
  SRC=$(PGPASSWORD="${SUPABASE_PASSWORD}" psql "${SUPABASE_URL}" -t -c \
    "SELECT COUNT(*) FROM ${TABLE};" 2>/dev/null | tr -d ' ' || echo "N/A")
  DST=$(PGPASSWORD="${NEON_PASSWORD}" psql "${NEON_URL}" -t -c \
    "SELECT COUNT(*) FROM ${TABLE};" 2>/dev/null | tr -d ' ' || echo "N/A")
  MATCH="✓"
  if [ "${SRC}" != "${DST}" ]; then
    MATCH="✗ MISMATCH"
    ALL_MATCH=false
  fi
  printf "%-35s %12s %12s %s\n" "${TABLE}" "${SRC}" "${DST}" "${MATCH}"
done

echo ""
if [ "${ALL_MATCH}" = "true" ]; then
  echo "  ALLE TABELLEN MATCHEN — migratie succesvol."
else
  echo "  MISMATCH GEVONDEN — controleer bovenstaande output voor fase 2."
  exit 1
fi

# ---- Stap 5: test Neon-verbinding vanuit backend-formaat ----
echo ""
echo "[5/5] Test Neon via Npgsql-compatibele verbinding (psql)..."
RESULT=$(PGPASSWORD="${NEON_PASSWORD}" psql \
  "host=${NEON_HOST} port=${NEON_PORT} dbname=${NEON_DB} user=${NEON_USER} sslmode=require" \
  -c "SELECT 'neon_ok' AS status;" -t 2>&1 | tr -d ' ')
if echo "${RESULT}" | grep -q "neon_ok"; then
  echo "  Neon verbinding: OK"
else
  echo "  Neon verbinding: GEFAALD — ${RESULT}"
  exit 1
fi

echo ""
echo "=== Fase 1 klaar. Geef akkoord voor fase 2 (connectionstring activeren). ==="
echo ""
echo "Volgende stappen voor fase 2:"
echo "  1. Vul het echte NEON_PASSWORD in appsettings.json / appsettings.Development.json"
echo "  2. Draai de backend lokaal en check de health endpoint"
echo "  3. Roteer Supabase wachtwoord (dashboard) — dan zijn de credentials in MigrationRunner.cs"
echo "     en 000_SUPABASE_SETUP.md waardeloos en kunnen ze gesaneerd worden"
