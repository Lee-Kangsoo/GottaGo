# GottaGo Project Structure Guide

이 문서는 현재 GottaGo 프로젝트를 처음 읽는 사람을 위해 작성한 구조 설명서입니다.
목표는 "어디서부터 읽어야 하는지", "각 파일이 어떤 책임을 가지는지", "데이터가 어떻게 흐르는지"를 빠르게 이해하도록 돕는 것입니다.

## 1. 프로젝트를 한 문장으로 보면

현재 GottaGo는 "지금 당장 사용할 수 있는 가장 가까운 화장실"을 빠르게 보여주는 MVP입니다.

구조는 크게 두 축으로 나뉩니다.

- `apps/mobile`: 사용자가 보는 React Native 앱
- `apps/api`: 화장실 데이터를 제공하는 Express API

즉, 모바일 앱이 좌표를 기준으로 API에 "근처 화장실을 달라"고 요청하고,
API는 mock 데이터 또는 PostGIS 데이터베이스에서 결과를 반환하는 구조입니다.

## 2. 최상위 폴더 구조

```text
.
├── apps/
│   ├── api/        # 백엔드 API
│   └── mobile/     # Expo 기반 모바일 앱
├── docs/           # 사람이 읽는 설명 문서
├── plan/           # 작업 계획
├── complete/       # 작업 결과 보고서
├── README.md       # 실행 및 환경 설명
└── AGENTS.md       # 이 저장소에서 작업할 때의 우선순위와 가이드
```

처음 읽을 때 추천 순서는 다음과 같습니다.

1. `README.md`
2. `apps/mobile/App.tsx`
3. `apps/mobile/services/toiletApi.ts`
4. `apps/api/src/index.ts`
5. `apps/api/src/routes/toilets.ts`
6. `apps/api/src/services/toiletService.ts`
7. `apps/api/db/schema.sql`

이 순서로 보면 "화면 -> API 호출 -> 서버 라우팅 -> 실제 조회" 흐름이 자연스럽게 이어집니다.

## 3. Mobile 앱 구조

모바일 앱의 핵심은 `apps/mobile/App.tsx`입니다.
이 파일이 현재 MVP 화면의 조립 지점이며, 상태 관리와 데이터 로딩의 중심입니다.

### 핵심 파일

- `apps/mobile/App.tsx`
  - 앱의 메인 화면입니다.
  - 현재 선택한 검색 위치, 선택한 화장실, 로딩 상태, 에러 상태를 관리합니다.
  - `fetchNearbyToilets`를 호출해 데이터를 가져오고, 지도/리스트 화면에 전달합니다.

- `apps/mobile/services/toiletApi.ts`
  - 모바일에서 화장실 데이터를 가져오는 서비스 계층입니다.
  - mock 모드면 로컬 배열을 사용하고, 실제 API 모드면 `/toilets/nearby`를 호출합니다.
  - 즉, 화면 컴포넌트가 네트워크 세부 구현을 직접 알지 않도록 분리한 파일입니다.

- `apps/mobile/components/HeroMap.tsx`
  - 지도 표현을 담당합니다.
  - Mapbox, Naver, fallback preview 중 어떤 방식을 쓸지 결정합니다.
  - 중요한 점은 "같은 화장실 데이터"를 서로 다른 지도 엔진 위에 올려서 보여준다는 점입니다.

- `apps/mobile/components/ToiletCard.tsx`
  - 리스트 뷰에서 화장실 한 개를 카드 형태로 렌더링합니다.

- `apps/mobile/components/ToiletDetailSheet.tsx`
  - 현재 선택된 화장실의 상세 정보를 보여줍니다.

- `apps/mobile/components/FilterBar.tsx`
  - 현재는 UI 중심의 필터 표시 컴포넌트입니다.
  - 실제 필터 로직은 아직 강하게 연결되어 있지 않고, MVP 표현 레이어에 가깝습니다.

- `apps/mobile/components/ViewToggle.tsx`
  - map/list 보기 전환 UI입니다.

- `apps/mobile/constants/config.ts`
  - Expo 환경변수를 앱 내부에서 쓰기 쉬운 형태로 정리합니다.
  - "mock 데이터를 쓸지", "API base URL이 무엇인지", "지도 엔진 기본값이 무엇인지"를 여기서 정합니다.

- `apps/mobile/data/toilets.ts`
  - mock 모드에서 사용하는 샘플 데이터입니다.

- `apps/mobile/types/toilet.ts`
  - 모바일 앱에서 사용하는 화장실 타입 정의입니다.

## 4. API 구조

API의 시작점은 `apps/api/src/index.ts`입니다.
Express 앱을 만들고, 공통 미들웨어를 붙이고, 라우터를 연결하는 전형적인 구조입니다.

### 핵심 파일

- `apps/api/src/index.ts`
  - 서버 엔트리포인트입니다.
  - `/health`와 `/toilets` 라우터를 연결합니다.

- `apps/api/src/routes/toilets.ts`
  - `/toilets/nearby` 요청을 받는 라우터입니다.
  - query parameter를 검증하고, 서비스 계층으로 넘깁니다.
  - 여기서는 입력 검증이 핵심 책임입니다.

- `apps/api/src/services/toiletService.ts`
  - 실제 "근처 화장실 조회" 비즈니스 로직이 들어 있습니다.
  - DB가 없으면 mock 데이터를 반환하고,
  - DB가 있으면 PostGIS 쿼리로 거리 기반 결과를 가져옵니다.

