import { weightChartColors } from "@/components/weight/weight-chart/WeightChart.tokens";
import { styles as weightChartStyles } from "@/components/weight/weight-chart/WeightProgressChart.styles";
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
  showZoomControls?: boolean;
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
};

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const COLORS = {
  accent: weightChartColors.accentColor,
  accentStrong: weightChartColors.accentStrong,
  accentBg: weightChartColors.accentBackground,
  textMuted: "rgba(191,219,254,0.76)",
  subText: weightChartColors.labelColor,
  neutral: weightChartColors.neutralText,
  line: weightChartColors.lineColor,
  dotFill: weightChartColors.dotFillColor,
  trend: weightChartColors.trendLineColor,
  grid: weightChartColors.gridLineColor,
  guide: "rgba(148,163,184,0.2)",
  success: "rgba(34,197,94,0.92)",
  danger: "rgba(248,113,113,0.95)",
  warning: "rgba(251,191,36,0.95)",
  panelOverlay: weightChartColors.backgroundGradientFrom,
};

const PAD_LEFT = 44;
const PAD_RIGHT = 16;
const PAD_TOP = 18;
const PAD_BOTTOM = 34;

function formatValue(value: number, unitLabel: string) {
  const decimals = Math.abs(value) < 10 ? 1 : 0;
  return `${value.toFixed(decimals)} ${unitLabel}`;
}

