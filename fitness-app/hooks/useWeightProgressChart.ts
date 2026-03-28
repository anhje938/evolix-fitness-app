import { formatShortDayMonthNO } from "@/utils/date";
import type { Weight } from "@/types/weight";
import { useMemo } from "react";

import { useSvgChartZoom } from "./useSvgChartZoom";

const WEIGHT_CHART_AXIS_WIDTH = 64;

function getTrendWindow(pointCount: number) {
  if (pointCount <= 5) return 2;
  if (pointCount <= 20) return 3;
  if (pointCount <= 60) return 5;
  return 7;
}

function movingAverage(values: number[], windowSize: number) {
  return values.map((_, index) => {
    const start = Math.max(0, index - windowSize + 1);
    const slice = values.slice(start, index + 1);
    return slice.reduce((sum, value) => sum + value, 0) / slice.length;
  });
}

type Params = {
  weightList: Weight[];
  weeks: number;

  yMinPadding: number;
  yMaxPadding: number;

  decimalPlaces: number;

  goalValue?: number;
  includeGoalInRange?: boolean;

  minXLabels: number;
  maxXLabels: number;

  minZoom: number;
  maxZoom: number;
  zoomStep: number;

  height?: number;
};

export function useWeightProgressChart({
  weightList,
  weeks,
  yMinPadding,
  yMaxPadding,
  decimalPlaces,
  goalValue,
  includeGoalInRange = false,
  minXLabels,
  maxXLabels,
  minZoom,
  maxZoom,
  zoomStep,
  height,
}: Params) {
  const dailyData = useMemo(() => {
    if (!weightList.length) return [];

    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - weeks * 7);

    const filtered = weightList
      .filter((item) => new Date(item.timestampUtc) >= cutoff)
      .sort(
        (a, b) =>
          new Date(a.timestampUtc).getTime() -
          new Date(b.timestampUtc).getTime()
      );

    return filtered.map((item) => {
      const d = new Date(item.timestampUtc);
      return {
        label: formatShortDayMonthNO(item.timestampUtc),
        value: item.weightKg,
        date: d,
      };
    });
  }, [weightList, weeks]);

  const stats = useMemo(() => {
    if (!dailyData.length) return null;

    const values = dailyData.map((d) => d.value);
    const first = values[0];
    const last = values[values.length - 1];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const change = last - first;
    const changePercent = first !== 0 ? (change / first) * 100 : 0;

    const daysBetween =
      (dailyData[dailyData.length - 1].date.getTime() -
        dailyData[0].date.getTime()) /
      (1000 * 60 * 60 * 24);
    const weeksBetween = Math.max(daysBetween / 7, 1);
    const avgChangePerWeek = change / weeksBetween;

    let weeksToGoal: number | null = null;
    let daysToGoal: number | null = null;
    let goalDirection: "correct" | "wrong" | "stable" = "stable";

    if (goalValue !== undefined && Math.abs(avgChangePerWeek) > 0.01) {
      const remaining = goalValue - last;
      const isGainingWeight = avgChangePerWeek > 0;
      const needsToGain = remaining > 0;

      if ((isGainingWeight && needsToGain) || (!isGainingWeight && !needsToGain)) {
        goalDirection = "correct";
        weeksToGoal = Math.abs(remaining / avgChangePerWeek);
        daysToGoal = Math.round(weeksToGoal * 7);
      } else if (Math.abs(remaining) > 0.1) {
        goalDirection = "wrong";
      }
    }

    return {
      first,
      last,
      min,
      max,
      change,
      changePercent,
      avgChangePerWeek,
      count: dailyData.length,
      weeksToGoal,
      daysToGoal,
      goalDirection,
    };
  }, [dailyData, goalValue]);

  const labels = useMemo(() => dailyData.map((w) => w.label), [dailyData]);
  const values = useMemo(() => dailyData.map((w) => w.value), [dailyData]);
  const trendValues = useMemo(() => {
    if (values.length < 2) return [];
    return movingAverage(values, getTrendWindow(values.length));
  }, [values]);

  const yRange = useMemo(() => {
    if (!values.length) {
      return { minY: 0, maxY: 0, goal: goalValue ?? 0, isGoalInRange: false };
    }

    const baseMin = Math.min(...values);
    const baseMax = Math.max(...values);
    const range = baseMax - baseMin;
    const autoPad = range < 0.0001 ? 0.8 : Math.max(0.4, Math.min(1.5, range * 0.15));

    const goal = goalValue ?? values[values.length - 1];

    let minY = baseMin - yMinPadding - autoPad;
    let maxY = baseMax + yMaxPadding + autoPad;

    if (includeGoalInRange && goalValue !== undefined) {
      minY = Math.min(minY, goal - autoPad);
      maxY = Math.max(maxY, goal + autoPad);
    }

    const isGoalInRange = goal >= minY && goal <= maxY;

    return { minY, maxY, goal, isGoalInRange };
  }, [values, yMinPadding, yMaxPadding, goalValue, includeGoalInRange]);

  const dataCount = dailyData.length;
  const adaptivePointWidth =
    dataCount <= 4
      ? 46
      : dataCount <= 8
      ? 40
      : dataCount <= 16
      ? 32
      : dataCount <= 30
      ? 26
      : 22;
  const zoomState = useSvgChartZoom({
    pointCount: dataCount,
    height: height ?? 240,
    baseContentWidth: Math.max(156, dataCount * adaptivePointWidth),
    staticWidthOffset: WEIGHT_CHART_AXIS_WIDTH,
    minZoom,
    maxZoom,
    zoomStep,
    minVisibleLabels: minXLabels,
    maxVisibleLabels: maxXLabels,
  });

  const limitedLabels = useMemo(() => {
    if (!labels.length) return labels;
    const dynamicMaxXLabels = zoomState.dynamicMaxVisibleLabels;

    if (dynamicMaxXLabels > 0 && labels.length > dynamicMaxXLabels) {
      const step = Math.ceil(labels.length / dynamicMaxXLabels);
      return labels.map((label, index) => (index % step === 0 ? label : ""));
    }
    return labels;
  }, [labels, zoomState.dynamicMaxVisibleLabels]);

  const trend = useMemo(() => {
    const changeText = stats
      ? stats.change > 0
        ? `+${stats.change.toFixed(decimalPlaces)} kg`
        : `${stats.change.toFixed(decimalPlaces)} kg`
      : "";

    const trendIcon =
      stats && stats.change !== 0
        ? stats.change > 0
          ? "\u2197"
          : "\u2198"
        : "\u2192";
    const trendColor =
      stats && stats.change !== 0
        ? stats.change > 0
          ? "rgba(239, 68, 68, 0.9)"
          : "rgba(34, 197, 94, 0.9)"
        : "rgba(148, 163, 184, 0.9)";

    return { changeText, trendIcon, trendColor };
  }, [decimalPlaces, stats]);

  return {
    dailyData,
    stats,
    labels,
    values,
    trendValues,
    limitedLabels,
    ...yRange,
    ...zoomState,
    trend,
  };
}
