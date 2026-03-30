import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "csv-parse/sync";
import dotenv from "dotenv";
import iconv from "iconv-lite";

type CsvRow = Record<string, string>;

type CliOptions = {
  inputPath?: string;
  outputPath?: string;
  cachePath?: string;
  delayMs: number;
  limit?: number;
  overwrite: boolean;
  dryRun: boolean;
};

type NaverAddress = {
  roadAddress?: string;
  jibunAddress?: string;
  englishAddress?: string;
  x?: string;
  y?: string;
  distance?: number;
};

type NaverGeocodeResponse = {
  status?: string;
  meta?: {
    totalCount?: number;
  };
  addresses?: NaverAddress[];
  errorMessage?: string;
};

type GeocodeResult =
  | {
      status: "geocoded";
      latitude: string;
      longitude: string;
      query: string;
      matchedAddress: string;
      matchedType: "road" | "jibun";
      source: "api" | "cache";
    }
  | {
      status: "not_found" | "missing_address" | "existing_coordinates";
      query: string;
      matchedAddress: string;
      matchedType: "";
      source: "api" | "cache" | "";
    };

type GeocodeCacheRow = {
  query: string;
  status: "geocoded" | "not_found";
  latitude: string;
  longitude: string;
  matchedAddress: string;
  matchedType: "road" | "jibun" | "";
};

class NaverGeocodeApiError extends Error {
  readonly statusCode: number;
  readonly details: string;
  readonly shouldAbort: boolean;

  constructor(statusCode: number, details: string) {
    super(`Naver geocode request failed with ${statusCode}: ${details}`);
    this.name = "NaverGeocodeApiError";
    this.statusCode = statusCode;
    this.details = details;
    this.shouldAbort = statusCode === 401 || statusCode === 403;
  }
}

const geocodeStatusColumn = "geocoding_status";
const geocodeQueryColumn = "geocoding_query";
const geocodeMatchedAddressColumn = "geocoding_matched_address";
const geocodeMatchedTypeColumn = "geocoding_matched_type";
const geocodeErrorColumn = "geocoding_error";
const geocodeSourceColumn = "geocoding_source";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(scriptDir, "../.env") });
dotenv.config();

function parseArgs(argv: string[]): CliOptions {
  const positionals: string[] = [];
  let outputPath: string | undefined;
  let cachePath: string | undefined;
  let limit: number | undefined;
  let delayMs = Number.parseInt(process.env.NAVER_GEOCODE_DELAY_MS ?? "150", 10);
  let overwrite = false;
  let dryRun = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    switch (argument) {
      case "--output":
        outputPath = argv[index + 1];
        index += 1;
        break;
      case "--cache":
        cachePath = argv[index + 1];
        index += 1;
        break;
      case "--limit":
        limit = Number.parseInt(argv[index + 1] ?? "", 10);
        index += 1;
        break;
      case "--delay-ms":
        delayMs = Number.parseInt(argv[index + 1] ?? "", 10);
        index += 1;
        break;
      case "--overwrite":
        overwrite = true;
        break;
      case "--dry-run":
        dryRun = true;
        break;
      default:
        if (argument.startsWith("--")) {
          throw new Error(`Unknown argument: ${argument}`);
        }

        positionals.push(argument);
    }
  }

  if (!Number.isFinite(delayMs) || delayMs < 0) {
    throw new Error("delay-ms must be a non-negative integer.");
  }

  if (limit !== undefined && (!Number.isFinite(limit) || limit < 1)) {
    throw new Error("limit must be a positive integer.");
  }

  return {
    inputPath: positionals[0],
    outputPath: outputPath ?? positionals[1],
    cachePath,
    delayMs,
    limit,
    overwrite,
    dryRun,
  };
}

