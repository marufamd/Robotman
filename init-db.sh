#!/bin/bash
# One-time database restore script
# Run this after starting the postgres container with: ./init-db.sh

set -e

echo "Restoring database from robotdb.dump..."

# Copy the dump file into the container
docker cp robotdb.dump robotman-postgres-1:/tmp/robotdb.dump

# Restore the dump file (data only)
docker exec -i robotman-postgres-1 pg_restore -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --data-only --no-owner --no-privileges /tmp/robotdb.dump

# Clean up
docker exec -i robotman-postgres-1 rm /tmp/robotdb.dump

echo "Database restore completed!"
