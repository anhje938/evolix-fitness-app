import { generalStyles } from "@/config/styles";
import { newColors } from "@/config/theme";
import { typography } from "@/config/typography";
import {
  HOME_ACCENT_BAR_COLORS,
  HOME_ACCENT_BAR_HEIGHT,
  HOME_ACCENT_BAR_MARGIN_BOTTOM,
  HOME_ACCENT_BAR_OPACITY,
  HOME_ACCENT_BAR_WIDTH,
  HOME_CARD_BG,
  HOME_CARD_BORDER,
  HOME_CARD_ELEVATION,
  HOME_CARD_SHADOW_COLOR,
  HOME_CARD_SHADOW_OFFSET,
  HOME_CARD_SHADOW_OPACITY,
  HOME_CARD_SHADOW_RADIUS,
  HOME_SECTION_TITLE_COLOR,
  HOME_SECTION_TITLE_SIZE,
  HOME_SECTION_TITLE_WEIGHT,
} from "@/components/home/homeCardTokens";
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
    const sign = isUp ? "+" : "-";
    return `${sign}${abs.toFixed(1)} kg`;
  }, [weightProgressLastWeek, isUp]);

  const progressColor = isUp ? newColors.secondary.emerald : "#ef4444";
  const tintBorder = isUp
    ? "rgba(16, 185, 129, 0.22)"
    : "rgba(239, 68, 68, 0.22)";

  const safeWeightText = Number.isFinite(todayWeight)
    ? todayWeight.toFixed(1)
    : "--";

  return (
    <View style={[generalStyles.newCard, styles.card]}>
      <View pointerEvents="none" style={styles.sheenWrap}>
        <LinearGradient
          colors={[
            "rgba(6,182,212,0.12)",
            "rgba(59,130,246,0.08)",
            "rgba(2,6,23,0.00)",
          ]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={styles.sheen}
        />
      </View>

      <LinearGradient
        colors={HOME_ACCENT_BAR_COLORS}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accentBar}
      />

      <Text style={[typography.body, styles.kicker]}>Siste vektmåling</Text>

      <Text style={[typography.h1, styles.value]}>{safeWeightText} kg</Text>

      <View style={[styles.deltaPill, { borderColor: tintBorder }]}>
        <View pointerEvents="none" style={styles.pillGlowWrap}>
          <LinearGradient
            colors={[
              "rgba(6,182,212,0.12)",
              "rgba(59,130,246,0.06)",
              "rgba(2,6,23,0.00)",
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
          siste 7 målinger
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: HOME_CARD_BG,
    borderWidth: 1,
    borderColor: HOME_CARD_BORDER,
    shadowColor: HOME_CARD_SHADOW_COLOR,
    shadowOpacity: HOME_CARD_SHADOW_OPACITY,
    shadowRadius: HOME_CARD_SHADOW_RADIUS,
    shadowOffset: HOME_CARD_SHADOW_OFFSET,
    elevation: HOME_CARD_ELEVATION,
  },
  sheenWrap: {
    position: "absolute",
    top: -44,
    left: -56,
    right: -56,
    bottom: -44,
  },
  sheen: {
    flex: 1,
    transform: [{ rotate: "-10deg" }],
  },
  accentBar: {
    height: HOME_ACCENT_BAR_HEIGHT,
    width: HOME_ACCENT_BAR_WIDTH,
    borderRadius: 999,
    opacity: HOME_ACCENT_BAR_OPACITY,
    marginBottom: HOME_ACCENT_BAR_MARGIN_BOTTOM,
  },
  kicker: {
    color: HOME_SECTION_TITLE_COLOR,
    fontSize: HOME_SECTION_TITLE_SIZE,
    fontWeight: HOME_SECTION_TITLE_WEIGHT,
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  value: {
    color: newColors.text.primary,
    fontSize: 23,
    lineHeight: 27,
    marginBottom: 8,
  },
  deltaPill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: "rgba(2,6,23,0.30)",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
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
    width: 6,
    height: 6,
    borderRadius: 999,
    opacity: 0.95,
  },
  deltaValue: {
    fontSize: 13,
    lineHeight: 16,
  },
  deltaSub: {
    color: newColors.text.muted,
    fontSize: 11,
    lineHeight: 14,
  },
});
