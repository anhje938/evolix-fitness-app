import type { Weight } from "@/types/weight";
import { useMemo, useRef, useState } from "react";
import { Dimensions } from "react-native";
import { State } from "react-native-gesture-handler";

const screenWidth = Dimensions.get("window").width;
const BASE_POINT_WIDTH = 65;

type Params = {
  weightList: Weight[];
  weeks: number;

  yMinPadding: number;
  yMaxPadding: number;

  decimalPlaces: number;

  goalValue?: number;

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
  minXLabels,
  maxXLabels,
  minZoom,
  maxZoom,
  zoomStep,
  height,
}: Params) {
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const baseZoomRef = useRef<number>(1);

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
        label: d.toLocaleDateString("nb-NO", { day: "numeric", month: "short" }),
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

  const yRange = useMemo(() => {
    if (!values.length) {
      return { minY: 0, maxY: 0, goal: goalValue ?? 0, isGoalExtreme: false };
    }

    const baseMin = Math.min(...values);
    const baseMax = Math.max(...values);
    const range = baseMax - baseMin;
    const autoPad = range < 0.0001 ? 0.8 : Math.max(0.4, Math.min(1.5, range * 0.15));

    const goal = goalValue ?? values[values.length - 1];

    let minY = baseMin - yMinPadding - autoPad;
    let maxY = baseMax + yMaxPadding + autoPad;

    if (goal < minY) {
      const goalPad = Math.max(autoPad, (baseMin - goal) * 0.15);
      minY = goal - goalPad;
    }
    if (goal > maxY) {
      const goalPad = Math.max(autoPad, (goal - baseMax) * 0.15);
      maxY = goal + goalPad;
    }

    const dataRange = baseMax - baseMin;
    const goalDistance =
      goal < baseMin ? baseMin - goal : goal > baseMax ? goal - baseMax : 0;
    const isGoalExtreme = goalDistance > dataRange * 2;

    if (isGoalExtreme) {
      minY = baseMin - yMinPadding - autoPad;
      maxY = baseMax + yMaxPadding + autoPad;
    }

    return { minY, maxY, goal, isGoalExtreme };
  }, [values, yMinPadding, yMaxPadding, goalValue]);

  const zoomState = useMemo(() => {
    const fallbackWidth = screenWidth - 48;
    const effectiveContainerWidth = containerWidth ?? fallbackWidth;
    const naturalWidth = dailyData.length * BASE_POINT_WIDTH;
    const computedMinZoom =
      naturalWidth > 0 ? Math.min(1, effectiveContainerWidth / naturalWidth) : 1;
    const effectiveMinZoom = Math.min(minZoom, computedMinZoom);
    const effectiveMaxZoom = Math.max(effectiveMinZoom, maxZoom);

    const desiredWidth = naturalWidth * zoom;
    const chartWidth = Math.max(effectiveContainerWidth, desiredWidth);
    const chartHeight = height ?? 240;

    const canZoomIn = zoom < effectiveMaxZoom - 0.01;
    const canZoomOut = zoom > effectiveMinZoom + 0.01;

    return {
      effectiveContainerWidth,
      effectiveMinZoom,
      effectiveMaxZoom,
      chartWidth,
      chartHeight,
      canZoomIn,
      canZoomOut,
    };
  }, [containerWidth, dailyData.length, height, maxZoom, minZoom, zoom]);

  const clampZoom = (value: number) =>
    Math.min(zoomState.effectiveMaxZoom, Math.max(zoomState.effectiveMinZoom, value));

  const handleZoomIn = () => {
    setZoom((prev) => {
      const next = clampZoom(prev * (1 + zoomStep));
      baseZoomRef.current = next;
      return next;
    });
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const next = clampZoom(prev / (1 + zoomStep));
      baseZoomRef.current = next;
      return next;
    });
  };

  const handlePinchEvent = (event: any) => {
    const scale = event.nativeEvent.scale as number;
    setZoom(clampZoom(baseZoomRef.current * scale));
  };

  const handlePinchStateChange = (event: any) => {
    const state = event.nativeEvent.state as number;
    if (state === State.BEGAN) baseZoomRef.current = zoom;
    if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      baseZoomRef.current = zoom;
    }
  };

  const limitedLabels = useMemo(() => {
    if (!labels.length) return labels;

    const { effectiveMinZoom, effectiveMaxZoom } = zoomState;
    const zoomRange = effectiveMaxZoom - effectiveMinZoom;
    const zoomT = zoomRange > 0 ? (zoom - effectiveMinZoom) / zoomRange : 0.5;

    const minAllowedX = Math.min(minXLabels, labels.length);
    const maxAllowedX = Math.min(Math.max(maxXLabels, minAllowedX), labels.length);
    const dynamicMaxXLabels = Math.round(minAllowedX + zoomT * (maxAllowedX - minAllowedX));

    if (dynamicMaxXLabels > 0 && labels.length > dynamicMaxXLabels) {
      const step = Math.ceil(labels.length / dynamicMaxXLabels);
      return labels.map((label, index) => (index % step === 0 ? label : ""));
    }
    return labels;
  }, [labels, minXLabels, maxXLabels, zoom, zoomState]);

  const trend = useMemo(() => {
    const changeText = stats
      ? stats.change > 0
        ? `+${stats.change.toFixed(decimalPlaces)} kg`
        : `${stats.change.toFixed(decimalPlaces)} kg`
      : "";

    const trendIcon =
      stats && stats.change !== 0 ? (stats.change > 0 ? "↗" : "↘") : "→";

    const trendColor =
      stats && stats.change !== 0
        ? stats.change > 0
          ? "rgba(239, 68, 68, 0.9)"
          : "rgba(34, 197, 94, 0.9)"
        : "rgba(148, 163, 184, 0.9)";

    return { changeText, trendIcon, trendColor };
  }, [decimalPlaces, stats]);

  return {
    // layout
    containerWidth,
    setContainerWidth,
    zoom,
    // data
    dailyData,
    stats,
    labels,
    values,
    limitedLabels,
    // y-range
    ...yRange,
    // zoom computed
    ...zoomState,
    // handlers
    handleZoomIn,
    handleZoomOut,
    handlePinchEvent,
    handlePinchStateChange,
    // misc
    trend,
  };
}
