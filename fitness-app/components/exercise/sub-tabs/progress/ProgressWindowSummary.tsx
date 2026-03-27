import { generalStyles } from "@/config/styles";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type ProgressWindowItem = {
  label: string;
  deltaKg: number | null;
};

type Props = {
  items: ProgressWindowItem[];
};

function formatDelta(deltaKg: number | null) {
  if (deltaKg == null || !Number.isFinite(deltaKg)) return "—";

  const rounded = Math.round(deltaKg * 10) / 10;
  const abs = Math.abs(rounded);
  const shown =
    Math.abs(abs - Math.round(abs)) < 0.001 ? `${Math.round(abs)}` : `${abs}`;

  if (rounded > 0) return `+${shown} kg`;
  if (rounded < 0) return `-${shown} kg`;
  return "0 kg";
}

function getTrendTone(deltaKg: number | null) {
  if (deltaKg == null || !Number.isFinite(deltaKg)) {
    return {
      valueColor: "rgba(226,232,240,0.70)",
      sheenA: "rgba(99,102,241,0.10)",
      sheenB: "rgba(34,211,238,0.06)",
    };
  }

  if (deltaKg > 0) {
    return {
      valueColor: "rgba(34,211,238,0.98)",
      sheenA: "rgba(34,211,238,0.16)",
      sheenB: "rgba(56,189,248,0.08)",
    };
  }

  if (deltaKg < 0) {
    return {
      valueColor: "rgba(248,113,113,0.98)",
      sheenA: "rgba(248,113,113,0.16)",
      sheenB: "rgba(251,191,36,0.08)",
    };
  }

  return {
    valueColor: "rgba(226,232,240,0.88)",
    sheenA: "rgba(99,102,241,0.10)",
    sheenB: "rgba(34,211,238,0.06)",
  };
}

export function ProgressWindowSummary({ items }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {items.map((item) => {
          const tone = getTrendTone(item.deltaKg);

          return (
            <View key={item.label} style={[styles.card, generalStyles.newCard]}>
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
                colors={[tone.sheenA, tone.sheenB, "rgba(255,255,255,0.00)"]}
                start={{ x: 1, y: 0 }}
                end={{ x: 0.2, y: 1 }}
                style={styles.sheenBlob}
                pointerEvents="none"
              />
              <View pointerEvents="none" style={styles.innerStroke} />

              <Text style={styles.label}>{item.label}</Text>
              <Text style={[styles.value, { color: tone.valueColor }]}>
                {formatDelta(item.deltaKg)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: -4,
    marginBottom: 14,
  },
  grid: {
    flexDirection: "row",
    gap: 6,
  },
  card: {
    flex: 1,
    minWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 7,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(2,6,23,0.18)",
  },
  innerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  sheenBlob: {
    position: "absolute",
    top: -28,
    right: -42,
    width: 110,
    height: 84,
    borderRadius: 999,
    opacity: 0.76,
  },
  label: {
    color: "rgba(226,232,240,0.72)",
    fontSize: 9.5,
    fontWeight: "600",
    letterSpacing: 0.12,
    marginBottom: 4,
  },
  value: {
    fontSize: 11.5,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.12,
  },
});
