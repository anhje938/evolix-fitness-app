import React from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { PinchGestureHandler } from "react-native-gesture-handler";
import {
  Defs,
  Line,
  Path as SvgPath,
  Stop,
  LinearGradient as SvgLinearGradient,
  Text as SvgText,
} from "react-native-svg";
import { LinearGradient as ExpoLinearGradient } from "expo-linear-gradient";

import { generalStyles } from "@/config/styles";
import { typography } from "@/config/typography";
import type { Weight } from "@/types/weight";
import { Ionicons } from "@expo/vector-icons";

import { useWeightProgressChart } from "@/hooks/useWeightProgressChart";
import { weightChartColors } from "./WeightChart.tokens";
import { styles } from "./WeightProgressChart.styles";

type Props = {
  weightList: Weight[];
  weeks?: number;

  // Text / labels
  title?: string;
  showTitle?: boolean;

  // Size
  height?: number;

  // Grid / lines
  showInnerLines?: boolean;
  showVerticalLines?: boolean;
  showOuterLines?: boolean;
  segments?: number;

  // Dots / line
  showDots?: boolean;
  lineStrokeWidth?: number;
  dotRadius?: number;

  // Colors
  lineColor?: string;
  dotColor?: string;
  trendLineColor?: string;
  backgroundGradientFrom?: string;
  backgroundGradientTo?: string;
  labelColor?: string;
  gridLineColor?: string;

  // Y-axis
  fromZero?: boolean;
  decimalPlaces?: number;
  yMinPadding?: number;
  yMaxPadding?: number;
  formatYLabelFn?: (y: string) => string;

  // Goal-line
  showGoalLine?: boolean;
  goalValue?: number;
  goalLineColor?: string;
  goalLineDashArray?: string;
  showTrendLine?: boolean;
  trendLineDashArray?: string;
  trendLineStrokeWidth?: number;

  // Label density
  minXLabels?: number;
  maxXLabels?: number;
  maxYLabels?: number;

  // Zoom
  showZoomControls?: boolean;
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;

  // Stats
  showStats?: boolean;
};

const CHART_PADDING_TOP = 16;
const CHART_PADDING_RIGHT = 64;

function calcChartScaler(data: number[], fromZero: boolean) {
  const values = fromZero ? [...data, 0] : data;
  return Math.max(...values) - Math.min(...values) || 1;
}

function calcChartBaseHeight(data: number[], height: number, fromZero: boolean) {
  const min = Math.min(...data);
  const max = Math.max(...data);

  if (min >= 0 && max >= 0) return height;
  if (min < 0 && max <= 0) return 0;
  return (height * max) / calcChartScaler(data, fromZero);
}

function calcChartHeight(
  value: number,
  data: number[],
  height: number,
  fromZero: boolean
) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const scaler = calcChartScaler(data, fromZero);

  if (min < 0 && max > 0) {
    return height * (value / scaler);
  }

  if (min >= 0 && max >= 0) {
    return fromZero
      ? height * (value / scaler)
      : height * ((value - min) / scaler);
  }

  return fromZero
    ? height * (value / scaler)
    : height * ((value - max) / scaler);
}

function buildBezierTrendPath({
  values,
  domainData,
  width,
  height,
  paddingRight,
  paddingTop,
  fromZero,
}: {
  values: number[];
  domainData: number[];
  width: number;
  height: number;
  paddingRight: number;
  paddingTop: number;
  fromZero: boolean;
}) {
  if (values.length < 2 || domainData.length === 0) return null;

  const slotCount = Math.max(values.length, 1);
  const x = (index: number) =>
    Math.floor(
      paddingRight + ((index + 0.5) * (width - paddingRight)) / slotCount
    );
  const baseHeight = calcChartBaseHeight(domainData, height, fromZero);
  const y = (index: number) => {
    const yHeight = calcChartHeight(values[index], domainData, height, fromZero);
    return Math.floor(((baseHeight - yHeight) / 4) * 3 + paddingTop);
  };

  return [`M${x(0)},${y(0)}`]
    .concat(
      values.slice(0, -1).map((_, index) => {
        const xMid = (x(index) + x(index + 1)) / 2;
        const yMid = (y(index) + y(index + 1)) / 2;
        const cpX1 = (xMid + x(index)) / 2;
        const cpX2 = (xMid + x(index + 1)) / 2;
        return (
          `Q ${cpX1}, ${y(index)}, ${xMid}, ${yMid}` +
          ` Q ${cpX2}, ${y(index + 1)}, ${x(index + 1)}, ${y(index + 1)}`
        );
      })
    )
    .join(" ");
}

