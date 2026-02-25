import { gradients } from "@/config/theme";
import { typography } from "@/config/typography";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

export default function WeeklySummaryCard() {
  const progress = 4 / 5;

  return (
    <LinearGradient
      colors={gradients.primary}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.cardContainer}
    >
      <View style={[styles.row, { marginBottom: -10 }]}>
        <Text style={typography.bodyBold}>Uke 47</Text>
        <Text style={typography.bodyBold}>4/5</Text>
      </View>
      <View style={styles.row}>
        <Text style={[typography.body, { fontSize: 13, opacity: 0.7 }]}>
          November 2025
        </Text>
        <Text style={[typography.body, { fontSize: 13, opacity: 0.7 }]}>
          Økter
        </Text>
      </View>

      {/* PROGRESS BAR */}
      <View style={styles.progressBackground}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 20,
    padding: 20,
    gap: 10,
    marginBottom: 30,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  // BACKGROUND LAYER (opaque blue)
  progressBackground: {
    height: 8,
    width: "100%",
    backgroundColor: "rgba(59, 130, 246, 0.25)", // blue-500 @ 25% opacity
    borderRadius: 999,
    marginTop: 10,
    overflow: "hidden",
  },

  // FILLED LAYER (white)
  progressFill: {
    height: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 999,
  },
});
