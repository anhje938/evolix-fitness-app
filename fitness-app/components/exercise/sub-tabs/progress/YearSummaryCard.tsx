// components/exercise/progress/YearSummaryCard.tsx
import { generalStyles } from "@/config/styles";
import { newColors } from "@/config/theme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  weightIncrease: number;
  volumeIncreaseKg: number;
};

export function YearSummaryCard({ weightIncrease, volumeIncreaseKg }: Props) {
  const formatDelta = (value: number, unit: string) => {
    const rounded = value.toFixed(1).replace(".0", "");
    if (value > 0) return `+${rounded}${unit}`;
    if (value < 0)
      return `-${Math.abs(value).toFixed(1).replace(".0", "")}${unit}`;
    return `0${unit}`;
  };

  return (
    <View style={[styles.yearCard, generalStyles.newCard]}>
      <Text style={styles.yearTitle}>📈 Progresjon siste år</Text>

      <View style={styles.yearRow}>
        <View style={styles.yearStat}>
          <Text style={styles.yearLabel}>Est 1RM-endring</Text>
          <Text style={styles.yearValue}>
            {formatDelta(weightIncrease, "kg")}
          </Text>
        </View>

        <View style={styles.yearStat}>
          <Text style={styles.yearLabel}>Volumendring (kg)</Text>
          <Text style={styles.yearValue}>
            {formatDelta(volumeIncreaseKg, "kg")}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  yearCard: {
    padding: 20,
    borderRadius: 20,
    marginTop: 4,
    marginBottom: 30,
  },
  yearTitle: {
    fontSize: 16,
    color: newColors.text.primary,
    marginBottom: 12,
  },
  yearRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  yearStat: {},
  yearLabel: {
    color: "rgba(226,232,240,0.7)",
    fontSize: 12,
  },
  yearValue: {
    color: "#38bdf8",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 4,
  },
});
