// progress/CombinedExerciseChart.tsx

import { generalStyles } from "@/config/styles";
import { typography } from "@/config/typography";
import { Ionicons } from "@expo/vector-icons";
import { max, min } from "d3-array";
import {
  scaleBand,
  scaleLinear,
  type ScaleBand,
  type ScaleLinear,
} from "d3-scale";
import { curveMonotoneX, line as d3Line, type Line as D3Line } from "d3-shape";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import type { TextStyle, ViewStyle } from "react-native";
import { Dimensions, StyleSheet, Text, View } from "react-native";
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

/**
 * Premium Dark Ocean theme
 */
const colors = {
  card: "rgba(2,6,23,0.18)",
  surface: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)",
  borderSoft: "rgba(255,255,255,0.05)",
  text: "#E5ECFF",
  textMuted: "rgba(148,163,184,0.9)",
  muted2: "rgba(148,163,184,0.7)",
  accent: "#06b6d4",
  accentDim: "rgba(6,182,212,0.2)",
  accentBg: "rgba(6,182,212,0.08)",

  // chart
  grid: "rgba(148,163,184,0.12)",
  plotTop: "rgba(2,6,23,0.30)",
  plotBottom: "rgba(2,6,23,0.50)",
  chartBg: "rgba(2,6,23,0.30)",

  // series
  line: "rgba(6,182,212,0.95)", // ✅ 1RM
  bar: "rgba(6,182,212,0.35)", // ✅ volum
  barStroke: "rgba(6,182,212,0.25)",

  green: "rgba(34, 197, 94, 0.9)",
  red: "rgba(239, 68, 68, 0.9)",
};

export type ExerciseProgressPoint = {
  timestampUtc: string; // ISO-string
  value: number;
};

type Props = {
  title?: string;
  showTitle?: boolean;
  height?: number;

  metric?: "weight" | "volume" | "both";
  volumeMetric?: "sets" | "kg";

  weightData: ExerciseProgressPoint[]; // 1RM (line)
  volumeData: ExerciseProgressPoint[]; // volume (bars)

  showOuterLines?: boolean;
  showVerticalLines?: boolean; // (not used, parity)
  segments?: number;

  minXLabels?: number;
  maxXLabels?: number;

  backgroundGradientFrom?: string;
  labelColor?: string;
  gridLineColor?: string;

  barColor?: string;
  lineColor?: string;

  fromZero?: boolean;
  decimalPlaces?: number;
};

type MergedPoint = {
  ts: string;
  label: string;
  oneRm: number;
  volume: number;
};

