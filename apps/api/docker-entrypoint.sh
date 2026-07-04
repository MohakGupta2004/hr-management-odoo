#!/bin/sh
set -e

# Sync the schema to the database. `db push` is used (not `migrate deploy`) because
# the schema is the source of truth for this project's local/dev containers.
echo "Syncing database schema (prisma db push)..."
bunx prisma db push --accept-data-loss

echo "Starting API..."
exec bun run index.ts
