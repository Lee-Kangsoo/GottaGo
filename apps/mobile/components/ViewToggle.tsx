import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../constants/colors";

interface ViewToggleProps {
  value: "map" | "list";
  onChange: (value: "map" | "list") => void;
}

const options: Array<"map" | "list"> = ["map", "list"];

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <View style={styles.wrapper}>
      {options.map((option) => {
        const isActive = value === option;

        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={[styles.button, isActive ? styles.activeButton : null]}
          >
            <Text style={[styles.label, isActive ? styles.activeLabel : null]}>
              {option === "map" ? "Map View" : "List View"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#efe4d5",
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    padding: 5,
  },
  button: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    paddingVertical: 10,
  },
  activeButton: {
    backgroundColor: colors.panel,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  activeLabel: {
    color: colors.card,
  },
});
