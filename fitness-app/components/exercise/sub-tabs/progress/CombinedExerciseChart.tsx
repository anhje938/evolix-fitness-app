import { generalStyles } from "@/config/styles";
import { typography } from "@/config/typography";
import type {
  PreparedProgressPoint,
  ProgressTimeRange,
  ProgressUnit,
} from "@/utils/exercise/progressChart";
import {
  prepareProgressSeries,
  PROGRESS_TIME_RANGE_OPTIONS,
} from "@/utils/exercise/progressChart";
import { Ionicons } from "@expo/vector-icons";
import { scaleLinear } from "d3-scale";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import type { ColorSchemeName, TextStyle, ViewStyle } from "react-native";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, {
  Circle,
  G,
  Path,
  Rect,
  Line as SvgLine,
  Text as SvgText,
} from "react-native-svg";

export type ExerciseProgressPoint = {
  timestampUtc: string;
  value: number;
  unit?: ProgressUnit;
};

type Props = {
  title?: string;
  showTitle?: boolean;
  height?: number;
  metric?: "weight" | "volume" | "both";
  volumeMetric?: "sets" | "kg";
  range?: ProgressTimeRange;
  onRangeChange?: (range: ProgressTimeRange) => void;
  weightData: ExerciseProgressPoint[];
  volumeData: ExerciseProgressPoint[];
  showOuterLines?: boolean;
};

type Palette = {
  card: string;
  surface: string;
  surfaceStrong: string;
  border: string;
  borderSoft: string;
  text: string;
  textMuted: string;
  muted2: string;
  accent: string;
  accentBg: string;
  accentDim: string;
  weight: string;
  trend: string;
  volume: string;
  volumeStroke: string;
  grid: string;
  chartBgTop: string;
  chartBgBottom: string;
  tooltipBg: string;
  tooltipBorder: string;
  guide: string;
  pr: string;
  success: string;
  warning: string;
  danger: string;
};

type MergedPoint = {
  key: string;
  shortLabel: string;
  fullLabel: string;
  weight: PreparedProgressPoint | null;
  volume: PreparedProgressPoint | null;
};

const PAD_LEFT = 44;
const PAD_RIGHT = 44;
const PAD_TOP = 18;
const PAD_BOTTOM = 34;

function getPalette(scheme: ColorSchemeName): Palette {
  if (scheme === "light") {
    return {
      card: "rgba(255,255,255,0.92)",
      surface: "rgba(15,23,42,0.05)",
      surfaceStrong: "rgba(15,23,42,0.08)",
      border: "rgba(15,23,42,0.10)",
      borderSoft: "rgba(15,23,42,0.08)",
      text: "#0f172a",
      textMuted: "rgba(15,23,42,0.82)",
      muted2: "rgba(15,23,42,0.58)",
      accent: "#0891b2",
      accentBg: "rgba(8,145,178,0.08)",
      accentDim: "rgba(8,145,178,0.18)",
      weight: "#0f766e",
      trend: "#d97706",
      volume: "rgba(2,132,199,0.28)",
      volumeStroke: "rgba(2,132,199,0.60)",
      grid: "rgba(15,23,42,0.10)",
      chartBgTop: "rgba(248,250,252,0.92)",
      chartBgBottom: "rgba(241,245,249,0.96)",
      tooltipBg: "rgba(255,255,255,0.96)",
      tooltipBorder: "rgba(15,23,42,0.10)",
      guide: "rgba(15,23,42,0.18)",
      pr: "#f59e0b",
      success: "#15803d",
      warning: "#b45309",
      danger: "#dc2626",
    };
  }

  return {
    card: "rgba(2,6,23,0.18)",
    surface: "rgba(255,255,255,0.04)",
    surfaceStrong: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.08)",
    borderSoft: "rgba(255,255,255,0.05)",
    text: "#E5ECFF",
    textMuted: "rgba(226,232,240,0.92)",
    muted2: "rgba(148,163,184,0.78)",
    accent: "#22d3ee",
    accentBg: "rgba(34,211,238,0.10)",
    accentDim: "rgba(34,211,238,0.22)",
    weight: "rgba(34,211,238,0.95)",
    trend: "#fbbf24",
    volume: "rgba(59,130,246,0.32)",
    volumeStroke: "rgba(59,130,246,0.68)",
    grid: "rgba(148,163,184,0.12)",
    chartBgTop: "rgba(2,6,23,0.30)",
    chartBgBottom: "rgba(2,6,23,0.56)",
    tooltipBg: "rgba(8,15,29,0.96)",
    tooltipBorder: "rgba(255,255,255,0.08)",
    guide: "rgba(148,163,184,0.20)",
    pr: "#fbbf24",
    success: "#22c55e",
    warning: "#f59e0b",
    danger: "#f87171",
  };
}

