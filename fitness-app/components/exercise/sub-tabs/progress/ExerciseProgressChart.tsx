// progress/ExerciseProgressChart.tsx

import { generalStyles } from "@/config/styles";
import { typography } from "@/config/typography";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import type { TextStyle, ViewStyle } from "react-native";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { BarChart, LineChart } from "react-native-chart-kit";

/**
 * Premium Dark Ocean theme
 */
const colors = {
  card: "rgba(2,6,23,0.18)",
  surface: "rgba(255,255,255,0.04)",
  surfaceStrong: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.08)",
  borderSoft: "rgba(255,255,255,0.05)",
  text: "#E5ECFF",
  textMuted: "rgba(148,163,184,0.9)",
  muted2: "rgba(148,163,184,0.7)",
  accent: "#06b6d4",
  accentDim: "rgba(6,182,212,0.2)",
  accentBg: "rgba(6,182,212,0.08)",
  chartLine: "rgba(6,182,212,0.95)",
  chartBar: "rgba(6,182,212,0.85)",
  chartGrid: "rgba(148,163,184,0.12)",
  chartBg: "rgba(2,6,23,0.30)",
  green: "rgba(34, 197, 94, 0.9)",
  red: "rgba(239, 68, 68, 0.9)",
};

export type ExerciseProgressPoint = {
  timestampUtc: string; // ISO-string
  value: number;
};

type Props = {
  data: ExerciseProgressPoint[];

  // Text / labels
  title?: string;
  showTitle?: boolean;

  // Size
  height?: number;

  // ✅ NEW: chart type selector
  variant?: "line" | "bar";

  // Grid / lines
  showInnerLines?: boolean;
  showVerticalLines?: boolean;
  showOuterLines?: boolean;
  segments?: number;

  // Labels control (X/Y)
  showVerticalLabels?: boolean; // X-axis labels
  showHorizontalLabels?: boolean; // Y-axis labels

  // Colors
  barColor?: string;
  backgroundGradientFrom?: string;
  backgroundGradientTo?: string;
  labelColor?: string;
  gridLineColor?: string;

  // Y-axis
  fromZero?: boolean;
  decimalPlaces?: number;

  // Label density
  minXLabels?: number;
  maxXLabels?: number;

  // Values on bars (only applies to Bar)
  showValuesOnTopOfBars?: boolean;
};

const screenWidth = Dimensions.get("window").width;

