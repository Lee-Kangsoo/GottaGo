# GottaGo

GottaGo is a map-first toilet finder for urgent real-world use.

The repository is now scaffolded as a small monorepo:

- `apps/mobile`: Expo-based mobile MVP
- `apps/api`: Express + TypeScript API scaffold

For a guided explanation of the current structure and file responsibilities, see:

- `docs/project-structure-guide.md`
- `docs/private-data-policy.md`

## Current MVP Shape

The initial build focuses on one question:

"Where is the nearest toilet I can use right now?"

Current scaffold includes:

- mobile landing screen with map preview, open-now filter chips, and toilet cards
- shared toilet domain model across app and API
- `GET /health` and `GET /toilets/nearby` API endpoints
- PostGIS schema and seed SQL for nearby search

The mobile app can switch between mock data and the real API via env configuration.

## Repository Layout

```text
.
├── apps
│   ├── api
│   │   ├── db
│   │   └── src
│   └── mobile
│       ├── components
│       ├── constants
│       ├── data
│       └── types
├── AGENTS.md
├── README.md
└── package.json
```

## Install

```bash
npm install
```

## Quick Verification

```bash
npm run verify:stack
```

This script runs lint, API build, mobile typecheck, and lightweight local stack checks.
If Docker or the API is unavailable in the current shell environment, it prints warnings instead of stopping immediately.

## Run The Mobile App

```bash
cp apps/mobile/.env.example apps/mobile/.env
npm run dev:mobile
```

Notes:

- Mapbox requires a public access token and a downloads token
- Naver Dynamic Map requires `EXPO_PUBLIC_NAVER_MAP_CLIENT_ID`
- `EXPO_PUBLIC_MAP_PROVIDER=mapbox|naver` sets the initial map engine, and the app can also switch engines in the UI
- Expo Go will show the fallback preview; a real native Mapbox map requires a development build
- Naver Dynamic Map renders through a `WebView`, so it can be used without the native Mapbox path
- `EXPO_PUBLIC_USE_MOCK_DATA=false` makes the app call the API instead of local mock data
- `EXPO_PUBLIC_API_BASE_URL=http://localhost:4000` works for the iOS simulator on the same machine
- mobile workspace scripts are pinned to port `8081` to avoid Expo auto-port issues seen locally
- if you test on a physical phone later, replace `localhost` in the mobile API config with your computer's LAN IP

Recommended mobile env values:

```text
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk...
EXPO_PUBLIC_MAP_PROVIDER=mapbox
EXPO_PUBLIC_NAVER_MAP_CLIENT_ID=
RNMAPBOX_MAPS_DOWNLOAD_TOKEN=sk...
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000
EXPO_PUBLIC_USE_MOCK_DATA=true
```

Verified native iOS build command:

```bash
cd apps/mobile
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 HOME=/Users/kangsoo/Desktop/GottaGo npm run ios
```

## Run The API

```bash
cp apps/api/.env.example apps/api/.env
npm run dev:api
```

Default API URL:

```text
http://localhost:4000
```

Example endpoint:

```text
GET /toilets/nearby?latitude=37.5663&longitude=126.9779&openNow=true&radiusMeters=1500
```

## Database

The API scaffold assumes PostgreSQL with PostGIS.

Schema and seed files:

- `apps/api/db/schema.sql`
- `apps/api/db/seed.sql`

The nearby-search query pattern is documented in the schema file using `ST_DWithin` and `ST_Distance`.

### Start Local PostGIS

```bash
docker compose up -d
```

Then apply the schema and seed:

```bash
psql postgres://postgres:postgres@localhost:5432/gottago -f apps/api/db/schema.sql
psql postgres://postgres:postgres@localhost:5432/gottago -f apps/api/db/seed.sql
```

The schema file is idempotent for enum creation, so rerunning it is safe.

If you want the API to read from the database instead of mock data, set this in `apps/api/.env`:

```text
USE_MOCK_DATA=false
```

Verified DB-backed API checks:

```bash
curl -s http://localhost:4000/health
curl -s "http://localhost:4000/toilets/nearby?latitude=37.5663&longitude=126.9779&openNow=true&radiusMeters=1500"
```

### Import The Korea Public Toilet CSV

After the database schema exists, import the public toilet dataset:

```bash
npm install
cp apps/api/.env.example apps/api/.env
npm run import:public-toilets --workspace @gottago/api -- data/private/korea_public_toilet.csv
```

Data policy:

- real source CSVs and geocoded outputs are treated as private operating assets
- keep them under `data/private/` or another private storage location
- do not commit those files to the public repository
- if you need a sharable example later, add a small redacted sample file instead of the full dataset

Import behavior:

- reads `cp949` encoded CSV
- keeps only rows with coordinates
- imports `공중화장실` and `개방화장실`
- skips `미개방`
- upserts by source record id
- imports in batches using `jsonb_to_recordset` instead of row-by-row inserts
- verified import result in the local PostGIS database: `49,998` rows

Import logic:

- script: `apps/api/scripts/importPublicToilets.ts`
- fast path script: `apps/api/scripts/importPublicToiletsCopy.ts`
- data analysis: `docs/public-toilet-data-plan.md`

Useful option:

- `--batch-size=<count>`: controls the DB upsert batch size for large imports

For large full reloads, use the COPY-based fast path:

```bash
npm run import:public-toilets:copy --workspace @gottago/api -- data/private/korea_public_toilet.naver-geocoded.csv
```

### Build A Geocoded CSV With Naver API

The source CSV has many rows with missing coordinates. You can enrich those rows with Naver Geocoding before import:

```bash
cp apps/api/.env.example apps/api/.env
# fill NAVER_MAPS_CLIENT_ID and NAVER_MAPS_CLIENT_SECRET in apps/api/.env
npm run build:public-toilets-csv --workspace @gottago/api -- data/private/korea_public_toilet.csv
```

Output behavior:

- reads the input CSV as `cp949`
- geocodes rows where `WGS84위도` and `WGS84경도` are missing
- writes a new `*.naver-geocoded.csv` file in `cp949`
- writes and reuses a separate `*.naver-geocode-cache.csv` file so repeated runs do not geocode the same address twice
- fills `WGS84위도` and `WGS84경도` and appends geocoding audit columns
- uses `https://maps.apigw.ntruss.com/map-geocode/v2/geocode`
- aborts immediately on auth errors such as `401`

Useful options:

- `--output <path>`: write to a specific CSV path
- `--cache <path>`: write/read the reusable geocoding cache CSV at a specific path
- `--limit <count>`: only geocode a subset for testing
- `--delay-ms <ms>`: throttle requests between calls
- `--overwrite`: geocode all rows, including rows that already have coordinates
- `--dry-run`: print lookup counts without calling the API or writing a file

## Current Verified State

1. Root lint passes.
2. API TypeScript build passes.
3. Mobile TypeScript check passes.
4. Local PostGIS is running and contains imported public toilet data.
5. `GET /health` and `GET /toilets/nearby` return real DB-backed responses.
6. Expo Go no longer crashes on `@rnmapbox/maps`; it falls back to the preview map.
7. iOS native Mapbox build has been verified with `expo run:ios`.
8. A repo-level `verify:stack` workflow exists for repeatable local checks.
9. The mobile app now supports both Mapbox and Naver Dynamic Map rendering paths.
10. The iOS native build still succeeds after adding `react-native-webview` for the Naver map path.
