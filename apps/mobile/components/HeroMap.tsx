import Constants from "expo-constants";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { colors } from "../constants/colors";
import { config } from "../constants/config";
import { ToiletRecord } from "../types/toilet";

// HeroMap is the adapter between one shared toilet dataset and multiple map
// rendering strategies: Mapbox native, Naver in a WebView, or a fallback preview.
interface CenterLocation {
  latitude: number;
  longitude: number;
}

interface HeroMapProps {
  centerLocation: CenterLocation;
  toilets: ToiletRecord[];
  selectedToiletId: string | null;
  onSelectToilet: (toilet: ToiletRecord) => void;
  provider: "mapbox" | "naver";
}

function getRelativePosition(
  latitude: number,
  longitude: number,
  centerLatitude: number,
  centerLongitude: number,
) {
  // The fallback preview is not geospatially exact. It is a lightweight visual
  // approximation so Expo Go still shows a useful map-like layout.
  const x = ((longitude - centerLongitude) * 18000) + 160;
  const y = ((centerLatitude - latitude) * 18000) + 110;

  return {
    left: Math.max(20, Math.min(300, x)),
    top: Math.max(18, Math.min(190, y)),
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const isExpoGo = Constants.executionEnvironment === "storeClient";
const hasMapboxToken = Boolean(
  config.mapboxAccessToken &&
    config.mapboxAccessToken !== "MAPBOX_PUBLIC_ACCESS_TOKEN",
);
const hasNaverClientId = Boolean(config.naverMapClientId);

let mapboxModule:
  | (typeof import("@rnmapbox/maps"))["default"]
  | null = null;

if (!isExpoGo && hasMapboxToken) {
  // Mapbox must not be imported eagerly in Expo Go because the native module
  // does not exist there and would crash the app before fallback UI can render.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  mapboxModule = require("@rnmapbox/maps").default as (typeof import("@rnmapbox/maps"))["default"];
  void mapboxModule.setAccessToken(config.mapboxAccessToken);
}

function FallbackMap({
  centerLocation,
  toilets,
  selectedToiletId,
  onSelectToilet,
  legendTitle,
  legendMeta,
}: HeroMapProps & { legendTitle: string; legendMeta: string }) {
  return (
    <View style={styles.card}>
      <View style={styles.map}>
        <View style={styles.gridGlow} />
        {toilets.slice(0, 6).map((toilet) => {
          const position = getRelativePosition(
            toilet.latitude,
            toilet.longitude,
            centerLocation.latitude,
            centerLocation.longitude,
          );

          return (
            <Pressable
              key={toilet.id}
              onPress={() => onSelectToilet(toilet)}
              style={[
                styles.pin,
                toilet.id === selectedToiletId ? styles.selectedPin : null,
                position,
              ]}
            >
              <Text style={styles.pinLabel}>{toilet.distanceMeters}m</Text>
            </Pressable>
          );
        })}
        <View style={styles.userDot}>
          <Text style={styles.userDotLabel}>YOU</Text>
        </View>
        <View style={styles.mapBadge}>
          <Text style={styles.mapBadgeLabel}>Search origin</Text>
          <Text style={styles.mapBadgeValue}>
            {centerLocation.latitude.toFixed(4)}, {centerLocation.longitude.toFixed(4)}
          </Text>
        </View>
      </View>
      <View style={styles.legendRow}>
        <Text style={styles.legendTitle}>{legendTitle}</Text>
        <Text style={styles.legendMeta}>{legendMeta}</Text>
      </View>
    </View>
  );
}

function buildNaverMapHtml({
  centerLocation,
  toilets,
  selectedToiletId,
}: Pick<HeroMapProps, "centerLocation" | "toilets" | "selectedToiletId">) {
  // Naver is rendered inside a WebView, so marker clicks are bridged back into
  // React Native via postMessage.
  const payload = JSON.stringify({
    centerLocation,
    selectedToiletId,
    toilets: toilets.map((toilet) => ({
      id: toilet.id,
      name: toilet.name,
      latitude: toilet.latitude,
      longitude: toilet.longitude,
      distanceMeters: toilet.distanceMeters,
    })),
  }).replaceAll("<", "\\u003c");

  const clientId = escapeHtml(config.naverMapClientId);

  return `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <style>
      html, body, #map {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: #f4ece7;
        font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;
      }

      #map {
        position: relative;
      }

      .origin-badge {
        align-items: flex-start;
        background: rgba(34, 24, 19, 0.88);
        border-radius: 14px;
        color: #fff8f1;
        display: flex;
        flex-direction: column;
        left: 12px;
        padding: 10px 12px;
        position: absolute;
        top: 12px;
        z-index: 10;
      }

      .origin-badge .label {
        color: #cfb8aa;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .origin-badge .value {
        font-size: 12px;
        font-weight: 800;
        margin-top: 4px;
      }

      .toilet-pin {
        align-items: center;
        background: #ef5e2f;
        border: 3px solid #fff8f1;
        border-radius: 14px;
        color: #fff8f1;
        display: flex;
        font-size: 11px;
        font-weight: 800;
        justify-content: center;
        min-width: 48px;
        padding: 7px 8px;
        transform: translate(-50%, -50%);
      }

      .toilet-pin.selected {
        background: #1b1f3b;
        border-color: #ffffff;
        box-shadow: 0 10px 18px rgba(0, 0, 0, 0.18);
      }

      .user-pin {
        align-items: center;
        background: #221813;
        border: 3px solid #ffffff;
        border-radius: 18px;
        color: #fff8f1;
        display: flex;
        font-size: 10px;
        font-weight: 900;
        height: 36px;
        justify-content: center;
        transform: translate(-50%, -50%);
        width: 36px;
      }
    </style>
    <script src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}"></script>
  </head>
  <body>
    <div id="map"></div>
    <div class="origin-badge">
      <span class="label">Naver Dynamic Map</span>
      <span class="value">${centerLocation.latitude.toFixed(4)}, ${centerLocation.longitude.toFixed(4)}</span>
    </div>
    <script>
      (function () {
        var data = ${payload};
        var center = new naver.maps.LatLng(data.centerLocation.latitude, data.centerLocation.longitude);
        var map = new naver.maps.Map("map", {
          center: center,
          zoom: 15,
          mapDataControl: false,
          scaleControl: false,
          logoControl: false
        });

        function createToiletMarker(distanceMeters, isSelected) {
          return {
            content: '<div class="toilet-pin' + (isSelected ? ' selected' : '') + '">' + distanceMeters + 'm</div>',
            anchor: new naver.maps.Point(24, 16)
          };
        }

        new naver.maps.Marker({
          position: center,
          map: map,
          icon: {
            content: '<div class="user-pin">YOU</div>',
            anchor: new naver.maps.Point(18, 18)
          }
        });

        var bounds = new naver.maps.LatLngBounds();
        bounds.extend(center);

        data.toilets.forEach(function (toilet) {
          var position = new naver.maps.LatLng(toilet.latitude, toilet.longitude);
          bounds.extend(position);

          var marker = new naver.maps.Marker({
            position: position,
            map: map,
            icon: createToiletMarker(toilet.distanceMeters, toilet.id === data.selectedToiletId)
          });

          naver.maps.Event.addListener(marker, "click", function () {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: "selectToilet",
                toiletId: toilet.id
              }));
            }
          });
        });

        if (data.toilets.length > 0) {
          map.fitBounds(bounds, {
            top: 52,
            right: 40,
            bottom: 40,
            left: 40
          });
        }
      })();
    </script>
  </body>
</html>`;
}

function NaverMap({
  centerLocation,
  toilets,
  selectedToiletId,
  onSelectToilet,
}: HeroMapProps) {
  const source = { html: buildNaverMapHtml({ centerLocation, toilets, selectedToiletId }) };

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as
        | { type: "selectToilet"; toiletId: string }
        | undefined;

      if (payload?.type !== "selectToilet") {
        return;
      }

      const selectedToilet = toilets.find((toilet) => toilet.id === payload.toiletId);

      if (selectedToilet) {
        onSelectToilet(selectedToilet);
      }
    } catch {
      // Ignore malformed payloads coming from the web view.
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.liveMap}>
        <WebView
          originWhitelist={["*"]}
          source={source}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          style={styles.webView}
        />
      </View>
      <View style={styles.legendRow}>
        <Text style={styles.legendTitle}>Live Naver dynamic map</Text>
        <Text style={styles.legendMeta}>Tap a marker to inspect the selected toilet.</Text>
      </View>
    </View>
  );
}

