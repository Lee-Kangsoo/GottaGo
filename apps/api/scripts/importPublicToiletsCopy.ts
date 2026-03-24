import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

import { parse } from "csv-parse/sync";
import iconv from "iconv-lite";
import { PoolClient } from "pg";
import { from as copyFrom } from "pg-copy-streams";

import { env } from "../src/config/env.js";
import { getPool } from "../src/services/db.js";

type CsvRow = {
  관리번호: string;
  구분명: string;
  화장실명: string;
  소재지도로명주소: string;
  소재지지번주소: string;
  개방시간: string;
  개방시간상세: string;
  WGS84위도: string;
  WGS84경도: string;
  화장실소유구분명: string;
  관리기관명: string;
  전화번호: string;
  비상벨설치여부: string;
  화장실입구CCTV설치유무: string;
  기저귀교환대유무: string;
  남성용장애인용대변기수?: string;
  여성용장애인용대변기수?: string;
  "남성용-장애인용대변기수"?: string;
  "여성용-장애인용대변기수"?: string;
  최종수정시점: string;
};

interface NormalizedToilet {
  id: string;
  sourceRecordId: string;
  name: string;
  address: string;
  toiletType: "public";
  latitude: number;
  longitude: number;
  openingHours: string;
  openingHoursDetail: string | null;
  isOpenNow: boolean | null;
  isAccessible: boolean;
  isFree: boolean;
  ownerType: string | null;
  managingOrg: string | null;
  phone: string | null;
  hasEmergencyBell: boolean;
  hasEntranceCctv: boolean;
  hasDiaperTable: boolean;
  source: string;
  rawSource: Record<string, string>;
  lastVerifiedAt: string | null;
}

type SkipReason =
  | "unsupported_category"
  | "closed_to_public"
  | "missing_coordinates"
  | "missing_source_record_id"
  | "missing_name"
  | "missing_address";

const allowedCategories = new Set(["공중화장실", "개방화장실"]);
const sourceName = "korea_public_toilet_csv";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const stagingTableName = "toilets_import_staging";

function resolveDefaultCsvPath(): string {
  const candidates = [
    path.resolve(scriptDir, "../../../korea_public_toilet.csv"),
    path.resolve(scriptDir, "../../../../korea_public_toilet.csv"),
    path.resolve(process.cwd(), "../../korea_public_toilet.csv"),
    path.resolve(process.cwd(), "../korea_public_toilet.csv"),
    path.resolve(process.cwd(), "korea_public_toilet.csv"),
  ];

  const matched = candidates.find((candidate) => existsSync(candidate));

  return matched ?? candidates[0];
}

