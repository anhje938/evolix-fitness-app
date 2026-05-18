import { weightChartColors } from "@/components/weight/weight-chart/WeightChart.tokens";
import { styles as weightChartStyles } from "@/components/weight/weight-chart/WeightProgressChart.styles";
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
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { PinchGestureHandler } from "react-native-gesture-handler";
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

import { useSvgChartZoom } from "@/hooks/useSvgChartZoom";
import { useTranslation } from "@/i18n/translations";

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
  minXLabels?: number;
  maxXLabels?: number;
  showZoomControls?: boolean;
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
};

type MergedPoint = {
  key: string;
  shortLabel: string;
  fullLabel: string;
  weight: PreparedProgressPoint | null;
  volume: PreparedProgressPoint | null;
};

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const COLORS = {
  accent: weightChartColors.accentColor,
  accentStrong: weightChartColors.accentStrong,
  accentBg: weightChartColors.accentBackground,
  neutral: weightChartColors.neutralText,
  subText: weightChartColors.labelColor,
  line: weightChartColors.lineColor,
  dotFill: weightChartColors.dotFillColor,
  trend: weightChartColors.trendLineColor,
  volume: weightChartColors.lineColor,
  volumeStroke: weightChartColors.lineColor,
  grid: weightChartColors.gridLineColor,
  guide: "rgba(148,163,184,0.2)",
  success: "rgba(34,197,94,0.92)",
  danger: "rgba(248,113,113,0.95)",
  warning: "rgba(251,191,36,0.95)",
  panelOverlay: weightChartColors.backgroundGradientFrom,
};

const PAD_LEFT = 44;
const PAD_RIGHT = 44;
const PAD_TOP = 18;
const PAD_BOTTOM = 34;

function formatValue(value: number | null, unit: string) {
  if (value == null) return "--";
  const decimals = Math.abs(value) < 10 ? 1 : 0;
  return `${value.toFixed(decimals)} ${unit}`;
}

function formatSignedValue(value: number | null, unit: string) {
  if (value == null) return "--";
  return `${value > 0 ? "+" : ""}${formatValue(value, unit)}`;
}

function getSlotWidth(pointCount: number) {
  if (pointCount <= 5) return 64;
  if (pointCount <= 12) return 44;
  if (pointCount <= 24) return 34;
  return 28;
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
  const step = Math.max(1, Math.ceil(total / desired));
  const indexes = new Set<number>();
  for (let index = 0; index < total; index += step) {
    indexes.add(index);
  }
  indexes.add(total - 1);
  return indexes;
}

