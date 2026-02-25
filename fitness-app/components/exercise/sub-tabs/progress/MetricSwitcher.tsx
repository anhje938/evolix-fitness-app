import { newColors } from "@/config/theme";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type Metric = "weight" | "volume" | "both";
export type VolumeMetric = "kg" | "sets";

type Props = {
  metric: Metric;
  onMetricChange: (m: Metric) => void;
  volumeMetric: VolumeMetric;
  onVolumeMetricChange: (v: VolumeMetric) => void;
};

export function MetricSwitcher({
  metric,
  onMetricChange,
  volumeMetric,
  onVolumeMetricChange,
}: Props) {
  return (
    <>
      <View style={styles.modeRow}>
        <ToggleButton
          label="Maks vekt"
          selected={metric === "weight"}
          onPress={() => onMetricChange("weight")}
        />
        <ToggleButton
          label="Volum"
          selected={metric === "volume"}
          onPress={() => onMetricChange("volume")}
        />
        <ToggleButton
          label="Begge"
          selected={metric === "both"}
          onPress={() => onMetricChange("both")}
        />
      </View>

      {metric !== "weight" && (
        <View style={styles.subModeRow}>
          <SubModeButton
            label="Volum (kg)"
            selected={volumeMetric === "kg"}
            onPress={() => onVolumeMetricChange("kg")}
          />
          <SubModeButton
            label="Volum (sets)"
            selected={volumeMetric === "sets"}
            onPress={() => onVolumeMetricChange("sets")}
          />
        </View>
      )}
    </>
  );
}

type ToggleProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function ToggleButton({ label, selected, onPress }: ToggleProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.modeButton, selected && styles.modeButtonSelected]}
    >
      <Text
        style={[
          styles.modeButtonText,
          selected && styles.modeButtonTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SubModeButton({ label, selected, onPress }: ToggleProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.subModeButton, selected && styles.subModeButtonSelected]}
    >
      <Text
        style={[styles.subModeText, selected && styles.subModeTextSelected]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  modeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  modeButtonSelected: {
    backgroundColor: "rgba(6,181,212,0.35)",
  },
  modeButtonText: {
    color: "rgba(226,232,240,0.7)",
    fontSize: 13,
  },
  modeButtonTextSelected: {
    color: "#06b5d4",
    fontWeight: "600",
  },

  subModeRow: {
    flexDirection: "row",
    gap: 8,
  },
  subModeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.3)",
    alignItems: "center",
  },
  subModeButtonSelected: {
    backgroundColor: "rgba(15,23,42,0.8)",
    borderColor: "rgba(148,163,184,0.7)",
  },
  subModeText: {
    fontSize: 13,
    color: "rgba(226,232,240,0.7)",
  },
  subModeTextSelected: {
    color: newColors.text.accent,
  },
});
