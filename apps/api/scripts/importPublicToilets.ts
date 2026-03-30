import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "csv-parse/sync";
import iconv from "iconv-lite";
import { PoolClient } from "pg";

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

type ImportPayloadRow = {
  id: string;
  source_record_id: string;
  name: string;
  address: string;
  toilet_type: "public";
  longitude: number;
  latitude: number;
  opening_hours: string;
  opening_hours_detail: string | null;
  is_open_now: boolean | null;
  is_accessible: boolean;
  is_free: boolean;
  owner_type: string | null;
  managing_org: string | null;
  phone: string | null;
  has_emergency_bell: boolean;
  has_entrance_cctv: boolean;
  has_diaper_table: boolean;
  source: string;
  raw_source: Record<string, string>;
  last_verified_at: string | null;
};

const allowedCategories = new Set(["공중화장실", "개방화장실"]);
const sourceName = "korea_public_toilet_csv";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultBatchSize = 1000;

function resolveDefaultCsvPath(): string {
  const candidates = [
    path.resolve(scriptDir, "../../../data/private/korea_public_toilet.csv"),
    path.resolve(scriptDir, "../../../../data/private/korea_public_toilet.csv"),
    path.resolve(scriptDir, "../../../korea_public_toilet.csv"),
    path.resolve(scriptDir, "../../../../korea_public_toilet.csv"),
    path.resolve(process.cwd(), "data/private/korea_public_toilet.csv"),
    path.resolve(process.cwd(), "../data/private/korea_public_toilet.csv"),
    path.resolve(process.cwd(), "../../data/private/korea_public_toilet.csv"),
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

function chunkRows<T>(rows: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }

  return chunks;
}

function toImportPayloadRow(toilet: NormalizedToilet): ImportPayloadRow {
  return {
    id: toilet.id,
    source_record_id: toilet.sourceRecordId,
    name: toilet.name,
    address: toilet.address,
    toilet_type: toilet.toiletType,
    longitude: toilet.longitude,
    latitude: toilet.latitude,
    opening_hours: toilet.openingHours,
    opening_hours_detail: toilet.openingHoursDetail,
    is_open_now: toilet.isOpenNow,
    is_accessible: toilet.isAccessible,
    is_free: toilet.isFree,
    owner_type: toilet.ownerType,
    managing_org: toilet.managingOrg,
    phone: toilet.phone,
    has_emergency_bell: toilet.hasEmergencyBell,
    has_entrance_cctv: toilet.hasEntranceCctv,
    has_diaper_table: toilet.hasDiaperTable,
    source: toilet.source,
    raw_source: toilet.rawSource,
    last_verified_at: toilet.lastVerifiedAt,
  };
}

async function importBatch(client: PoolClient, batch: NormalizedToilet[]) {
  const payload = batch.map(toImportPayloadRow);

  await client.query(
    `
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
        imported.id::uuid,
        imported.source_record_id,
        imported.name,
        imported.address,
        imported.toilet_type::toilet_type,
        ST_SetSRID(ST_MakePoint(imported.longitude, imported.latitude), 4326)::geography,
        imported.opening_hours,
        imported.opening_hours_detail,
        imported.is_open_now,
        imported.is_accessible,
        imported.is_free,
        imported.owner_type,
        imported.managing_org,
        imported.phone,
        imported.has_emergency_bell,
        imported.has_entrance_cctv,
        imported.has_diaper_table,
        'verified'::verification_status,
        imported.source,
        imported.raw_source,
        imported.last_verified_at::timestamptz
      FROM jsonb_to_recordset($1::jsonb) AS imported(
        id text,
        source_record_id text,
        name text,
        address text,
        toilet_type text,
        longitude double precision,
        latitude double precision,
        opening_hours text,
        opening_hours_detail text,
        is_open_now boolean,
        is_accessible boolean,
        is_free boolean,
        owner_type text,
        managing_org text,
        phone text,
        has_emergency_bell boolean,
        has_entrance_cctv boolean,
        has_diaper_table boolean,
        source text,
        raw_source jsonb,
        last_verified_at text
      )
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
    `,
    [JSON.stringify(payload)],
  );
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const fileArgument = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
  const batchSizeArgument = process.argv.find((argument) => argument.startsWith("--batch-size="));
  const batchSize = batchSizeArgument
    ? Number.parseInt(batchSizeArgument.split("=")[1] ?? "", 10)
    : defaultBatchSize;

  if (!Number.isFinite(batchSize) || batchSize < 1) {
    throw new Error("batch-size must be a positive integer.");
  }

  const csvPath = fileArgument
    ? path.resolve(fileArgument)
    : resolveDefaultCsvPath();
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

    const batches = chunkRows(normalized, batchSize);

    for (const [index, batch] of batches.entries()) {
      await importBatch(client, batch);

      if ((index + 1) % 10 === 0 || index === batches.length - 1) {
        console.log(
          JSON.stringify(
            {
              csvPath,
              processedRows: Math.min((index + 1) * batchSize, normalized.length),
              totalImportableRows: normalized.length,
              batch: index + 1,
              totalBatches: batches.length,
              batchSize,
            },
            null,
            2,
          ),
        );
      }
    }

    await client.query("COMMIT");

    console.log(
      JSON.stringify(
        {
          csvPath,
          imported: normalized.length,
          batchSize,
          batches: batches.length,
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
