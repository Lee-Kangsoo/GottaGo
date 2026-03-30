# Korea Public Toilet CSV Analysis

Source file:

- `data/private/korea_public_toilet.csv`

Purpose:

- evaluate whether this public dataset can power the Phase 1 public toilet MVP
- define a safe import strategy for the app

## What The File Contains

The CSV is encoded in `cp949` and includes national public toilet records in Korea.

Important columns:

- `관리번호`
- `구분명`
- `화장실명`
- `소재지도로명주소`
- `소재지지번주소`
- `개방시간`
- `개방시간상세`
- `WGS84위도`
- `WGS84경도`
- `화장실소유구분명`
- `비상벨설치여부`
- `비상벨설치장소`
- `화장실입구CCTV설치유무`
- `기저귀교환대유무`
- `남성용-장애인용대변기수`
- `여성용-장애인용대변기수`
- `데이터기준일자`
- `최종수정시점`

## High-Level Findings

Parsed with proper CSV handling, the file currently contains:

- total rows: `53,393`
- rows missing latitude or longitude: `24,245`
- rows with usable coordinates: `29,148`

Category distribution:

- `공중화장실`: `28,641`
- `개방화장실`: `22,280`
- `간이화장실`: `2,214`
- `이동화장실`: `253`

Opening type distribution:

- `정시`: `25,107`
- `상시`: `22,210`
- empty: `4,643`
- `불규칙`: `877`
- `미개방`: `556`

Feature coverage:

- emergency bell: `20,789`
- entrance CCTV: `10,554`
- diaper table: `9,679`
- accessible stall present: `24,978`

Ownership examples:

- `공공기관-지방자치단체`
- `민간`
- `공공기관-지방공공기관(지방공기업/지방출자출연기관)`
- `공공기관-국가공공기관`

## Data Quality Risks

### 1. Coordinates Are Missing In Many Rows

About `45%` of rows do not have usable lat/lon.

Implication:

- the dataset cannot be imported as-is for map search
- we should only ship map-visible records that already have coordinates
- rows without coordinates should go into a repair queue, not the main map

### 2. Opening Hours Are Semi-Structured

`개방시간상세` contains mixed human-written formats such as:

- `월-금06:00~22:00 토-일09:00~18:00 공휴일 휴관`
- `10:30-20:30`
- `09:00-16:00/월~금`
- `평일9시간(09:00~18:00)`

Implication:

- `open now` cannot be treated as fully reliable from this file alone
- we should support `always_open`, `hours_text`, and `open_now_confidence`
- simple formats can be parsed automatically
- messy or irregular formats should remain text-only at first

### 3. Not Every Row Should Be Shown The Same Way

The file mixes:

- public toilets
- open toilets inside other facilities
- temporary/simple toilets
- mobile toilets

Implication:

- the app should not render every row as the same trust level or visual type
- `구분명` should become a visible badge or category

## Recommended MVP Import Rule

For Phase 1, import only rows that satisfy all of the following:

- latitude exists
- longitude exists
- `구분명` is one of:
  - `공중화장실`
  - `개방화장실`
- `개방시간` is not `미개방`

Optional:

- keep `간이화장실` and `이동화장실` in the database, but hide them from default search

Why:

- this gives a cleaner, more trustworthy map for urgent use
- the app goal is speed and confidence, not raw row count

## Recommended App Mapping

Map CSV fields into the app model like this:

- `id`: `관리번호`
- `name`: `화장실명`
- `address`: prefer `소재지도로명주소`, fallback `소재지지번주소`
- `latitude`: `WGS84위도`
- `longitude`: `WGS84경도`
- `toilet_type`: derived from `구분명`
- `source`: `korea_public_toilet_csv`
- `opening_hours_text`: combine `개방시간` + `개방시간상세`
- `is_always_open`: `개방시간 == 상시`
- `is_accessible`: true if male or female accessible stall count > 0
- `has_emergency_bell`: `비상벨설치여부 == Y`
- `has_entrance_cctv`: `화장실입구CCTV설치유무 == Y`
- `has_diaper_table`: `기저귀교환대유무 == Y`
- `owner_type`: `화장실소유구분명`
- `managing_org`: `관리기관명`
- `phone`: `전화번호`
- `installed_at`: `설치연월`
- `remodeled_at`: `리모델링연월`
- `source_updated_at`: `최종수정시점`

## Recommended Toilet Type Mapping

Internal app categories:

- `공중화장실` -> `public`
- `개방화장실` -> `public_open_partner`
- `간이화장실` -> `temporary`
- `이동화장실` -> `mobile`

For the user-facing MVP:

- default map shows `public` and `public_open_partner`
- `temporary` and `mobile` can be optional filters later

## How To Handle Open Now

Recommended first-pass logic:

- if `개방시간 == 상시` -> treat as open all day
- if `개방시간 == 미개방` -> exclude from search
- if `개방시간 == 정시` and `개방시간상세` matches simple hour format -> parse it
- if `개방시간 == 불규칙` or detail text is messy -> keep `hours_text` only and mark `open_now_confidence = low`
- if opening fields are empty -> `open_now = unknown`

Do not pretend this field is precise in MVP.

Show:

- `상시`
- parsed hours when reliable
- `시간 정보 확인 필요` when not reliable

## Best Way To Use This In The App

### Phase 1

Use this file as the seed dataset for verified public toilets.

Flow:

1. import clean rows into Postgres/PostGIS
2. expose nearby search from the backend
3. show them as the default trusted layer in the app

### Phase 2

Use user reports to improve bad or missing fields:

- missing coordinates
- inaccurate hours
- temporarily closed toilets
- wrong accessibility metadata

### Phase 3

Blend with user-submitted and host-open toilets, but keep source labels clear:

- official public data
- community-submitted
- host-opened

## Recommended Database Strategy

Use a staged import pipeline:

### Raw table

Store the CSV almost 그대로 for traceability.

Purpose:

- reimport safely
- audit source changes
- repair parsing later

### Normalized toilet table

Store cleaned, app-facing records.

Purpose:

- map search
- filters
- fast UI payloads

Suggested normalized flags:

- `is_visible`
- `is_always_open`
- `open_now_confidence`
- `is_accessible`
- `has_emergency_bell`
- `has_entrance_cctv`
- `has_diaper_table`
- `source_record_id`

## Concrete Recommendation

Yes, this file is good enough to power the first public toilet map.

But only if we use it carefully:

- import only rows with coordinates
- default to `공중화장실` and `개방화장실`
- do not overpromise `open now`
- keep original hour text visible
- use the backend to normalize and filter records before they reach the app

## Next Step

The best next implementation step is:

1. create an import script for this CSV
2. load cleaned rows into PostGIS
3. connect `/toilets/nearby` to the imported data

That will turn the current mock toilet list into a real nationwide public toilet layer.
