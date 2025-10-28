#!/bin/sh
set -e

# Als /data bestaat (Render Disk gemount) en de database daar nog niet is, kopieer hem
if [ -d "/data" ] && [ ! -f "/data/CLOCKWISE.FDB" ]; then
    echo "🔧 Copying initial database to /data..."
    cp /app/CLOCKWISE.FDB.initial /data/CLOCKWISE.FDB
    chmod 666 /data/CLOCKWISE.FDB
    echo "✅ Database initialized in /data"
fi

# Als /data NIET bestaat (lokaal of zonder disk), gebruik /app
if [ ! -d "/data" ]; then
    echo "⚠️  No /data mount detected - using /app (data will NOT persist!)"
    cp /app/CLOCKWISE.FDB.initial /app/CLOCKWISE.FDB 2>/dev/null || true
    chmod 666 /app/CLOCKWISE.FDB 2>/dev/null || true
fi

# Start de applicatie
export ASPNETCORE_URLS="http://+:${PORT:-8080}"
exec dotnet backend.dll
