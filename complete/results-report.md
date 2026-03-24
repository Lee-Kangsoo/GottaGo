# GottaGo Results Report

## Summary

The repository was pushed to a verified local working state for linting, DB-backed API usage, geocoding CSV generation, iOS-native Mapbox build preparation, and dual map-engine mobile rendering. Documentation, a notice file, and a repo-local reusable skill were added.

## Verified Outcomes

1. Root lint passes with the new shared ESLint setup.
2. API TypeScript build passes.
3. Mobile TypeScript check passes.
4. `apps/api/.env` is configured for DB mode with `USE_MOCK_DATA=false`.
5. Local PostGIS is running and contains `49,998` imported toilet rows.
6. `GET /health` returns `{"status":"ok","service":"gottago-api"}`.
7. `GET /toilets/nearby?latitude=37.5663&longitude=126.9779&openNow=true&radiusMeters=1500` returns real public toilet records from PostGIS.
8. The Naver geocoding script now:
   - uses `maps.apigw.ntruss.com`
   - writes a reusable cache CSV
   - aborts immediately on auth errors
9. The public toilet import script now performs batched upserts via `jsonb_to_recordset` instead of row-by-row inserts.
10. Expo Go no longer crashes on eager Mapbox import because `HeroMap.tsx` now gates native Mapbox loading.
11. A repo-local skill package was created at `.codex/skills/gottago-dev-workflow/`.
12. The mobile UI was refreshed with a stronger urgent-use visual style, clearer map marker presentation, and updated mock test locations.
13. Mobile Expo scripts are pinned to port `8081` to reduce repeat failures from Expo auto-port selection.
14. Mobile API fetch failures now surface a more actionable error message, including the `localhost` vs LAN IP warning for real devices.
15. A repo-level `scripts/verify-local-stack.sh` workflow and `npm run verify:stack` command were added.
16. A mobile QA checklist was added at `docs/mobile-smoke-checklist.md`.
17. A separate COPY-based importer was added for faster full public toilet reloads.
18. The mobile app now supports both Mapbox and Naver Dynamic Map rendering paths, with a runtime map-engine switch in the UI.
19. Naver Dynamic Map is rendered through `react-native-webview` using the Naver Maps JS SDK and marker click bridging.
20. The iOS development build still succeeds after adding the Naver WebView map path, once the shell is run with UTF-8 locale variables.

## Added Or Updated Files

- `eslint.config.mjs`
- `apps/mobile/.env.example`
- `apps/mobile/app.config.ts`
- `apps/mobile/constants/config.ts`
- `apps/mobile/App.tsx`
- `apps/mobile/components/HeroMap.tsx`
- `apps/mobile/package.json`
- `apps/mobile/components/FilterBar.tsx`
- `apps/mobile/components/ToiletCard.tsx`
- `apps/mobile/components/ToiletDetailSheet.tsx`
- `apps/mobile/data/toilets.ts`
- `apps/mobile/constants/colors.ts`
- `apps/api/scripts/buildPublicToiletCsvWithNaver.ts`
- `apps/api/scripts/importPublicToilets.ts`
- `apps/api/scripts/importPublicToiletsCopy.ts`
- `apps/api/db/schema.sql`
- `README.md`
- `notice.md`
- `plan/implementation-plan.md`
- `scripts/verify-local-stack.sh`
- `docs/mobile-smoke-checklist.md`
- `.codex/skills/gottago-dev-workflow/...`

## Notes

- The repo-local skill is stored inside the workspace because global skill installation was outside the writable/safe scope for this run.
- The helper script in the skill is suitable for a normal local shell, but sandboxed execution may block Docker socket access.
