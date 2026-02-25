import { generalStyles } from "@/config/styles";
import { gradients, newColors } from "@/config/theme";
import { typography } from "@/config/typography";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

type WeightSummaryBoxProps = {
  todayWeight: number;
  weightProgressLastWeek: number;
};

export function WeightSummaryBox({
  todayWeight,
  weightProgressLastWeek,
}: WeightSummaryBoxProps) {
  const isUp = weightProgressLastWeek >= 0;

  const progressText = useMemo(() => {
    const abs = Math.abs(weightProgressLastWeek);
    const sign = isUp ? "+" : "−";
    return `${sign}${abs.toFixed(1)} kg`;
  }, [weightProgressLastWeek, isUp]);

  const upColor = newColors.secondary.emerald;
  const downColor = "#ef4444"; // lokal fallback

  const progressColor = isUp ? upColor : downColor;

  // litt tydeligere, men fortsatt premium
  const tintBorder = isUp
    ? "rgba(16, 185, 129, 0.26)"
    : "rgba(239, 68, 68, 0.26)";

  const safeWeightText = Number.isFinite(todayWeight)
    ? todayWeight.toFixed(1)
    : "—";

  return (
    <View style={[generalStyles.newCard, styles.card]}>
      {/* Cyan/blue sheen (ikke hvit -> unngår grå "melk") */}
      <View pointerEvents="none" style={styles.sheenWrap}>
        <LinearGradient
          colors={[
            "rgba(6, 182, 212, 0.10)", // cyan hint
            "rgba(59, 130, 246, 0.06)", // blue hint
            "rgba(2, 6, 23, 0.00)", // fade til transparent
          ]}
          start={{ x: 0.15, y: 0.0 }}
          end={{ x: 0.85, y: 1.0 }}
          style={styles.sheen}
        />
      </View>

      {/* Top accent gradient bar */}
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accentBar}
      />

      <Text style={[typography.body, styles.kicker]}>Siste vektmåling</Text>

      <Text style={[typography.h1, styles.value]}>{safeWeightText} kg</Text>

      <View style={[styles.deltaPill, { borderColor: tintBorder }]}>
        {/* Tinted pill glow (match brand, ikke hvit) */}
        <View pointerEvents="none" style={styles.pillGlowWrap}>
          <LinearGradient
            colors={[
              "rgba(6, 182, 212, 0.16)",
              "rgba(59, 130, 246, 0.08)",
              "rgba(2, 6, 23, 0.00)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pillGlow}
          />
        </View>

        <View style={[styles.deltaDot, { backgroundColor: progressColor }]} />
        <Text
          style={[
            typography.bodyBold,
            styles.deltaValue,
            { color: progressColor },
          ]}
        >
          {progressText}
        </Text>
        <Text style={[typography.body, styles.deltaSub]}>
          de siste 7 målingene
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    borderRadius: 22,
    alignItems: "center",
    overflow: "hidden",

    // La newCard styre surface/border – vi matcher resten via tint + sheen
    shadowColor: "#000",
    shadowOpacity: 0.11,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },

  sheenWrap: {
    position: "absolute",
    top: -50,
    left: -70,
    right: -70,
    bottom: -50,
  },
  sheen: {
    flex: 1,
    transform: [{ rotate: "-10deg" }],
  },

  accentBar: {
    height: 3,
    width: "62%",
    borderRadius: 999,
    opacity: 0.9,
    marginBottom: 12,
  },

  kicker: {
    color: newColors.text.secondary,
    letterSpacing: 0.3,
    marginBottom: 6,
  },

  value: {
    color: newColors.text.primary,
    fontSize: 28,
    lineHeight: 32,
    marginBottom: 12,
  },

  deltaPill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",

    // Viktig: bruk mørk base (ikke hvit) => mindre grå, mer premium
    backgroundColor: "rgba(2, 6, 23, 0.28)",

    shadowColor: "#000",
    shadowOpacity: 0.09,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },

  pillGlowWrap: {
    position: "absolute",
    top: -12,
    left: -22,
    right: -22,
    bottom: -12,
  },
  pillGlow: {
    flex: 1,
  },

  deltaDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    opacity: 0.95,
  },

  deltaValue: {
    fontSize: 15,
    lineHeight: 18,
  },

  deltaSub: {
    color: newColors.text.muted,
    fontSize: 13,
    lineHeight: 16,
  },
});
