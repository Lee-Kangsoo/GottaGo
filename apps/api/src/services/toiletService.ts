import { getPool } from "./db.js";
import { ToiletRecord } from "../types/toilet.js";

// Mock data keeps the mobile flow usable even before PostGIS is connected.
const mockToilets: ToiletRecord[] = [
  {
    id: "toilet_001",
    name: "City Hall Public Restroom",
    address: "110 Sejong-daero, Jung-gu",
    latitude: 37.5663,
    longitude: 126.9779,
    distanceMeters: 180,
    isAccessible: true,
    isFree: true,
    isOpenNow: true,
    lastVerifiedAt: "2026-03-13T09:00:00Z",
    openingHours: "06:00-23:00",
    toiletType: "public",
  },
  {
    id: "toilet_002",
    name: "Seoul Plaza Station Toilet",
    address: "2 Taepyeong-ro 1-ga, Jung-gu",
    latitude: 37.5658,
    longitude: 126.9784,
    distanceMeters: 320,
    isAccessible: true,
    isFree: true,
    isOpenNow: true,
    lastVerifiedAt: "2026-03-13T11:10:00Z",
    openingHours: "24 hours",
    toiletType: "public",
  },
  {
    id: "toilet_003",
    name: "Deoksugung Side Entrance",
    address: "99 Sejong-daero, Jung-gu",
    latitude: 37.5651,
    longitude: 126.9751,
    distanceMeters: 540,
    isAccessible: false,
    isFree: true,
    isOpenNow: false,
    lastVerifiedAt: "2026-03-13T07:45:00Z",
    openingHours: "09:00-18:00",
    toiletType: "public",
  },
];

interface NearbyToiletParams {
  latitude: number;
  longitude: number;
  openNow?: boolean;
  radiusMeters?: number;
  toiletType?: ToiletRecord["toiletType"];
}

function getMockNearbyToilets({
  openNow,
  radiusMeters,
  toiletType,
}: NearbyToiletParams): ToiletRecord[] {
  // The mock path mirrors the DB query shape closely so the client can switch
  // between mock and real data without changing UI logic.
  const filtered = openNow
    ? mockToilets.filter((toilet) => toilet.isOpenNow)
    : mockToilets;

  return filtered
    .filter((toilet) => (radiusMeters ? toilet.distanceMeters <= radiusMeters : true))
    .filter((toilet) => (toiletType ? toilet.toiletType === toiletType : true))
    .sort((left, right) => left.distanceMeters - right.distanceMeters);
}

export async function getNearbyToilets({
  latitude,
  longitude,
  openNow,
  radiusMeters = 1500,
  toiletType,
}: NearbyToiletParams): Promise<ToiletRecord[]> {
  const pool = getPool();

  if (!pool) {
    // No DB means "development fallback mode".
    return getMockNearbyToilets({
      latitude,
      longitude,
      openNow,
      radiusMeters,
      toiletType,
    });
  }

  const result = await pool.query<ToiletRecord>(
    `
      -- PostGIS search:
      -- 1. keep toilets inside the requested radius
      -- 2. optionally filter by open-now / type
      -- 3. sort by actual distance from the user's point
      SELECT
        id::text,
        name,
        address,
        ST_Y(location::geometry) AS latitude,
        ST_X(location::geometry) AS longitude,
        ROUND(
          ST_Distance(
            location,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
          )
        )::int AS "distanceMeters",
        is_accessible AS "isAccessible",
        is_free AS "isFree",
        COALESCE(is_open_now, false) AS "isOpenNow",
        COALESCE(last_verified_at, NOW())::text AS "lastVerifiedAt",
        COALESCE(opening_hours, 'Unknown') AS "openingHours",
        toilet_type AS "toiletType"
      FROM toilets
      WHERE ST_DWithin(
        location,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
      AND ($4::boolean IS NULL OR is_open_now = $4)
      AND ($5::text IS NULL OR toilet_type::text = $5)
      ORDER BY "distanceMeters"
      LIMIT 50
    `,
    [longitude, latitude, radiusMeters, openNow ?? null, toiletType ?? null],
  );

  return result.rows;
}
