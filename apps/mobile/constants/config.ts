import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra as
  | {
      mapboxAccessToken?: string;
      mapProvider?: string;
      naverMapClientId?: string;
      apiBaseUrl?: string;
      useMockData?: string;
    }
  | undefined;

export const config: {
  apiBaseUrl: string;
  mapboxAccessToken: string;
  mapProvider: "mapbox" | "naver";
  naverMapClientId: string;
  useMockData: boolean;
} = {
  apiBaseUrl: extra?.apiBaseUrl ?? "http://localhost:4000",
  mapboxAccessToken: extra?.mapboxAccessToken ?? "",
  mapProvider: extra?.mapProvider === "naver" ? "naver" : "mapbox",
  naverMapClientId: extra?.naverMapClientId ?? "",
  useMockData: extra?.useMockData !== "false",
};