function formatValue(value: number | null, unit: string) {
  if (value == null) return "--";
  const decimals = value < 10 ? 1 : 0;
  return `${value.toFixed(decimals)} ${unit}`;
}

function getSlotWidth(pointCount: number) {
  if (pointCount <= 5) return 64;
  if (pointCount <= 12) return 44;
  if (pointCount <= 24) return 34;
  return 28;
}

function getVisibleLabelIndexes(total: number) {
  const maxLabels = total <= 8 ? total : 6;
  const step = Math.max(1, Math.ceil(total / maxLabels));
  const indexes = new Set<number>();
  for (let index = 0; index < total; index += step) {
    indexes.add(index);
  }
  indexes.add(total - 1);
  return indexes;
}

function buildLineSegments(
  points: MergedPoint[],
  getX: (index: number) => number,
  getY: (value: number) => number,
  accessor: (point: MergedPoint) => number | null,
  gapAccessor: (point: MergedPoint) => boolean
) {
  const segments: string[] = [];
  let active = "";

  points.forEach((point, index) => {
    const value = accessor(point);
    if (value == null) return;

    const x = getX(index);
    const y = getY(value);

    if (!active || gapAccessor(point)) {
      if (active) segments.push(active);
      active = `M ${x} ${y}`;
      return;
    }

    active += ` L ${x} ${y}`;
  });

  if (active) {
    segments.push(active);
  }

  return segments;
}

function createStyles(colors: Palette) {
  return StyleSheet.create<{
    card: ViewStyle;
    header: ViewStyle;
    iconCircle: ViewStyle;
    title: TextStyle;
    subtitle: TextStyle;
    trendPill: ViewStyle;
    trendText: TextStyle;
    statsRow: ViewStyle;
    statBox: ViewStyle;
    statDivider: ViewStyle;
    statLabel: TextStyle;
    statValue: TextStyle;
    rangeRow: ViewStyle;
    rangePill: ViewStyle;
    rangePillActive: ViewStyle;
    rangePillText: TextStyle;
    rangePillTextActive: TextStyle;
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
    trendPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.surfaceStrong,
      borderWidth: 1,
      borderColor: colors.borderSoft,
    },
    trendText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textMuted,
      letterSpacing: 0.1,
    },
    statsRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      marginBottom: 12,
    },
    statBox: {
      flex: 1,
      alignItems: "center",
      gap: 3,
    },
    statDivider: {
      width: 1,
      height: 26,
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
      fontWeight: "600",
      color: colors.text,
      letterSpacing: 0.1,
    },
    rangeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 12,
      justifyContent: "center",
    },
    rangePill: {
      minWidth: 50,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceStrong,
      borderWidth: 1,
      borderColor: colors.borderSoft,
    },
    rangePillActive: {
      backgroundColor: colors.accentBg,
      borderColor: colors.accentDim,
    },
    rangePillText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.muted2,
      letterSpacing: 0.1,
    },
    rangePillTextActive: {
      color: colors.text,
    },
    chartOuter: {
      width: "100%",
      overflow: "hidden",
    },
    chartBackground: {
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: colors.chartBgBottom,
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
}

