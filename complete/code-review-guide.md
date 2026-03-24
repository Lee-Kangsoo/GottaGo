# GottaGo Code Review Guide

이 문서는 이번 작업에서 실제로 바뀐 코드와 확인 포인트를 빠르게 검토할 수 있게 정리한 파일입니다.

## 1. ESLint 추가

파일:

- `/Users/kangsoo/Desktop/GottaGo/eslint.config.mjs`

확인할 것:

- 루트 공용 ESLint flat config가 추가되었는지
- `node_modules`, `dist`, `.expo`, `ios`, `android` 등이 ignore 되는지
- TypeScript, React, React Hooks 규칙이 적용되는지

직접 확인:

```bash
npm run lint
```

## 2. 모바일 env 기반 mock/API 전환

파일:

- `/Users/kangsoo/Desktop/GottaGo/apps/mobile/app.config.ts`
- `/Users/kangsoo/Desktop/GottaGo/apps/mobile/constants/config.ts`
- `/Users/kangsoo/Desktop/GottaGo/apps/mobile/.env.example`
- `/Users/kangsoo/Desktop/GottaGo/apps/mobile/package.json`

확인할 것:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_USE_MOCK_DATA`
- `EXPO_PUBLIC_MAP_PROVIDER`
- `EXPO_PUBLIC_NAVER_MAP_CLIENT_ID`
- `config.useMockData` 가 env 기반으로 계산되는지
- `config.apiBaseUrl` 이 env에서 읽히는지
- `config.mapProvider` 와 `config.naverMapClientId` 가 env에서 읽히는지
- mobile script가 `8081` 포트 고정으로 바뀌었는지

직접 확인:

```bash
sed -n '1,120p' apps/mobile/app.config.ts
sed -n '1,120p' apps/mobile/constants/config.ts
sed -n '1,120p' apps/mobile/.env.example
sed -n '1,80p' apps/mobile/package.json
```

## 2-1. 테스트 위치 / mock 좌표 변경

파일:

- `/Users/kangsoo/Desktop/GottaGo/apps/mobile/App.tsx`
- `/Users/kangsoo/Desktop/GottaGo/apps/mobile/data/toilets.ts`

확인할 것:

- preset 위치가 `Gangnam Station`, `Seoul Station`, `Suji-gu Office Station` 으로 바뀌었는지
- mock toilet data가 이 세 지역 주변 기준으로 재구성됐는지
- mock 상태에서도 지도가 더 자연스럽게 보이도록 좌표 분포가 퍼져 있는지

## 3. Expo Go Mapbox 크래시 방지

파일:

- `/Users/kangsoo/Desktop/GottaGo/apps/mobile/components/HeroMap.tsx`

확인할 것:

- 파일 상단 eager import 대신 조건부 로딩 구조인지
- `Constants.executionEnvironment === "storeClient"` 일 때 fallback map으로 빠지는지
- native execution일 때만 `@rnmapbox/maps` 를 로드하는지

핵심 포인트:

- 이전에는 Expo Go에서도 native Mapbox import가 먼저 평가돼서 앱이 죽을 수 있었음
- 지금은 fallback preview가 먼저 살아남도록 바뀜
- fallback map 자체도 marker/현재 위치/좌표 배지 표현이 더 강해짐

## 3-1. Naver Dynamic Map 추가

파일:

- `/Users/kangsoo/Desktop/GottaGo/apps/mobile/components/HeroMap.tsx`
- `/Users/kangsoo/Desktop/GottaGo/apps/mobile/App.tsx`
- `/Users/kangsoo/Desktop/GottaGo/apps/mobile/package.json`

확인할 것:

- `react-native-webview` 가 mobile dependency에 추가됐는지
- `HeroMap` 이 `provider` prop을 받아 `mapbox` / `naver` 를 분기하는지
- Naver 경로에서 `oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=...` 를 사용하는지
- marker click 시 `window.ReactNativeWebView.postMessage(...)` 로 선택 이벤트를 React Native에 넘기는지
- 앱 화면에서 `Map engine` 카드로 `Mapbox` / `Naver` 를 전환할 수 있는지

핵심 포인트:

- Mapbox는 native 경로를 유지
- Naver는 dynamic map JS SDK를 `WebView` 안에서 렌더링
- 같은 `selectedToilet` 흐름을 두 지도 엔진에서 공통으로 재사용

## 4. 모바일 hook/lint 정리

파일:

- `/Users/kangsoo/Desktop/GottaGo/apps/mobile/App.tsx`

확인할 것:

- `useCurrentLocation` 이름이 hook처럼 오해되지 않도록 `handleUseCurrentLocation` 으로 바뀌었는지
- lint rule 위반이 제거됐는지

직접 확인:

```bash
sed -n '1,220p' apps/mobile/App.tsx
```

## 5. Naver geocoding 개선

파일:

- `/Users/kangsoo/Desktop/GottaGo/apps/api/scripts/buildPublicToiletCsvWithNaver.ts`

확인할 것:

- geocode host가 `maps.apigw.ntruss.com` 인지
- cache CSV 경로/읽기/쓰기 로직이 있는지
- `401`/`403` 에서 즉시 abort 하는지
- `geocoding_source` 컬럼이 추가됐는지

핵심 포인트:

- 같은 주소를 다시 호출하지 않도록 cache CSV를 별도로 유지
- 잘못된 호스트에서 발생하던 auth failure 문제 수정
- auth 오류가 나면 대량 요청 낭비 없이 바로 중단

직접 확인:

```bash
sed -n '1,260p' apps/api/scripts/buildPublicToiletCsvWithNaver.ts
sed -n '260,520p' apps/api/scripts/buildPublicToiletCsvWithNaver.ts
```

## 6. DB schema 재실행 안전성 개선

파일:

- `/Users/kangsoo/Desktop/GottaGo/apps/api/db/schema.sql`

확인할 것:

- `toilet_type`, `verification_status` enum 생성이 `DO $$ ... IF NOT EXISTS ... $$;` 형태인지
- schema 재적용 시 enum already exists 오류를 줄이도록 바뀌었는지

직접 확인:

```bash
sed -n '1,80p' apps/api/db/schema.sql
```

## 7. CSV import 성능 개선

파일:

- `/Users/kangsoo/Desktop/GottaGo/apps/api/scripts/importPublicToilets.ts`
- `/Users/kangsoo/Desktop/GottaGo/apps/api/scripts/importPublicToiletsCopy.ts`

확인할 것:

- 기존 row-by-row 반복 대신 batch import 구조인지
- `jsonb_to_recordset($1::jsonb)` 기반 upsert인지
- `chunkRows`, `toImportPayloadRow`, `importBatch` 같은 배치 함수가 추가됐는지
- `--batch-size=<count>` 옵션이 들어갔는지
- 진행 로그가 batch 단위로 출력되는지

핵심 포인트:

- 대량 import 시간을 줄이기 위한 구조 변경
- 한 row마다 round-trip 하던 것을 batch upsert로 전환
- `COPY` 기반 staging import fast path도 별도 스크립트로 추가됨

직접 확인:

```bash
sed -n '1,260p' apps/api/scripts/importPublicToilets.ts
sed -n '260,520p' apps/api/scripts/importPublicToilets.ts
sed -n '1,320p' apps/api/scripts/importPublicToiletsCopy.ts
```

## 8. README / 운영 문서 업데이트

파일:

- `/Users/kangsoo/Desktop/GottaGo/README.md`
- `/Users/kangsoo/Desktop/GottaGo/notice.md`
- `/Users/kangsoo/Desktop/GottaGo/docs/mobile-smoke-checklist.md`
- `/Users/kangsoo/Desktop/GottaGo/scripts/verify-local-stack.sh`
- `/Users/kangsoo/Desktop/GottaGo/plan/implementation-plan.md`
- `/Users/kangsoo/Desktop/GottaGo/complete/results-report.md`
- `/Users/kangsoo/Desktop/GottaGo/complete/issues-report.md`

확인할 것:

- README가 현재 검증된 실행 경로 기준으로 갱신됐는지
- `notice.md` 에 Expo/Mapbox/Naver/DB 함정이 정리됐는지
- `verify:stack` 과 mobile smoke checklist가 추가됐는지
- `results-report.md` 와 `issues-report.md` 에 완료/미완료 항목이 나뉘어 있는지

## 8-1. 모바일 API 에러 메시지 보강

파일:

- `/Users/kangsoo/Desktop/GottaGo/apps/mobile/services/toiletApi.ts`

확인할 것:

- 네트워크 실패 시 `config.apiBaseUrl` 이 메시지에 포함되는지
- 실제 디바이스에서 `localhost` 대신 LAN IP를 써야 한다는 안내가 들어가는지

## 9. Repo-local skill 추가

파일:

- `/Users/kangsoo/Desktop/GottaGo/.codex/skills/gottago-dev-workflow/SKILL.md`
- `/Users/kangsoo/Desktop/GottaGo/.codex/skills/gottago-dev-workflow/references/stack-notes.md`
- `/Users/kangsoo/Desktop/GottaGo/.codex/skills/gottago-dev-workflow/scripts/verify-local-stack.sh`

확인할 것:

- repo 전용 workflow skill이 생성됐는지
- reference와 helper script가 같이 들어있는지
- local stack 검증 명령이 정리돼 있는지

## 10. 현재 직접 검증된 상태

직접 검증 완료:

- `npm run lint`
- `npm run build --workspace @gottago/api`
- `npx tsc -p apps/mobile/tsconfig.json --noEmit`
- DB row count `49,998`
- `GET /health`
- `GET /toilets/nearby?...`

아직 남은 것:

- Expo 포트 `65536` 문제의 근본 해결
- skill 전역 설치 여부

## 11. 추천 확인 순서

1. `npm run lint`
2. `apps/mobile/App.tsx`
3. `apps/mobile/data/toilets.ts`
4. `apps/mobile/components/HeroMap.tsx`
5. `apps/mobile/package.json`
6. `apps/mobile/components/ToiletDetailSheet.tsx`
7. `apps/api/scripts/buildPublicToiletCsvWithNaver.ts`
8. `apps/api/scripts/importPublicToilets.ts`
9. `apps/api/db/schema.sql`
10. `README.md`
11. `complete/results-report.md`
12. `complete/issues-report.md`
