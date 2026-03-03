import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { PinchGestureHandler } from "react-native-gesture-handler";
import {
  Defs,
  Line,
  Stop,
  LinearGradient as SvgLinearGradient,
  Text as SvgText,
} from "react-native-svg";

import { generalStyles } from "@/config/styles";
import { typography } from "@/config/typography";
import type { Weight } from "@/types/weight";
import { Ionicons } from "@expo/vector-icons";

import { useWeightProgressChart } from "@/hooks/useWeightProgressChart";
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

  lineColor = "rgba(6, 182, 212, 1)",
  dotColor = "rgba(6, 182, 212, 1)",
  backgroundGradientFrom = "rgba(2, 6, 23, 0.26)",
  backgroundGradientTo = "transparent",
  labelColor = "rgba(148,163,184,0.85)",
  gridLineColor = "rgba(255,255,255,0.06)",

  fromZero = false,
  decimalPlaces = 1,
  yMinPadding = 0,
  yMaxPadding = 0,
  formatYLabelFn,

  showGoalLine = true,
  goalValue,
  goalLineColor = "rgba(251, 191, 36, 0.75)",
  goalLineDashArray = "4,3",

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
        {showTitle && (
          <View style={styles.headerRow}>
            <View>
              <Text style={[typography.h2, styles.title]}>{title}</Text>
              <Text style={[typography.body, styles.meta]}>
                {`0 m\u00e5linger \u00b7 siste ${weeks} uker`}
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
              {"Ingen vektm\u00e5linger enn\u00e5"}
            </Text>
            <Text style={[typography.body, styles.emptySub]}>
              {"Legg inn en m\u00e5ling for \u00e5 se utviklingen her."}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const datasets: any[] = [
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
  const shouldEnableHorizontalScroll =
    chart.chartWidth > chart.effectiveContainerWidth + 1;
  const shouldShowGoalToggle =
    showGoalLine &&
    goalValue !== undefined &&
    chart.stats &&
    (!chart.isGoalInRange || showGoalInChart);

  return (
    <View style={[generalStyles.newCard, styles.card]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          {showTitle && (
            <Text style={[typography.h2, styles.title]}>{title}</Text>
          )}
          <Text style={[typography.body, styles.meta]}>
            {`${chart.stats?.count} m\u00e5linger \u00b7 siste ${weeks} uker`}
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
              <Text style={styles.statLabel}>Endring</Text>
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
              <Text style={styles.statLabel}>{"N\u00e5"}</Text>
            </View>
            <Text style={styles.statValue}>
              {chart.stats.last.toFixed(decimalPlaces)} kg
            </Text>
          </View>
        </View>
      )}

      <Text style={styles.hint}>{"Knip for zoom \u00b7 dra for \u00e5 se mer"}</Text>

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
                {showGoalInChart ? "Skjul m\u00e5l" : "Vis m\u00e5l"}
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
        onLayout={(e) => chart.setContainerWidth(e.nativeEvent.layout.width)}
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
              scrollEnabled={shouldEnableHorizontalScroll}
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
              <View
                style={[
                  styles.chartPanel,
                  { width: chart.chartWidth, height: chart.chartHeight },
                ]}
              >
                <View style={styles.panelAccent} />

                <LineChart
                  data={{ labels: chart.limitedLabels, datasets }}
                  width={chart.chartWidth}
                  height={chart.chartHeight}
                  withInnerLines={showInnerLines}
                  withVerticalLines={showVerticalLines}
                  withOuterLines={showOuterLines}
                  fromZero={fromZero}
                  segments={segments}
                  yAxisInterval={1}
                  yAxisSuffix=""
                  yAxisLabel=""
                  chartConfig={{
                    backgroundGradientFrom: "transparent",
                    backgroundGradientTo: "transparent",
                    decimalPlaces,
                    color: () => lineColor,
                    labelColor: () => labelColor,
                    paddingTop: 20,
                    paddingRight: 16,
                    propsForDots: showDots
                      ? {
                          r: String(dotRadius),
                          strokeWidth: "1.5",
                          stroke: lineColor,
                          fill: "#020617",
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
                  }}
                  bezier
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    right: 0,
                    bottom: 0,
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
                      paddingTop = 16,
                      paddingRight = 64,
                      data: decoratorData = [],
                    } = props;

                    if (
                      !showGoalLine ||
                      goalValue === undefined ||
                      chart.maxY === chart.minY ||
                      !chart.isGoalInRange
                    ) {
                      return null;
                    }

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
                    const goalHeight =
                      min < 0 && max > 0
                        ? innerHeight * (chart.goal / scaler)
                        : min >= 0 && max >= 0
                        ? fromZero
                          ? innerHeight * (chart.goal / scaler)
                          : innerHeight * ((chart.goal - min) / scaler)
                        : fromZero
                        ? innerHeight * (chart.goal / scaler)
                        : innerHeight * ((chart.goal - max) / scaler);
                    const goalY = ((baseHeight - goalHeight) / 4) * 3 + paddingTop;

                    return (
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
                          {`M\u00e5l: ${chart.goal.toFixed(decimalPlaces)} kg`}
                        </SvgText>

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
            </ScrollView>
          </View>
        </PinchGestureHandler>
      </View>

      {/* Goal stats */}
      {showStats && chart.stats && goalValue !== undefined && (
        <View style={styles.goalStats}>
          <View style={styles.goalStat}>
            <View style={styles.goalLabelRow}>
              <Text style={styles.goalStatLabel}>{"M\u00e5l"}</Text>
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
            <Text style={styles.goalStatLabel}>{"Tid til m\u00e5l"}</Text>

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