- `apps/api/src/services/db.ts`
  - PostgreSQL 연결 풀을 생성하고 재사용합니다.
  - `USE_MOCK_DATA=true` 이거나 `DATABASE_URL`이 없으면 `null`을 반환해 mock 모드로 빠지게 만듭니다.

- `apps/api/src/config/env.ts`
  - 환경변수를 읽고 검증합니다.
  - "앱이 어떤 모드로 동작해야 하는지"를 안전하게 결정하는 파일입니다.

- `apps/api/src/types/toilet.ts`
  - API가 반환하는 화장실 도메인 타입 정의입니다.

## 5. DB 구조

DB는 PostgreSQL + PostGIS를 전제로 합니다.

- `apps/api/db/schema.sql`
  - 화장실 테이블과 관련 타입을 정의합니다.
  - 핵심은 위치를 `geography`로 저장하고 거리 기반 질의를 가능하게 하는 것입니다.

- `apps/api/db/seed.sql`
  - 초기 샘플 데이터를 넣는 파일입니다.

현재 핵심 질의는 다음 질문을 해결하기 위한 것입니다.

"사용자 좌표를 중심으로 일정 반경 안에 있는 화장실을 거리순으로 가져와라."

그래서 `ST_DWithin`과 `ST_Distance`가 중요한 역할을 합니다.

## 6. 데이터 흐름

현재 가장 중요한 실행 흐름은 아래와 같습니다.

1. 사용자가 앱에서 기준 위치를 선택합니다.
2. `App.tsx`가 `fetchNearbyToilets(...)`를 호출합니다.
3. `toiletApi.ts`가 mock 데이터 또는 실제 API를 선택합니다.
4. API 모드라면 `/toilets/nearby` 요청이 서버로 갑니다.
5. `routes/toilets.ts`가 query를 검증합니다.
6. `toiletService.ts`가 mock 또는 DB 조회를 수행합니다.
7. 결과가 모바일 앱으로 돌아오고, 지도와 리스트에 렌더링됩니다.

이 흐름이 현재 프로젝트의 "가장 먼저 이해해야 하는 메인 파이프라인"입니다.

## 7. import 스크립트 구조

공공 화장실 CSV를 DB에 넣는 작업은 아래 스크립트들이 담당합니다.

- `apps/api/scripts/importPublicToilets.ts`
- `apps/api/scripts/importPublicToilets.js`
- `apps/api/scripts/importPublicToiletsCopy.ts`
- `apps/api/scripts/buildPublicToiletCsvWithNaver.ts`

특히 `importPublicToilets.js`는 다음 단계를 수행합니다.

1. CSV 파일을 `cp949` 인코딩으로 읽습니다.
2. 행 단위로 파싱합니다.
3. 서비스에 필요한 필드만 정규화합니다.
4. 좌표가 없거나 미개방인 행은 제외합니다.
5. 각 행을 DB 스키마에 맞는 형태로 바꿉니다.
6. `source_record_id` 기준으로 upsert 합니다.

이 스크립트는 "원본 공공 데이터"를 "앱이 바로 쓸 수 있는 구조화된 DB 레코드"로 변환하는 ETL 역할을 합니다.

## 8. 코드 읽을 때의 기준점

이 프로젝트는 아직 Phase 1 MVP 중심이기 때문에,
모든 파일을 같은 무게로 읽기보다 아래 우선순위로 읽는 것이 좋습니다.

### 1순위: 사용자 경험 흐름

- `apps/mobile/App.tsx`
- `apps/mobile/components/HeroMap.tsx`
- `apps/mobile/services/toiletApi.ts`

### 2순위: 서버 응답 흐름

- `apps/api/src/index.ts`
- `apps/api/src/routes/toilets.ts`
- `apps/api/src/services/toiletService.ts`

### 3순위: 데이터 적재 흐름

- `apps/api/db/schema.sql`
- `apps/api/scripts/importPublicToilets.js`

## 9. 현재 코드의 성격

현재 코드는 완성형 제품이라기보다 "작동하는 MVP 뼈대"에 가깝습니다.
그래서 각 파일은 다음 성격을 띱니다.

- UI 컴포넌트: 빠르게 map-first UX를 보여주기 위한 구조
- API 서비스: mock -> real DB 전환이 쉬운 구조
- import 스크립트: 공공 데이터를 초기에 안정적으로 들여오기 위한 구조

즉, 지금 단계에서 중요한 것은 "복잡한 기능 수"보다
"빠르게 검색되고, 지도에서 보고, 실제 데이터로 연결되는 기본 루프"입니다.

## 10. 다음에 설명을 더 붙이기 좋은 지점

현재 이후에 설명을 확장하기 좋은 파일은 다음과 같습니다.

- `apps/api/db/schema.sql`: 컬럼별 설계 의도 주석
- `apps/mobile/App.tsx`: 상태 변화 흐름도
- `apps/mobile/components/HeroMap.tsx`: Mapbox/Naver 분기 구조 설명
- `apps/api/scripts/importPublicToilets.ts`: ETL 단계별 주석 강화

이 문서를 먼저 읽고, 그 다음 각 파일 상단 주석을 따라가면 현재 프로젝트를 훨씬 빠르게 파악할 수 있습니다.
