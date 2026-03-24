import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "GottaGo",
  slug: "gottago",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  assetBundlePatterns: ["**/*"],
  ios: {
    bundleIdentifier: "com.kangsoo.gottago",
    supportsTablet: true,
  },
  android: {
    package: "com.kangsoo.gottago",
  },
  plugins: [
    [
      "expo-location",
      {
        locationWhenInUsePermission: "Find toilets near you.",
      },
    ],
    "@rnmapbox/maps",
  ],
  extra: {
    mapboxAccessToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "",
    mapProvider: process.env.EXPO_PUBLIC_MAP_PROVIDER ?? "mapbox",
    naverMapClientId: process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID ?? "",
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4000",
    useMockData: process.env.EXPO_PUBLIC_USE_MOCK_DATA ?? "true",
  },
};

export default config;
