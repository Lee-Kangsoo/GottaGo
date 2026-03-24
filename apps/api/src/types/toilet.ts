export type ToiletType = "public" | "community" | "host_opened";

export interface ToiletRecord {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  isAccessible: boolean;
  isFree: boolean;
  isOpenNow: boolean;
  lastVerifiedAt: string;
  openingHours: string;
  toiletType: ToiletType;
}