function MapboxMap(props: HeroMapProps) {
  const { centerLocation, toilets, selectedToiletId, onSelectToilet } = props;

  if (isExpoGo || !hasMapboxToken || !mapboxModule) {
    // When native rendering is unavailable, stay functional instead of failing.
    return (
      <FallbackMap
        {...props}
        legendTitle="Mapbox preview"
        legendMeta={
          isExpoGo
            ? "Expo Go cannot render native Mapbox, so a fallback preview is shown."
            : "Add a Mapbox token to render the live map."
        }
      />
    );
  }

  const Mapbox = mapboxModule;

  return (
    <View style={styles.card}>
      <View style={styles.liveMap}>
        <Mapbox.MapView style={StyleSheet.absoluteFill} styleURL={Mapbox.StyleURL.Street}>
          <Mapbox.Camera
            zoomLevel={14}
            centerCoordinate={[centerLocation.longitude, centerLocation.latitude]}
            animationMode="easeTo"
            animationDuration={0}
          />
          <Mapbox.MarkerView
            coordinate={[centerLocation.longitude, centerLocation.latitude]}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.liveUserMarker}>
              <Text style={styles.liveUserText}>YOU</Text>
            </View>
          </Mapbox.MarkerView>
          {toilets.map((toilet) => (
            <Mapbox.MarkerView
              key={toilet.id}
              coordinate={[toilet.longitude, toilet.latitude]}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <Pressable
                onPress={() => onSelectToilet(toilet)}
                style={[
                  styles.mapMarker,
                  toilet.id === selectedToiletId ? styles.selectedPin : null,
                ]}
              />
            </Mapbox.MarkerView>
          ))}
        </Mapbox.MapView>
      </View>
      <View style={styles.legendRow}>
        <Text style={styles.legendTitle}>Live Mapbox map</Text>
        <Text style={styles.legendMeta}>Tap a marker to inspect the selected toilet.</Text>
      </View>
    </View>
  );
}