const screenWidth = Dimensions.get("window").width;

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function CombinedExerciseChart({
  title = "1RM & volum",
  showTitle = true,
  height,

  metric,
  volumeMetric,

  weightData,
  volumeData,

  showOuterLines = false,
  showVerticalLines = false,
  segments = 5,

  minXLabels = 3,
  maxXLabels = 6,

  backgroundGradientFrom,
  labelColor,
  gridLineColor,

  barColor,
  lineColor,

  fromZero = true,
  decimalPlaces = 0,
}: Props) {
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  /**
   * ============================================================
   *  VISUAL TWEAKS - Premium Dark Ocean
   * ============================================================
   */

  // --- Layout / sizing
  const CARD_PADDING_X = 18;
  const CHART_HEIGHT = height ?? 240;

  const PAD_TOP = 14;
  const PAD_BOTTOM = 28;
  const PAD_LEFT = 42;
  const PAD_RIGHT = 42;

  // inner plot box
  const PLOT_RADIUS = 16;
  const PLOT_GRAD_TOP = "rgba(2,6,23,0.40)";
  const PLOT_GRAD_BOTTOM = "rgba(2,6,23,0.60)";

  const OUTER_BORDER_WIDTH = showOuterLines ? 1 : 0;

  // --- X axis (labels)
  const X_LABEL_FONT_SIZE = 10;
  const X_LABEL_Y_OFFSET = 18;
  const X_LABEL_TEXT_ANCHOR: "start" | "middle" | "end" = "middle";
  const X_LABEL_ROTATE_DEG = 0;

  // --- Y axes (labels)
  const Y_LEFT_FONT_SIZE = 9;
  const Y_RIGHT_FONT_SIZE = 9;

  const Y_LABEL_DY = 3;
  const Y_LEFT_X_OFFSET = 8;
  const Y_RIGHT_X_OFFSET = 8;
  const Y_LEFT_SUFFIX = " kg";
  const Y_RIGHT_SUFFIX = ""; // evt: volumeMetric === "kg" ? "kg" : ""

  // --- Grid
  const GRID_STROKE_WIDTH = 1;
  const GRID_DASHARRAY = "4,4";
  const GRID_USE_LEFT_AXIS_TICKS = true;

  // --- Band scale spacing (DENSE MODE)
  const X_PADDING_INNER = 0.22;
  const X_PADDING_OUTER = 0.18;

  // --- Bars (common)
  const BAR_WIDTH_FACTOR = 0.6;
  const BAR_RADIUS = 3;
  const BAR_OPACITY = 1;

  // --- Line
  const LINE_WIDTH = 2.5;
  const LINE_CURVE = curveMonotoneX;
  const LINE_OPACITY = 1;

  // --- Dots
  const DOT_RADIUS = 0;
  const DOT_OPACITY = 0;
  const LAST_DOT_RADIUS = 4;
  const LAST_DOT_OPACITY = 1;

  // --- Legend
  const LEGEND_X = 10;
  const LEGEND_Y = 14;
  const LEGEND_FONT_SIZE = 11;

  const LEGEND_BAR_SWATCH_SIZE = 10;
  const LEGEND_BAR_SWATCH_RADIUS = 3;
  const LEGEND_BAR_SWATCH_Y = -8;

  const LEGEND_BAR_TEXT_X = 16;
  const LEGEND_BAR_TEXT_Y = 0;

  const LEGEND_LINE_X1 = 70;
  const LEGEND_LINE_X2 = 90;
  const LEGEND_LINE_Y = -3;
  const LEGEND_LINE_WIDTH = 2.5;

  const LEGEND_LINE_TEXT_X = 96;
  const LEGEND_LINE_TEXT_Y = 0;

  const volumeLegend = "Volum";
  const oneLegend = "1RM";

  // --- Layers
  const SHOW_PLOT_BG = true;
  const SHOW_GRID = true;
  const SHOW_BARS = true;
  const SHOW_LINE = true;
  const SHOW_DOTS = false;
  const SHOW_LAST_DOT = true;
  const SHOW_X_LABELS = true;
  const SHOW_LEGEND = true;

  /**
   * ============================================================
   *  ✅ SPARSE MODE (få punkter) – fast størrelse, venstrejustert
   * ============================================================
   */
  const ENABLE_SPARSE_MODE = true;
  const SPARSE_MAX_POINTS = 6;
  const SPARSE_LEFT_INSET = 6;
  const SPARSE_BAR_WIDTH_PX = 18;
  const SPARSE_GAP_PX = 10;

  // Color overrides
  const effectiveBarColor = barColor || colors.bar;
  const effectiveLineColor = lineColor || colors.line;
  const effectiveLabelColor = labelColor || colors.muted2;
  const effectiveGridLineColor = gridLineColor || colors.grid;

  /**
   * ============================================================
   *  DATA + MERGE
   * ============================================================
   */
  const merged: MergedPoint[] = useMemo(() => {
    const wMap = new Map<string, number>(
      (weightData ?? []).map((p) => [p.timestampUtc, p.value])
    );
    const vMap = new Map<string, number>(
      (volumeData ?? []).map((p) => [p.timestampUtc, p.value])
    );

    const allTs = Array.from(
      new Set<string>([...wMap.keys(), ...vMap.keys()])
    ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    return allTs.map((ts) => {
      const d = new Date(ts);
      const one = Number(wMap.get(ts) ?? 0);
      const vol = Number(vMap.get(ts) ?? 0);

      return {
        ts,
        label: d.toLocaleDateString("nb-NO", {
          day: "numeric",
          month: "short",
        }),
        oneRm: Number.isFinite(one) ? Math.max(0, one) : 0,
        volume: Number.isFinite(vol) ? Math.max(0, vol) : 0,
      };
    });
  }, [weightData, volumeData]);

  const stats = useMemo(() => {
    if (merged.length === 0) return null;
    const oneRmValues = merged.map((d) => d.oneRm).filter((v) => v > 0);
    const volumeValues = merged.map((d) => d.volume).filter((v) => v > 0);

    if (oneRmValues.length === 0 && volumeValues.length === 0) return null;

    const maxOneRm = oneRmValues.length > 0 ? Math.max(...oneRmValues) : 0;
    const maxVolume = volumeValues.length > 0 ? Math.max(...volumeValues) : 0;
    const latestOneRm =
      oneRmValues.length > 0 ? oneRmValues[oneRmValues.length - 1] : 0;
    const latestVolume =
      volumeValues.length > 0 ? volumeValues[volumeValues.length - 1] : 0;

    const firstOneRm = oneRmValues.length > 0 ? oneRmValues[0] : 0;
    const changeOneRm = latestOneRm - firstOneRm;
    const changePercentOneRm =
      firstOneRm > 0 ? ((changeOneRm / firstOneRm) * 100).toFixed(1) : "0.0";

    return {
      maxOneRm,
      maxVolume,
      latestOneRm,
      latestVolume,
      changeOneRm,
      changePercentOneRm,
    };
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
              1RM (linje) + volum (søyler)
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
            Start å logge økter for å se progresjon
          </Text>
        </View>
      </View>
    );
  }

  const fallbackWidth = screenWidth - (CARD_PADDING_X * 2 + 12);
  const chartWidth = containerWidth ?? fallbackWidth;
  const chartHeight = CHART_HEIGHT;

  const pad = {
    top: PAD_TOP,
    bottom: PAD_BOTTOM,
    left: PAD_LEFT,
    right: PAD_RIGHT,
  };

  const innerW = Math.max(10, chartWidth - pad.left - pad.right);
  const innerH = Math.max(10, chartHeight - pad.top - pad.bottom);

  const oneMax = max(merged, (d) => d.oneRm) ?? 0;
  const oneMin = min(merged, (d) => d.oneRm) ?? 0;

  const volMax = max(merged, (d) => d.volume) ?? 0;
  const volMin = 0;

  const yOne: ScaleLinear<number, number> = scaleLinear<number>()
    .domain([fromZero ? 0 : Math.min(oneMin, 0), Math.max(oneMax, 1)])
    .nice(segments)
    .range([innerH, 0]);

  const yVol: ScaleLinear<number, number> = scaleLinear<number>()
    .domain([volMin, Math.max(volMax, 1)])
    .nice(segments)
    .range([innerH, 0]);

  // X label density
  const totalPoints = merged.length;
  const minAllowedX = Math.min(minXLabels, totalPoints);
  const maxAllowedX = Math.min(Math.max(maxXLabels, minAllowedX), totalPoints);

  let showX: boolean[] = merged.map(() => true);
  if (maxAllowedX > 0 && totalPoints > maxAllowedX) {
    const step = Math.ceil(totalPoints / maxAllowedX);
    showX = merged.map((_, i) => i % step === 0);
  }

  const ticks = (GRID_USE_LEFT_AXIS_TICKS ? yOne : yVol).ticks(segments);

  const fmt = (n: number) => n.toFixed(decimalPlaces);
  const rightLabelForY = (y: number) => fmt(yVol.invert(y));

  /**
   * ============================================================
   *  ✅ X LAYOUT: SPARSE vs DENSE
   * ============================================================
   */

  const useSparse =
    ENABLE_SPARSE_MODE &&
    merged.length > 0 &&
    merged.length <= SPARSE_MAX_POINTS;

  // DENSE: use scaleBand (current behavior)
  const xDense: ScaleBand<string> = scaleBand<string>()
    .domain(merged.map((d) => d.ts))
    .range([0, innerW])
    .paddingInner(X_PADDING_INNER)
    .paddingOuter(X_PADDING_OUTER);

  // Helper: get bar-left + bandW + centerX for each point
  const getX = (d: MergedPoint, idx: number) => {
    if (useSparse) {
      const slotW = SPARSE_BAR_WIDTH_PX + SPARSE_GAP_PX;
      const bx = SPARSE_LEFT_INSET + idx * slotW;
      const bwBase = SPARSE_BAR_WIDTH_PX;
      const bw = bwBase * BAR_WIDTH_FACTOR;
      const bxCentered = bx + (bwBase - bw) / 2;
      const cx = bx + bwBase / 2;
      return { bx: bxCentered, bw, cx };
    }

    const bxBand = xDense(d.ts);
    const bandW = xDense.bandwidth();
    const bw = bandW * BAR_WIDTH_FACTOR;
    const bxCentered = (bxBand ?? 0) + (bandW - bw) / 2;
    const cx = (bxBand ?? 0) + bandW / 2;
    return { bx: bxCentered, bw, cx };
  };

  // Line path
  const lineGenerator: D3Line<{ x: number; y: number }> = d3Line<{
    x: number;
    y: number;
  }>()
    .x((p) => p.x)
    .y((p) => p.y)
    .curve(LINE_CURVE);

  const linePoints = merged.map((d, idx) => {
    const { cx } = getX(d, idx);
    return { x: cx, y: yOne(d.oneRm) };
  });
  const linePath = lineGenerator(linePoints) ?? "";

  const last = merged[merged.length - 1];
  const lastIdx = merged.length - 1;
  const lastCx = getX(last, lastIdx).cx;
  const lastCy = yOne(last.oneRm);

  let lastNonZeroOne = { point: merged[merged.length - 1], idx: merged.length - 1 };
  for (let i = merged.length - 1; i >= 0; i--) {
    if (merged[i].oneRm > 0) {
      lastNonZeroOne = { point: merged[i], idx: i };
      break;
    }
  }

  const changeUp = (stats?.changeOneRm ?? 0) > 0;
  const changeDown = (stats?.changeOneRm ?? 0) < 0;

  const leftLabel = (n: number) => {
    if (n < 10) return n.toFixed(1);
    return n.toFixed(0);
  };

  const fmtSmart = (n: number, dp: number) => {
    if (n < 10) return n.toFixed(dp);
    return n.toFixed(0);
  };

  return (
    <View style={[generalStyles.newCard, styles.card]}>
      {/* Header */}
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
          <Text style={[typography.body, styles.subtitle]} numberOfLines={1}>
            {merged.length} økter • 1RM + volum
          </Text>
        </View>

        {!!stats && (
          <View
            style={[
              styles.trendPill,
              changeUp && styles.trendPillUp,
              changeDown && styles.trendPillDown,
            ]}
          >
            <Ionicons
              name={
                changeUp
                  ? "trending-up"
                  : changeDown
                  ? "trending-down"
                  : "remove"
              }
              size={12}
              color={
                changeUp
                  ? colors.green
                  : changeDown
                  ? colors.red
                  : colors.textMuted
              }
            />
            <Text
              style={[
                styles.trendText,
                changeUp && { color: colors.green },
                changeDown && { color: colors.red },
              ]}
              numberOfLines={1}
            >
              {stats.changePercentOneRm === "0.0"
                ? "0.0%"
                : `${stats.changePercentOneRm}%`}
            </Text>
          </View>
        )}
      </View>

      {/* Stats Row */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Maks 1RM</Text>
            <Text style={styles.statValue}>
              {fmtSmart(stats.maxOneRm, 1)} kg
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Maks vol</Text>
            <Text style={styles.statValue}>
              {volumeMetric === "kg"
                ? `${fmtSmart(stats.maxVolume, 0)} kg`
                : `${fmtSmart(stats.maxVolume, 0)}`}
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Endring</Text>
            <Text
              style={[
                styles.statValue,
                {
                  color: stats.changeOneRm >= 0 ? colors.green : colors.red,
                  fontSize: 12,
                },
              ]}
            >
              {stats.changeOneRm >= 0 ? "+" : ""}
              {fmtSmart(stats.changeOneRm, 1)} kg
            </Text>
          </View>
        </View>
      )}

      {/* Chart */}
      <View
        style={styles.chartOuter}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        <View
          style={[
            styles.chartBackground,
            {
              width: chartWidth,
              height: chartHeight,
              borderWidth: OUTER_BORDER_WIDTH,
              borderColor: showOuterLines
                ? effectiveGridLineColor
                : "transparent",
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

          <Svg width={chartWidth} height={chartHeight}>
            <Defs>
              <SvgLinearGradient id="plotGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.plotTop} />
                <Stop offset="1" stopColor={colors.plotBottom} />
              </SvgLinearGradient>

              {/* Bar gradient */}
              <SvgLinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="rgba(6,182,212,0.40)" />
                <Stop offset="1" stopColor="rgba(6,182,212,0.30)" />
              </SvgLinearGradient>
            </Defs>

            <G x={pad.left} y={pad.top}>
              {/* Plot background */}
              <Rect
                x={0}
                y={0}
                width={innerW}
                height={innerH}
                rx={PLOT_RADIUS}
                fill="url(#plotGrad)"
              />

              {/* Legend */}
              <G x={LEGEND_X} y={LEGEND_Y}>
                {/* Bars */}
                <Rect
                  x={0}
                  y={-8}
                  width={10}
                  height={10}
                  rx={3}
                  fill={effectiveBarColor}
                  stroke={colors.barStroke}
                  strokeWidth={1}
                />
                <SvgText
                  x={16}
                  y={0}
                  fill={effectiveLabelColor}
                  fontSize={11}
                  fontWeight="600"
                >
                  Volum
                </SvgText>

                {/* Line */}
                <SvgLine
                  x1={68}
                  x2={88}
                  y1={-3}
                  y2={-3}
                  stroke={effectiveLineColor}
                  strokeWidth={2.6}
                />
                <SvgText
                  x={94}
                  y={0}
                  fill={effectiveLabelColor}
                  fontSize={11}
                  fontWeight="600"
                >
                  1RM
                </SvgText>
              </G>

              {/* Grid + Y labels */}
              {ticks.map((t, idx) => {
                const y = yOne(t);
                return (
                  <G key={`grid-${idx}`}>
                    <SvgLine
                      x1={0}
                      x2={innerW}
                      y1={y}
                      y2={y}
                      stroke={effectiveGridLineColor}
                      strokeWidth={GRID_STROKE_WIDTH}
                      strokeDasharray={GRID_DASHARRAY}
                    />

                    {/* Left (1RM) */}
                    <SvgText
                      x={-Y_LEFT_X_OFFSET}
                      y={y + Y_LABEL_DY}
                      fill={effectiveLabelColor}
                      fontSize={Y_LEFT_FONT_SIZE}
                      textAnchor="end"
                      fontWeight="600"
                    >
                      {leftLabel(t)}
                    </SvgText>

                    {/* Right (Volume) */}
                    <SvgText
                      x={innerW + Y_RIGHT_X_OFFSET}
                      y={y + Y_LABEL_DY}
                      fill={effectiveLabelColor}
                      fontSize={Y_RIGHT_FONT_SIZE}
                      textAnchor="start"
                      fontWeight="600"
                    >
                      {rightLabelForY(y)}
                    </SvgText>
                  </G>
                );
              })}

              {/* Bars = volume */}
              {merged.map((d, idx) => {
                const { bx, bw } = getX(d, idx);
                const top = yVol(d.volume);
                const h = clamp(innerH - top, 0, innerH);

                if (metric === "weight") return null;
                return (
                  <Rect
                    key={`bar-${d.ts}`}
                    x={bx}
                    y={top}
                    width={bw}
                    height={h}
                    rx={BAR_RADIUS}
                    ry={BAR_RADIUS}
                    fill="url(#barGrad)"
                    stroke={colors.barStroke}
                    strokeWidth={1}
                    opacity={1}
                  />
                );
              })}

              {/* Line = 1RM */}
              {metric !== "volume" && !!linePath && (
                <Path
                  d={linePath}
                  fill="none"
                  stroke={effectiveLineColor}
                  strokeWidth={LINE_WIDTH}
                  opacity={1}
                />
              )}

              {/* Last dot (1RM) */}
              {metric !== "volume" && lastNonZeroOne.point.oneRm > 0 && (
                <Circle
                  cx={lastCx}
                  cy={lastCy}
                  r={LAST_DOT_RADIUS}
                  fill={effectiveLineColor}
                  opacity={1}
                />
              )}

              {/* X labels */}
              {merged.map((d, idx) => {
                if (!showX[idx]) return null;

                const { cx } = getX(d, idx);
                const yText = innerH + X_LABEL_Y_OFFSET;

                return (
                  <SvgText
                    key={`xl-${d.ts}`}
                    x={cx}
                    y={yText}
                    fill={effectiveLabelColor}
                    fontSize={X_LABEL_FONT_SIZE}
                    textAnchor="middle"
                    fontWeight="600"
                  >
                    {d.label}
                  </SvgText>
                );
              })}
            </G>
          </Svg>
        </View>
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

  trendPill: ViewStyle;
  trendPillUp: ViewStyle;
  trendPillDown: ViewStyle;
  trendText: TextStyle;

  statsRow: ViewStyle;
  statBox: ViewStyle;
  statDivider: ViewStyle;
  statLabel: TextStyle;
  statValue: TextStyle;

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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  trendPillUp: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderColor: "rgba(34,197,94,0.25)",
  },
  trendPillDown: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderColor: "rgba(239,68,68,0.25)",
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

  chartOuter: { width: "100%" },

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
