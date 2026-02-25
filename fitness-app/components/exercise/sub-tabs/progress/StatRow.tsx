// components/exercise/progress/StatRow.tsx
import { generalStyles } from "@/config/styles";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  pr: number;
  lastWeight: number;
  diffToPr: number;
};

export function StatRow({ pr, lastWeight, diffToPr }: Props) {
  return (
    <View style={styles.statsRow}>
      <StatCard label="PR" value={pr} unit="kg" accent icon="trophy-outline" />
      <StatCard
        label="Siste"
        value={lastWeight}
        unit="kg"
        icon="time-outline"
      />
      <StatCard
        label="Til PR"
        value={diffToPr}
        unit="kg"
        warning
        icon="trending-up-outline"
      />
    </View>
  );
}

type StatCardProps = {
  label: string;
  value: number;
  unit?: string;
  accent?: boolean;
  warning?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
};

function StatCard({
  label,
  value,
  unit,
  accent,
  warning,
  icon,
}: StatCardProps) {
  const display = Number.isFinite(value) ? Math.round(value) : 0;

  // Slim premium palette
  const valueColor = warning
    ? "rgba(249,115,22,0.98)"
    : accent
    ? "rgba(34,211,238,0.98)"
    : "rgba(226,232,240,0.94)";

  const chipBg = warning
    ? "rgba(249,115,22,0.12)"
    : accent
    ? "rgba(34,211,238,0.12)"
    : "rgba(255,255,255,0.05)";

  const chipBorder = warning
    ? "rgba(249,115,22,0.22)"
    : accent
    ? "rgba(34,211,238,0.22)"
    : "rgba(255,255,255,0.09)";

  const sheenA = warning
    ? "rgba(249,115,22,0.16)"
    : accent
    ? "rgba(34,211,238,0.16)"
    : "rgba(99,102,241,0.10)";

  const sheenB = warning
    ? "rgba(251,191,36,0.08)"
    : accent
    ? "rgba(56,189,248,0.08)"
    : "rgba(34,211,238,0.06)";

  return (
    <View style={[styles.statCard, generalStyles.newCard]}>
      {/* Slim sheen */}
      <LinearGradient
        colors={[
          "rgba(255,255,255,0.055)",
          "rgba(255,255,255,0.018)",
          "rgba(255,255,255,0.00)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[sheenA, sheenB, "rgba(255,255,255,0)"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 1 }}
        style={styles.sheenBlob}
        pointerEvents="none"
      />
      <View pointerEvents="none" style={styles.innerStroke} />

      {/* Header */}
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconChip,
            { backgroundColor: chipBg, borderColor: chipBorder },
          ]}
        >
          <Ionicons
            name={icon ?? "stats-chart-outline"}
            size={13}
            color={valueColor}
          />
        </View>
        <Text style={styles.statLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>

      {/* Value */}
      <View style={styles.valueRow}>
        <Text
          style={[styles.statValue, { color: valueColor }]}
          numberOfLines={1}
        >
          {display}
        </Text>
        {!!unit && (
          <Text style={styles.statUnit} numberOfLines={1}>
            {unit}
          </Text>
        )}
      </View>

      {/* Micro-line */}
      <View
        pointerEvents="none"
        style={[
          styles.bottomGlow,
          {
            backgroundColor: warning
              ? "rgba(249,115,22,0.16)"
              : accent
              ? "rgba(34,211,238,0.16)"
              : "rgba(255,255,255,0.09)",
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 22, // slimmer
    marginBottom: 14,
    gap: 10,
  },

  statCard: {
    width: "30%",
    paddingVertical: 12, // slimmer
    paddingHorizontal: 12,
    borderRadius: 16, // slightly tighter radius
    overflow: "hidden",
    alignItems: "flex-start",

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(2,6,23,0.18)",
  },

  innerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },

  sheenBlob: {
    position: "absolute",
    top: -46,
    right: -86,
    width: 190,
    height: 140,
    borderRadius: 999,
    opacity: 0.85, // calmer
  },

  topRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8, // slimmer
  },

  iconChip: {
    width: 24, // slimmer
    height: 24,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  statLabel: {
    flex: 1,
    fontSize: 11.5,
    color: "rgba(226,232,240,0.70)",
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  valueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },

  statValue: {
    fontSize: 24, // slimmer
    fontWeight: "600",
    letterSpacing: -0.2,
    fontVariant: ["tabular-nums"],
  },

  statUnit: {
    fontSize: 11.5,
    color: "rgba(226,232,240,0.58)",
    fontWeight: "700",
    paddingBottom: 3,
  },

  bottomGlow: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 9,
    height: 2,
    borderRadius: 999,
    opacity: 0.85,
  },
});