export function HeroMap(props: HeroMapProps) {
  // Provider switching happens here so the rest of the screen can remain
  // provider-agnostic.
  if (props.provider === "naver") {
    if (!hasNaverClientId) {
      return (
        <FallbackMap
          {...props}
          legendTitle="Naver map preview"
          legendMeta="Add EXPO_PUBLIC_NAVER_MAP_CLIENT_ID to render the live Naver dynamic map."
        />
      );
    }

    return <NaverMap {...props} />;
  }

  return <MapboxMap {...props} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 8,
    },
  },
  liveMap: {
    backgroundColor: colors.mapBackdrop,
    height: 240,
    position: "relative",
  },
  webView: {
    backgroundColor: colors.mapBackdrop,
    flex: 1,
  },
  map: {
    backgroundColor: colors.mapBackdrop,
    height: 240,
    position: "relative",
  },
  gridGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  pin: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    minWidth: 48,
    paddingHorizontal: 8,
    paddingVertical: 7,
    position: "absolute",
  },
  pinLabel: {
    color: colors.card,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  selectedPin: {
    borderColor: "#ffffff",
    borderWidth: 3,
    transform: [{ scale: 1.12 }],
  },
  mapMarker: {
    backgroundColor: colors.accent,
    borderColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 3,
    height: 24,
    width: 24,
  },
  userDot: {
    alignItems: "center",
    backgroundColor: colors.mapInk,
    borderColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 3,
    height: 36,
    justifyContent: "center",
    left: 146,
    position: "absolute",
    top: 102,
    width: 36,
  },
  userDotLabel: {
    color: colors.card,
    fontSize: 10,
    fontWeight: "900",
  },
  mapBadge: {
    backgroundColor: "rgba(34, 24, 19, 0.86)",
    borderRadius: 14,
    left: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: "absolute",
    top: 14,
  },
  mapBadgeLabel: {
    color: "#cfb8aa",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  mapBadgeValue: {
    color: colors.card,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  liveUserMarker: {
    alignItems: "center",
    backgroundColor: colors.mapInk,
    borderColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 3,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  liveUserText: {
    color: colors.card,
    fontSize: 10,
    fontWeight: "900",
  },
  legendRow: {
    backgroundColor: "#fff8f1",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  legendTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  legendMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});
