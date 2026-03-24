import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import { ToiletCard } from "./components/ToiletCard";
import { ToiletDetailSheet } from "./components/ToiletDetailSheet";
import { FilterBar } from "./components/FilterBar";
import { HeroMap } from "./components/HeroMap";
import { ViewToggle } from "./components/ViewToggle";
import { colors } from "./constants/colors";
import { config } from "./constants/config";
import { fetchNearbyToilets } from "./services/toiletApi";
import { ToiletRecord } from "./types/toilet";

// The mobile app shell owns the current search origin, loads nearby toilets,
// and passes the same dataset into both the map and list experiences.
interface SearchLocation {
  key: string;
  label: string;
  latitude: number;
  longitude: number;
}

const locationPresets: SearchLocation[] = [
  {
    key: "gangnam",
    label: "Gangnam Station",
    latitude: 37.4979,
    longitude: 127.0276,
  },
  {
    key: "seoul",
    label: "Seoul Station",
    latitude: 37.5547,
    longitude: 126.9706,
  },
  {
    key: "suji",
    label: "Suji-gu Office Station",
    latitude: 37.3221,
    longitude: 127.0957,
  },
];

function getDistanceLabel(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${distanceMeters}m`;
  }

  return `${(distanceMeters / 1000).toFixed(1)}km`;
}

function filterToilets(records: ToiletRecord[]): ToiletRecord[] {
  // The MVP currently prioritizes "usable right now" above all other filters.
  return records
    .filter((record) => record.isOpenNow)
    .sort((left, right) => left.distanceMeters - right.distanceMeters);
}

export default function App() {
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [mapProvider, setMapProvider] = useState<"mapbox" | "naver">(config.mapProvider);
  const [toiletRecords, setToiletRecords] = useState<ToiletRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeLocation, setActiveLocation] = useState<SearchLocation>(locationPresets[0]);
  const [isResolvingDeviceLocation, setIsResolvingDeviceLocation] = useState(false);
  const visibleToilets = filterToilets(toiletRecords);
  const [selectedToilet, setSelectedToilet] = useState<ToiletRecord | null>(
    visibleToilets[0] ?? null,
  );
  const closest = visibleToilets[0];

  useEffect(() => {
    async function loadToilets() {
      setIsLoading(true);
      setLoadError(null);

      try {
        // The app always asks for open-now results first because urgency is the
        // core product question in Phase 1.
        const response = await fetchNearbyToilets({
          latitude: activeLocation.latitude,
          longitude: activeLocation.longitude,
          openNow: true,
        });

        setToiletRecords(response.data);
        setSelectedToilet(response.data[0] ?? null);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }

    void loadToilets();
  }, [activeLocation]);

  async function handleUseCurrentLocation() {
    setIsResolvingDeviceLocation(true);
    setLoadError(null);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        setLoadError("Location permission was denied.");
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Changing the active location automatically triggers a fresh nearby search
      // through the effect above.
      setActiveLocation({
        key: "device",
        label: "Current Device Location",
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to get location");
    } finally {
      setIsResolvingDeviceLocation(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.backdropOrb} />
        <View style={styles.backdropOrbSecondary} />
        <View style={styles.header}>
          <Text style={styles.eyebrow}>GottaGo MVP</Text>
          <Text style={styles.title}>Need a usable toilet right now?</Text>
          <Text style={styles.subtitle}>
            Fast nearby search, map-first scanning, and one-tap spot selection for urgent moments.
          </Text>
        </View>

        <View style={styles.heroStrip}>
          <View style={styles.heroStripLeft}>
            <Text style={styles.heroStripLabel}>Live search radius</Text>
            <Text style={styles.heroStripValue}>1.5km open-now scan</Text>
          </View>
          <View style={styles.heroStripBadge}>
            <Text style={styles.heroStripBadgeText}>
              {isLoading ? "Syncing" : `${visibleToilets.length} ready`}
            </Text>
          </View>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Fastest Pick</Text>
            <Text style={styles.metricValue}>{closest ? getDistanceLabel(closest.distanceMeters) : "--"}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Selected Origin</Text>
            <Text style={styles.metricValue}>{activeLocation.label.split(" ")[0]}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Map Engine</Text>
            <Text style={styles.metricValue}>{mapProvider === "naver" ? "Naver" : "Mapbox"}</Text>
          </View>
        </View>

        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <Text style={styles.locationLabel}>Search origin</Text>
            <Text style={styles.locationValue}>{activeLocation.label}</Text>
          </View>
          <Text style={styles.locationCoords}>
            {activeLocation.latitude.toFixed(4)}, {activeLocation.longitude.toFixed(4)}
          </Text>
          <View style={styles.locationActions}>
            {locationPresets.map((preset) => {
              const isActive = activeLocation.key === preset.key;

              return (
                <Pressable
                  key={preset.key}
                  onPress={() => setActiveLocation(preset)}
                  style={[styles.locationChip, isActive ? styles.activeLocationChip : null]}
                >
                  <Text
                    style={[
                      styles.locationChipText,
                      isActive ? styles.activeLocationChipText : null,
                    ]}
                  >
                    {preset.label}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => void handleUseCurrentLocation()}
              style={styles.locationChip}
            >
              <Text style={styles.locationChipText}>
                {isResolvingDeviceLocation ? "Locating..." : "Use Device"}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.engineCard}>
          <View style={styles.locationHeader}>
            <Text style={styles.locationLabel}>Map engine</Text>
            <Text style={styles.locationValue}>
              {mapProvider === "naver" ? "Naver Dynamic Map" : "Mapbox Native"}
            </Text>
          </View>
          <Text style={styles.engineMeta}>
            Use the same toilet search flow with either Mapbox or Naver without changing the rest of the app.
          </Text>
          <View style={styles.locationActions}>
            {(["mapbox", "naver"] as const).map((provider) => {
              const isActive = mapProvider === provider;

              return (
                <Pressable
                  key={provider}
                  onPress={() => setMapProvider(provider)}
                  style={[styles.locationChip, isActive ? styles.activeLocationChip : null]}
                >
                  <Text
                    style={[
                      styles.locationChipText,
                      isActive ? styles.activeLocationChipText : null,
                    ]}
                  >
                    {provider === "naver" ? "Naver" : "Mapbox"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <HeroMap
          toilets={visibleToilets}
          centerLocation={activeLocation}
          selectedToiletId={selectedToilet?.id ?? null}
          onSelectToilet={(toilet: ToiletRecord) => setSelectedToilet(toilet)}
          provider={mapProvider}
        />

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Closest open toilet</Text>
          <Text style={styles.summaryTitle}>{closest?.name ?? "No open toilet found"}</Text>
          <Text style={styles.summaryMeta}>
            {closest
              ? `${getDistanceLabel(closest.distanceMeters)} away · ${closest.address}`
              : "Check data feed or remove the open-now filter."}
          </Text>
        </View>

        <FilterBar />
        <ViewToggle value={viewMode} onChange={setViewMode} />
        {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

        {viewMode === "map" ? (
          <ToiletDetailSheet toilet={selectedToilet} />
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Open Now</Text>
              <Text style={styles.sectionMeta}>
                {isLoading ? "Loading..." : `${visibleToilets.length} results`}
              </Text>
            </View>

            <View style={styles.list}>
              {visibleToilets.map((toilet) => (
                <ToiletCard
                  key={toilet.id}
                  toilet={toilet}
                  isSelected={selectedToilet?.id === toilet.id}
                  onPress={() => setSelectedToilet(toilet)}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 48,
    gap: 18,
    overflow: "hidden",
  },
  backdropOrb: {
    backgroundColor: "#ffd5bf",
    borderRadius: 120,
    height: 180,
    opacity: 0.5,
    position: "absolute",
    right: -50,
    top: -20,
    width: 180,
  },
  backdropOrbSecondary: {
    backgroundColor: "#e5ead7",
    borderRadius: 120,
    height: 140,
    left: -40,
    opacity: 0.7,
    position: "absolute",
    top: 160,
    width: 140,
  },
  header: {
    gap: 8,
    marginTop: 8,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 34,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  heroStrip: {
    alignItems: "center",
    backgroundColor: colors.panel,
    borderRadius: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  heroStripLeft: {
    gap: 4,
  },
  heroStripLabel: {
    color: "#cfb8aa",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  heroStripValue: {
    color: colors.card,
    fontSize: 18,
    fontWeight: "800",
  },
  heroStripBadge: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroStripBadgeText: {
    color: colors.card,
    fontSize: 12,
    fontWeight: "800",
  },
  metricRow: {
    flexDirection: "row",
    gap: 10,
  },
  metricCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  metricLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metricValue: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  summaryCard: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    padding: 18,
  },
  locationCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  engineCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  locationHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  locationLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  locationValue: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  locationCoords: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  engineMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  locationActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  locationChip: {
    backgroundColor: colors.accentMuted,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  activeLocationChip: {
    backgroundColor: colors.accent,
  },
  locationChipText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  activeLocationChipText: {
    color: colors.card,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  summaryTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
  },
  summaryMeta: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
  },
  sectionMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  list: {
    gap: 12,
  },
  errorText: {
    backgroundColor: "#fff0e9",
    borderColor: "#f3c4b0",
    borderRadius: 14,
    borderWidth: 1,
    color: colors.warning,
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
