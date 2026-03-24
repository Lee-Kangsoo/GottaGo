import { StyleSheet, Text, View } from "react-native";

import { colors } from "../constants/colors";

const filters = ["Open now", "Accessible", "Free"];

export function FilterBar() {
  return (
    <View style={styles.row}>
      {filters.map((filter, index) => (
        <View
          key={filter}
          style={[styles.chip, index === 0 ? styles.activeChip : null]}
        >
          <Text style={[styles.chipLabel, index === 0 ? styles.activeLabel : null]}>
            {filter}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  activeChip: {
    backgroundColor: colors.panel,
    borderColor: colors.panel,
  },
  chipLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  activeLabel: {
    color: colors.card,
  },
});
