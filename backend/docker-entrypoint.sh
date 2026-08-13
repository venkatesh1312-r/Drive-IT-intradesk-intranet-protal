#!/bin/sh
set -e

echo "Running prisma migrate deploy..."

# Try the normal migration first
if npx prisma migrate deploy; then
  echo "Migrations applied successfully."
else
  echo "migrate deploy failed - checking if it's a baseline issue (P3005)..."

  # Baseline known pre-existing migrations that predate migration tracking.
  # Safe to re-run: if a migration is already marked applied, this is a no-op.
  npx prisma migrate resolve --applied "20260806114440_initial_schema" || true
  npx prisma migrate resolve --applied "20260807065451_add_password_auth" || true

  echo "Retrying migrate deploy after baseline..."
  npx prisma migrate deploy
fi

echo "Starting application..."
exec node dist/main
