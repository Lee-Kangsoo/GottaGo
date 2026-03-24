---
name: gottago-dev-workflow
description: Use this skill when working in the GottaGo repo to run the verified local workflow for linting, DB-backed API checks, mobile mock/API mode switching, Naver geocoding CSV generation, and final verification/reporting.
---

# GottaGo Dev Workflow

Use this skill for repository-specific development and verification tasks in `GottaGo`.

## Use This Skill For

- running the verified local stack
- checking whether the API is using real PostGIS data or mock data
- switching the mobile app between mock mode and API mode
- running or troubleshooting the Naver geocoding CSV workflow
- preparing final verification notes or implementation reports

## Quick Workflow

1. Start by reading:
   - [`/Users/kangsoo/Desktop/GottaGo/notice.md`](/Users/kangsoo/Desktop/GottaGo/notice.md)
   - [`/Users/kangsoo/Desktop/GottaGo/plan/implementation-plan.md`](/Users/kangsoo/Desktop/GottaGo/plan/implementation-plan.md)
2. Run the helper script:
   - `bash .codex/skills/gottago-dev-workflow/scripts/verify-local-stack.sh`
3. If the stack is healthy:
   - API health should pass
   - nearby query should return real records
   - DB count should be non-zero
4. For mobile:
   - Expo Go should use fallback preview
   - native Mapbox requires `npx expo run:ios` or `npx expo run:android`
5. For geocoding:
   - use `apps/api/scripts/buildPublicToiletCsvWithNaver.ts`
   - cache file is `*.naver-geocode-cache.csv`
   - auth errors should abort immediately

## Important Repo Facts

- `apps/api/.env` controls DB mode with `USE_MOCK_DATA=false`
- `apps/mobile/.env` controls mock/API switching with `EXPO_PUBLIC_USE_MOCK_DATA`
- the working Naver Maps geocode host is `maps.apigw.ntruss.com`
- the local PostGIS database has been verified with imported public toilet rows

## References

- For stack notes and pitfalls: [`references/stack-notes.md`](references/stack-notes.md)
- For the repeatable local verification command set: [`scripts/verify-local-stack.sh`](scripts/verify-local-stack.sh)
