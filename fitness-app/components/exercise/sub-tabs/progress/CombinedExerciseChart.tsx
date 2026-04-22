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
  getProgressRangeOption,
  prepareProgressSeries,
  stepProgressRange,
} from "@/utils/exercise/progressChart";
import { Ionicons } from "@expo/vector-icons";
import { scaleLinear } from "d3-scale";
import { area as d3Area, curveCatmullRom, line as d3Line } from "d3-shape";
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

export type ExerciseProgressPoint = {
  timestampUtc: string;
  value: number;
  unit?: ProgressUnit;
};

export type CombinedChartViewMode =
  | "relationship"
  | "indexed";

type Props = {
  title?: string;
  subtitle?: string;
  showTitle?: boolean;
  height?: number;
  headerControls?: React.ReactNode;
  viewMode?: CombinedChartViewMode;
  onViewModeChange?: (viewMode: CombinedChartViewMode) => void;
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
  weightTrendValue: number | null;
  volumeTrendValue: number | null;
  indexedWeight: number | null;
  indexedVolume: number | null;
};

type ResponseTone = "positive" | "neutral" | "negative" | "quiet";

type ResponseZone = {
  key: string;
  startIndex: number;
  endIndex: number;
  tone: ResponseTone;
  label: string;
  note: string;
  volumeDeltaPct: number | null;
  strengthDeltaPct: number | null;
  strengthDeltaKg: number | null;
};

type CauseLink = {
  key: string;
  fromIndex: number;
  toIndex: number;
  tone: Exclude<ResponseTone, "quiet">;
};

type SummaryTone = "positive" | "neutral" | "negative";

type SummaryCard = {
  label: string;
  value: string;
  detail: string;
  tone: SummaryTone;
};

const VIEW_MODE_OPTIONS: {
  value: CombinedChartViewMode;
  label: string;
}[] = [
  { value: "relationship", label: "Sammenheng" },
  { value: "indexed", label: "Indeksert" },
];

const COLORS = {
  accent: weightChartColors.accentColor,
  accentStrong: weightChartColors.accentStrong,
  accentBg: weightChartColors.accentBackground,
  textMuted: "rgba(191,219,254,0.76)",
  neutral: weightChartColors.neutralText,
  subText: weightChartColors.labelColor,
  line: weightChartColors.lineColor,
  dotFill: weightChartColors.dotFillColor,
  rawLine: weightChartColors.lineColor,
  rawDot: weightChartColors.lineColor,
  trend: weightChartColors.trendLineColor,
  indexedVolume: weightChartColors.lineColor,
  volume: weightChartColors.lineColor,
  volumeStroke: weightChartColors.lineColor,
  grid: weightChartColors.gridLineColor,
  guide: "rgba(148,163,184,0.2)",
  success: "rgba(34,197,94,0.92)",
  warning: "rgba(251,191,36,0.95)",
  danger: "rgba(248,113,113,0.95)",
  responsePositive: "rgba(56,189,248,0.96)",
  responseNegative: weightChartColors.trendLineColor,
  responseNeutral: "rgba(148,163,184,0.92)",
  panelOverlay: weightChartColors.backgroundGradientFrom,
  surface: "rgba(8,15,28,0.52)",
  surfaceSoft: "rgba(8,15,28,0.36)",
  surfaceBorder: "rgba(56,189,248,0.12)",
  surfaceBorderStrong: "rgba(56,189,248,0.18)",
};

const PAD_LEFT = 46;
const PAD_RIGHT = 42;
const PAD_TOP = 18;
const PAD_BOTTOM = 34;

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatValue(
  value: number | null,
  unit: string,
  forceDecimals?: number
) {
  if (!isFiniteNumber(value)) return "—";
  const decimals =
    forceDecimals ?? (Math.abs(value) < 10 || unit === "%" ? 1 : 0);
  return `${value.toFixed(decimals)}${unit ? ` ${unit}` : ""}`;
}

