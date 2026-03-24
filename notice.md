# GottaGo Notice

## What Was Easy To Miss

- `@rnmapbox/maps` cannot run as a native map inside Expo Go.
- The app must not import Mapbox eagerly in Expo Go, or it crashes before fallback UI renders.
- The repo now avoids that crash by loading Mapbox only when native execution is available.

## Mobile Runtime Modes

- `EXPO_PUBLIC_USE_MOCK_DATA=true`: mobile uses local mock toilet data.
- `EXPO_PUBLIC_USE_MOCK_DATA=false`: mobile calls the API.
- `EXPO_PUBLIC_API_BASE_URL=http://localhost:4000` works for the iOS simulator running on the same Mac.
- For a physical phone, `localhost` will not work. Use your machine's LAN IP instead.
- In this environment, Expo auto-port discovery sometimes failed with `ERR_SOCKET_BAD_PORT` and `65536`; the mobile workspace scripts are pinned to port `8081` as the practical workaround.

## Mapbox Tokens

- `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` is the public runtime token.
- `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` is the secret native SDK downloads token.
- `EXPO_PUBLIC_MAP_PROVIDER=mapbox|naver` controls the initial map engine, and the UI can switch between both at runtime.
- Expo Go is still useful without the native map because the app shows a fallback preview.
- Real Mapbox rendering requires `npx expo run:ios` or `npx expo run:android`.

## Naver Dynamic Map

- `EXPO_PUBLIC_NAVER_MAP_CLIENT_ID` is required for the live Naver dynamic map.
- The current mobile implementation renders Naver Maps JS API v3 inside a `react-native-webview` bridge.
- Marker taps are posted back into React Native so the same toilet selection flow works for both map engines.
- If the client id is missing, the app falls back to the preview card instead of breaking the screen.
- On this machine, `pod install` failed unless the shell used UTF-8 locale variables. The working iOS build command is:
  `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 HOME=/Users/kangsoo/Desktop/GottaGo npm run ios`

## Naver Geocoding

- The working geocoding host is `https://maps.apigw.ntruss.com/map-geocode/v2/geocode`.
- Using `naveropenapi.apigw.ntruss.com` with the current keys caused auth failure, while `maps.apigw.ntruss.com` worked.
- Geocode results are cached in a separate CSV so repeated runs do not re-hit the same address.
- Auth failures such as `401` now abort immediately instead of wasting many calls.

## Database State

- Local PostGIS currently contains `49,998` imported toilet rows.
- `apps/api/.env` is configured for DB mode with `USE_MOCK_DATA=false`.
- The API returns real nearby toilet results from PostGIS.

## Schema / Import Caveats

- `apps/api/db/schema.sql` is now safer to rerun because enum creation is guarded.
- The CSV import path now uses batched `jsonb_to_recordset` upserts instead of row-by-row inserts.
- `--batch-size=<count>` can be used to tune the import size for large runs.
- A separate `COPY`-based importer now exists for faster full reloads.
- If the import is interrupted mid-transaction, committed row count is the fastest way to confirm final state.

## Verified Commands

```bash
npm run lint
npm run build --workspace @gottago/api
npx tsc -p apps/mobile/tsconfig.json --noEmit
npm run verify:stack
docker compose up -d
node apps/api/dist/index.js
curl -s http://localhost:4000/health
curl -s "http://localhost:4000/toilets/nearby?latitude=37.5663&longitude=126.9779&openNow=true&radiusMeters=1500"
cd apps/mobile
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 HOME=/Users/kangsoo/Desktop/GottaGo npm run ios
```
