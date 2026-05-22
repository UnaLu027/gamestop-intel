#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/5] Rebuilding containers"
docker compose down -v --remove-orphans || true
docker compose build --no-cache

echo "[2/5] Starting services"
docker compose up -d

echo "[3/5] Waiting for database readiness"
for i in {1..30}; do
  if docker compose exec -T db pg_isready -U admin -d gamestop_db >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "[4/5] Seeding GameStop dataset"
docker compose exec -T backend python scripts/seed_gamestop_data.py

echo "[5/5] Done"
echo "Frontend: http://localhost:3000"
echo "API docs: http://localhost:8000/docs"