function formatSignedPercent(value: number | null) {
  if (!isFiniteNumber(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)} %`;
}

function getSlotWidth(pointCount: number) {
  if (pointCount <= 5) return 64;
  if (pointCount <= 12) return 46;
  if (pointCount <= 24) return 36;
  return 28;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function calculatePercentChange(first: number | null, last: number | null) {
  if (!isFiniteNumber(first) || !isFiniteNumber(last) || first === 0) {
    return null;
  }
  return Number((((last - first) / first) * 100).toFixed(1));
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

function collectSegments<T>(
  points: T[],
  getX: (index: number) => number,
  getY: (value: number) => number,
  accessor: (point: T) => number | null,
  gapAccessor: (point: T) => boolean
) {
  const segments: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];

  points.forEach((point, index) => {
    const value = accessor(point);
    if (!isFiniteNumber(value)) return;
    const nextPoint = { x: getX(index), y: getY(value) };
    if (!Number.isFinite(nextPoint.x) || !Number.isFinite(nextPoint.y)) return;

    if (current.length > 0 && gapAccessor(point)) {
      segments.push(current);
      current = [];
    }

    current.push(nextPoint);
  });

  if (current.length > 0) {
    segments.push(current);
  }

  return segments;
}

function buildSmoothLinePaths<T>(
  points: T[],
  getX: (index: number) => number,
  getY: (value: number) => number,
  accessor: (point: T) => number | null,
  gapAccessor: (point: T) => boolean
) {
  const generator = d3Line<{ x: number; y: number }>()
    .x((point) => point.x)
    .y((point) => point.y)
    .curve(curveCatmullRom.alpha(0.6));

  return collectSegments(points, getX, getY, accessor, gapAccessor)
    .map((segment) =>
      segment.length === 1
        ? `M ${segment[0].x} ${segment[0].y}`
        : generator(segment) ?? ""
    )
    .filter(Boolean);
}

function buildSmoothAreaPaths<T>(
  points: T[],
  getX: (index: number) => number,
  getY: (value: number) => number,
  accessor: (point: T) => number | null,
  gapAccessor: (point: T) => boolean,
  baselineY: number
) {
  return collectSegments(points, getX, getY, accessor, gapAccessor)
    .map((segment) => {
      const generator = d3Area<{ x: number; y: number }>()
        .x((point) => point.x)
        .y0(baselineY)
        .y1((point) => point.y)
        .curve(curveCatmullRom.alpha(0.6));
      return generator(segment) ?? "";
    })
    .filter(Boolean);
}

function buildConnectionPath(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
) {
  const controlX = (fromX + toX) / 2;
  const controlY = Math.min(fromY, toY) - 24;
  return `M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`;
}

function getSummaryTone(value: number | null): SummaryTone {
  if (!isFiniteNumber(value) || value === 0) return "neutral";
  return value > 0 ? "positive" : "negative";
}

function getResponseFill(tone: ResponseTone, strong: boolean) {
  if (tone === "positive") return strong ? "rgba(56,189,248,0.13)" : "rgba(56,189,248,0.08)";
  if (tone === "neutral") return strong ? "rgba(148,163,184,0.10)" : "rgba(148,163,184,0.06)";
  if (tone === "negative") return strong ? "rgba(192,132,252,0.13)" : "rgba(192,132,252,0.08)";
  return "rgba(148,163,184,0.04)";
}

function getResponseBadgeColors(tone: ResponseTone) {
  if (tone === "positive") {
    return {
      bg: "rgba(56,189,248,0.14)",
      border: "rgba(56,189,248,0.22)",
      text: COLORS.responsePositive,
    };
  }
  if (tone === "neutral") {
    return {
      bg: "rgba(148,163,184,0.12)",
      border: "rgba(148,163,184,0.18)",
      text: COLORS.responseNeutral,
    };
  }
  if (tone === "negative") {
    return {
      bg: "rgba(192,132,252,0.14)",
      border: "rgba(192,132,252,0.22)",
      text: COLORS.responseNegative,
    };
  }
  return {
    bg: "rgba(148,163,184,0.10)",
    border: "rgba(148,163,184,0.14)",
    text: COLORS.neutral,
  };
}

function getEfficiencyState(
  strengthTrendPct: number | null,
  volumeTrendPct: number | null
) {
  if (!isFiniteNumber(strengthTrendPct) || !isFiniteNumber(volumeTrendPct)) {
    return {
      label: "Ukjent",
      detail: "For lite data",
      tone: "neutral" as SummaryTone,
    };
  }

  if (strengthTrendPct > 0 && volumeTrendPct <= 0) {
    return {
      label: "Høy",
      detail: "Styrke opp uten mer volum",
      tone: "positive" as SummaryTone,
    };
  }

  if (strengthTrendPct <= 0 && volumeTrendPct > 6) {
    return {
      label: "Lav",
      detail: "Lite effekt av mer volum",
      tone: "negative" as SummaryTone,
    };
  }

  const ratio = strengthTrendPct / Math.max(Math.abs(volumeTrendPct), 1);
  if (strengthTrendPct > 0 && ratio >= 0.5) {
    return {
      label: "Høy",
      detail: "God respons på volum",
      tone: "positive" as SummaryTone,
    };
  }

  if (strengthTrendPct >= 0 && ratio >= 0.15) {
    return {
      label: "Moderat",
      detail: "Jevn respons",
      tone: "neutral" as SummaryTone,
    };
  }

  return {
    label: "Lav",
    detail: "Volum uten tydelig effekt",
    tone: "negative" as SummaryTone,
  };
}

function getSummaryColors(tone: SummaryTone) {
  if (tone === "positive") {
    return {
      value: COLORS.success,
      glowA: "rgba(56,189,248,0.16)",
      glowB: COLORS.accentBg,
    };
  }
  if (tone === "negative") {
    return {
      value: COLORS.responseNegative,
      glowA: "rgba(192,132,252,0.16)",
      glowB: "rgba(56,189,248,0.08)",
    };
  }
  return {
    value: COLORS.neutral,
    glowA: COLORS.accentStrong,
    glowB: "rgba(192,132,252,0.08)",
  };
}

function getComparableValue(
  points: MergedPoint[],
  startIndex: number,
  accessor: (point: MergedPoint) => number | null,
  direction: -1 | 1
) {
  let cursor = startIndex;
  while (cursor >= 0 && cursor < points.length) {
    const value = accessor(points[cursor]);
    if (isFiniteNumber(value)) return value;
    cursor += direction;
  }
  return null;
}

function formatZoomLabel(
  range: ProgressTimeRange,
  zoom: number,
  usesRangeZoom: boolean
) {
  if (!usesRangeZoom) {
    return `${zoom.toFixed(2)}x`;
  }

  const rangeLabel = getProgressRangeOption(range).label;
  return Math.abs(zoom - 1) > 0.05
    ? `${rangeLabel} | ${zoom.toFixed(1)}x`
    : rangeLabel;
}

const styles = StyleSheet.create({
  controlDeck: {
    width: "100%",
    marginBottom: 10,
    gap: 8,
  },
  controlGroup: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 9,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    gap: 6,
  },
  controlGroupWide: {
    width: "100%",
  },
  controlGroupLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.22,
    textTransform: "uppercase",
    marginBottom: 7,
  },
  modeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
  },
  viewPill: {
    minHeight: 30,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    overflow: "hidden",
  },
  viewPillActive: {
    backgroundColor: COLORS.accentBg,
    borderColor: COLORS.surfaceBorderStrong,
  },
  viewPillText: {
    color: COLORS.textMuted,
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.08,
  },
  viewPillTextActive: {
    color: COLORS.neutral,
  },
  headerText: {
    flex: 1,
    paddingRight: 10,
  },
  subtitle: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "500",
  },
  meta: {
    marginTop: 4,
    color: COLORS.subText,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.08,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: 0,
    position: "relative",
    overflow: "hidden",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  summaryGlow: {
    position: "absolute",
    top: -24,
    right: -28,
    width: 90,
    height: 80,
    borderRadius: 999,
    opacity: 0.88,
  },
  summaryLabel: {
    color: COLORS.textMuted,
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 0.22,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.18,
    marginBottom: 4,
  },
  summaryDetail: {
    color: COLORS.textMuted,
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: "500",
  },
  chartScrollContent: {
    paddingBottom: 6,
  },
  chartOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.panelOverlay,
  },
  insightCard: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  insightDate: {
    flex: 1,
    color: COLORS.neutral,
    fontSize: 13,
    fontWeight: "700",
  },
  insightBadge: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  insightBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.08,
  },
  insightGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 12,
    rowGap: 10,
  },
  insightMetric: {
    width: "47%",
    minWidth: 0,
  },
  insightLabel: {
    color: COLORS.textMuted,
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 0.16,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  insightValue: {
    color: COLORS.neutral,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.12,
  },
  insightNote: {
    marginTop: 8,
    color: COLORS.textMuted,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "500",
  },
  emptyWrap: {
    flex: 1,
  },
});

export function CombinedExerciseChart({
  title = "Styrke vs volum",
  subtitle = "Volum under, styrketrend over",
  showTitle = true,
  height = 280,
  headerControls,
  viewMode = "relationship",
  onViewModeChange,
  volumeMetric = "kg",
  range = "3m",
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
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const fillId = useMemo(
    () => `combined-progress-fill-${Math.random().toString(36).slice(2, 10)}`,
    []
  );
  const indexedFillId = useMemo(
    () =>
      `combined-progress-indexed-fill-${Math.random()
        .toString(36)
        .slice(2, 10)}`,
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
        weightTrendValue: point.trendValue ?? point.value,
        volumeTrendValue: null,
        indexedWeight: null,
        indexedVolume: null,
      });
    }

    for (const point of volumeSeries.points) {
      const existing = map.get(point.key);
      if (existing) {
        existing.volume = point;
        existing.volumeTrendValue = point.trendValue ?? point.value;
        continue;
      }

      map.set(point.key, {
        key: point.key,
        shortLabel: point.shortLabel,
        fullLabel: point.fullLabel,
        weight: null,
        volume: point,
        weightTrendValue: null,
        volumeTrendValue: point.trendValue ?? point.value,
        indexedWeight: null,
        indexedVolume: null,
      });
    }

    const points = Array.from(map.values()).sort(
      (a, b) =>
        Date.parse(a.weight?.timestampUtc ?? a.volume?.timestampUtc ?? "") -
        Date.parse(b.weight?.timestampUtc ?? b.volume?.timestampUtc ?? "")
    );

    const weightBase =
      points.find((point) => isFiniteNumber(point.weightTrendValue))
        ?.weightTrendValue ?? null;
    const volumeBase =
      points.find((point) => isFiniteNumber(point.volumeTrendValue))
        ?.volumeTrendValue ?? null;

    return points.map((point) => ({
      ...point,
      indexedWeight:
        isFiniteNumber(point.weightTrendValue) &&
        isFiniteNumber(weightBase) &&
        weightBase !== 0
          ? Number(((point.weightTrendValue / weightBase) * 100).toFixed(1))
          : null,
      indexedVolume:
        isFiniteNumber(point.volumeTrendValue) &&
        isFiniteNumber(volumeBase) &&
        volumeBase !== 0
          ? Number(((point.volumeTrendValue / volumeBase) * 100).toFixed(1))
          : null,
    }));
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

  const selected =
    merged.find((point) => point.key === selectedKey) ??
    merged[merged.length - 1] ??
    null;

  const chartAnalysis = useMemo(() => {
    const strengthTrendPct = calculatePercentChange(
      merged.find((point) => isFiniteNumber(point.weightTrendValue))
        ?.weightTrendValue ?? null,
      [...merged]
        .reverse()
        .find((point) => isFiniteNumber(point.weightTrendValue))
        ?.weightTrendValue ?? null
    );
    const volumeTrendPct = calculatePercentChange(
      merged.find((point) => isFiniteNumber(point.volumeTrendValue))
        ?.volumeTrendValue ?? null,
      [...merged]
        .reverse()
        .find((point) => isFiniteNumber(point.volumeTrendValue))
        ?.volumeTrendValue ?? null
    );

    const efficiency = getEfficiencyState(strengthTrendPct, volumeTrendPct);
    const volumeMedian =
      median(
        merged
          .map((point) => point.volumeTrendValue ?? point.volume?.value ?? null)
          .filter(isFiniteNumber)
      ) ?? null;

    const zones: ResponseZone[] = [];
    const links: CauseLink[] = [];

    for (let index = 0; index < merged.length - 1; index += 1) {
      const current = merged[index];
      const currentVolume = current.volumeTrendValue ?? current.volume?.value ?? null;
      const previousVolume = getComparableValue(
        merged,
        index - 1,
        (point) => point.volumeTrendValue ?? point.volume?.value ?? null,
        -1
      );
      const currentStrength =
        current.weightTrendValue ?? current.weight?.value ?? null;
      const responseIndex = Math.min(index + 2, merged.length - 1);
      const futureStrength = getComparableValue(
        merged,
        responseIndex,
        (point) => point.weightTrendValue ?? point.weight?.value ?? null,
        -1
      );

      const volumeDeltaPct = calculatePercentChange(previousVolume, currentVolume);
      const strengthDeltaPct = calculatePercentChange(
        currentStrength,
        futureStrength
      );
      const strengthDeltaKg =
        isFiniteNumber(currentStrength) && isFiniteNumber(futureStrength)
          ? Number((futureStrength - currentStrength).toFixed(1))
          : null;

      const hasElevatedLoad =
        isFiniteNumber(currentVolume) &&
        isFiniteNumber(volumeMedian) &&
        (currentVolume >= volumeMedian * 1.05 ||
          (isFiniteNumber(volumeDeltaPct) && volumeDeltaPct >= 8));

      let tone: ResponseTone = "quiet";
      if (hasElevatedLoad) {
        if (
          (isFiniteNumber(strengthDeltaKg) && strengthDeltaKg >= 0.6) ||
          (isFiniteNumber(strengthDeltaPct) && strengthDeltaPct >= 0.6)
        ) {
          tone = "positive";
        } else if (
          (isFiniteNumber(strengthDeltaKg) && strengthDeltaKg <= -0.4) ||
          (isFiniteNumber(strengthDeltaPct) && strengthDeltaPct <= -0.35)
        ) {
          tone = "negative";
        } else {
          tone = "neutral";
        }
      }

      zones.push({
        key: `${current.key}-zone`,
        startIndex: index,
        endIndex: Math.min(index + 1, merged.length - 1),
        tone,
        label:
          tone === "positive"
            ? "Bra respons"
            : tone === "neutral"
            ? "Flat respons"
            : tone === "negative"
            ? "Slitasje"
            : "Rolig",
        note:
          tone === "positive"
            ? "Styrken steg etter mer volum."
            : tone === "neutral"
            ? "Høyt volum, lite utslag."
            : tone === "negative"
            ? "Mer belastning, svakere trend."
            : "Rolig blokk.",
        volumeDeltaPct,
        strengthDeltaPct,
        strengthDeltaKg,
      });

      if (tone !== "quiet" && tone !== "neutral" && responseIndex > index) {
        links.push({
          key: `${current.key}-link`,
          fromIndex: index,
          toIndex: responseIndex,
          tone,
        });
      }
    }

    const summaryCards: SummaryCard[] = [
      {
        label: "Styrketrend",
        value: formatSignedPercent(strengthTrendPct),
        detail: weightSeries.rangeLabel,
        tone: getSummaryTone(strengthTrendPct),
      },
      {
        label: "Volumtrend",
        value: formatSignedPercent(volumeTrendPct),
        detail: volumeSeries.rangeLabel,
        tone: getSummaryTone(volumeTrendPct),
      },
      {
        label: "Effektivitet",
        value: efficiency.label,
        detail: efficiency.detail,
        tone: efficiency.tone,
      },
    ];

    return {
      zones,
      links,
      summaryCards,
    };
  }, [merged, volumeSeries.rangeLabel, weightSeries.rangeLabel]);

  const nextRangeIn = onRangeChange ? stepProgressRange(range, "in") : range;
  const nextRangeOut = onRangeChange ? stepProgressRange(range, "out") : range;
  const canStepRangeIn = !!onRangeChange && nextRangeIn !== range;
  const canStepRangeOut = !!onRangeChange && nextRangeOut !== range;
  const controlDeck =
    headerControls || onViewModeChange ? (
      <View style={styles.controlDeck}>
        {headerControls && (
          <View style={[styles.controlGroup, styles.controlGroupWide]}>
            <Text style={styles.controlGroupLabel}>Måling</Text>
            {headerControls}
          </View>
        )}

        {!!onViewModeChange && (
          <View style={[styles.controlGroup, styles.controlGroupWide]}>
            <Text style={styles.controlGroupLabel}>Visning</Text>
            <View style={styles.modeRow}>
              {VIEW_MODE_OPTIONS.map((option) => {
                const active = option.value === viewMode;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => onViewModeChange(option.value)}
                    style={({ pressed }) => [
                      styles.viewPill,
                      active && styles.viewPillActive,
                      pressed && { opacity: 0.94 },
                    ]}
                  >
                    {active && (
                      <LinearGradient
                        pointerEvents="none"
                        colors={[
                          "rgba(34,211,238,0.24)",
                          "rgba(37,99,235,0.14)",
                          "rgba(8,15,28,0.08)",
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                    )}

                    <Text
                      style={[
                        styles.viewPillText,
                        active && styles.viewPillTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

      </View>
    ) : null;

  const slotWidth = getSlotWidth(merged.length);
  const chartZoom = useSvgChartZoom({
    pointCount: merged.length,
    height,
    baseContentWidth: Math.max(240, merged.length * slotWidth),
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
  const canZoomInControl = canStepRangeIn || chartZoom.canZoomIn;
  const canZoomOutControl = canStepRangeOut || chartZoom.canZoomOut;
  const handleZoomInPress = () => {
    if (canStepRangeIn && onRangeChange) {
      chartZoom.resetZoom();
      onRangeChange(nextRangeIn);
      return;
    }
    chartZoom.handleZoomIn();
  };
  const handleZoomOutPress = () => {
    if (canStepRangeOut && onRangeChange) {
      chartZoom.resetZoom();
      onRangeChange(nextRangeOut);
      return;
    }
    chartZoom.handleZoomOut();
  };
  const zoomLabel = formatZoomLabel(range, chartZoom.zoom, !!onRangeChange);

  if (!merged.length || !selected) {
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
        {controlDeck}

        {showTitle && (
          <View style={weightChartStyles.headerRow}>
            <View style={styles.emptyWrap}>
              <Text style={[typography.h2, weightChartStyles.title]}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
              <Text style={styles.meta}>0 punkter · valgt periode</Text>
            </View>
          </View>
        )}

        <View style={weightChartStyles.emptyRow}>
          <View style={weightChartStyles.emptyIconWrap}>
            <Ionicons name="pulse-outline" size={18} color="#38bdf8" />
          </View>
          <View style={styles.emptyWrap}>
            <Text style={[typography.bodyBlack, weightChartStyles.emptyTitle]}>
              Ingen data tilgjengelig ennå
            </Text>
            <Text style={[typography.body, weightChartStyles.emptySub]}>
              Når øktene inneholder nok data, bygger vi sammenhengen mellom
              styrke og volum her.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const selectedIndex = merged.findIndex((point) => point.key === selected.key);
  const effectiveContainerWidth = chartZoom.effectiveContainerWidth;
  const chartWidth = chartZoom.chartWidth;
  const shouldEnableHorizontalScroll = chartZoom.shouldEnableHorizontalScroll;
  const innerWidth = Math.max(10, chartWidth - PAD_LEFT - PAD_RIGHT);
  const innerHeight = Math.max(94, chartZoom.chartHeight - PAD_TOP - PAD_BOTTOM);
  const baselineY = chartZoom.chartHeight - PAD_BOTTOM;
  const useIndexedScale = viewMode === "indexed";
  const strongZones = viewMode === "relationship";
  const showRelationshipLinks = viewMode === "relationship";
  const rawLineOpacity = 0.12;
  const rawDotOpacity = 0.42;
  const volumeFillOpacity = viewMode === "relationship" ? 0.30 : 0.18;
  const volumeStrokeOpacity = viewMode === "relationship" ? 0.34 : 0.2;
  const labelIndexes = getVisibleLabelIndexes(
    merged.length,
    minXLabels,
    chartZoom.isPinching
      ? Math.min(
          chartZoom.dynamicMaxVisibleLabels,
          chartZoom.renderMode === "overview" ? 4 : 6
        )
      : chartZoom.dynamicMaxVisibleLabels
  );

  const getX = (index: number) => {
    if (merged.length === 1) return PAD_LEFT + innerWidth / 2;
    const step = innerWidth / merged.length;
    return PAD_LEFT + step / 2 + step * index;
  };

  const indexedValues = merged
    .flatMap((point) => [point.indexedWeight, point.indexedVolume])
    .filter(isFiniteNumber);
  const indexedMin = indexedValues.length ? Math.min(...indexedValues) : 96;
  const indexedMax = indexedValues.length ? Math.max(...indexedValues) : 104;
  const indexedPad = Math.max(4, (indexedMax - indexedMin) * 0.18);
  const indexedScale = scaleLinear()
    .domain([indexedMin - indexedPad, indexedMax + indexedPad])
    .range([innerHeight, 0]);
  const weightScale = scaleLinear()
    .domain([weightSeries.yDomain.paddedMin, weightSeries.yDomain.paddedMax])
    .range([innerHeight, 0]);
  const volumeScale = scaleLinear()
    .domain([0, volumeSeries.yDomain.paddedMax])
    .range([innerHeight, 0]);

  const getWeightDisplayValue = (point: MergedPoint) =>
    useIndexedScale ? point.indexedWeight : point.weightTrendValue;
  const getWeightRawValue = (point: MergedPoint) =>
    useIndexedScale ? null : point.weight?.value ?? null;
  const getVolumeDisplayValue = (point: MergedPoint) =>
    useIndexedScale ? point.indexedVolume : point.volumeTrendValue;
  const getVolumeFoundationValue = (point: MergedPoint) =>
    useIndexedScale ? point.indexedVolume : point.volume?.value ?? null;

  const mainTrendPaths = buildSmoothLinePaths(
    merged,
    getX,
    (value) => PAD_TOP + (useIndexedScale ? indexedScale(value) : weightScale(value)),
    (point) => getWeightDisplayValue(point),
    (point) => point.weight?.hasGapBefore ?? false
  );
  const rawWeightPaths = buildSmoothLinePaths(
    merged,
    getX,
    (value) => PAD_TOP + weightScale(value),
    (point) => getWeightRawValue(point),
    (point) => point.weight?.hasGapBefore ?? false
  );
  const indexedVolumeAreaPaths = buildSmoothAreaPaths(
    merged,
    getX,
    (value) => PAD_TOP + indexedScale(value),
    (point) => getVolumeDisplayValue(point),
    (point) => point.volume?.hasGapBefore ?? false,
    baselineY
  );
  const indexedVolumePaths = buildSmoothLinePaths(
    merged,
    getX,
    (value) => PAD_TOP + indexedScale(value),
    (point) => getVolumeDisplayValue(point),
    (point) => point.volume?.hasGapBefore ?? false
  );

  const selectedX = getX(selectedIndex);
  const metaLabel = `${merged.length} ${
    weightSeries.bucket === "week" ? "ukepunkter" : "punkter"
  } · ${weightSeries.rangeLabel}`;
  const tickCount = chartZoom.isPinching ? 3 : 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, index) => index / tickCount);
  const selectedResponse =
    chartAnalysis.zones.find(
      (zone) =>
        selectedIndex >= zone.startIndex && selectedIndex <= zone.endIndex
    ) ??
    chartAnalysis.zones[
      Math.max(0, Math.min(selectedIndex, chartAnalysis.zones.length - 1))
    ] ??
    null;
  const selectedWeightTrendPct = calculatePercentChange(
    getComparableValue(merged, selectedIndex - 1, (point) => point.weightTrendValue, -1),
    selected.weightTrendValue
  );
  const selectedVolumeTrendPct = calculatePercentChange(
    getComparableValue(merged, selectedIndex - 1, (point) => point.volumeTrendValue, -1),
    selected.volumeTrendValue
  );

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
      {controlDeck}

      <View style={weightChartStyles.headerRow}>
        <View style={styles.headerText}>
          {showTitle && (
            <>
              <Text style={[typography.h2, weightChartStyles.title]}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </>
          )}
          <Text style={styles.meta}>{metaLabel}</Text>
        </View>

        {showZoomControls && (
          <View style={weightChartStyles.zoomContainer}>
            <TouchableOpacity
              onPress={handleZoomOutPress}
              disabled={!canZoomOutControl}
              activeOpacity={0.7}
              style={[
                weightChartStyles.zoomButton,
                !canZoomOutControl && weightChartStyles.zoomButtonDisabled,
              ]}
            >
              <Text style={weightChartStyles.zoomText}>-</Text>
            </TouchableOpacity>

            <View style={weightChartStyles.zoomPill}>
              <Text style={weightChartStyles.zoomLabel}>{zoomLabel}</Text>
            </View>

            <TouchableOpacity
              onPress={handleZoomInPress}
              disabled={!canZoomInControl}
              activeOpacity={0.7}
              style={[
                weightChartStyles.zoomButton,
                !canZoomInControl && weightChartStyles.zoomButtonDisabled,
              ]}
            >
              <Text style={weightChartStyles.zoomText}>+</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.summaryRow}>
        {chartAnalysis.summaryCards.map((card) => {
          const colors = getSummaryColors(card.tone);
          return (
            <View key={card.label} style={styles.summaryCard}>
              <LinearGradient
                pointerEvents="none"
                colors={[colors.glowA, colors.glowB, "rgba(255,255,255,0.00)"]}
                start={{ x: 1, y: 0 }}
                end={{ x: 0.2, y: 1 }}
                style={styles.summaryGlow}
              />
              <Text style={styles.summaryLabel}>{card.label}</Text>
              <Text style={[styles.summaryValue, { color: colors.value }]}>
                {card.value}
              </Text>
              <Text style={styles.summaryDetail}>{card.detail}</Text>
            </View>
          );
        })}
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
                    { width: chartWidth, height: chartZoom.chartHeight },
                  ]}
                >
                  <View style={weightChartStyles.panelAccent} />
                  <View pointerEvents="none" style={styles.chartOverlay} />

                  <Svg width={chartWidth} height={chartZoom.chartHeight}>
                    <Defs>
                      <SvgLinearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                        <Stop
                          offset="0"
                          stopColor={COLORS.indexedVolume}
                          stopOpacity={weightChartColors.shadowFillFromOpacity}
                        />
                        <Stop
                          offset="1"
                          stopColor={COLORS.indexedVolume}
                          stopOpacity={weightChartColors.shadowFillToOpacity}
                        />
                      </SvgLinearGradient>
                      <SvgLinearGradient
                        id={indexedFillId}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <Stop
                          offset="0"
                          stopColor={COLORS.indexedVolume}
                          stopOpacity="0.22"
                        />
                        <Stop
                          offset="1"
                          stopColor={COLORS.indexedVolume}
                          stopOpacity="0.02"
                        />
                      </SvgLinearGradient>
                    </Defs>

                    {viewMode !== "indexed" &&
                      chartAnalysis.zones.map((zone) => {
                        const startX =
                          zone.startIndex === 0
                            ? PAD_LEFT
                            : (getX(zone.startIndex - 1) + getX(zone.startIndex)) / 2;
                        const endX =
                          zone.endIndex >= merged.length - 1
                            ? chartWidth - PAD_RIGHT
                            : (getX(zone.endIndex) + getX(zone.endIndex + 1)) / 2;
                        return (
                          <Rect
                            key={zone.key}
                            x={startX}
                            y={PAD_TOP}
                            width={Math.max(6, endX - startX)}
                            height={innerHeight}
                            fill={getResponseFill(zone.tone, strongZones)}
                          />
                        );
                      })}

                    {ticks.map((tick, index) => {
                      const y = PAD_TOP + innerHeight * tick;
                      const leftTick = useIndexedScale
                        ? indexedMax + indexedPad - (indexedMax - indexedMin + indexedPad * 2) * tick
                        : weightSeries.yDomain.paddedMax -
                          (weightSeries.yDomain.paddedMax -
                            weightSeries.yDomain.paddedMin) *
                            tick;
                      const rightTick = useIndexedScale
                        ? null
                        : volumeSeries.yDomain.paddedMax -
                          volumeSeries.yDomain.paddedMax * tick;

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
                            {leftTick < 10 ? leftTick.toFixed(1) : leftTick.toFixed(0)}
                          </SvgText>
                          {rightTick != null && (
                            <SvgText
                              x={chartWidth - PAD_RIGHT + 8}
                              y={y + 3}
                              fontSize={9}
                              fill="rgba(148,163,184,0.5)"
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

                    {useIndexedScale && (
                      <SvgLine
                        x1={PAD_LEFT}
                        x2={chartWidth - PAD_RIGHT}
                        y1={PAD_TOP + indexedScale(100)}
                        y2={PAD_TOP + indexedScale(100)}
                        stroke={COLORS.accentStrong}
                        strokeWidth={1.1}
                        strokeDasharray="5,5"
                      />
                    )}

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

                    {useIndexedScale
                      ? indexedVolumeAreaPaths.map((segment) => (
                          <Path
                            key={`indexed-area-${segment}`}
                            d={segment}
                            fill={`url(#${indexedFillId})`}
                          />
                        ))
                      : merged.map((point, index) => {
                          const volumeValue = getVolumeFoundationValue(point);
                          if (!isFiniteNumber(volumeValue)) return null;
                          const x = getX(index);
                          const barWidth = Math.min(18, slotWidth * 0.62);
                          const top = PAD_TOP + volumeScale(volumeValue);
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
                              fillOpacity={volumeFillOpacity}
                              stroke={COLORS.volumeStroke}
                              strokeOpacity={volumeStrokeOpacity}
                              strokeWidth={point.key === selected.key ? 1.4 : 0.9}
                            />
                          );
                        })}

                    {showRelationshipLinks &&
                      !useIndexedScale &&
                      chartAnalysis.links.map((link) => {
                        const fromVolume = getVolumeFoundationValue(merged[link.fromIndex]);
                        const toWeight = getWeightDisplayValue(merged[link.toIndex]);
                        if (!isFiniteNumber(fromVolume) || !isFiniteNumber(toWeight)) {
                          return null;
                        }
                        return (
                          <Path
                            key={link.key}
                            d={buildConnectionPath(
                              getX(link.fromIndex),
                              PAD_TOP + volumeScale(fromVolume),
                              getX(link.toIndex),
                              PAD_TOP + weightScale(toWeight)
                            )}
                            fill="none"
                            stroke={
                              link.tone === "positive"
                                ? COLORS.responsePositive
                                : COLORS.responseNegative
                            }
                            strokeWidth={1.1}
                            strokeOpacity={0.22}
                            strokeDasharray="4,5"
                          />
                        );
                      })}

                    {!useIndexedScale &&
                      rawWeightPaths.map((segment) => (
                        <Path
                          key={`raw-${segment}`}
                          d={segment}
                          fill="none"
                          stroke={COLORS.rawLine}
                          strokeOpacity={rawLineOpacity}
                          strokeWidth={1.1}
                        />
                      ))}

                    {useIndexedScale &&
                      indexedVolumePaths.map((segment) => (
                        <Path
                          key={`indexed-volume-${segment}`}
                          d={segment}
                          fill="none"
                          stroke={COLORS.indexedVolume}
                          strokeWidth={1.45}
                          strokeOpacity={0.68}
                          strokeDasharray="5,5"
                        />
                      ))}

                    {mainTrendPaths.map((segment) => (
                      <Path
                        key={`trend-${segment}`}
                        d={segment}
                        fill="none"
                        stroke={COLORS.trend}
                        strokeWidth={3.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))}

                    {merged.map((point, index) => {
                      const x = getX(index);
                      const mainValue = getWeightDisplayValue(point);
                      const rawValue = getWeightRawValue(point);
                      const mainY =
                        isFiniteNumber(mainValue)
                          ? PAD_TOP +
                            (useIndexedScale
                              ? indexedScale(mainValue)
                              : weightScale(mainValue))
                          : null;
                      const rawY =
                        isFiniteNumber(rawValue)
                          ? PAD_TOP + weightScale(rawValue)
                          : null;

                      return (
                        <G key={`point-${point.key}`}>
                          {!useIndexedScale && isFiniteNumber(rawY) && (
                            <Circle
                              cx={x}
                              cy={rawY}
                              r={point.key === selected.key ? 3.2 : 2.1}
                              fill={COLORS.rawDot}
                              opacity={rawDotOpacity}
                            />
                          )}
                          {isFiniteNumber(mainY) && (
                            <>
                              <Circle
                                cx={x}
                                cy={mainY}
                                r={point.key === selected.key ? 4.1 : 2.4}
                                fill={COLORS.dotFill}
                                stroke={COLORS.trend}
                                strokeWidth={point.key === selected.key ? 2 : 1.35}
                              />
                              {point.key === selected.key && (
                                <Circle
                                  cx={x}
                                  cy={mainY}
                                  r={8}
                                  fill="transparent"
                                  stroke={COLORS.accent}
                                  strokeWidth={1}
                                />
                              )}
                            </>
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
                        </G>
                      );
                    })}

                    <SvgLine
                      x1={selectedX}
                      x2={selectedX}
                      y1={PAD_TOP}
                      y2={baselineY}
                      stroke={COLORS.guide}
                      strokeWidth={1}
                      strokeDasharray="3,4"
                    />
                  </Svg>
                </View>
              </Animated.View>
            </ScrollView>
          </View>
        </PinchGestureHandler>
      </View>

      <View style={styles.insightCard}>
        <View style={styles.insightHeader}>
          <Text style={styles.insightDate}>{selected.fullLabel}</Text>
          {selectedResponse && (
            <View
              style={[
                styles.insightBadge,
                {
                  backgroundColor: getResponseBadgeColors(selectedResponse.tone).bg,
                  borderColor: getResponseBadgeColors(selectedResponse.tone).border,
                },
              ]}
            >
              <Text
                style={[
                  styles.insightBadgeText,
                  { color: getResponseBadgeColors(selectedResponse.tone).text },
                ]}
              >
                {selectedResponse.label}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.insightGrid}>
          <View style={styles.insightMetric}>
            <Text style={styles.insightLabel}>1RM</Text>
            <Text style={styles.insightValue}>
              {formatValue(selected.weight?.value ?? null, weightSeries.unitLabel, 1)}
            </Text>
          </View>
          <View style={styles.insightMetric}>
            <Text style={styles.insightLabel}>1RM-trend</Text>
            <Text style={styles.insightValue}>
              {formatSignedPercent(selectedWeightTrendPct)}
            </Text>
          </View>
          <View style={styles.insightMetric}>
            <Text style={styles.insightLabel}>Volum</Text>
            <Text style={styles.insightValue}>
              {formatValue(selected.volume?.value ?? null, volumeSeries.unitLabel, 0)}
            </Text>
          </View>
          <View style={styles.insightMetric}>
            <Text style={styles.insightLabel}>Volumtrend</Text>
            <Text style={styles.insightValue}>
              {formatSignedPercent(selectedVolumeTrendPct)}
            </Text>
          </View>
        </View>

        <Text style={styles.insightNote}>
          {selectedResponse?.note ??
            "For lite data til å lese responsen sikkert ennå."}
        </Text>
      </View>
    </View>
  );
}
