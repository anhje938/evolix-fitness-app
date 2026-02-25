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
  const chart = useWeightProgressChart({
    weightList,
    weeks,
    yMinPadding,
    yMaxPadding,
    decimalPlaces,
    goalValue,
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
                0 målinger · siste {weeks} uker
              </Text>
            </View>
          </View>
        )}

        <View style={styles.emptyRow}>
          <View style={styles.emptyIconWrap}>
            <Text style={styles.emptyIcon}>⚖️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyBlack, styles.emptyTitle]}>
              Ingen vektmålinger ennå
            </Text>
            <Text style={[typography.body, styles.emptySub]}>
              Legg inn en måling for å se utviklingen her.
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

  return (
    <View style={[generalStyles.newCard, styles.card]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          {showTitle && (
            <Text style={[typography.h2, styles.title]}>{title}</Text>
          )}
          <Text style={[typography.body, styles.meta]}>
            {chart.stats?.count} målinger · siste {weeks} uker
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
              <Text style={styles.zoomText}>−</Text>
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
            <Text style={styles.statLabel}>Start</Text>
            <Text style={styles.statValue}>
              {chart.stats.first.toFixed(decimalPlaces)} kg
            </Text>
          </View>

          <View style={[styles.statBox, styles.statBoxAccent]}>
            <Text style={styles.statLabel}>Endring</Text>
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
            <Text style={styles.statLabel}>Nå</Text>
            <Text style={styles.statValue}>
              {chart.stats.last.toFixed(decimalPlaces)} kg
            </Text>
          </View>
        </View>
      )}

      <Text style={styles.hint}>Knip for zoom · dra for å se mer</Text>

      {/* Goal indicator if goal is outside visible range */}
      {showGoalLine &&
        goalValue !== undefined &&
        chart.isGoalExtreme &&
        chart.stats && (
          <View style={styles.goalIndicator}>
            <View
              style={[
                styles.goalBadge,
                chart.goal < chart.stats.min
                  ? styles.goalBadgeBelow
                  : styles.goalBadgeAbove,
              ]}
            >
              <Text style={styles.goalBadgeIcon}>
                {chart.goal < chart.stats.min ? "↓" : "↑"}
              </Text>
              <View style={styles.goalBadgeContent}>
                <Text style={styles.goalBadgeLabel}>Mål</Text>
                <Text style={styles.goalBadgeValue}>
                  {chart.goal.toFixed(decimalPlaces)} kg
                </Text>
              </View>
              <Text style={styles.goalBadgeDistance}>
                {chart.goal < chart.stats.min ? "-" : "+"}
                {Math.abs(chart.stats.last - chart.goal).toFixed(1)} kg
              </Text>
            </View>
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
              scrollEnabled={chart.chartWidth > chart.effectiveContainerWidth}
              contentContainerStyle={[
                styles.scrollContent,
                { width: chart.chartWidth },
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
                    const { width: innerWidth, height: innerHeight } = props;

                    if (
                      !showGoalLine ||
                      !chart.goal ||
                      chart.maxY === chart.minY ||
                      chart.isGoalExtreme
                    ) {
                      return null;
                    }

                    const goalY =
                      ((chart.maxY - chart.goal) / (chart.maxY - chart.minY)) *
                      innerHeight;

                    return (
                      <>
                        {/* Goal line */}
                        <Line
                          x1="0"
                          x2={innerWidth.toString()}
                          y1={goalY}
                          y2={goalY}
                          stroke={goalLineColor}
                          strokeDasharray={goalLineDashArray}
                          strokeWidth={1.5}
                        />

                        {/* Goal label */}
                        <SvgText
                          x={innerWidth - 65}
                          y={goalY - 6}
                          fill={goalLineColor}
                          fontSize="11"
                          fontWeight="700"
                          textAnchor="end"
                        >
                          Mål: {chart.goal.toFixed(decimalPlaces)} kg
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
            <Text style={styles.goalStatLabel}>Mål</Text>
            <Text style={styles.goalStatValue}>
              {goalValue.toFixed(decimalPlaces)} kg
            </Text>
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
