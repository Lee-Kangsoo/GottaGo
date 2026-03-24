# Stack Notes

## Verified Local State

- Root lint passes.
- API TypeScript build passes.
- Mobile TypeScript check passes.
- The DB-backed API returns real nearby toilet data.
- Expo Go fallback path is safe because Mapbox is no longer imported eagerly.

## Environment Controls

- `apps/api/.env`
  - `USE_MOCK_DATA=false` means API uses Postgres/PostGIS.
- `apps/mobile/.env`
  - `EXPO_PUBLIC_USE_MOCK_DATA=false` means mobile calls API.
  - `EXPO_PUBLIC_API_BASE_URL=http://localhost:4000` works for iOS simulator.

## Known Constraints

- Full CSV import is functional but still row-by-row and may take time.
- Physical devices need LAN IP instead of `localhost`.
- Native Mapbox requires a dev build, not Expo Go.

## Geocoding Notes

- CSV geocoding uses a reusable cache CSV.
- The script now stops immediately on auth failures.
- The current verified host is `https://maps.apigw.ntruss.com/map-geocode/v2/geocode`.
