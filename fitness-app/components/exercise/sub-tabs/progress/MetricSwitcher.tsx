import { newColors } from "@/config/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
    <View style={styles.section}>
      <View style={styles.modeRail}>
        <ToggleButton
          label="Vekt"
          icon="barbell-outline"
          selected={metric === "weight"}
          onPress={() => onMetricChange("weight")}
        />
        <ToggleButton
          label="Volum"
          icon="layers-outline"
          selected={metric === "volume"}
          onPress={() => onMetricChange("volume")}
        />
        <ToggleButton
          label="Begge"
          icon="pulse-outline"
          selected={metric === "both"}
          onPress={() => onMetricChange("both")}
        />
      </View>

      {metric !== "weight" && (
        <View style={styles.subModeRail}>
          <SubModeButton
            label="Kg"
            selected={volumeMetric === "kg"}
            onPress={() => onVolumeMetricChange("kg")}
          />
          <SubModeButton
            label="Sett"
            selected={volumeMetric === "sets"}
            onPress={() => onVolumeMetricChange("sets")}
          />
        </View>
      )}
    </View>
  );
}

type ToggleProps = {
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  selected: boolean;
  onPress: () => void;
};

function ToggleButton({ label, icon, selected, onPress }: ToggleProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeButton,
        selected && styles.modeButtonSelected,
        pressed && styles.buttonPressed,
      ]}
    >
      {selected && (
        <LinearGradient
          pointerEvents="none"
          colors={[
            "rgba(34,211,238,0.24)",
            "rgba(37,99,235,0.16)",
            "rgba(8,15,28,0.08)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      <View
        style={[
          styles.modeButtonIconWrap,
          selected && styles.modeButtonIconWrapSelected,
        ]}
      >
        <Ionicons
          name={icon ?? "ellipse-outline"}
          size={14}
          color={
            selected
              ? newColors.primary.extraLight
              : "rgba(226,232,240,0.72)"
          }
        />
      </View>

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
      style={({ pressed }) => [
        styles.subModeButton,
        selected && styles.subModeButtonSelected,
        pressed && styles.buttonPressed,
      ]}
    >
      {selected && (
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(34,211,238,0.18)", "rgba(15,23,42,0.08)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      <Text
        style={[styles.subModeText, selected && styles.subModeTextSelected]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 6,
    alignItems: "center",
  },
  modeRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    justifyContent: "center",
  },
  modeButton: {
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  modeButtonSelected: {
    backgroundColor: "rgba(34,211,238,0.12)",
    borderColor: "rgba(103,232,249,0.18)",
  },
  modeButtonIconWrap: {
    width: 18,
    height: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 0.8,
    borderColor: "rgba(255,255,255,0.06)",
  },
  modeButtonIconWrapSelected: {
    backgroundColor: "rgba(8,15,28,0.34)",
    borderColor: "rgba(103,232,249,0.14)",
  },
  modeButtonText: {
    color: "rgba(226,232,240,0.76)",
    fontSize: 10.5,
    fontWeight: "600",
  },
  modeButtonTextSelected: {
    color: "#F8FAFC",
  },
  subModeRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    justifyContent: "center",
  },
  subModeButton: {
    minHeight: 30,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  subModeButtonSelected: {
    backgroundColor: "rgba(34,211,238,0.10)",
    borderColor: "rgba(103,232,249,0.16)",
  },
  subModeText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "rgba(226,232,240,0.72)",
  },
  subModeTextSelected: {
    color: newColors.text.accent,
  },
  buttonPressed: {
    opacity: 0.94,
  },
});