export function ExerciseProgressChart({
  data,

  title = "Progresjon",
  showTitle = true,

  height,

  variant: initialVariant = "bar",

  showInnerLines = true,
  showVerticalLines = false,
  showOuterLines = false,
  segments = 5,

  showVerticalLabels = true,
  showHorizontalLabels = true,

  barColor,
  backgroundGradientFrom = "rgba(15,23,42,0.95)",
  backgroundGradientTo = "rgba(15,23,42,0.95)",
  labelColor,
  gridLineColor,

  fromZero = true,
  decimalPlaces = 0,

  minXLabels = 3,
  maxXLabels = 6,

  showValuesOnTopOfBars,
}: Props) {
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [variant, setVariant] = useState<"line" | "bar">(initialVariant);

  const dailyData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const sorted = [...data].sort(
      (a, b) =>
        new Date(a.timestampUtc).getTime() - new Date(b.timestampUtc).getTime()
    );

    return sorted.map((item) => {
      const d = new Date(item.timestampUtc);
      const v = Number(item.value);
      return {
        label: d.toLocaleDateString("nb-NO", {
          day: "numeric",
          month: "short",
        }),
        value: Number.isFinite(v) ? Math.max(0, v) : 0,
      };
    });
  }, [data]);

  const stats = useMemo(() => {
    if (dailyData.length === 0) return null;
    const values = dailyData.map((d) => d.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const latest = values[values.length - 1];
    const first = values[0];
    const change = latest - first;
    const changePercent =
      first > 0 ? ((change / first) * 100).toFixed(1) : "0.0";

    return { max, min, avg, latest, change, changePercent };
  }, [dailyData]);

  if (!dailyData.length) {
    return (
      <View style={[generalStyles.newCard, styles.card]}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="analytics" size={20} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            {showTitle && (
              <Text style={[typography.bodyBold, styles.title]}>{title}</Text>
            )}
            <Text style={[typography.body, styles.subtitle]}>
              Spor din progresjon
            </Text>
          </View>
        </View>

        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="stats-chart-outline"
              size={28}
              color={colors.muted2}
            />
          </View>
          <Text style={[typography.body, styles.emptyText]}>
            Ingen data tilgjengelig ennå
          </Text>
          <Text style={[typography.body, styles.emptySubtext]}>
            Start å logge økter for å se progresjon
          </Text>
        </View>
      </View>
    );
  }

  // --- ORIGINAL labels/values ---
  const labels = dailyData.map((w) => w.label);
  const values = dailyData.map((w) => w.value);

  // ✅ ONLY ADDITION: ghost value for BAR chart only (extra slot at end)
  const barLabels = variant === "bar" ? [...labels, ""] : labels;
  const barValues = variant === "bar" ? [...values, 0] : values;

  // X-label density (use barLabels so spacing matches the rendered chart)
  const totalPoints = barLabels.length;
  const minAllowedX = Math.min(minXLabels, totalPoints);
  const maxAllowedX = Math.min(Math.max(maxXLabels, minAllowedX), totalPoints);

  let limitedLabels = barLabels;
  if (maxAllowedX > 0 && totalPoints > maxAllowedX) {
    const step = Math.ceil(totalPoints / maxAllowedX);
    limitedLabels = barLabels.map((label, index) =>
      index % step === 0 ? label : ""
    );
  }

  const fallbackWidth = screenWidth - 48;
  const effectiveContainerWidth = containerWidth ?? fallbackWidth;

  const chartWidth = effectiveContainerWidth;
  const chartHeight = height ?? 220;

  // Heuristic: show values on top only if not too many bars
  const autoShowValues = barValues.length <= 12;
  const effectiveShowValues =
    typeof showValuesOnTopOfBars === "boolean"
      ? showValuesOnTopOfBars
      : autoShowValues;

  // Color overrides
  const effectiveBarColor =
    barColor || (variant === "line" ? colors.chartLine : colors.chartBar);
  const effectiveLabelColor = labelColor || colors.muted2;
  const effectiveGridLineColor = gridLineColor || colors.chartGrid;

  return (
    <View style={[generalStyles.newCard, styles.card]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="analytics" size={20} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          {showTitle && (
            <Text style={[typography.bodyBold, styles.title]}>{title}</Text>
          )}
          <Text style={[typography.body, styles.subtitle]}>
            {dailyData.length} økter
          </Text>
        </View>

        {/* Chart Type Toggle */}
        <View style={styles.variantToggle}>
          <Pressable
            onPress={() => setVariant("bar")}
            style={[
              styles.variantButton,
              variant === "bar" && styles.variantButtonActive,
            ]}
          >
            <Ionicons
              name="bar-chart"
              size={14}
              color={variant === "bar" ? colors.accent : colors.muted2}
            />
          </Pressable>
          <Pressable
            onPress={() => setVariant("line")}
            style={[
              styles.variantButton,
              variant === "line" && styles.variantButtonActive,
            ]}
          >
            <Ionicons
              name="stats-chart"
              size={14}
              color={variant === "line" ? colors.accent : colors.muted2}
            />
          </Pressable>
        </View>
      </View>

      {/* Stats Row */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Maks</Text>
            <Text style={styles.statValue}>{stats.max.toFixed(1)}</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Snitt</Text>
            <Text style={styles.statValue}>{stats.avg.toFixed(1)}</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Min</Text>
            <Text style={styles.statValue}>{stats.min.toFixed(1)}</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Endring</Text>
            <View style={styles.changeRow}>
              <Ionicons
                name={stats.change >= 0 ? "trending-up" : "trending-down"}
                size={12}
                color={stats.change >= 0 ? colors.green : colors.red}
              />
              <Text
                style={[
                  styles.statValue,
                  {
                    color: stats.change >= 0 ? colors.green : colors.red,
                    fontSize: 12,
                  },
                ]}
              >
                {stats.changePercent}%
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Chart */}
      <View
        style={styles.chartOuter}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        {chartWidth > 0 && (
          <View
            style={[
              styles.chartBackground,
              {
                width: chartWidth,
                height: chartHeight,
              },
            ]}
          >
            {/* Gradient Overlay */}
            <LinearGradient
              colors={[
                "rgba(6,182,212,0.08)",
                "rgba(6,182,212,0.03)",
                "rgba(6,182,212,0.00)",
              ]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.chartGradient}
              pointerEvents="none"
            />

            {variant === "line" ? (
              <LineChart
                data={{
                  labels: labels,
                  datasets: [{ data: values, strokeWidth: 3 }],
                }}
                width={chartWidth}
                height={chartHeight}
                fromZero={fromZero}
                withInnerLines={showInnerLines}
                withOuterLines={showOuterLines}
                segments={segments}
                withVerticalLabels={showVerticalLabels}
                withHorizontalLabels={showHorizontalLabels}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  backgroundGradientFrom: "transparent",
                  backgroundGradientTo: "transparent",
                  decimalPlaces,
                  color: () => effectiveBarColor,
                  labelColor: () => effectiveLabelColor,
                  propsForBackgroundLines: {
                    stroke: effectiveGridLineColor,
                    strokeDasharray: "4,4",
                  },
                  propsForVerticalLabels: { fontSize: "9" },
                  propsForDots: {
                    r: "0",
                  },
                }}
                style={StyleSheet.absoluteFillObject}
                bezier
              />
            ) : (
              <BarChart
                data={{
                  labels: limitedLabels,
                  datasets: [{ data: barValues }],
                }}
                width={chartWidth}
                height={chartHeight}
                fromZero={fromZero}
                withInnerLines={showInnerLines}
                segments={segments}
                withVerticalLabels={showVerticalLabels}
                withHorizontalLabels={showHorizontalLabels}
                yAxisLabel=""
                yAxisSuffix=""
                showValuesOnTopOfBars={effectiveShowValues}
                chartConfig={{
                  backgroundGradientFrom: "transparent",
                  backgroundGradientTo: "transparent",
                  decimalPlaces,
                  color: () => effectiveBarColor,
                  labelColor: () => effectiveLabelColor,
                  propsForBackgroundLines: {
                    stroke: effectiveGridLineColor,
                    strokeDasharray: "4,4",
                  },
                  barPercentage: 0.7,
                  propsForLabels: { fontSize: "9" },
                }}
                style={StyleSheet.absoluteFillObject}
                flatColor
              />
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create<{
  card: ViewStyle;
  header: ViewStyle;
  iconCircle: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  variantToggle: ViewStyle;
  variantButton: ViewStyle;
  variantButtonActive: ViewStyle;
  statsRow: ViewStyle;
  statBox: ViewStyle;
  statDivider: ViewStyle;
  statLabel: TextStyle;
  statValue: TextStyle;
  changeRow: ViewStyle;
  chartOuter: ViewStyle;
  chartBackground: ViewStyle;
  chartGradient: ViewStyle;
  emptyState: ViewStyle;
  emptyIcon: ViewStyle;
  emptyText: TextStyle;
  emptySubtext: TextStyle;
}>({
  card: {
    width: "100%",
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 22,
    marginBottom: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },

  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentBg,
    borderWidth: 1,
    borderColor: colors.accentDim,
  },

  title: {
    fontSize: 16,
    color: colors.text,
    letterSpacing: 0.1,
    marginBottom: 2,
  },

  subtitle: {
    fontSize: 12,
    color: colors.muted2,
    letterSpacing: 0.1,
  },

  variantToggle: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 3,
    gap: 3,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },

  variantButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  variantButtonActive: {
    backgroundColor: colors.accentBg,
    borderWidth: 1,
    borderColor: colors.accentDim,
  },

  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom: 16,
  },

  statBox: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },

  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.borderSoft,
  },

  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.muted2,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },

  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 0.1,
  },

  changeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  chartOuter: {
    width: "100%",
  },

  chartBackground: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.chartBg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    position: "relative",
  },

  chartGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom: 16,
  },

  emptyText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 6,
  },

  emptySubtext: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.muted2,
    textAlign: "center",
    lineHeight: 18,
  },
});
