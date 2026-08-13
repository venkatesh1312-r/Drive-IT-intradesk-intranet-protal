#!/bin/sh
set -e

echo "Running prisma migrate deploy..."

# Try the normal migration first
if npx prisma migrate deploy; then
  echo "Migrations applied successfully."
else
  echo "migrate deploy failed - checking if it's a baseline issue (P3005)..."

  # Baseline the pre-existing pgvector schema migration if the DB already
  # has tables from before migration tracking started. Safe to re-run:
  # if already marked applied, this is a no-op.
  npx prisma migrate resolve --applied "20260810010000_init_postgres_pgvector" || true

  echo "Retrying migrate deploy after baseline..."
  npx prisma migrate deploy
fi

echo "Starting application..."
exec node server.js
