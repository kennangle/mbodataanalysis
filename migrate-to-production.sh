#!/bin/bash

# Script to migrate data from development database to production database
# Usage: ./migrate-to-production.sh

set -e

echo "========================================="
echo "Database Migration: Dev -> Production"
echo "========================================="
echo ""

# Check if production DATABASE_URL is provided
if [ -z "$PRODUCTION_DATABASE_URL" ]; then
    echo "ERROR: PRODUCTION_DATABASE_URL environment variable is not set"
    echo ""
    echo "To use this script, you need to:"
    echo "1. Go to Publishing -> Advanced Settings"
    echo "2. Copy your production DATABASE_URL"
    echo "3. Run: PRODUCTION_DATABASE_URL='your-prod-url-here' ./migrate-to-production.sh"
    echo ""
    exit 1
fi

# Development database URL from current environment
DEV_DB_URL="${DATABASE_URL}"

if [ -z "$DEV_DB_URL" ]; then
    echo "ERROR: DATABASE_URL (development) environment variable is not set"
    exit 1
fi

echo "✓ Development database URL found"
echo "✓ Production database URL provided"
echo ""

# Create backup directory
BACKUP_DIR="./db_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 Exporting development database..."
pg_dump "$DEV_DB_URL" \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    -f "$BACKUP_DIR/dev_export.sql"

if [ $? -eq 0 ]; then
    echo "✓ Export successful: $BACKUP_DIR/dev_export.sql"
    echo ""
else
    echo "✗ Export failed"
    exit 1
fi

echo "📥 Importing into production database..."
psql "$PRODUCTION_DATABASE_URL" -f "$BACKUP_DIR/dev_export.sql" 2>&1 | grep -v "^$" || true

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo ""
    echo "✓ Import successful!"
    echo ""
    echo "========================================="
    echo "Migration Complete! 🎉"
    echo "========================================="
    echo ""
    echo "Your production database now has all the data from development."
    echo "Backup saved in: $BACKUP_DIR"
    echo ""
else
    echo "✗ Import failed"
    exit 1
fi
