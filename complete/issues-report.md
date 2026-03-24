# GottaGo Issues Report

## Remaining Issues

1. Expo CLI auto-port selection can fail with `ERR_SOCKET_BAD_PORT` and port `65536`.
   - Current mitigation: mobile scripts are pinned to `8081`.
   - If it still recurs, inspect the local Expo CLI / freeport behavior directly.

2. The public toilet CSV import path now has both a batched upsert path and a COPY-based fast path.
   - Remaining improvement: benchmark both paths and decide which should be the default.

3. The repo-local helper script depends on direct Docker access.
   - It now degrades to warnings, but full DB verification still depends on Docker access from the current shell.

4. The repo-local skill is not globally installed into Codex home.
   - It exists in the workspace and is reusable there, but not yet installed as a global skill package.

5. The Naver Dynamic Map path is implemented, but it still needs one visual smoke test with the live client id.
   - The local mobile `.env` now reuses the existing Maps client id from `apps/api/.env`.
   - The app still falls back safely if the key is removed or invalid.

6. iOS native builds can fail during `pod install` if the shell locale is not UTF-8.
   - Current mitigation: run `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 HOME=/Users/kangsoo/Desktop/GottaGo npm run ios`.

## Environment Constraints Seen During Execution

1. Some process-inspection commands were unreliable in the current environment.
2. Docker access was available for direct commands but not consistently from inside a shell script launched under sandbox restrictions.
3. Expo commands could hang without emitting incremental logs, so previous successful build evidence and later port-specific retries were used together.

## Recommended Next Steps

1. Add a faster import path for the large toilet CSV.
2. Decide whether the repo-local skill should be copied into the global Codex skills directory outside the repo.
3. Add one automated integration check that boots the API and validates one nearby query response shape.
4. Benchmark the standard importer against the COPY fast path and decide whether to make COPY the default.
5. Add one explicit simulator/device smoke-test checklist for the mobile app if repeated manual QA becomes common.
6. Run one explicit simulator smoke test with the map engine switched to `Naver` and confirm the live JS map tiles and marker taps visually.
