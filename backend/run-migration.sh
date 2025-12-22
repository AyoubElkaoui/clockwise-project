#!/bin/bash

# Script to run PostgreSQL migrations on Supabase
# Usage: ./run-migration.sh

set -e

echo "Running workflow migration on Supabase..."

# Connection details
HOST="db.ynajasnxfvgtlbjatlbw.supabase.co"
PORT="5432"
DATABASE="postgres"
USER="postgres"
PASSWORD="Kj9QIapHHgKUlguF"

# Run migration
PGPASSWORD=$PASSWORD psql -h $HOST -p $PORT -U $USER -d $DATABASE -f Migrations/001_CreateWorkflowTables.sql

echo "Migration completed successfully!"
echo ""
echo "You can verify the table exists by running:"
echo "  SELECT * FROM time_entries_workflow LIMIT 5;"