function toDeterministicUuid(value: string): string {
  const hash = createHash("md5").update(value).digest("hex");

  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `5${hash.slice(13, 16)}`,
    `a${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join("-");
}

function getAccessibleCount(row: CsvRow, key: "male" | "female"): number {
  const field =
    key === "male"
      ? row["남성용-장애인용대변기수"] ?? row.남성용장애인용대변기수 ?? "0"
      : row["여성용-장애인용대변기수"] ?? row.여성용장애인용대변기수 ?? "0";

  const parsed = Number.parseInt(field, 10);

  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeOpenNow(row: CsvRow): boolean | null {
  if (row.개방시간 === "상시") {
    return true;
  }

  if (row.개방시간 === "미개방") {
    return false;
  }

  return null;
}

function getSkipReason(row: CsvRow): SkipReason | null {
  if (!allowedCategories.has(row.구분명)) {
    return "unsupported_category";
  }

  if (row.개방시간 === "미개방") {
    return "closed_to_public";
  }

  const latitude = Number.parseFloat(row.WGS84위도);
  const longitude = Number.parseFloat(row.WGS84경도);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return "missing_coordinates";
  }

  const sourceRecordId = row.관리번호?.trim();
  if (!sourceRecordId) {
    return "missing_source_record_id";
  }

  const name = row.화장실명?.trim();
  if (!name) {
    return "missing_name";
  }

  const address = row.소재지도로명주소?.trim() || row.소재지지번주소?.trim();
  if (!address) {
    return "missing_address";
  }

  return null;
}

function normalizeRow(row: CsvRow): NormalizedToilet | null {
  const skipReason = getSkipReason(row);

  if (skipReason) {
    return null;
  }

  const latitude = Number.parseFloat(row.WGS84위도);
  const longitude = Number.parseFloat(row.WGS84경도);
  const sourceRecordId = row.관리번호?.trim() as string;
  const name = row.화장실명?.trim() as string;
  const address = (row.소재지도로명주소?.trim() || row.소재지지번주소?.trim()) as string;
  const openingHoursParts = [row.개방시간?.trim(), row.개방시간상세?.trim()].filter(Boolean);

  return {
    id: toDeterministicUuid(sourceRecordId),
    sourceRecordId,
    name,
    address,
    toiletType: "public",
    latitude,
    longitude,
    openingHours: openingHoursParts.join(" / "),
    openingHoursDetail: row.개방시간상세?.trim() || null,
    isOpenNow: normalizeOpenNow(row),
    isAccessible: getAccessibleCount(row, "male") > 0 || getAccessibleCount(row, "female") > 0,
    isFree: true,
    ownerType: row.화장실소유구분명?.trim() || null,
    managingOrg: row.관리기관명?.trim() || null,
    phone: row.전화번호?.trim() || null,
    hasEmergencyBell: row.비상벨설치여부 === "Y",
    hasEntranceCctv: row.화장실입구CCTV설치유무 === "Y",
    hasDiaperTable: row.기저귀교환대유무 === "Y",
    source: sourceName,
    rawSource: row,
    lastVerifiedAt: row.최종수정시점?.trim() || null,
  };
}

function loadCsv(csvPath: string): CsvRow[] {
  const fileBuffer = readFileSync(csvPath);
  const decoded = iconv.decode(fileBuffer, "cp949");

  return parse(decoded, {
    columns: true,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRow[];
}

function toCopyValue(value: string | number | boolean | null): string {
  if (value === null) {
    return "\\N";
  }

  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\t/g, "\\t")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

function toCopyLine(toilet: NormalizedToilet): string {
  return [
    toilet.id,
    toilet.sourceRecordId,
    toilet.name,
    toilet.address,
    toilet.toiletType,
    toilet.longitude,
    toilet.latitude,
    toilet.openingHours,
    toilet.openingHoursDetail,
    toilet.isOpenNow,
    toilet.isAccessible,
    toilet.isFree,
    toilet.ownerType,
    toilet.managingOrg,
    toilet.phone,
    toilet.hasEmergencyBell,
    toilet.hasEntranceCctv,
    toilet.hasDiaperTable,
    toilet.source,
    JSON.stringify(toilet.rawSource),
    toilet.lastVerifiedAt,
  ]
    .map((value) => toCopyValue(value ?? null))
    .join("\t");
}

async function createStagingTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TEMP TABLE ${stagingTableName} (
      id text NOT NULL,
      source_record_id text NOT NULL,
      name text NOT NULL,
      address text NOT NULL,
      toilet_type text NOT NULL,
      longitude double precision NOT NULL,
      latitude double precision NOT NULL,
      opening_hours text,
      opening_hours_detail text,
      is_open_now boolean,
      is_accessible boolean NOT NULL,
      is_free boolean NOT NULL,
      owner_type text,
      managing_org text,
      phone text,
      has_emergency_bell boolean NOT NULL,
      has_entrance_cctv boolean NOT NULL,
      has_diaper_table boolean NOT NULL,
      source text,
      raw_source jsonb,
      last_verified_at text
    ) ON COMMIT DROP
  `);
}

async function copyIntoStaging(client: PoolClient, toilets: NormalizedToilet[]): Promise<void> {
  const stream = client.query(
    copyFrom(
      `COPY ${stagingTableName} (
        id,
        source_record_id,
        name,
        address,
        toilet_type,
        longitude,
        latitude,
        opening_hours,
        opening_hours_detail,
        is_open_now,
        is_accessible,
        is_free,
        owner_type,
        managing_org,
        phone,
        has_emergency_bell,
        has_entrance_cctv,
        has_diaper_table,
        source,
        raw_source,
        last_verified_at
      ) FROM STDIN WITH (FORMAT text)`
    ),
  );

  const source = Readable.from(toilets.map((toilet) => `${toCopyLine(toilet)}\n`));
  await pipeline(source, stream);
}

