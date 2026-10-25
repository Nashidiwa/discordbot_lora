#!/bin/sh
set -e

# Ensure data directory exists for persistent SQLite database
mkdir -p /app/data

# Run pending database migrations
echo "==> [Entrypoint] Synchronizing and applying database migrations..."
npx prisma migrate deploy

# Execute the container's main command
echo "==> [Entrypoint] Starting application process..."
exec "$@"
