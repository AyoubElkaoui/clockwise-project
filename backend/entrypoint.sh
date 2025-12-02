#!/bin/sh
set -e

echo "Starting Clockwise Backend..."

# Check if database exists, if not let EF Core migrations create it
if [ ! -f "/app/CLOCKWISE.FDB" ]; then
    echo "Database will be created by EF Core migrations..."
fi

# Start the application
export ASPNETCORE_URLS="http://+:${PORT:-8080}"
echo "Starting on port ${PORT:-8080}"
exec dotnet backend.dll
