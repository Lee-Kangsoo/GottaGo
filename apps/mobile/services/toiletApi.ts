import { config } from "../constants/config";
import { toilets } from "../data/toilets";
import { ToiletRecord } from "../types/toilet";

// This file hides the difference between mock mode and real API mode so UI
// components can always call one function for "nearby toilets".
interface NearbyToiletParams {
  latitude: number;
  longitude: number;
  openNow?: boolean;
}

interface NearbyToiletResponse {
  data: ToiletRecord[];
  meta: {
    count: number;
    filters: {
      openNow?: boolean;
    };
  };
}

function getDistanceMeters(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
): number {
  // Haversine formula for mock-mode distance sorting.
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const deltaLatitude = toRadians(toLatitude - fromLatitude);
  const deltaLongitude = toRadians(toLongitude - fromLongitude);
  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(toRadians(fromLatitude)) *
      Math.cos(toRadians(toLatitude)) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);

  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function buildNearbyUrl(params: NearbyToiletParams): string {
  const url = new URL("/toilets/nearby", config.apiBaseUrl);

  url.searchParams.set("latitude", String(params.latitude));
  url.searchParams.set("longitude", String(params.longitude));

  if (params.openNow !== undefined) {
    url.searchParams.set("openNow", String(params.openNow));
  }

  return url.toString();
}

function getMockNearbyToilets(params: NearbyToiletParams): NearbyToiletResponse {
  const filtered = params.openNow
    ? toilets.filter((toilet) => toilet.isOpenNow)
    : toilets;
  const withDistance = filtered.map((toilet) => ({
    ...toilet,
    distanceMeters: getDistanceMeters(
      params.latitude,
      params.longitude,
      toilet.latitude,
      toilet.longitude,
    ),
  }));

  return {
    data: withDistance.sort((left, right) => left.distanceMeters - right.distanceMeters),
    meta: {
      count: withDistance.length,
      filters: {
        openNow: params.openNow,
      },
    },
  };
}

export async function fetchNearbyToilets(
  params: NearbyToiletParams,
): Promise<NearbyToiletResponse> {
  if (config.useMockData) {
    // Local mock mode is useful when the API or DB is not running yet.
    return getMockNearbyToilets(params);
  }

  let response: Response;

  try {
    response = await fetch(buildNearbyUrl(params));
  } catch (error) {
    const baseMessage =
      error instanceof Error ? error.message : "Unknown network error";

    throw new Error(
      `Failed to reach the toilet API at ${config.apiBaseUrl}. ${baseMessage} If this is a real device, replace localhost with your computer's LAN IP.`,
    );
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch toilets: ${response.status}`);
  }

  return (await response.json()) as NearbyToiletResponse;
}
