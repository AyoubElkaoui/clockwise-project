#!/bin/sh
set -e

# Voor free tier zonder persistent storage: gebruik /app (data gaat verloren bij redeploy)
# Maar voor demo/portfolio is dit prima!

echo "🚀 Starting Clockwise Backend..."

# Kopieer database template naar /app als deze nog niet bestaat
if [ ! -f "/app/CLOCKWISE.FDB" ]; then
    echo "� Initializing database in /app..."
    cp /app/CLOCKWISE.FDB.initial /app/CLOCKWISE.FDB
    chmod 666 /app/CLOCKWISE.FDB
    echo "✅ Database ready in /app"
else
    echo "✅ Database already exists in /app"
fi

# Start de applicatie
export ASPNETCORE_URLS="http://+:${PORT:-8080}"
echo "🌐 Starting on port ${PORT:-8080}"
exec dotnet backend.dll
