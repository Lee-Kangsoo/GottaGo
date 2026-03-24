import { StyleSheet, Text, View } from "react-native";

import { colors } from "../constants/colors";
import { ToiletRecord } from "../types/toilet";

interface ToiletDetailSheetProps {
  toilet: ToiletRecord | null;
}

function getDetailRows(toilet: ToiletRecord) {
  return [
    {
      label: "Distance",
      value: `${toilet.distanceMeters}m`,
    },
    {
      label: "Access",
      value: toilet.isAccessible ? "Wheelchair-friendly" : "Stairs possible",
    },
    {
      label: "Cost",
      value: toilet.isFree ? "Free" : "Paid",
    },
    {
      label: "Hours",
      value: toilet.openingHours,
    },
  ];
}

export function ToiletDetailSheet({ toilet }: ToiletDetailSheetProps) {
  if (!toilet) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyTitle}>No toilet selected</Text>
        <Text style={styles.emptyBody}>
          Once map markers are interactive, the tapped location will appear here.
        </Text>
      </View>
    );
  }

  const rows = getDetailRows(toilet);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{toilet.name}</Text>
          <Text style={styles.address}>{toilet.address}</Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{toilet.isOpenNow ? "Open Now" : "Check Status"}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {rows.map((row) => (
          <View key={row.label} style={styles.gridItem}>
            <Text style={styles.gridLabel}>{row.label}</Text>
            <Text style={styles.gridValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.footer}>
        Verified at {toilet.lastVerifiedAt}. Public toilets stay default until
        community trust systems are added.
      </Text>

      <View style={styles.callout}>
        <Text style={styles.calloutLabel}>Next step</Text>
        <Text style={styles.calloutValue}>Follow map markers and hand off to navigation in the next iteration.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.panel,
    borderRadius: 22,
    borderWidth: 1,
    gap: 16,
    padding: 18,
  },
  emptyTitle: {
    color: colors.card,
    fontSize: 18,
    fontWeight: "800",
  },
  emptyBody: {
    color: "#cfb8aa",
    fontSize: 14,
    lineHeight: 20,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerText: {
    flex: 1,
    gap: 4,
    paddingRight: 10,
  },
  title: {
    color: colors.card,
    fontSize: 21,
    fontWeight: "800",
  },
  address: {
    color: "#cfb8aa",
    fontSize: 13,
    lineHeight: 18,
  },
  statusPill: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    color: colors.card,
    fontSize: 12,
    fontWeight: "800",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridItem: {
    backgroundColor: "#382a23",
    borderRadius: 16,
    minWidth: "47%",
    padding: 12,
  },
  gridLabel: {
    color: "#cfb8aa",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  gridValue: {
    color: colors.card,
    fontSize: 14,
    fontWeight: "700",
  },
  footer: {
    color: "#cfb8aa",
    fontSize: 12,
    lineHeight: 18,
  },
  callout: {
    backgroundColor: colors.accentMuted,
    borderRadius: 16,
    gap: 4,
    padding: 14,
  },
  calloutLabel: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  calloutValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
});
