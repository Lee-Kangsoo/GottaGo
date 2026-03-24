import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../constants/colors";
import { ToiletRecord } from "../types/toilet";

interface ToiletCardProps {
  toilet: ToiletRecord;
  isSelected?: boolean;
  onPress?: () => void;
}

function getBadges(toilet: ToiletRecord): string[] {
  return [
    toilet.isAccessible ? "Accessible" : "Stairs",
    toilet.isFree ? "Free" : "Paid",
    toilet.toiletType === "public" ? "Public" : "Community",
  ];
}

export function ToiletCard({ toilet, isSelected = false, onPress }: ToiletCardProps) {
  const badges = getBadges(toilet);

  return (
    <Pressable style={[styles.card, isSelected ? styles.selectedCard : null]} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{toilet.name}</Text>
          <Text style={styles.address}>{toilet.address}</Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{toilet.isOpenNow ? "Open" : "Check"}</Text>
        </View>
      </View>

      <Text style={styles.meta}>
        {toilet.distanceMeters}m away · {toilet.openingHours}
      </Text>

      <View style={styles.routeRow}>
        <Text style={styles.routeLabel}>Best quick route</Text>
        <Text style={styles.routeValue}>
          {toilet.distanceMeters < 300 ? "Sprint-worthy" : toilet.distanceMeters < 800 ? "Short walk" : "Still reachable"}
        </Text>
      </View>

      <View style={styles.badges}>
        {badges.map((badge) => (
          <View key={badge} style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.verified}>Last verified {toilet.lastVerifiedAt}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  selectedCard: {
    backgroundColor: "#fff4ea",
    borderColor: colors.accent,
    borderWidth: 2,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerText: {
    flex: 1,
    gap: 4,
    paddingRight: 12,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "800",
  },
  address: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  statusPill: {
    backgroundColor: colors.accentMuted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: "800",
  },
  meta: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  routeRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  routeLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  routeValue: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: "800",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    backgroundColor: colors.accentMuted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  verified: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
});
