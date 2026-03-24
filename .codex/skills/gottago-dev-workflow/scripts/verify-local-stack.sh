#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"

cd "$ROOT_DIR"

echo "[1/6] lint"
npm run lint >/dev/null

echo "[2/6] api build"
npm run build --workspace @gottago/api >/dev/null

echo "[3/6] mobile typecheck"
npx tsc -p apps/mobile/tsconfig.json --noEmit >/dev/null

echo "[4/6] db row count"
docker exec gottago-postgres psql -U postgres -d gottago -t -A -c "select count(*) from toilets;"

echo "[5/6] api health"
curl -s http://localhost:4000/health
echo

echo "[6/6] nearby sample"
curl -s "http://localhost:4000/toilets/nearby?latitude=37.5663&longitude=126.9779&openNow=true&radiusMeters=1500"
echo