function formatSignedValue(value: number | null, unitLabel: string) {
  if (value == null) return "--";
  return `${value > 0 ? "+" : ""}${formatValue(value, unitLabel)}`;
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

function buildAreaPaths(
  points: PreparedProgressPoint[],
  getX: (index: number) => number,
  getY: (value: number) => number,
  accessor: (point: PreparedProgressPoint) => number | null,
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

    if (activePoints.length > 0 && point.hasGapBefore) {
      pushActive();
    }

    activePoints.push(nextPoint);
  });

  pushActive();
  return paths;
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
  showVerticalLines = false,
  minXLabels = 3,
  maxXLabels = 10,
  showZoomControls = true,
  minZoom = 0.1,
  maxZoom = 5,
  zoomStep = 0.35,
}: Props) {
  const { t, language } = useTranslation();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const fillId = useMemo(
    () => `exercise-progress-fill-${Math.random().toString(36).slice(2, 10)}`,
    []
  );

  const effectiveMetric: ProgressMetricKind =
    metricKind ?? (variant === "bar" ? "volumeKg" : "weight");

  const prepared = useMemo(
    () =>
      prepareProgressSeries({
        data,
        metric: effectiveMetric,
        range,
        language,
      }),
    [data, effectiveMetric, language, range]
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

  const slotWidth = getPointSlotWidth(prepared.points.length);
  const chartZoom = useSvgChartZoom({
    pointCount: prepared.points.length,
    height,
    baseContentWidth: Math.max(220, prepared.points.length * slotWidth),
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

  if (!prepared.points.length) {
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
                {t("progressChartMeta", {
                  count: 0,
                  pointLabel: t("progressPoints"),
                  range: t("progressSelectedPeriod"),
                })}
              </Text>
            </View>
          </View>
        )}

        <View style={weightChartStyles.emptyRow}>
          <View style={weightChartStyles.emptyIconWrap}>
            <Ionicons name="stats-chart-outline" size={18} color="#38bdf8" />
          </View>
          <View style={styles.emptyWrap}>
            <Text style={[typography.bodyBlack, weightChartStyles.emptyTitle]}>
              {t("progressionNoData")}
            </Text>
            <Text style={[typography.body, weightChartStyles.emptySub]}>
              {t("progressMoreDataBody")}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const selectedPoint =
    prepared.points.find((point) => point.key === selectedKey) ??
    prepared.points[prepared.points.length - 1];
  const firstPoint = prepared.points[0];
  const lastPoint = prepared.points[prepared.points.length - 1];
  const trendTone = getTrendTone(prepared.totalChange);

  const effectiveContainerWidth = chartZoom.effectiveContainerWidth;
  const chartWidth = chartZoom.chartWidth;
  const shouldEnableHorizontalScroll = chartZoom.shouldEnableHorizontalScroll;
  const innerWidth = Math.max(10, chartWidth - PAD_LEFT - PAD_RIGHT);
  const innerHeight = Math.max(
    80,
    chartZoom.chartHeight - PAD_TOP - PAD_BOTTOM
  );
  const baselineY = chartZoom.chartHeight - PAD_BOTTOM;
  const shouldRenderGuide = chartZoom.renderMode !== "overview";
  const shouldRenderTrend = chartZoom.renderMode !== "overview";
  const shouldRenderArea = variant === "line";
  const shouldRenderTouchTargets =
    !chartZoom.isPinching && chartZoom.renderMode !== "overview";
  const compactDotsOnlySelected = chartZoom.renderMode === "compact";
  const maxVisibleLabels = chartZoom.isPinching
    ? Math.min(
        chartZoom.dynamicMaxVisibleLabels,
        chartZoom.renderMode === "overview" ? 4 : 6
      )
    : chartZoom.dynamicMaxVisibleLabels;

  const yScale = scaleLinear()
    .domain([prepared.yDomain.paddedMin, prepared.yDomain.paddedMax])
    .range([innerHeight, 0]);

  const getX = (index: number) => {
    if (prepared.points.length === 1) {
      return PAD_LEFT + innerWidth / 2;
    }
    const step = innerWidth / prepared.points.length;
    return PAD_LEFT + step / 2 + step * index;
  };

  const getY = (value: number) => PAD_TOP + yScale(value);

  const rawSegments = buildLinePath(prepared.points, getX, getY, (point) =>
    variant === "line" ? point.clampedValue : null
  );
  const rawAreas =
    shouldRenderArea
      ? buildAreaPaths(
          prepared.points,
          getX,
          getY,
          (point) => point.clampedValue,
          baselineY
        )
      : [];
  const trendSegments = buildLinePath(
    prepared.points,
    getX,
    getY,
    (point) => point.trendClampedValue
  );

  const labelIndexes = getVisibleLabelIndexes(
    prepared.points.length,
    minXLabels,
    maxVisibleLabels
  );
  const tickCount = chartZoom.isPinching ? 3 : 4;
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
  const pointLabel =
    prepared.bucket === "week" ? t("progressWeekPoints") : t("progressPoints");
  const metaLabel = t("progressChartMeta", {
    count: prepared.points.length,
    pointLabel,
    range: prepared.rangeLabel,
  });

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
                  {option.value === "all" ? t("progressAll") : option.label}
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
            <Text style={weightChartStyles.statLabel}>{t("progressStart")}</Text>
          </View>
          <Text style={weightChartStyles.statValue}>
            {formatValue(firstPoint.value, prepared.unitLabel)}
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
                name={trendTone.icon}
                size={12}
                color={COLORS.accent}
              />
            </View>
            <Text style={weightChartStyles.statLabel}>{t("progressTrend")}</Text>
          </View>
          <View style={weightChartStyles.changeRow}>
            <Text
              style={[weightChartStyles.trendIcon, { color: trendTone.color }]}
            >
              {trendTone.iconText}
            </Text>
            <Text
              style={[weightChartStyles.statValue, { color: trendTone.color }]}
            >
              {formatSignedValue(prepared.totalChange, prepared.unitLabel)}
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
            <Text style={weightChartStyles.statLabel}>{t("progressLatest")}</Text>
          </View>
          <Text style={weightChartStyles.statValue}>
            {formatValue(lastPoint.value, prepared.unitLabel)}
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
                        {tick < 10 ? tick.toFixed(1) : tick.toFixed(0)}
                      </SvgText>
                    </G>
                  );
                })}

                {showVerticalLines &&
                  prepared.points.map((point, index) => {
                    if (index === 0 || index === prepared.points.length - 1) {
                      return null;
                    }

                    return (
                      <SvgLine
                        key={`vertical-${point.key}`}
                        x1={getX(index)}
                        x2={getX(index)}
                        y1={PAD_TOP}
                        y2={baselineY}
                        stroke={COLORS.grid}
                        strokeWidth={1}
                        strokeDasharray="3,5"
                      />
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

                {rawAreas.map((areaPath) => (
                  <Path
                    key={`area-${areaPath}`}
                    d={areaPath}
                    fill={`url(#${fillId})`}
                  />
                ))}

                {variant === "bar" &&
                  prepared.points.map((point, index) => {
                    const x = getX(index);
                    const barWidth = Math.min(18, slotWidth * 0.62);
                    const top = getY(point.clampedValue);
                    const barHeight = Math.max(4, baselineY - top);
                    return (
                      <Rect
                        key={`bar-${point.key}`}
                        x={x - barWidth / 2}
                        y={top}
                        width={barWidth}
                        height={barHeight}
                        rx={4}
                        fill={COLORS.line}
                        fillOpacity={weightChartColors.shadowFillFromOpacity}
                        stroke={point.isOutlier ? COLORS.warning : COLORS.line}
                        strokeWidth={point.key === selectedPoint.key ? 1.6 : 1}
                      />
                    );
                  })}

                {rawSegments.map((segment) => (
                  <Path
                    key={segment}
                    d={segment}
                    fill="none"
                    stroke={COLORS.line}
                    strokeWidth={variant === "line" ? 1.9 : 0}
                  />
                ))}

                {shouldRenderTrend &&
                  trendSegments.map((segment) => (
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

                {prepared.points.map((point, index) => {
                  const x = getX(index);
                  const y = getY(point.clampedValue);
                  const showDot =
                    variant === "line" &&
                    (compactDotsOnlySelected
                      ? point.key === selectedPoint.key ||
                        point.isPr ||
                        point.isOutlier
                      : prepared.points.length <= 12 ||
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
                            fill={COLORS.dotFill}
                            stroke={
                              point.isOutlier ? COLORS.warning : COLORS.line
                            }
                            strokeWidth={1.5}
                          />
                          {point.isPr && (
                            <Circle
                              cx={x}
                              cy={y}
                              r={point.key === selectedPoint.key ? 6.1 : 4.9}
                              fill="none"
                              stroke={COLORS.warning}
                              strokeWidth={1.1}
                            />
                          )}
                        </>
                      )}

                      {shouldRenderGuide && point.key === selectedPoint.key && (
                        <Circle
                          cx={x}
                          cy={y}
                          r={8.2}
                          fill="transparent"
                          stroke={COLORS.accent}
                          strokeWidth={1}
                        />
                      )}

                      {shouldRenderTouchTargets && (
                        <Circle
                          cx={x}
                          cy={y}
                          r={Math.max(12, slotWidth * 0.34)}
                          fill="transparent"
                          onPress={() => setSelectedKey(point.key)}
                        />
                      )}

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
                        point.isPr &&
                        point.key === selectedPoint.key && (
                        <SvgText
                          x={x}
                          y={Math.max(14, y - 12)}
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
                  </G>
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
            {t("progressAveragePerWeek")}
          </Text>
          <Text
            style={[
              weightChartStyles.miniStatValue,
              prepared.averageChangePerWeek != null && {
                color: getTrendTone(prepared.averageChangePerWeek).color,
              },
            ]}
          >
            {formatSignedValue(prepared.averageChangePerWeek, prepared.unitLabel)}
          </Text>
        </View>

        <View style={weightChartStyles.miniStat}>
          <Text style={weightChartStyles.miniStatLabel}>
            {t("progressSelected")}
          </Text>
          <Text style={weightChartStyles.miniStatValue}>
            {selectedPoint.shortLabel}
          </Text>
        </View>

        <View style={weightChartStyles.miniStat}>
          <Text style={weightChartStyles.miniStatLabel}>
            {t("progressValue")}
          </Text>
          <Text style={weightChartStyles.miniStatValue}>
            {formatValue(selectedPoint.value, prepared.unitLabel)}
          </Text>
        </View>
      </View>
    </View>
  );
}