function buildLineSegments<T>(
  points: T[],
  getX: (index: number) => number,
  getY: (value: number) => number,
  accessor: (point: T) => number | null,
  gapAccessor: (point: T) => boolean
) {
  const segments: string[] = [];
  let active = "";

  points.forEach((point, index) => {
    const value = accessor(point);
    if (value == null) return;

    const x = getX(index);
    const y = getY(value);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }

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

function buildAreaPaths<T>(
  points: T[],
  getX: (index: number) => number,
  getY: (value: number) => number,
  accessor: (point: T) => number | null,
  gapAccessor: (point: T) => boolean,
  baselineY: number
) {
  const paths: string[] = [];
  let activePoints: { x: number; y: number }[] = [];

  const pushActive = () => {
    if (activePoints.length === 0) return;

    const first = activePoints[0];
    const last = activePoints[activePoints.length - 1];
    const topPath = activePoints
      .map((point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
      )
      .join(" ");

    paths.push(
      `${topPath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`
    );
    activePoints = [];
  };

  points.forEach((point, index) => {
    const value = accessor(point);
    if (value == null) return;

    const nextPoint = {
      x: getX(index),
      y: getY(value),
    };

    if (!Number.isFinite(nextPoint.x) || !Number.isFinite(nextPoint.y)) {
      return;
    }

    if (activePoints.length > 0 && gapAccessor(point)) {
      pushActive();
    }

    activePoints.push(nextPoint);
  });

  pushActive();
  return paths;
}

function getTrendTone(value: number | null): {
  color: string;
  icon: IoniconName;
  iconText: string;
} {
  if (value == null || value === 0) {
    return {
      color: COLORS.neutral,
      icon: "remove",
      iconText: "→",
    };
  }

  return value > 0
    ? {
        color: COLORS.success,
        icon: "trending-up",
        iconText: "↗",
      }
    : {
        color: COLORS.danger,
        icon: "trending-down",
        iconText: "↘",
      };
}

const styles = StyleSheet.create({
  headerText: {
    flex: 1,
    paddingRight: 10,
  },
  rangeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  rangePill: {
    minWidth: 48,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8,15,28,0.66)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.12)",
  },
  rangePillActive: {
    backgroundColor: COLORS.accentBg,
    borderColor: COLORS.accentStrong,
  },
  rangePillText: {
    color: "rgba(224,242,254,0.95)",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.08,
  },
  rangePillTextActive: {
    color: "#F8FAFC",
  },
  chartScrollContent: {
    paddingBottom: 6,
  },
  chartOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.panelOverlay,
  },
  emptyWrap: {
    flex: 1,
  },
});

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
  minXLabels = 3,
  maxXLabels = 10,
  showZoomControls = true,
  minZoom = 0.1,
  maxZoom = 5,
  zoomStep = 0.35,
}: Props) {
  const { t } = useTranslation();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const fillId = useMemo(
    () => `combined-progress-fill-${Math.random().toString(36).slice(2, 10)}`,
    []
  );

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

  const slotWidth = getSlotWidth(merged.length);
  const chartZoom = useSvgChartZoom({
    pointCount: merged.length,
    height,
    baseContentWidth: Math.max(220, merged.length * slotWidth),
    staticWidthOffset: PAD_LEFT + PAD_RIGHT,
    minZoom,
    maxZoom,
    zoomStep,
    minVisibleLabels: minXLabels,
    maxVisibleLabels: maxXLabels,
    fallbackWidthPadding: 56,
  });
  const pinchTranslateX = useMemo(
    () =>
      Animated.multiply(
        Animated.subtract(chartZoom.pinchScale, 1),
        chartZoom.chartWidth / 2
      ),
    [chartZoom.chartWidth, chartZoom.pinchScale]
  );

  if (!merged.length) {
    return (
      <View style={[generalStyles.newCard, weightChartStyles.card]}>
        <LinearGradient
          pointerEvents="none"
          colors={weightChartColors.cardGradientColors}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.92, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={weightChartStyles.cardGlowTop} />
        <View pointerEvents="none" style={weightChartStyles.cardGlowBottom} />

        {showTitle && (
          <View style={weightChartStyles.headerRow}>
            <View style={styles.emptyWrap}>
              <Text style={[typography.h2, weightChartStyles.title]}>
                {title}
              </Text>
              <Text style={[typography.body, weightChartStyles.meta]}>
                0 punkter · valgt periode
              </Text>
            </View>
          </View>
        )}

        <View style={weightChartStyles.emptyRow}>
          <View style={weightChartStyles.emptyIconWrap}>
            <Ionicons name="pulse-outline" size={18} color="#38bdf8" />
          </View>
          <View style={styles.emptyWrap}>
            <Text style={[typography.bodyBlack, weightChartStyles.emptyTitle]}>
              {t("progressionNoData")}
            </Text>
            <Text style={[typography.body, weightChartStyles.emptySub]}>
              Når øktene inneholder nok data, bygger vi både 1RM og volum her.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const selected =
    merged.find((point) => point.key === selectedKey) ??
    merged[merged.length - 1];
  const isWeightVisible = metric !== "volume";
  const isVolumeVisible = metric !== "weight";
  const primarySeries = isWeightVisible ? weightSeries : volumeSeries;
  const primaryPoints = isWeightVisible ? weightSeries.points : volumeSeries.points;
  const primaryFirst = primaryPoints[0];
  const primaryLast = primaryPoints[primaryPoints.length - 1];
  const primaryUnit = primarySeries.unitLabel;
  const primaryTrendTone = getTrendTone(primarySeries.totalChange);

  const effectiveContainerWidth = chartZoom.effectiveContainerWidth;
  const chartWidth = chartZoom.chartWidth;
  const shouldEnableHorizontalScroll = chartZoom.shouldEnableHorizontalScroll;
  const innerWidth = Math.max(10, chartWidth - PAD_LEFT - PAD_RIGHT);
  const innerHeight = Math.max(
    90,
    chartZoom.chartHeight - PAD_TOP - PAD_BOTTOM
  );
  const baselineY = chartZoom.chartHeight - PAD_BOTTOM;
  const shouldRenderGuide = chartZoom.renderMode !== "overview";
  const shouldRenderTrend = chartZoom.renderMode !== "overview";
  const shouldRenderArea = true;
  const shouldRenderTouchTargets =
    !chartZoom.isPinching && chartZoom.renderMode !== "overview";
  const compactDotsOnlySelected = chartZoom.renderMode === "compact";
  const maxVisibleLabels = chartZoom.isPinching
    ? Math.min(
        chartZoom.dynamicMaxVisibleLabels,
        chartZoom.renderMode === "overview" ? 4 : 6
      )
    : chartZoom.dynamicMaxVisibleLabels;

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
    const step = innerWidth / merged.length;
    return PAD_LEFT + step / 2 + step * index;
  };

  const weightLine = buildLineSegments(
    merged,
    getX,
    (value) => PAD_TOP + weightScale(value),
    (point) =>
      point.weight && isWeightVisible ? point.weight.clampedValue : null,
    (point) => point.weight?.hasGapBefore ?? false
  );
  const weightArea = buildAreaPaths(
    merged,
    getX,
    (value) => PAD_TOP + weightScale(value),
    (point) =>
      point.weight && isWeightVisible ? point.weight.clampedValue : null,
    (point) => point.weight?.hasGapBefore ?? false,
    baselineY
  );
  const trendLine = buildLineSegments(
    merged,
    getX,
    (value) => PAD_TOP + weightScale(value),
    (point) =>
      point.weight && isWeightVisible
        ? point.weight.trendClampedValue
        : null,
    (point) => point.weight?.hasGapBefore ?? false
  );
  const volumeTrendLine = buildLineSegments(
    merged,
    getX,
    (value) => PAD_TOP + volumeScale(value),
    (point) =>
      point.volume && isVolumeVisible
        ? point.volume.trendClampedValue
        : null,
    (point) => point.volume?.hasGapBefore ?? false
  );

  const labelIndexes = getVisibleLabelIndexes(
    merged.length,
    minXLabels,
    maxVisibleLabels
  );
  const tickCount = chartZoom.isPinching ? 3 : 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, index) => index / tickCount);
  const selectedIndex = merged.findIndex((point) => point.key === selected.key);
  const selectedX = getX(selectedIndex);
  const metaLabel = `${merged.length} ${
    weightSeries.bucket === "week" ? "ukepunkter" : "punkter"
  } · ${weightSeries.rangeLabel}`;

  return (
    <View style={[generalStyles.newCard, weightChartStyles.card]}>
      <LinearGradient
        pointerEvents="none"
        colors={weightChartColors.cardGradientColors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.92, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={weightChartStyles.cardGlowTop} />
      <View pointerEvents="none" style={weightChartStyles.cardGlowBottom} />

      <View style={weightChartStyles.headerRow}>
        <View style={styles.headerText}>
          {showTitle && (
            <Text style={[typography.h2, weightChartStyles.title]}>{title}</Text>
          )}
          <Text style={[typography.body, weightChartStyles.meta]}>
            {metaLabel}
          </Text>
        </View>

        {showZoomControls && (
          <View style={weightChartStyles.zoomContainer}>
            <TouchableOpacity
              onPress={chartZoom.handleZoomOut}
              disabled={!chartZoom.canZoomOut}
              activeOpacity={0.7}
              style={[
                weightChartStyles.zoomButton,
                !chartZoom.canZoomOut && weightChartStyles.zoomButtonDisabled,
              ]}
            >
              <Text style={weightChartStyles.zoomText}>-</Text>
            </TouchableOpacity>

            <View style={weightChartStyles.zoomPill}>
              <Text style={weightChartStyles.zoomLabel}>
                {chartZoom.zoom.toFixed(2)}x
              </Text>
            </View>

            <TouchableOpacity
              onPress={chartZoom.handleZoomIn}
              disabled={!chartZoom.canZoomIn}
              activeOpacity={0.7}
              style={[
                weightChartStyles.zoomButton,
                !chartZoom.canZoomIn && weightChartStyles.zoomButtonDisabled,
              ]}
            >
              <Text style={weightChartStyles.zoomText}>+</Text>
            </TouchableOpacity>
          </View>
        )}
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

      <View style={weightChartStyles.statsRow}>
        <View style={weightChartStyles.statBox}>
          <View style={weightChartStyles.statHead}>
            <View style={weightChartStyles.statIconWrap}>
              <Ionicons name="flag-outline" size={12} color={COLORS.accent} />
            </View>
            <Text style={weightChartStyles.statLabel}>Start</Text>
          </View>
          <Text style={weightChartStyles.statValue}>
            {formatValue(primaryFirst?.value ?? null, primaryUnit)}
          </Text>
        </View>

        <View
          style={[
            weightChartStyles.statBox,
            weightChartStyles.statBoxAccent,
          ]}
        >
          <View style={weightChartStyles.statHead}>
            <View style={weightChartStyles.statIconWrap}>
              <Ionicons
                name={primaryTrendTone.icon}
                size={12}
                color={COLORS.accent}
              />
            </View>
            <Text style={weightChartStyles.statLabel}>Trend</Text>
          </View>
          <View style={weightChartStyles.changeRow}>
            <Text
              style={[
                weightChartStyles.trendIcon,
                { color: primaryTrendTone.color },
              ]}
            >
              {primaryTrendTone.iconText}
            </Text>
            <Text
              style={[
                weightChartStyles.statValue,
                { color: primaryTrendTone.color },
              ]}
            >
              {formatSignedValue(primarySeries.totalChange, primaryUnit)}
            </Text>
          </View>
        </View>

        <View style={weightChartStyles.statBox}>
          <View style={weightChartStyles.statHead}>
            <View style={weightChartStyles.statIconWrap}>
              <Ionicons
                name="analytics-outline"
                size={12}
                color={COLORS.accent}
              />
            </View>
            <Text style={weightChartStyles.statLabel}>Siste</Text>
          </View>
          <Text style={weightChartStyles.statValue}>
            {formatValue(primaryLast?.value ?? null, primaryUnit)}
          </Text>
        </View>
      </View>

      <View
        style={weightChartStyles.chartOuter}
        onLayout={(event) => {
          const nextWidth = event.nativeEvent.layout.width;
          if (nextWidth !== chartZoom.containerWidth) {
            chartZoom.setContainerWidth(nextWidth);
          }
        }}
      >
        <PinchGestureHandler
          onGestureEvent={chartZoom.handlePinchEvent}
          onHandlerStateChange={chartZoom.handlePinchStateChange}
        >
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              bounces={false}
              scrollEnabled={!chartZoom.isPinching && shouldEnableHorizontalScroll}
              contentContainerStyle={[
                styles.chartScrollContent,
                {
                  width: shouldEnableHorizontalScroll
                    ? chartWidth
                    : effectiveContainerWidth,
                  alignItems: shouldEnableHorizontalScroll ? "flex-start" : "center",
                },
              ]}
            >
              <Animated.View
                renderToHardwareTextureAndroid
                shouldRasterizeIOS
                style={{
                  transform: [
                    { translateX: pinchTranslateX },
                    { scaleX: chartZoom.pinchScale },
                  ],
                }}
              >
                <View
                  style={[
                    weightChartStyles.chartPanel,
                    {
                      width: chartWidth,
                      height: chartZoom.chartHeight,
                    },
                  ]}
                >
                  <View style={weightChartStyles.panelAccent} />
                  <View pointerEvents="none" style={styles.chartOverlay} />

                  <Svg width={chartWidth} height={chartZoom.chartHeight}>
                  <Defs>
                    <SvgLinearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                      <Stop
                        offset="0"
                        stopColor={COLORS.line}
                        stopOpacity={weightChartColors.shadowFillFromOpacity}
                      />
                      <Stop
                        offset="1"
                        stopColor={COLORS.line}
                        stopOpacity={weightChartColors.shadowFillToOpacity}
                      />
                    </SvgLinearGradient>
                  </Defs>

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
                const leftTick = isWeightVisible ? weightTick : volumeTick;
                const rightTick =
                  isWeightVisible && isVolumeVisible ? volumeTick : null;

                return (
                  <G key={`grid-${index}`}>
                    <SvgLine
                      x1={PAD_LEFT}
                      x2={chartWidth - PAD_RIGHT}
                      y1={y}
                      y2={y}
                      stroke={COLORS.grid}
                      strokeWidth={1}
                      strokeDasharray="4,4"
                    />
                    <SvgText
                      x={PAD_LEFT - 8}
                      y={y + 3}
                      textAnchor="end"
                      fontSize={9}
                      fill={COLORS.subText}
                      fontWeight="600"
                    >
                      {leftTick < 10
                        ? leftTick.toFixed(1)
                        : leftTick.toFixed(0)}
                    </SvgText>

                    {rightTick != null && (
                      <SvgText
                        x={chartWidth - PAD_RIGHT + 8}
                        y={y + 3}
                        fontSize={9}
                        fill={COLORS.subText}
                        fontWeight="600"
                      >
                        {rightTick < 10
                          ? rightTick.toFixed(1)
                          : rightTick.toFixed(0)}
                      </SvgText>
                    )}
                  </G>
                );
                  })}

              {showOuterLines && (
                <Rect
                  x={PAD_LEFT}
                  y={PAD_TOP}
                  width={chartWidth - PAD_LEFT - PAD_RIGHT}
                  height={innerHeight}
                  fill="transparent"
                  stroke={COLORS.grid}
                  strokeWidth={1}
                />
              )}

              {shouldRenderGuide && (
                <SvgLine
                  x1={selectedX}
                  x2={selectedX}
                  y1={PAD_TOP}
                  y2={baselineY}
                  stroke={COLORS.guide}
                  strokeWidth={1}
                  strokeDasharray="3,4"
                />
              )}

              {isWeightVisible &&
                shouldRenderArea &&
                weightArea.map((segment) => (
                  <Path
                    key={`weight-area-${segment}`}
                    d={segment}
                    fill={`url(#${fillId})`}
                  />
                ))}

              {isVolumeVisible &&
                merged.map((point, index) => {
                  if (!point.volume) return null;

                  const x = getX(index);
                  const barWidth = Math.min(18, slotWidth * 0.62);
                  const top = PAD_TOP + volumeScale(point.volume.clampedValue);
                  const barHeight = Math.max(4, baselineY - top);

                  return (
                    <Rect
                      key={`volume-${point.key}`}
                      x={x - barWidth / 2}
                      y={top}
                      width={barWidth}
                      height={barHeight}
                      rx={4}
                      fill={COLORS.volume}
                      fillOpacity={weightChartColors.shadowFillFromOpacity}
                      stroke={COLORS.volumeStroke}
                      strokeWidth={point.key === selected.key ? 1.6 : 1}
                    />
                  );
                })}

              {isVolumeVisible &&
                shouldRenderTrend &&
                volumeTrendLine.map((segment) => (
                  <Path
                    key={`volume-trend-${segment}`}
                    d={segment}
                    fill="none"
                    stroke={COLORS.volumeStroke}
                    strokeWidth={1.15}
                    strokeDasharray="5,5"
                    opacity={0.55}
                  />
                ))}

              {isWeightVisible &&
                weightLine.map((segment) => (
                  <Path
                    key={`weight-${segment}`}
                    d={segment}
                    fill="none"
                    stroke={COLORS.line}
                    strokeWidth={1.9}
                  />
                ))}

              {isWeightVisible &&
                shouldRenderTrend &&
                trendLine.map((segment) => (
                  <Path
                    key={`trend-${segment}`}
                    d={segment}
                    fill="none"
                    stroke={COLORS.trend}
                    strokeWidth={1.35}
                    strokeDasharray="6,6"
                    opacity={0.95}
                  />
                ))}

              {merged.map((point, index) => {
                const x = getX(index);
                const weightY =
                  point.weight != null
                    ? PAD_TOP + weightScale(point.weight.clampedValue)
                    : PAD_TOP + innerHeight * 0.3;
                const showDot =
                  point.weight != null &&
                  isWeightVisible &&
                  (compactDotsOnlySelected
                    ? point.key === selected.key ||
                      point.weight.isPr ||
                      point.weight.isOutlier
                    : merged.length <= 12 ||
                      point.key === selected.key ||
                      point.weight.isPr ||
                      point.weight.isOutlier);

                return (
                  <G key={`merged-${point.key}`}>
                    {showDot && point.weight && (
                      <>
                        <Circle
                          cx={x}
                          cy={weightY}
                          r={point.key === selected.key ? 4.1 : 2.8}
                          fill={COLORS.dotFill}
                          stroke={
                            point.weight.isOutlier ? COLORS.warning : COLORS.line
                          }
                          strokeWidth={1.5}
                        />
                        {point.weight.isPr && (
                          <Circle
                            cx={x}
                            cy={weightY}
                            r={point.key === selected.key ? 6.1 : 4.9}
                            fill="none"
                            stroke={COLORS.warning}
                            strokeWidth={1.1}
                          />
                        )}
                      </>
                    )}

                    {shouldRenderGuide &&
                      point.key === selected.key &&
                      point.weight &&
                      isWeightVisible && (
                      <Circle
                        cx={x}
                        cy={weightY}
                        r={8.2}
                        fill="transparent"
                        stroke={COLORS.accent}
                        strokeWidth={1}
                      />
                    )}

                    {shouldRenderTouchTargets
                      ? point.volume ? (
                          <Rect
                            x={x - Math.min(18, slotWidth * 0.62) / 2}
                            y={PAD_TOP + volumeScale(point.volume.clampedValue)}
                            width={Math.min(18, slotWidth * 0.62)}
                            height={Math.max(
                              20,
                              baselineY -
                                (PAD_TOP + volumeScale(point.volume.clampedValue))
                            )}
                            fill="transparent"
                            onPress={() => setSelectedKey(point.key)}
                          />
                        ) : point.weight ? (
                          <Circle
                            cx={x}
                            cy={weightY}
                            r={Math.max(12, slotWidth * 0.34)}
                            fill="transparent"
                            onPress={() => setSelectedKey(point.key)}
                          />
                        ) : null
                      : null}

                    {labelIndexes.has(index) && (
                      <SvgText
                        x={x}
                        y={chartZoom.chartHeight - 12}
                        textAnchor="middle"
                        fontSize={10}
                        fill={COLORS.subText}
                        fontWeight="600"
                      >
                        {point.shortLabel}
                      </SvgText>
                    )}

                    {shouldRenderGuide &&
                      point.key === selected.key &&
                      point.weight?.isPr && (
                      <SvgText
                        x={x}
                        y={Math.max(14, weightY - 12)}
                        textAnchor="middle"
                        fontSize={10}
                        fill={COLORS.warning}
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
              </Animated.View>
            </ScrollView>
          </View>
        </PinchGestureHandler>
      </View>

      <View style={weightChartStyles.additionalStats}>
        <View style={weightChartStyles.miniStat}>
          <Text style={weightChartStyles.miniStatLabel}>
            {isWeightVisible && isVolumeVisible ? "1RM snitt/uke" : "Snitt / uke"}
          </Text>
          <Text
            style={[
              weightChartStyles.miniStatValue,
              primarySeries.averageChangePerWeek != null && {
                color: getTrendTone(primarySeries.averageChangePerWeek).color,
              },
            ]}
          >
            {formatSignedValue(primarySeries.averageChangePerWeek, primaryUnit)}
          </Text>
        </View>

        <View style={weightChartStyles.miniStat}>
          <Text style={weightChartStyles.miniStatLabel}>
            {isWeightVisible && isVolumeVisible ? "Volum valgt" : "Valgt"}
          </Text>
          <Text style={weightChartStyles.miniStatValue}>
            {isWeightVisible && isVolumeVisible
              ? formatValue(selected.volume?.value ?? null, volumeSeries.unitLabel)
              : selected.shortLabel}
          </Text>
        </View>

        <View style={weightChartStyles.miniStat}>
          <Text style={weightChartStyles.miniStatLabel}>
            {isWeightVisible && isVolumeVisible ? "Valgt" : "Verdi"}
          </Text>
          <Text style={weightChartStyles.miniStatValue}>
            {isWeightVisible && isVolumeVisible
              ? selected.shortLabel
              : formatValue(
                  isWeightVisible
                    ? selected.weight?.value ?? null
                    : selected.volume?.value ?? null,
                  primaryUnit
                )}
          </Text>
        </View>
      </View>
    </View>
  );
}
