import { formatShortDayMonthNO } from "@/utils/date";
import type { Weight } from "@/types/weight";
import { useMemo } from "react";
import { calculateWeightTrendSeries } from "@/utils/weightTrend";

import { useSvgChartZoom } from "./useSvgChartZoom";

const WEIGHT_CHART_AXIS_WIDTH = 64;

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

    const filtered = weightList.filter(
      (item) => new Date(item.timestampUtc) >= cutoff
    );
    const trendSeries = calculateWeightTrendSeries(filtered);

    return trendSeries.map((item) => {
      const d = new Date(item.timestampUtc);
      return {
        label: formatShortDayMonthNO(item.timestampUtc),
        value: item.weightKg,
        trendValue: item.trendWeightKg,
        deltaFromTrend: item.deltaFromTrendKg,
        date: d,
      };
    });
  }, [weightList, weeks]);

  const stats = useMemo(() => {
    if (!dailyData.length) return null;

    const values = dailyData.map((d) => d.value);
    const trendValues = dailyData.map((d) => d.trendValue);
    const first = values[0];
    const last = values[values.length - 1];
    const trendFirst = trendValues[0];
    const trendLast = trendValues[trendValues.length - 1];
    const deltaFromTrend = dailyData[dailyData.length - 1].deltaFromTrend;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const rawChange = last - first;
    const trendChange = trendLast - trendFirst;
    const changePercent = trendFirst !== 0 ? (trendChange / trendFirst) * 100 : 0;

    const daysBetween =
      (dailyData[dailyData.length - 1].date.getTime() -
        dailyData[0].date.getTime()) /
      (1000 * 60 * 60 * 24);
    const weeksBetween = Math.max(daysBetween / 7, 1);
    const avgChangePerWeek = trendChange / weeksBetween;

    let weeksToGoal: number | null = null;
    let daysToGoal: number | null = null;
    let goalDirection: "correct" | "wrong" | "stable" = "stable";

    if (goalValue !== undefined && Math.abs(avgChangePerWeek) > 0.01) {
      const remaining = goalValue - trendLast;
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
      trendFirst,
      trendLast,
      deltaFromTrend,
      min,
      max,
      rawChange,
      change: trendChange,
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
  const trendValues = useMemo(
    () => dailyData.map((w) => w.trendValue),
    [dailyData]
  );

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
    const roundedDelta =
      stats != null ? Number(stats.deltaFromTrend.toFixed(decimalPlaces)) : 0;
    const deltaText = stats
      ? `${roundedDelta > 0 ? "+" : ""}${roundedDelta.toFixed(decimalPlaces)} kg`
      : "";
    const deltaLabel =
      roundedDelta > 0 ? "Over trend" : roundedDelta < 0 ? "Under trend" : "På trend";
    const deltaIcon =
      roundedDelta > 0
        ? "\u2197"
        : roundedDelta < 0
        ? "\u2198"
        : "\u2192";
    const deltaColor =
      roundedDelta > 0
        ? "rgba(251, 146, 60, 0.96)"
        : roundedDelta < 0
        ? "rgba(103, 232, 249, 0.96)"
        : "rgba(191, 219, 254, 0.9)";
    const paceColor =
      stats && stats.avgChangePerWeek > 0
        ? "rgba(251, 146, 60, 0.96)"
        : stats && stats.avgChangePerWeek < 0
        ? "rgba(103, 232, 249, 0.96)"
        : "rgba(191, 219, 254, 0.9)";

    return { deltaText, deltaLabel, deltaIcon, deltaColor, paceColor };
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
