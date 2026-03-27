import { generalStyles } from "@/config/styles";
import { typography } from "@/config/typography";
import type {
  PreparedProgressPoint,
  ProgressMetricKind,
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
  Defs,
  G,
  Path,
  Rect,
  Stop,
  Line as SvgLine,
  LinearGradient as SvgLinearGradient,
  Text as SvgText,
} from "react-native-svg";

export type ExerciseProgressPoint = {
  timestampUtc: string;
  value: number;
  unit?: ProgressUnit;
};

type Props = {
  data: ExerciseProgressPoint[];
  title?: string;
  showTitle?: boolean;
  height?: number;
  variant?: "line" | "bar";
  range?: ProgressTimeRange;
  onRangeChange?: (range: ProgressTimeRange) => void;
  metricKind?: ProgressMetricKind;
  showOuterLines?: boolean;
  showVerticalLines?: boolean;
  minXLabels?: number;
  maxXLabels?: number;
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
  accentDim: string;
  accentBg: string;
  raw: string;
  rawFill: string;
  trend: string;
  grid: string;
  chartBgTop: string;
  chartBgBottom: string;
  tooltipBg: string;
  tooltipBorder: string;
  guide: string;
  pr: string;
  warning: string;
  success: string;
  danger: string;
};

const PAD_LEFT = 44;
const PAD_RIGHT = 16;
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
      textMuted: "rgba(15,23,42,0.80)",
      muted2: "rgba(15,23,42,0.58)",
      accent: "#0891b2",
      accentDim: "rgba(8,145,178,0.18)",
      accentBg: "rgba(8,145,178,0.08)",
      raw: "#0f766e",
      rawFill: "rgba(15,118,110,0.22)",
      trend: "#d97706",
      grid: "rgba(15,23,42,0.10)",
      chartBgTop: "rgba(248,250,252,0.92)",
      chartBgBottom: "rgba(241,245,249,0.96)",
      tooltipBg: "rgba(255,255,255,0.96)",
      tooltipBorder: "rgba(15,23,42,0.10)",
      guide: "rgba(15,23,42,0.18)",
      pr: "#f59e0b",
      warning: "#b45309",
      success: "#15803d",
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
    accentDim: "rgba(34,211,238,0.22)",
    accentBg: "rgba(34,211,238,0.10)",
    raw: "rgba(34,211,238,0.95)",
    rawFill: "rgba(34,211,238,0.22)",
    trend: "#fbbf24",
    grid: "rgba(148,163,184,0.12)",
    chartBgTop: "rgba(2,6,23,0.30)",
    chartBgBottom: "rgba(2,6,23,0.56)",
    tooltipBg: "rgba(8,15,29,0.96)",
    tooltipBorder: "rgba(255,255,255,0.08)",
    guide: "rgba(148,163,184,0.20)",
    pr: "#fbbf24",
    warning: "#f59e0b",
    success: "#22c55e",
    danger: "#f87171",
  };
}

function formatValue(value: number, unitLabel: string) {
  const decimals = value < 10 ? 1 : 0;
  return `${value.toFixed(decimals)} ${unitLabel}`;
}

function getPointSlotWidth(pointCount: number) {
  if (pointCount <= 5) return 64;
  if (pointCount <= 12) return 44;
  if (pointCount <= 24) return 34;
  return 28;
}

function buildLinePath(
  points: PreparedProgressPoint[],
  getX: (index: number) => number,
  getY: (value: number) => number,
  accessor: (point: PreparedProgressPoint) => number | null
) {
  const segments: string[] = [];
  let activeSegment = "";

  points.forEach((point, index) => {
    const value = accessor(point);
    if (value == null) return;

    const x = getX(index);
    const y = getY(value);

    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    if (!activeSegment || point.hasGapBefore) {
      if (activeSegment) {
        segments.push(activeSegment);
      }
      activeSegment = `M ${x} ${y}`;
      return;
    }

    activeSegment += ` L ${x} ${y}`;
  });

  if (activeSegment) {
    segments.push(activeSegment);
  }

  return segments;
}

