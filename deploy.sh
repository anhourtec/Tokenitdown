#!/usr/bin/env bash

set -euo pipefail

# TokenItDown — clean build & deploy of the full stack (web + Postgres + Redis).
#
# Builds the Next.js app into a Docker image and brings up the whole stack via
# docker compose. The web container waits for Postgres, ensures the database +
# schema (Drizzle migrations), then starts. Mirrors BookYourPTO-SaaS/build.sh.
#
# Ports differ from BookYourPTO so both stacks coexist on one host:
#   Web 3020 · Postgres 5433 · Redis 6386

PROJECT="tokenitdown"

echo "========================================"
echo "  TokenItDown — CLEAN BUILD & DEPLOY"
echo "========================================"

# Run from the script's directory regardless of where it's invoked from.
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "✗ .env not found. Copy .env.example to .env and fill it in first."
  exit 1
fi

echo ""
echo "▶ Step 1: Stopping existing containers..."
if [ -n "$(docker compose ps -q 2>/dev/null)" ]; then
  docker compose down
else
  echo "  No running containers."
fi

echo ""
echo "▶ Step 2: Removing old images for THIS project only..."
docker images --format '{{.Repository}} {{.ID}}' \
  | grep "^${PROJECT}" \
  | awk '{print $2}' \
  | xargs -r docker rmi -f || true

echo ""
echo "▶ Step 3: Building images from scratch (NO CACHE)..."
docker compose build --no-cache

echo ""
echo "▶ Step 4: Starting services..."
docker compose up -d

echo ""
echo "▶ Step 5: Status:"
docker compose ps

echo ""
echo "✓ Deployment complete!"
echo "  Web      -> http://localhost:3020 (and http://192.168.69.16:3020 on the LAN)"
echo "  Postgres -> 192.168.69.16:5433    Redis -> 192.168.69.16:6386"
echo "  Logs: docker compose logs -f web"