export function WeightProgressChart({
  weightList,
  weeks = 8,

  title = "Vektutvikling",
  showTitle = true,

  height,

  showInnerLines = true,
  showVerticalLines = false,
  showOuterLines = false,
  segments = 5,

  showDots = true,
  lineStrokeWidth = 2.5,
  dotRadius = 3.5,

  lineColor = weightChartColors.lineColor,
  dotColor = weightChartColors.dotColor,
  trendLineColor = weightChartColors.trendLineColor,
  backgroundGradientFrom = "rgba(8, 15, 28, 0.18)",
  backgroundGradientTo = weightChartColors.backgroundGradientTo,
  labelColor = weightChartColors.labelColor,
  gridLineColor = weightChartColors.gridLineColor,

  fromZero = false,
  decimalPlaces = 1,
  yMinPadding = 0,
  yMaxPadding = 0,
  formatYLabelFn,

  showGoalLine = true,
  goalValue,
  goalLineColor = weightChartColors.goalLineColor,
  goalLineDashArray = "4,3",
  showTrendLine = true,
  trendLineDashArray = "6,6",
  trendLineStrokeWidth = 1.35,

  minXLabels = 3,
  maxXLabels = 12,
  maxYLabels = 5,

  showZoomControls = true,
  minZoom = 1,
  maxZoom = 4,
  zoomStep = 0.5,

  showStats = true,
}: Props) {
  const [showGoalInChart, setShowGoalInChart] = React.useState(false);

  const chart = useWeightProgressChart({
    weightList,
    weeks,
    yMinPadding,
    yMaxPadding,
    decimalPlaces,
    goalValue,
    includeGoalInRange: showGoalInChart,
    minXLabels,
    maxXLabels,
    minZoom,
    maxZoom,
    zoomStep,
    height,
  });

  // Empty state
  if (!chart.dailyData.length) {
    return (
      <View style={[generalStyles.newCard, styles.card]}>
        <ExpoLinearGradient
          pointerEvents="none"
          colors={weightChartColors.cardGradientColors}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.92, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.cardGlowTop} />
        <View pointerEvents="none" style={styles.cardGlowBottom} />

        {showTitle && (
          <View style={styles.headerRow}>
            <View>
              <Text style={[typography.h2, styles.title]}>{title}</Text>
              <Text style={[typography.body, styles.meta]}>
                {`0 målinger · siste ${weeks} uker`}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.emptyRow}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="scale-outline" size={18} color="#38bdf8" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyBlack, styles.emptyTitle]}>
              {"Ingen vektmålinger ennå"}
            </Text>
            <Text style={[typography.body, styles.emptySub]}>
              {"Legg inn en måling for å se utviklingen her."}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const showChartDots =
    showDots && chart.renderMode === "full";
  const shouldRenderDecorator = showTrendLine || showGoalLine;
  const datasets = [
    {
      data: chart.values,
      strokeWidth: lineStrokeWidth,
      color: () => lineColor,
    },
    {
      data: [chart.minY, chart.maxY],
      strokeWidth: 0,
      color: () => "rgba(0,0,0,0)",
      withDots: false,
    },
  ];
  const chartConfig = {
    backgroundGradientFrom: "transparent",
    backgroundGradientTo: "transparent",
    decimalPlaces,
    color: () => lineColor,
    labelColor: () => labelColor,
    useShadowColorFromDataset: true,
    paddingTop: 20,
    paddingRight: 16,
    propsForDots: showChartDots
      ? {
          r: String(dotRadius),
          strokeWidth: "1.5",
          stroke: dotColor,
          fill: weightChartColors.dotFillColor,
        }
      : { r: "0", strokeWidth: "0" },
    propsForBackgroundLines: {
      stroke: gridLineColor,
      strokeDasharray: "",
      strokeWidth: "1",
    },
    propsForLabels: {
      fontSize: 10,
      fontWeight: "600",
    } as any,
  };
  const shouldEnableHorizontalScroll =
    chart.chartWidth > chart.effectiveContainerWidth + 1;
  const pinchTranslateX = Animated.multiply(
    Animated.subtract(chart.pinchScale, 1),
    chart.chartWidth / 2
  );
  const shouldShowGoalToggle =
    showGoalLine &&
    goalValue !== undefined &&
    chart.stats &&
    (!chart.isGoalInRange || showGoalInChart);

  return (
    <View style={[generalStyles.newCard, styles.card]}>
      <ExpoLinearGradient
        pointerEvents="none"
        colors={weightChartColors.cardGradientColors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.92, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.cardGlowTop} />
      <View pointerEvents="none" style={styles.cardGlowBottom} />

      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          {showTitle && <Text style={[typography.h2, styles.title]}>{title}</Text>}
          <Text style={[typography.body, styles.meta]}>
            {`${chart.stats?.count} målinger · siste ${weeks} uker`}
          </Text>
        </View>

        {showZoomControls && (
          <View style={styles.zoomContainer}>
            <TouchableOpacity
              onPress={chart.handleZoomOut}
              disabled={!chart.canZoomOut}
              activeOpacity={0.7}
              style={[
                styles.zoomButton,
                !chart.canZoomOut && styles.zoomButtonDisabled,
              ]}
            >
              <Text style={styles.zoomText}>-</Text>
            </TouchableOpacity>

            <View style={styles.zoomPill}>
              <Text style={styles.zoomLabel}>{chart.zoom.toFixed(2)}x</Text>
            </View>

            <TouchableOpacity
              onPress={chart.handleZoomIn}
              disabled={!chart.canZoomIn}
              activeOpacity={0.7}
              style={[
                styles.zoomButton,
                !chart.canZoomIn && styles.zoomButtonDisabled,
              ]}
            >
              <Text style={styles.zoomText}>+</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Stats row */}
      {showStats && chart.stats && (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <View style={styles.statHead}>
              <View style={styles.statIconWrap}>
                <Ionicons name="flag-outline" size={12} color="#7dd3fc" />
              </View>
              <Text style={styles.statLabel}>Start</Text>
            </View>
            <Text style={styles.statValue}>
              {chart.stats.first.toFixed(decimalPlaces)} kg
            </Text>
          </View>

          <View style={[styles.statBox, styles.statBoxAccent]}>
            <View style={styles.statHead}>
              <View style={styles.statIconWrap}>
                <Ionicons
                  name="swap-vertical-outline"
                  size={12}
                  color="#7dd3fc"
                />
              </View>
              <Text style={styles.statLabel}>Trend</Text>
            </View>
            <View style={styles.changeRow}>
              <Text
                style={[styles.trendIcon, { color: chart.trend.trendColor }]}
              >
                {chart.trend.trendIcon}
              </Text>
              <Text
                style={[styles.statValue, { color: chart.trend.trendColor }]}
              >
                {chart.trend.changeText}
              </Text>
            </View>
          </View>

          <View style={styles.statBox}>
            <View style={styles.statHead}>
              <View style={styles.statIconWrap}>
                <Ionicons name="scale-outline" size={12} color="#7dd3fc" />
              </View>
              <Text style={styles.statLabel}>Siste</Text>
            </View>
            <Text style={styles.statValue}>
              {chart.stats.last.toFixed(decimalPlaces)} kg
            </Text>
          </View>
        </View>
      )}

      {/* Goal indicator if goal is outside visible range */}
      {shouldShowGoalToggle && (
          <View style={styles.goalIndicator}>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => setShowGoalInChart((prev) => !prev)}
              style={[styles.goalHint, showGoalInChart && styles.goalHintActive]}
            >
              <Ionicons
                name={showGoalInChart ? "eye-off-outline" : "arrow-down"}
                size={12}
                color={
                  showGoalInChart
                    ? "rgba(125,211,252,0.96)"
                    : "rgba(251,191,36,0.95)"
                }
              />
              <Text
                style={[
                  styles.goalHintText,
                  showGoalInChart && styles.goalHintTextActive,
                ]}
              >
                {showGoalInChart ? "Skjul mål" : "Vis mål"}
              </Text>
              <Text style={styles.goalHintValue}>
                {`${chart.goal.toFixed(decimalPlaces)} kg`}
              </Text>
            </TouchableOpacity>
          </View>
        )}

      {/* Chart */}
      <View
        style={styles.chartOuter}
        onLayout={(e) => {
          const nextWidth = e.nativeEvent.layout.width;
          if (nextWidth !== chart.containerWidth) {
            chart.setContainerWidth(nextWidth);
          }
        }}
      >
        <PinchGestureHandler
          onGestureEvent={chart.handlePinchEvent}
          onHandlerStateChange={chart.handlePinchStateChange}
        >
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              bounces={false}
              scrollEnabled={!chart.isPinching && shouldEnableHorizontalScroll}
              contentContainerStyle={[
                styles.scrollContent,
                {
                  width: shouldEnableHorizontalScroll
                    ? chart.chartWidth
                    : chart.effectiveContainerWidth,
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
                    { scaleX: chart.pinchScale },
                  ],
                }}
              >
                <View
                  style={[
                    styles.chartPanel,
                    {
                      width: chart.chartWidth,
                      height: chart.chartHeight,
                      backgroundColor: "rgba(8, 15, 28, 0.38)",
                    },
                  ]}
                >
                  <View style={styles.panelAccent} />

                <LineChart
                  data={{ labels: chart.limitedLabels, datasets }}
                  width={chart.chartWidth}
                  height={chart.chartHeight}
                  withShadow
                  withInnerLines={showInnerLines}
                  withVerticalLines={showVerticalLines}
                  withOuterLines={showOuterLines}
                  fromZero={fromZero}
                  segments={segments}
                  yAxisInterval={1}
                  yAxisSuffix=""
                  yAxisLabel=""
                  chartConfig={chartConfig}
                  bezier
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    right: 0,
                    bottom: 0,
                    paddingRight: CHART_PADDING_RIGHT,
                  }}
                  formatYLabel={(yValue) => {
                    if (formatYLabelFn) return formatYLabelFn(yValue);
                    const n = Number(yValue);
                    if (!isFinite(n)) return yValue;
                    return n.toFixed(decimalPlaces);
                  }}
                  decorator={(props: any) => {
                    const {
                      width: innerWidth,
                      height: innerHeight,
                      paddingTop = CHART_PADDING_TOP,
                      paddingRight = CHART_PADDING_RIGHT,
                      data: decoratorData = [],
                    } = props;

                    const allDataValues = Array.isArray(decoratorData)
                      ? decoratorData
                          .flatMap((dataset: any) =>
                            Array.isArray(dataset?.data) ? dataset.data : []
                          )
                          .filter(
                            (v: unknown): v is number =>
                              typeof v === "number" && Number.isFinite(v)
                          )
                      : [];

                    if (!allDataValues.length) return null;

                    const trendPath =
                      shouldRenderDecorator &&
                      showTrendLine && chart.trendValues.length > 1
                        ? buildBezierTrendPath({
                            values: chart.trendValues,
                            domainData: allDataValues,
                            width: innerWidth,
                            height: innerHeight,
                            paddingRight,
                            paddingTop,
                            fromZero,
                          })
                        : null;
                    const shouldRenderGoal =
                      shouldRenderDecorator &&
                      showGoalLine &&
                      goalValue !== undefined &&
                      chart.maxY !== chart.minY &&
                      chart.isGoalInRange;

                    const min = Math.min(...allDataValues);
                    const max = Math.max(...allDataValues);
                    const scaler = fromZero
                      ? Math.max(...allDataValues, 0) - Math.min(...allDataValues, 0) || 1
                      : max - min || 1;
                    const baseHeight =
                      min >= 0 && max >= 0
                        ? innerHeight
                        : min < 0 && max <= 0
                        ? 0
                        : (innerHeight * max) / scaler;
                    const goalHeight = shouldRenderGoal
                      ? min < 0 && max > 0
                        ? innerHeight * (chart.goal / scaler)
                        : min >= 0 && max >= 0
                        ? fromZero
                          ? innerHeight * (chart.goal / scaler)
                          : innerHeight * ((chart.goal - min) / scaler)
                        : fromZero
                        ? innerHeight * (chart.goal / scaler)
                        : innerHeight * ((chart.goal - max) / scaler)
                      : null;
                    const goalY =
                      goalHeight != null
                        ? ((baseHeight - goalHeight) / 4) * 3 + paddingTop
                        : null;

                    if (!trendPath && !shouldRenderGoal) return null;

                    return (
                      <>
                        {trendPath ? (
                          <SvgPath
                            d={trendPath}
                            fill="none"
                            stroke={trendLineColor}
                            strokeWidth={trendLineStrokeWidth}
                            strokeDasharray={trendLineDashArray}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity={0.95}
                          />
                        ) : null}

                        {shouldRenderGoal && goalY != null ? (
                          <>
                        {/* Goal line */}
                        <Line
                          x1={paddingRight.toString()}
                          x2={innerWidth.toString()}
                          y1={goalY}
                          y2={goalY}
                          stroke={goalLineColor}
                          strokeDasharray={goalLineDashArray}
                          strokeWidth={1.5}
                        />

                        {/* Goal label */}
                        <SvgText
                          x={innerWidth - 6}
                          y={goalY - 6}
                          fill={goalLineColor}
                          fontSize="11"
                          fontWeight="700"
                          textAnchor="end"
                        >
                          {`Mål: ${chart.goal.toFixed(decimalPlaces)} kg`}
                        </SvgText>
                          </>
                        ) : null}

                        {/* Gradient fill under line (kept for future use) */}
                        <Defs>
                          <SvgLinearGradient
                            id="chartGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <Stop
                              offset="0%"
                              stopColor={lineColor}
                              stopOpacity="0.3"
                            />
                            <Stop
                              offset="100%"
                              stopColor={lineColor}
                              stopOpacity="0"
                            />
                          </SvgLinearGradient>
                        </Defs>
                      </>
                    );
                  }}
                />

                {/* Panel background */}
                  <View
                    pointerEvents="none"
                    style={[
                      {
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                        backgroundColor: backgroundGradientFrom,
                      },
                    ]}
                  />
                </View>
              </Animated.View>
            </ScrollView>
          </View>
        </PinchGestureHandler>
      </View>

      {/* Goal stats */}
      {showStats && chart.stats && goalValue !== undefined && (
        <View style={styles.goalStats}>
          <View style={styles.goalStat}>
            <View style={styles.goalLabelRow}>
              <Text style={styles.goalStatLabel}>Mål</Text>
            </View>
            <View style={styles.goalValueRow}>
              <Text style={[styles.goalStatValue, styles.goalWeightValue]}>
                {goalValue.toFixed(decimalPlaces)} kg
              </Text>
              <Ionicons
                name="medal"
                size={14}
                color="rgba(251,191,36,0.98)"
                style={styles.goalValueIcon}
              />
            </View>
          </View>

          <View style={styles.goalStat}>
            <Text style={styles.goalStatLabel}>Snitt/uke</Text>
            <Text
              style={[styles.goalStatValue, { color: chart.trend.trendColor }]}
            >
              {chart.stats.avgChangePerWeek > 0 ? "+" : ""}
              {chart.stats.avgChangePerWeek.toFixed(2)} kg
            </Text>
          </View>

          <View style={styles.goalStat}>
            <Text style={styles.goalStatLabel}>Tid til mål</Text>

            {chart.stats.goalDirection === "correct" &&
            chart.stats.daysToGoal !== null ? (
              <Text
                style={[
                  styles.goalStatValue,
                  { color: "rgba(34, 197, 94, 0.9)" },
                ]}
              >
                {chart.stats.daysToGoal < 7
                  ? `${chart.stats.daysToGoal} dag${
                      chart.stats.daysToGoal !== 1 ? "er" : ""
                    }`
                  : chart.stats.weeksToGoal! < 4
                  ? `${Math.round(chart.stats.weeksToGoal!)} uker`
                  : `${(chart.stats.weeksToGoal! / 4).toFixed(1)} mnd`}
              </Text>
            ) : chart.stats.goalDirection === "wrong" ? (
              <Text
                style={[
                  styles.goalStatValue,
                  { color: "rgba(239, 68, 68, 0.9)", fontSize: 11 },
                ]}
              >
                Feil retning
              </Text>
            ) : (
              <Text
                style={[
                  styles.goalStatValue,
                  { color: "rgba(148, 163, 184, 0.7)", fontSize: 11 },
                ]}
              >
                Stabil vekt
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
