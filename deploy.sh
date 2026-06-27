#!/usr/bin/env bash

set -euo pipefail

# TokenItDown data services (Postgres + Redis) — deploy / recreate.
#
# Run this ON the server (192.168.69.16). It only manages Postgres + Redis; the
# web app is not containerised (run it with `npm run dev`). Ports differ from
# BookYourPTO-SaaS so both stacks coexist:  Postgres 5433, Redis 6386.

echo "========================================"
echo "  TokenItDown — DATA SERVICES DEPLOY"
echo "========================================"

# Run from the script's directory regardless of where it's invoked from.
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "✗ .env not found. Copy .env.example to .env and fill it in first."
  exit 1
fi

echo ""
echo "▶ Step 1: Checking for running containers..."
if [ -n "$(docker compose ps -q 2>/dev/null)" ]; then
  echo "  Containers found — stopping them..."
  docker compose down
else
  echo "  No running containers."
fi

echo ""
echo "▶ Step 2: Pulling latest images..."
docker compose pull

echo ""
echo "▶ Step 3: Starting Postgres + Redis..."
docker compose up -d --force-recreate

echo ""
echo "▶ Step 4: Status:"
docker compose ps

echo ""
echo "✓ Data services up."
echo "  Postgres -> 192.168.69.16:5433   Redis -> 192.168.69.16:6386"
echo "  Run the app locally with: npm run dev"