export function CombinedExerciseChart({
  title = "1RM og volum",
  showTitle = true,
  height = 260,
  metric = "both",
  volumeMetric = "kg",
  range = "20",
  onRangeChange,
  weightData,
  volumeData,
  showOuterLines = false,
}: Props) {
  const colors = useMemo(() => getPalette("dark"), []);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [containerWidth, setContainerWidth] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const weightSeries = useMemo(
    () =>
      prepareProgressSeries({
        data: weightData,
        metric: "weight",
        range,
      }),
    [range, weightData]
  );

  const volumeSeries = useMemo(
    () =>
      prepareProgressSeries({
        data: volumeData,
        metric: volumeMetric === "kg" ? "volumeKg" : "volumeSets",
        range,
        forcedBucket: weightSeries.bucket,
      }),
    [range, volumeData, volumeMetric, weightSeries.bucket]
  );

  const merged = useMemo<MergedPoint[]>(() => {
    const map = new Map<string, MergedPoint>();

    for (const point of weightSeries.points) {
      map.set(point.key, {
        key: point.key,
        shortLabel: point.shortLabel,
        fullLabel: point.fullLabel,
        weight: point,
        volume: null,
      });
    }

    for (const point of volumeSeries.points) {
      const existing = map.get(point.key);
      if (existing) {
        existing.volume = point;
        continue;
      }

      map.set(point.key, {
        key: point.key,
        shortLabel: point.shortLabel,
        fullLabel: point.fullLabel,
        weight: null,
        volume: point,
      });
    }

    return Array.from(map.values()).sort(
      (a, b) =>
        Date.parse(a.weight?.timestampUtc ?? a.volume?.timestampUtc ?? "") -
        Date.parse(b.weight?.timestampUtc ?? b.volume?.timestampUtc ?? "")
    );
  }, [volumeSeries.points, weightSeries.points]);

  useEffect(() => {
    if (!merged.length) {
      setSelectedKey(null);
      return;
    }

    setSelectedKey((current) => {
      if (current && merged.some((point) => point.key === current)) {
        return current;
      }
      return merged[merged.length - 1].key;
    });
  }, [merged]);

  if (!merged.length) {
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
              Ingen data i valgt periode
            </Text>
          </View>
        </View>

        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="pulse-outline" size={28} color={colors.muted2} />
          </View>
          <Text style={[typography.body, styles.emptyText]}>
            Ingen data tilgjengelig ennå
          </Text>
          <Text style={[typography.body, styles.emptySubtext]}>
            Kombinasjonsgrafen viser først noe når både dato og verdi kan brukes
            på en trygg måte.
          </Text>
        </View>
      </View>
    );
  }

  const selected =
    merged.find((point) => point.key === selectedKey) ??
    merged[merged.length - 1];

  const slotWidth = getSlotWidth(merged.length);
  const minChartWidth = PAD_LEFT + PAD_RIGHT + slotWidth * merged.length;
  const chartWidth = Math.max(containerWidth, minChartWidth);
  const innerWidth = Math.max(10, chartWidth - PAD_LEFT - PAD_RIGHT);
  const innerHeight = Math.max(90, height - PAD_TOP - PAD_BOTTOM);

  const weightScale = scaleLinear()
    .domain([weightSeries.yDomain.paddedMin, weightSeries.yDomain.paddedMax])
    .range([innerHeight, 0]);
  const volumeScale = scaleLinear()
    .domain([0, volumeSeries.yDomain.paddedMax])
    .range([innerHeight, 0]);

  const getX = (index: number) => {
    if (merged.length === 1) {
      return PAD_LEFT + innerWidth / 2;
    }
    const step = innerWidth / (merged.length - 1);
    return PAD_LEFT + step * index;
  };

  const weightLine = buildLineSegments(
    merged,
    getX,
    (value) => PAD_TOP + weightScale(value),
    (point) =>
      point.weight && metric !== "volume" ? point.weight.clampedValue : null,
    (point) => point.weight?.hasGapBefore ?? false
  );
  const trendLine = buildLineSegments(
    merged,
    getX,
    (value) => PAD_TOP + weightScale(value),
    (point) =>
      point.weight && metric !== "volume"
        ? point.weight.trendClampedValue
        : null,
    (point) => point.weight?.hasGapBefore ?? false
  );

  const labelIndexes = getVisibleLabelIndexes(merged.length);
  const ticks = Array.from({ length: 5 }, (_, index) => index / 4);
  const selectedIndex = merged.findIndex((point) => point.key === selected.key);
  const selectedX = getX(selectedIndex);
  const trendChange = weightSeries.totalChange ?? 0;
  return (
    <View style={[generalStyles.newCard, styles.card]}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="analytics" size={20} color={colors.accent} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          {showTitle && (
            <Text style={[typography.bodyBold, styles.title]} numberOfLines={1}>
              {title}
            </Text>
          )}
          <Text style={[typography.body, styles.subtitle]} numberOfLines={2}>
            {weightSeries.rangeLabel} • {merged.length}{" "}
            {weightSeries.bucket === "week" ? "ukepunkter" : "punkter"}
          </Text>
        </View>

        <View style={styles.trendPill}>
          <Ionicons
            name={
              trendChange > 0
                ? "trending-up"
                : trendChange < 0
                ? "trending-down"
                : "remove"
            }
            size={12}
            color={
              trendChange > 0
                ? colors.success
                : trendChange < 0
                ? colors.danger
                : colors.textMuted
            }
          />
          <Text
            style={[
              styles.trendText,
              {
                color:
                  trendChange > 0
                    ? colors.success
                    : trendChange < 0
                    ? colors.danger
                    : colors.textMuted,
              },
            ]}
          >
            {weightSeries.totalChangePercent == null
              ? "--"
              : `${
                  weightSeries.totalChangePercent >= 0 ? "+" : ""
                }${weightSeries.totalChangePercent.toFixed(1)}%`}
          </Text>
        </View>
      </View>

      {!!onRangeChange && (
        <View style={styles.rangeRow}>
          {PROGRESS_TIME_RANGE_OPTIONS.map((option) => {
            const active = option.value === range;
            return (
              <Pressable
                key={option.value}
                onPress={() => onRangeChange(option.value)}
                style={({ pressed }) => [
                  styles.rangePill,
                  active && styles.rangePillActive,
                  pressed && { opacity: 0.92 },
                ]}
              >
                <Text
                  style={[
                    styles.rangePillText,
                    active && styles.rangePillTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>1RM total</Text>
          <Text
            style={[
              styles.statValue,
              {
                color:
                  (weightSeries.totalChange ?? 0) >= 0
                    ? colors.success
                    : colors.danger,
              },
            ]}
          >
            {weightSeries.totalChange == null
              ? "--"
              : `${weightSeries.totalChange >= 0 ? "+" : ""}${formatValue(
                  weightSeries.totalChange,
                  weightSeries.unitLabel
                )}`}
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Volum siste</Text>
          <Text style={styles.statValue}>
            {formatValue(
              selected.volume?.value ?? null,
              volumeSeries.unitLabel
            )}
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Snitt / uke</Text>
          <Text style={styles.statValue}>
            {weightSeries.averageChangePerWeek == null
              ? "--"
              : `${
                  weightSeries.averageChangePerWeek >= 0 ? "+" : ""
                }${formatValue(
                  weightSeries.averageChangePerWeek,
                  weightSeries.unitLabel
                )}`}
          </Text>
        </View>
      </View>

      <View
        style={styles.chartOuter}
        onLayout={(event) => {
          const nextWidth = event.nativeEvent.layout.width;
          if (nextWidth !== containerWidth) {
            setContainerWidth(nextWidth);
          }
        }}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View
            style={[
              styles.chartBackground,
              {
                width: chartWidth,
                height,
                borderWidth: showOuterLines ? 1 : 1,
              },
            ]}
          >
            <LinearGradient
              colors={[
                colors.chartBgTop,
                colors.chartBgBottom,
                colors.chartBgBottom,
              ]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.chartGradient}
              pointerEvents="none"
            />

            <Svg width={chartWidth} height={height}>
              {ticks.map((tick, index) => {
                const y = PAD_TOP + innerHeight * tick;
                const weightTick =
                  weightSeries.yDomain.paddedMax -
                  (weightSeries.yDomain.paddedMax -
                    weightSeries.yDomain.paddedMin) *
                    tick;
                const volumeTick =
                  volumeSeries.yDomain.paddedMax -
                  volumeSeries.yDomain.paddedMax * tick;

                return (
                  <G key={`grid-${index}`}>
                    <SvgLine
                      x1={PAD_LEFT}
                      x2={chartWidth - PAD_RIGHT}
                      y1={y}
                      y2={y}
                      stroke={colors.grid}
                      strokeWidth={1}
                      strokeDasharray="4,4"
                    />
                    <SvgText
                      x={PAD_LEFT - 8}
                      y={y + 3}
                      textAnchor="end"
                      fontSize={9}
                      fill={colors.muted2}
                      fontWeight="600"
                    >
                      {weightTick < 10
                        ? weightTick.toFixed(1)
                        : weightTick.toFixed(0)}
                    </SvgText>
                    <SvgText
                      x={chartWidth - PAD_RIGHT + 8}
                      y={y + 3}
                      fontSize={9}
                      fill={colors.muted2}
                      fontWeight="600"
                    >
                      {volumeTick < 10
                        ? volumeTick.toFixed(1)
                        : volumeTick.toFixed(0)}
                    </SvgText>
                  </G>
                );
              })}

              <SvgLine
                x1={selectedX}
                x2={selectedX}
                y1={PAD_TOP}
                y2={height - PAD_BOTTOM}
                stroke={colors.guide}
                strokeWidth={1}
                strokeDasharray="3,4"
              />

              {metric !== "weight" &&
                merged.map((point, index) => {
                  if (!point.volume) return null;

                  const x = getX(index);
                  const barWidth = Math.min(18, slotWidth * 0.62);
                  const top = PAD_TOP + volumeScale(point.volume.clampedValue);
                  const barHeight = Math.max(4, height - PAD_BOTTOM - top);

                  return (
                    <Rect
                      key={`volume-${point.key}`}
                      x={x - barWidth / 2}
                      y={top}
                      width={barWidth}
                      height={barHeight}
                      rx={4}
                      fill={colors.volume}
                      stroke={colors.volumeStroke}
                      strokeWidth={point.key === selected.key ? 1.6 : 1}
                    />
                  );
                })}

              {metric !== "volume" &&
                weightLine.map((segment) => (
                  <Path
                    key={`weight-${segment}`}
                    d={segment}
                    fill="none"
                    stroke={colors.weight}
                    strokeWidth={1.8}
                  />
                ))}

              {metric !== "volume" &&
                trendLine.map((segment) => (
                  <Path
                    key={`trend-${segment}`}
                    d={segment}
                    fill="none"
                    stroke={colors.trend}
                    strokeWidth={1.35}
                    strokeDasharray="6,6"
                  />
                ))}

              {merged.map((point, index) => {
                const x = getX(index);
                const y =
                  point.weight != null
                    ? PAD_TOP + weightScale(point.weight.clampedValue)
                    : PAD_TOP + innerHeight * 0.3;
                const showDot =
                  point.weight != null &&
                  metric !== "volume" &&
                  (merged.length <= 12 ||
                    point.key === selected.key ||
                    point.weight.isPr ||
                    point.weight.isOutlier);

                return (
                  <G key={`merged-${point.key}`}>
                    {showDot && point.weight && (
                      <>
                        <Circle
                          cx={x}
                          cy={y}
                          r={point.key === selected.key ? 4.1 : 2.8}
                          fill={
                            point.weight.isOutlier
                              ? colors.warning
                              : colors.weight
                          }
                        />
                        {point.weight.isPr && (
                          <Circle
                            cx={x}
                            cy={y}
                            r={point.key === selected.key ? 6.1 : 4.9}
                            fill="none"
                            stroke={colors.pr}
                            strokeWidth={1.1}
                          />
                        )}
                      </>
                    )}

                    {point.key === selected.key && (
                      <Circle
                        cx={x}
                        cy={y}
                        r={8.2}
                        fill="transparent"
                        stroke={colors.accent}
                        strokeWidth={1}
                      />
                    )}

                    {point.volume ? (
                      <Rect
                        x={x - Math.min(18, slotWidth * 0.62) / 2}
                        y={PAD_TOP + volumeScale(point.volume.clampedValue)}
                        width={Math.min(18, slotWidth * 0.62)}
                        height={Math.max(
                          20,
                          height -
                            PAD_BOTTOM -
                            (PAD_TOP + volumeScale(point.volume.clampedValue))
                        )}
                        fill="transparent"
                        onPress={() => setSelectedKey(point.key)}
                      />
                    ) : point.weight ? (
                      <Circle
                        cx={x}
                        cy={y}
                        r={Math.max(12, slotWidth * 0.34)}
                        fill="transparent"
                        onPress={() => setSelectedKey(point.key)}
                      />
                    ) : null}

                    {labelIndexes.has(index) && (
                      <SvgText
                        x={x}
                        y={height - 12}
                        textAnchor="middle"
                        fontSize={10}
                        fill={colors.muted2}
                        fontWeight="600"
                      >
                        {point.shortLabel}
                      </SvgText>
                    )}

                    {point.key === selected.key && point.weight?.isPr && (
                      <SvgText
                        x={x}
                        y={Math.max(14, y - 12)}
                        textAnchor="middle"
                        fontSize={10}
                        fill={colors.pr}
                        fontWeight="700"
                      >
                        PR
                      </SvgText>
                    )}
                  </G>
                );
              })}
            </Svg>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
