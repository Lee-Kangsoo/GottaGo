#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

echo "[1/7] root lint"
npm run lint >/dev/null

echo "[2/7] api build"
npm run build --workspace @gottago/api >/dev/null

echo "[3/7] mobile typecheck"
npx tsc -p apps/mobile/tsconfig.json --noEmit >/dev/null

echo "[4/7] db row count"
if docker exec gottago-postgres psql -U postgres -d gottago -t -A -c "select count(*) from toilets;"; then
  :
else
  echo "warning: docker exec failed in the current shell environment"
fi

echo "[5/7] api health"
if curl -s http://localhost:4000/health; then
  echo
else
  echo "warning: api health check failed"
fi

echo "[6/7] nearby sample"
if curl -s "http://localhost:4000/toilets/nearby?latitude=37.5663&longitude=126.9779&openNow=true&radiusMeters=1500"; then
  echo
else
  echo "warning: nearby sample check failed"
fi

echo "[7/7] mobile env summary"
if [ -f apps/mobile/.env ]; then
  grep -E '^(EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN|RNMAPBOX_MAPS_DOWNLOAD_TOKEN|EXPO_PUBLIC_API_BASE_URL|EXPO_PUBLIC_USE_MOCK_DATA|EXPO_PUBLIC_MAP_PROVIDER|EXPO_PUBLIC_NAVER_MAP_CLIENT_ID)=' apps/mobile/.env \
    | sed -E 's/(=(.*))/=[REDACTED]/' \
    || true
else
  echo "warning: apps/mobile/.env not found"
fi