function getVisibleLabelIndexes(
  total: number,
  minLabels: number,
  maxLabels: number
) {
  if (total <= maxLabels) {
    return new Set(Array.from({ length: total }, (_, index) => index));
  }

  const desired = Math.max(minLabels, Math.min(maxLabels, total));
  const step = Math.ceil(total / desired);
  const indexes = new Set<number>();

  for (let index = 0; index < total; index += step) {
    indexes.add(index);
  }
  indexes.add(total - 1);

  return indexes;
}

function createStyles(colors: Palette) {
  return StyleSheet.create<{
    card: ViewStyle;
    header: ViewStyle;
    iconCircle: ViewStyle;
    title: TextStyle;
    subtitle: TextStyle;
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
    statsRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 5,
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
      fontSize: 9,
      fontWeight: "600",
      color: colors.muted2,
      letterSpacing: 0.2,
      textTransform: "uppercase",
    },
    statValue: {
      fontSize: 12,
      fontWeight: "500",
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
      minWidth: 40,
      paddingHorizontal: 12,
      paddingVertical: 6,
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
      fontSize: 8,
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

export function ExerciseProgressChart({
  data,
  title = "Progresjon",
  showTitle = true,
  height = 250,
  variant = "line",
  range = "20",
  onRangeChange,
  metricKind,
  showOuterLines = false,
  minXLabels = 3,
  maxXLabels = 6,
}: Props) {
  const colors = useMemo(() => getPalette("dark"), []);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [containerWidth, setContainerWidth] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const effectiveMetric: ProgressMetricKind =
    metricKind ?? (variant === "bar" ? "volumeKg" : "weight");

  const prepared = useMemo(
    () =>
      prepareProgressSeries({
        data,
        metric: effectiveMetric,
        range,
      }),
    [data, effectiveMetric, range]
  );

  useEffect(() => {
    if (!prepared.points.length) {
      setSelectedKey(null);
      return;
    }

    setSelectedKey((current) => {
      if (current && prepared.points.some((point) => point.key === current)) {
        return current;
      }
      return prepared.points[prepared.points.length - 1].key;
    });
  }, [prepared.points]);

  if (!prepared.points.length) {
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
            Grafen hopper over manglende eller ugyldige logger og viser først
            noe når det finnes gyldige datapunkter.
          </Text>
        </View>
      </View>
    );
  }

  const selectedPoint =
    prepared.points.find((point) => point.key === selectedKey) ??
    prepared.points[prepared.points.length - 1];

  const slotWidth = getPointSlotWidth(prepared.points.length);
  const minChartWidth =
    PAD_LEFT + PAD_RIGHT + slotWidth * prepared.points.length;
  const chartWidth = Math.max(containerWidth, minChartWidth);
  const innerWidth = Math.max(10, chartWidth - PAD_LEFT - PAD_RIGHT);
  const innerHeight = Math.max(80, height - PAD_TOP - PAD_BOTTOM);

  const yScale = scaleLinear()
    .domain([prepared.yDomain.paddedMin, prepared.yDomain.paddedMax])
    .range([innerHeight, 0]);

  const getX = (index: number) => {
    if (prepared.points.length === 1) {
      return PAD_LEFT + innerWidth / 2;
    }
    const step = innerWidth / (prepared.points.length - 1);
    return PAD_LEFT + step * index;
  };

  const getY = (value: number) => PAD_TOP + yScale(value);

  const rawSegments = buildLinePath(prepared.points, getX, getY, (point) =>
    variant === "line" ? point.clampedValue : null
  );
  const trendSegments = buildLinePath(
    prepared.points,
    getX,
    getY,
    (point) => point.trendClampedValue
  );

  const labelIndexes = getVisibleLabelIndexes(
    prepared.points.length,
    minXLabels,
    maxXLabels
  );
  const tickCount = 4;
  const yTicks = Array.from({ length: tickCount + 1 }, (_, index) => {
    const ratio = index / tickCount;
    return (
      prepared.yDomain.paddedMax -
      (prepared.yDomain.paddedMax - prepared.yDomain.paddedMin) * ratio
    );
  });

  const selectedIndex = prepared.points.findIndex(
    (point) => point.key === selectedPoint.key
  );
  const selectedX = getX(selectedIndex);
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
            {prepared.rangeLabel} • {prepared.points.length}{" "}
            {prepared.bucket === "week" ? "ukepunkter" : "punkter"}
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
          <Text style={styles.statLabel}>Total</Text>
          <Text
            style={[
              styles.statValue,
              prepared.totalChange != null && {
                color:
                  prepared.totalChange >= 0 ? colors.success : colors.danger,
              },
            ]}
          >
            {prepared.totalChange == null
              ? "--"
              : `${prepared.totalChange >= 0 ? "+" : ""}${formatValue(
                  prepared.totalChange,
                  prepared.unitLabel
                )}`}
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Snitt / uke</Text>
          <Text style={styles.statValue}>
            {prepared.averageChangePerWeek == null
              ? "--"
              : `${prepared.averageChangePerWeek >= 0 ? "+" : ""}${formatValue(
                  prepared.averageChangePerWeek,
                  prepared.unitLabel
                )}`}
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Siste</Text>
          <Text style={styles.statValue}>
            {formatValue(selectedPoint.value, prepared.unitLabel)}
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
                borderWidth: showOuterLines ? 1 : 0,
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
              <Defs>
                <SvgLinearGradient
                  id="progressRawFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <Stop offset="0" stopColor={colors.rawFill} />
                  <Stop offset="1" stopColor="transparent" />
                </SvgLinearGradient>
              </Defs>

              <G>
                {yTicks.map((tick, index) => {
                  const y = getY(tick);
                  return (
                    <G key={`tick-${index}`}>
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
                        {tick < 10 ? tick.toFixed(1) : tick.toFixed(0)}
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

                {variant === "bar" &&
                  prepared.points.map((point, index) => {
                    const x = getX(index);
                    const barWidth = Math.min(18, slotWidth * 0.62);
                    const top = getY(point.clampedValue);
                    const barHeight = Math.max(4, height - PAD_BOTTOM - top);
                    return (
                      <Rect
                        key={`bar-${point.key}`}
                        x={x - barWidth / 2}
                        y={top}
                        width={barWidth}
                        height={barHeight}
                        rx={4}
                        fill={colors.rawFill}
                        stroke={point.isOutlier ? colors.warning : colors.raw}
                        strokeWidth={point.key === selectedPoint.key ? 1.6 : 1}
                      />
                    );
                  })}

                {rawSegments.map((segment) => (
                  <Path
                    key={segment}
                    d={segment}
                    fill="none"
                    stroke={colors.raw}
                    strokeWidth={variant === "line" ? 1.8 : 0}
                  />
                ))}

                {trendSegments.map((segment) => (
                  <Path
                    key={`trend-${segment}`}
                    d={segment}
                    fill="none"
                    stroke={colors.trend}
                    strokeWidth={1.35}
                    strokeDasharray="6,6"
                    opacity={0.95}
                  />
                ))}

                {prepared.points.map((point, index) => {
                  const x = getX(index);
                  const y = getY(point.clampedValue);
                  const showDot =
                    variant === "line" &&
                    (prepared.points.length <= 12 ||
                      point.key === selectedPoint.key ||
                      point.isPr ||
                      point.isOutlier);

                  return (
                    <G key={`point-${point.key}`}>
                      {showDot && (
                        <>
                          <Circle
                            cx={x}
                            cy={y}
                            r={point.key === selectedPoint.key ? 4.1 : 2.8}
                            fill={point.isOutlier ? colors.warning : colors.raw}
                          />
                          {point.isPr && (
                            <Circle
                              cx={x}
                              cy={y}
                              r={point.key === selectedPoint.key ? 6.1 : 4.9}
                              fill="none"
                              stroke={colors.pr}
                              strokeWidth={1.1}
                            />
                          )}
                        </>
                      )}

                      {point.key === selectedPoint.key && (
                        <Circle
                          cx={x}
                          cy={y}
                          r={8.2}
                          fill="transparent"
                          stroke={colors.accent}
                          strokeWidth={1}
                        />
                      )}

                      <Circle
                        cx={x}
                        cy={y}
                        r={Math.max(12, slotWidth * 0.34)}
                        fill="transparent"
                        onPress={() => setSelectedKey(point.key)}
                      />

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

                      {point.isPr && point.key === selectedPoint.key && (
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
              </G>
            </Svg>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