async function mergeStagingIntoToilets(client: PoolClient): Promise<void> {
  await client.query(`
    INSERT INTO toilets (
      id,
      source_record_id,
      name,
      address,
      toilet_type,
      location,
      opening_hours,
      opening_hours_detail,
      is_open_now,
      is_accessible,
      is_free,
      owner_type,
      managing_org,
      phone,
      has_emergency_bell,
      has_entrance_cctv,
      has_diaper_table,
      verification_status,
      source,
      raw_source,
      last_verified_at
    )
    SELECT
      staging.id::uuid,
      staging.source_record_id,
      staging.name,
      staging.address,
      staging.toilet_type::toilet_type,
      ST_SetSRID(ST_MakePoint(staging.longitude, staging.latitude), 4326)::geography,
      staging.opening_hours,
      staging.opening_hours_detail,
      staging.is_open_now,
      staging.is_accessible,
      staging.is_free,
      staging.owner_type,
      staging.managing_org,
      staging.phone,
      staging.has_emergency_bell,
      staging.has_entrance_cctv,
      staging.has_diaper_table,
      'verified'::verification_status,
      staging.source,
      staging.raw_source,
      staging.last_verified_at::timestamptz
    FROM ${stagingTableName} AS staging
    ON CONFLICT (source_record_id)
    DO UPDATE SET
      name = EXCLUDED.name,
      address = EXCLUDED.address,
      toilet_type = EXCLUDED.toilet_type,
      location = EXCLUDED.location,
      opening_hours = EXCLUDED.opening_hours,
      opening_hours_detail = EXCLUDED.opening_hours_detail,
      is_open_now = EXCLUDED.is_open_now,
      is_accessible = EXCLUDED.is_accessible,
      is_free = EXCLUDED.is_free,
      owner_type = EXCLUDED.owner_type,
      managing_org = EXCLUDED.managing_org,
      phone = EXCLUDED.phone,
      has_emergency_bell = EXCLUDED.has_emergency_bell,
      has_entrance_cctv = EXCLUDED.has_entrance_cctv,
      has_diaper_table = EXCLUDED.has_diaper_table,
      source = EXCLUDED.source,
      raw_source = EXCLUDED.raw_source,
      last_verified_at = EXCLUDED.last_verified_at,
      updated_at = NOW()
  `);
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const fileArgument = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
  const csvPath = fileArgument ? path.resolve(fileArgument) : resolveDefaultCsvPath();
  const rows = loadCsv(csvPath);
  const skipSummary = rows.reduce<Record<SkipReason, number>>(
    (summary, row) => {
      const reason = getSkipReason(row);

      if (reason) {
        summary[reason] += 1;
      }

      return summary;
    },
    {
      unsupported_category: 0,
      closed_to_public: 0,
      missing_coordinates: 0,
      missing_source_record_id: 0,
      missing_name: 0,
      missing_address: 0,
    },
  );
  const normalized = rows.map(normalizeRow).filter(Boolean) as NormalizedToilet[];

  if (isDryRun) {
    console.log(
      JSON.stringify(
        {
          mode: "copy",
          csvPath,
          totalRows: rows.length,
          importableRows: normalized.length,
          skippedRows: rows.length - normalized.length,
          skippedByReason: skipSummary,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (env.USE_MOCK_DATA || !env.DATABASE_URL) {
    throw new Error("Set USE_MOCK_DATA=false and DATABASE_URL before importing CSV data.");
  }

  const pool = getPool();

  if (!pool) {
    throw new Error("Database pool is unavailable.");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await createStagingTable(client);
    await copyIntoStaging(client, normalized);
    console.log(JSON.stringify({ mode: "copy", stage: "copied_to_staging", rows: normalized.length }, null, 2));
    await mergeStagingIntoToilets(client);
    await client.query("COMMIT");
    console.log(
      JSON.stringify(
        {
          mode: "copy",
          csvPath,
          imported: normalized.length,
          skipped: rows.length - normalized.length,
          skippedByReason: skipSummary,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

void main();