function resolveDefaultInputPath(): string {
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

function resolveDefaultOutputPath(inputPath: string): string {
  const parsedPath = path.parse(inputPath);

  return path.join(parsedPath.dir, `${parsedPath.name}.naver-geocoded${parsedPath.ext || ".csv"}`);
}

function resolveDefaultCachePath(inputPath: string): string {
  const parsedPath = path.parse(inputPath);

  return path.join(parsedPath.dir, `${parsedPath.name}.naver-geocode-cache.csv`);
}

function loadCsv(csvPath: string): { headers: string[]; rows: CsvRow[] } {
  const fileBuffer = readFileSync(csvPath);
  const decoded = iconv.decode(fileBuffer, "cp949");
  const records = parse(decoded, {
    columns: true,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRow[];

  const headers = records[0] ? Object.keys(records[0]) : [];

  return { headers, rows: records };
}

function loadGeocodeCache(cachePath: string): Map<string, GeocodeCacheRow> {
  if (!existsSync(cachePath)) {
    return new Map();
  }

  const { rows } = loadCsv(cachePath);
  const cache = new Map<string, GeocodeCacheRow>();

  for (const row of rows) {
    const query = (row.query ?? "").trim();
    const status = (row.status ?? "").trim();

    if (!query || (status !== "geocoded" && status !== "not_found")) {
      continue;
    }

    cache.set(query, {
      query,
      status,
      latitude: (row.latitude ?? "").trim(),
      longitude: (row.longitude ?? "").trim(),
      matchedAddress: (row.matchedAddress ?? "").trim(),
      matchedType:
        (row.matchedType ?? "").trim() === "road" || (row.matchedType ?? "").trim() === "jibun"
          ? ((row.matchedType ?? "").trim() as "road" | "jibun")
          : "",
    });
  }

  return cache;
}

function hasCoordinates(row: CsvRow): boolean {
  const latitude = Number.parseFloat((row.WGS84위도 ?? "").trim());
  const longitude = Number.parseFloat((row.WGS84경도 ?? "").trim());

  return Number.isFinite(latitude) && Number.isFinite(longitude);
}

function buildQueries(row: CsvRow): string[] {
  const roadAddress = (row.소재지도로명주소 ?? "").trim();
  const jibunAddress = (row.소재지지번주소 ?? "").trim();

  return [...new Set([roadAddress, jibunAddress].filter(Boolean))];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getRequiredEnv(name: "NAVER_MAPS_CLIENT_ID" | "NAVER_MAPS_CLIENT_SECRET"): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

async function geocodeAddress(query: string): Promise<NaverAddress | null> {
  const clientId = getRequiredEnv("NAVER_MAPS_CLIENT_ID");
  const clientSecret = getRequiredEnv("NAVER_MAPS_CLIENT_SECRET");

  const url = new URL("https://maps.apigw.ntruss.com/map-geocode/v2/geocode");
  url.searchParams.set("query", query);

  const response = await fetch(url, {
    headers: {
      "x-ncp-apigw-api-key-id": clientId,
      "x-ncp-apigw-api-key": clientSecret,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const bodyText = await response.text();
    let details = bodyText;

    try {
      const parsed = JSON.parse(bodyText) as {
        error?: {
          message?: string;
          details?: string;
        };
      };
      const parts = [parsed.error?.message, parsed.error?.details].filter(Boolean);

      if (parts.length > 0) {
        details = parts.join(" - ");
      }
    } catch {
      // Keep the raw response body when JSON parsing fails.
    }

    throw new NaverGeocodeApiError(response.status, details || "Unknown API error");
  }

  const payload = (await response.json()) as NaverGeocodeResponse;
  const firstAddress = payload.addresses?.[0];

  if (!firstAddress?.x || !firstAddress?.y) {
    return null;
  }

  return firstAddress;
}

function writeGeocodeCache(cachePath: string, cache: Map<string, GeocodeCacheRow>): void {
  const headers = ["query", "status", "latitude", "longitude", "matchedAddress", "matchedType"];
  const rows = [...cache.values()]
    .sort((left, right) => left.query.localeCompare(right.query, "ko"))
    .map((entry) => ({
      query: entry.query,
      status: entry.status,
      latitude: entry.latitude,
      longitude: entry.longitude,
      matchedAddress: entry.matchedAddress,
      matchedType: entry.matchedType,
    }));

  const csvContent = stringifyCsv(headers, rows);
  writeFileSync(cachePath, iconv.encode(csvContent, "cp949"));
}

async function geocodeRow(
  row: CsvRow,
  overwrite: boolean,
  cache: Map<string, GeocodeCacheRow>,
  onCacheWrite: () => void,
): Promise<GeocodeResult> {
  if (!overwrite && hasCoordinates(row)) {
    return {
      status: "existing_coordinates",
      query: "",
      matchedAddress: "",
      matchedType: "",
      source: "",
    };
  }

  const queries = buildQueries(row);

  if (queries.length === 0) {
    return {
      status: "missing_address",
      query: "",
      matchedAddress: "",
      matchedType: "",
      source: "",
    };
  }

  let usedApi = false;

  for (const query of queries) {
    const cached = cache.get(query);

    if (cached) {
      if (cached.status === "geocoded") {
        return {
          status: "geocoded",
          latitude: cached.latitude,
          longitude: cached.longitude,
          query,
          matchedAddress: cached.matchedAddress,
          matchedType: cached.matchedType === "road" ? "road" : "jibun",
          source: "cache",
        };
      }

      continue;
    }

    const result = await geocodeAddress(query);
    usedApi = true;

    if (!result?.x || !result?.y) {
      cache.set(query, {
        query,
        status: "not_found",
        latitude: "",
        longitude: "",
        matchedAddress: "",
        matchedType: "",
      });
      onCacheWrite();
      continue;
    }

    const matchedAddress = result.roadAddress?.trim() || result.jibunAddress?.trim() || query;
    const matchedType = result.roadAddress?.trim() ? "road" : "jibun";
    cache.set(query, {
      query,
      status: "geocoded",
      latitude: result.y,
      longitude: result.x,
      matchedAddress,
      matchedType,
    });
    onCacheWrite();

    return {
      status: "geocoded",
      latitude: result.y,
      longitude: result.x,
      query,
      matchedAddress,
      matchedType,
      source: "api",
    };
  }

  return {
    status: "not_found",
    query: queries[0],
    matchedAddress: "",
    matchedType: "",
    source: usedApi ? "api" : "cache",
  };
}

function toCsvValue(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }

  return value;
}

function stringifyCsv(headers: string[], rows: CsvRow[]): string {
  const lines = [headers.map(toCsvValue).join(",")];

  for (const row of rows) {
    lines.push(headers.map((header) => toCsvValue(row[header] ?? "")).join(","));
  }

  return lines.join("\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const inputPath = options.inputPath ? path.resolve(options.inputPath) : resolveDefaultInputPath();
  const outputPath = options.outputPath
    ? path.resolve(options.outputPath)
    : resolveDefaultOutputPath(inputPath);
  const cachePath = options.cachePath
    ? path.resolve(options.cachePath)
    : resolveDefaultCachePath(inputPath);
  const { headers, rows } = loadCsv(inputPath);
  const cache = loadGeocodeCache(cachePath);
  const outputHeaders = [...headers];

  for (const column of [
    geocodeStatusColumn,
    geocodeQueryColumn,
    geocodeMatchedAddressColumn,
    geocodeMatchedTypeColumn,
    geocodeErrorColumn,
    geocodeSourceColumn,
  ]) {
    if (!outputHeaders.includes(column)) {
      outputHeaders.push(column);
    }
  }

  if (options.dryRun) {
    const existingCoordinates = rows.filter((row) => hasCoordinates(row)).length;
    const missingAddress = rows.filter(
      (row) => !hasCoordinates(row) && buildQueries(row).length === 0,
    ).length;
    const rowsEligibleForLookup = rows.length - existingCoordinates - missingAddress;

    console.log(
      JSON.stringify(
        {
          inputPath,
          outputPath,
          cachePath,
          totalRows: rows.length,
          rowsEligibleForLookup,
          existingCoordinates,
          missingAddress,
          cachedQueries: cache.size,
          limit: options.limit ?? null,
          overwrite: options.overwrite,
          dryRun: true,
        },
        null,
        2,
      ),
    );
    return;
  }

  let attempted = 0;
  let geocoded = 0;
  let notFound = 0;
  let missingAddress = 0;
  let existingCoordinates = 0;
  let errored = 0;
  let cacheHits = 0;
  let apiRequests = 0;

  const persistCache = () => {
    writeGeocodeCache(cachePath, cache);
  };

  for (const [index, row] of rows.entries()) {
    const needsLookup = options.overwrite ? true : !hasCoordinates(row);

    if (!needsLookup) {
      row[geocodeStatusColumn] = "existing_coordinates";
      row[geocodeQueryColumn] = "";
      row[geocodeMatchedAddressColumn] = "";
      row[geocodeMatchedTypeColumn] = "";
      row[geocodeErrorColumn] = "";
      row[geocodeSourceColumn] = "";
      existingCoordinates += 1;
      continue;
    }

    if (options.limit !== undefined && attempted >= options.limit) {
      row[geocodeStatusColumn] = "limit_skipped";
      row[geocodeQueryColumn] = "";
      row[geocodeMatchedAddressColumn] = "";
      row[geocodeMatchedTypeColumn] = "";
      row[geocodeErrorColumn] = "";
      row[geocodeSourceColumn] = "";
      continue;
    }

    attempted += 1;
    row[geocodeErrorColumn] = "";

    try {
      const cacheSizeBeforeLookup = cache.size;
      const result = await geocodeRow(row, options.overwrite, cache, persistCache);

      row[geocodeStatusColumn] = result.status;
      row[geocodeQueryColumn] = result.query;
      row[geocodeMatchedAddressColumn] = result.matchedAddress;
      row[geocodeMatchedTypeColumn] = result.matchedType;
      row[geocodeSourceColumn] = result.source;

      if (result.status === "geocoded") {
        row.WGS84위도 = result.latitude;
        row.WGS84경도 = result.longitude;
        geocoded += 1;
      } else if (result.status === "not_found") {
        notFound += 1;
      } else if (result.status === "missing_address") {
        missingAddress += 1;
      } else if (result.status === "existing_coordinates") {
        existingCoordinates += 1;
      }

      if (result.source === "cache") {
        cacheHits += 1;
      }

      if (cache.size > cacheSizeBeforeLookup || result.source === "api") {
        apiRequests += 1;
      }
    } catch (error) {
      row[geocodeStatusColumn] = "error";
      row[geocodeQueryColumn] = buildQueries(row)[0] ?? "";
      row[geocodeMatchedAddressColumn] = "";
      row[geocodeMatchedTypeColumn] = "";
      row[geocodeErrorColumn] = error instanceof Error ? error.message : "Unknown error";
      row[geocodeSourceColumn] = "api";
      errored += 1;

      if (error instanceof NaverGeocodeApiError && error.shouldAbort) {
        const csvContent = stringifyCsv(outputHeaders, rows);
        writeFileSync(outputPath, iconv.encode(csvContent, "cp949"));
        persistCache();

        console.error(
          JSON.stringify(
            {
              aborted: true,
              reason: "naver_api_auth_error",
              statusCode: error.statusCode,
              message: error.message,
              details: error.details,
              attempted,
              geocoded,
              notFound,
              missingAddress,
              existingCoordinates,
              errored,
              cacheHits,
              apiRequests,
              cachedQueries: cache.size,
              outputPath,
              cachePath,
            },
            null,
            2,
          ),
        );

        process.exit(1);
      }
    }

    if (attempted % 100 === 0 || index === rows.length - 1) {
      console.log(
        JSON.stringify(
          {
            processedRows: index + 1,
            attempted,
            geocoded,
            notFound,
            missingAddress,
            existingCoordinates,
            errored,
            cacheHits,
            apiRequests,
            cachedQueries: cache.size,
          },
          null,
          2,
        ),
      );
    }

    if (options.delayMs > 0) {
      await sleep(options.delayMs);
    }
  }

  const summary = {
    inputPath,
    outputPath,
    cachePath,
    totalRows: rows.length,
    attempted,
    geocoded,
    notFound,
    missingAddress,
    existingCoordinates,
    errored,
    cacheHits,
    apiRequests,
    cachedQueries: cache.size,
    limit: options.limit ?? null,
    overwrite: options.overwrite,
    dryRun: false,
  };

  const csvContent = stringifyCsv(outputHeaders, rows);
  writeFileSync(outputPath, iconv.encode(csvContent, "cp949"));
  persistCache();
  console.log(JSON.stringify(summary, null, 2));
}

void main();
