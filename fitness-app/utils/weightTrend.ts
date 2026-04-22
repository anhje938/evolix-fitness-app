import type { Weight } from "@/types/weight";

export const TREND_WEIGHT_ALPHA = 0.2;

export type WeightTrendPoint = Weight & {
  trendWeightKg: number;
  deltaFromTrendKg: number;
};

export function calculateWeightTrendSeries(
  weightList: Weight[],
  alpha = TREND_WEIGHT_ALPHA
): WeightTrendPoint[] {
  if (!weightList.length) return [];

  const safeAlpha =
    Number.isFinite(alpha) && alpha > 0 && alpha <= 1
      ? alpha
      : TREND_WEIGHT_ALPHA;

  const sorted = [...weightList].sort(
    (a, b) =>
      new Date(a.timestampUtc).getTime() - new Date(b.timestampUtc).getTime()
  );

  let previousTrend: number | null = null;

  return sorted.map((entry) => {
    const trendWeightKg =
      previousTrend == null
        ? entry.weightKg
        : safeAlpha * entry.weightKg + (1 - safeAlpha) * previousTrend;

    previousTrend = trendWeightKg;

    return {
      ...entry,
      trendWeightKg,
      deltaFromTrendKg: entry.weightKg - trendWeightKg,
    };
  });
}
