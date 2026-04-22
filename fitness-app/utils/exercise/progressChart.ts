import {
  dateKeyToUtcDate,
  formatDateKeyLongNO,
  formatShortDayMonthNO,
  getOsloDateKey,
} from "@/utils/date";

export type ProgressTimeRange = "1m" | "3m" | "6m" | "1y" | "all";
export type ProgressMetricKind = "weight" | "volumeKg" | "volumeSets";
export type ProgressUnit = "kg" | "lbs" | "sets";
export type ProgressBucket = "day" | "week";

export type ProgressInputPoint = {
  timestampUtc: string;
  value: number | null | undefined;
  unit?: ProgressUnit;
};

export type PreparedProgressPoint = {
  key: string;
  timestampUtc: string;
  bucketStartUtc: string;
  shortLabel: string;
  fullLabel: string;
  value: number;
  clampedValue: number;
  trendValue: number | null;
  trendClampedValue: number | null;
  sourceCount: number;
  isOutlier: boolean;
  isPr: boolean;
  milestoneLabel: string | null;
  deltaFromPrev: number | null;
  deltaPercentFromPrev: number | null;
  gapDaysFromPrev: number | null;
  hasGapBefore: boolean;
  autoConverted: boolean;
};

export type PreparedProgressSeries = {
  points: PreparedProgressPoint[];
  bucket: ProgressBucket;
  unitLabel: string;
  rangeLabel: string;
  dataLabel: string;
  trendLabel: string;
  totalChange: number | null;
  totalChangePercent: number | null;
  averageChangePerWeek: number | null;
  plateau: boolean;
  hasLongGaps: boolean;
  removed: {
    missing: number;
    invalid: number;
    outOfRange: number;
    autoConverted: number;
    aggregatedAway: number;
  };
  yDomain: {
    min: number;
    max: number;
    paddedMin: number;
    paddedMax: number;
    lowerBound: number;
    upperBound: number;
    clipped: boolean;
  };
};

type InternalPoint = {
  timestampUtc: string;
  tsMs: number;
  value: number;
  autoConverted: boolean;
};

type PrepareProgressSeriesOptions = {
  metric: ProgressMetricKind;
  range: ProgressTimeRange;
  targetUnit?: ProgressUnit;
  forcedBucket?: ProgressBucket;
};

const KG_PER_LB = 0.45359237;

export const PROGRESS_TIME_RANGE_OPTIONS: {
  value: ProgressTimeRange;
  label: string;
}[] = [
  { value: "1m", label: "1M" },
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "all", label: "All" },
];

export function getProgressRangeOption(range: ProgressTimeRange) {
  return (
    PROGRESS_TIME_RANGE_OPTIONS.find((option) => option.value === range) ??
    PROGRESS_TIME_RANGE_OPTIONS[PROGRESS_TIME_RANGE_OPTIONS.length - 1]
  );
}

export function stepProgressRange(
  range: ProgressTimeRange,
  direction: "in" | "out"
) {
  const currentIndex = PROGRESS_TIME_RANGE_OPTIONS.findIndex(
    (option) => option.value === range
  );
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const delta = direction === "in" ? -1 : 1;
  const nextIndex = clamp(
    safeIndex + delta,
    0,
    PROGRESS_TIME_RANGE_OPTIONS.length - 1
  );

  return PROGRESS_TIME_RANGE_OPTIONS[nextIndex]?.value ?? range;
}

function addDays(date: Date, days: number) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function daysBetween(aMs: number, bMs: number) {
  return Math.abs(bMs - aMs) / 86400000;
}

function quantile(sortedValues: number[], q: number) {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];

  const pos = (sortedValues.length - 1) * q;
  const lower = Math.floor(pos);
  const upper = Math.ceil(pos);
  if (lower === upper) return sortedValues[lower];

  const weight = pos - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return quantile(sorted, 0.5);
}

function clamp(value: number, minValue: number, maxValue: number) {
  return Math.max(minValue, Math.min(maxValue, value));
}

function getRangeWindowDays(range: ProgressTimeRange) {
  if (range === "1m") return 30;
  if (range === "3m") return 90;
  if (range === "6m") return 180;
  if (range === "1y") return 365;
  return null;
}

function getWeekStartDateKey(dateKey: string) {
  const date = dateKeyToUtcDate(dateKey);
  if (!date) return "";

  const dayNumber = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 1 - dayNumber);
  return getOsloDateKey(date);
}

function formatShortLabel(dateKey: string, bucket: ProgressBucket) {
  const date = dateKeyToUtcDate(dateKey);
  if (!date) return "Ukjent";

  if (bucket === "week") {
    const end = addDays(date, 6);
    return `${formatShortDayMonthNO(date)} - ${formatShortDayMonthNO(end)}`;
  }

  return formatShortDayMonthNO(date);
}

function formatFullLabel(dateKey: string, bucket: ProgressBucket) {
  if (bucket === "week") {
    const date = dateKeyToUtcDate(dateKey);
    if (!date) return "Ukjent";
    const end = addDays(date, 6);
    return `${formatDateKeyLongNO(dateKey)} - ${formatDateKeyLongNO(
      getOsloDateKey(end)
    )}`;
  }

  return formatDateKeyLongNO(dateKey);
}

function formatRangeLabel(range: ProgressTimeRange) {
  if (range === "1m") return "Siste måned";
  if (range === "3m") return "Siste 3 måneder";
  if (range === "6m") return "Siste 6 måneder";
  if (range === "1y") return "Siste år";
  return "Hele historikken";
}

function metricDefaults(metric: ProgressMetricKind) {
  if (metric === "weight") {
    return {
      absoluteMax: 1000,
      unitLabel: "kg",
      dataLabel: "Rådata",
      trendLabel: "Trend",
      fromZero: false,
    };
  }

  if (metric === "volumeSets") {
    return {
      absoluteMax: 1000,
      unitLabel: "sets",
      dataLabel: "Daglig volum",
      trendLabel: "Glattet trend",
      fromZero: true,
    };
  }

  return {
    absoluteMax: 250000,
    unitLabel: "kg",
    dataLabel: "Daglig volum",
    trendLabel: "Glattet trend",
    fromZero: true,
  };
}

function normalizeUnitValue(
  value: number,
  metric: ProgressMetricKind,
  unit: ProgressUnit | undefined
) {
  if (metric === "volumeSets") return value;
  if (unit === "lbs") return value * KG_PER_LB;
  return value;
}

function maybeNormalizeImplicitUnitChange(
  value: number,
  previousValues: number[],
  metric: ProgressMetricKind
) {
  if (metric !== "weight" && metric !== "volumeKg") {
    return { value, autoConverted: false };
  }

  const prevMedian = median(previousValues);
  if (!prevMedian || prevMedian <= 0) {
    return { value, autoConverted: false };
  }

  const ratio = value / prevMedian;

  if (ratio > 1.9 && ratio < 2.45) {
    const normalized = value * KG_PER_LB;
    const normalizedRatio = normalized / prevMedian;
    if (normalizedRatio > 0.7 && normalizedRatio < 1.3) {
      return { value: normalized, autoConverted: true };
    }
  }

  if (ratio > 0.36 && ratio < 0.58) {
    const normalized = value / KG_PER_LB;
    const normalizedRatio = normalized / prevMedian;
    if (normalizedRatio > 0.7 && normalizedRatio < 1.3) {
      return { value: normalized, autoConverted: true };
    }
  }

  return { value, autoConverted: false };
}

function sanitizePoints(
  data: ProgressInputPoint[],
  metric: ProgressMetricKind,
  range: ProgressTimeRange,
  targetUnit: ProgressUnit | undefined
) {
  const defaults = metricDefaults(metric);
  const removed = {
    missing: 0,
    invalid: 0,
    outOfRange: 0,
    autoConverted: 0,
    aggregatedAway: 0,
  };

  const cleaned: InternalPoint[] = [];

  for (const item of data ?? []) {
    const tsMs = Date.parse(item.timestampUtc);
    if (!Number.isFinite(tsMs)) {
      removed.invalid += 1;
      continue;
    }

    if (item.value == null || !Number.isFinite(item.value)) {
      removed.missing += 1;
      continue;
    }

    let value = normalizeUnitValue(
      Number(item.value),
      metric,
      item.unit ?? targetUnit
    );
    let autoConverted = false;
    if (!Number.isFinite(value) || value <= 0) {
      removed.missing += 1;
      continue;
    }

    const previousValues = cleaned.slice(-3).map((point) => point.value);
    if (!item.unit && targetUnit !== "lbs") {
      const normalized = maybeNormalizeImplicitUnitChange(
        value,
        previousValues,
        metric
      );
      value = normalized.value;
      if (normalized.autoConverted) {
        removed.autoConverted += 1;
        autoConverted = true;
      }
    }

    if (value > defaults.absoluteMax) {
      removed.outOfRange += 1;
      continue;
    }

    cleaned.push({
      timestampUtc: new Date(tsMs).toISOString(),
      tsMs,
      value,
      autoConverted,
    });
  }

  cleaned.sort((a, b) => a.tsMs - b.tsMs);

  const windowDays = getRangeWindowDays(range);
  const latestTsMs = cleaned[cleaned.length - 1]?.tsMs ?? null;
  const cutoffTsMs =
    windowDays != null && latestTsMs != null
      ? latestTsMs - windowDays * 24 * 60 * 60 * 1000
      : null;
  const ranged =
    cutoffTsMs != null
      ? cleaned.filter((point) => point.tsMs >= cutoffTsMs)
      : cleaned;

  return { cleaned: ranged, removed };
}

function aggregatePoints(
  data: InternalPoint[],
  metric: ProgressMetricKind,
  bucket: ProgressBucket
) {
  const groups = new Map<
    string,
    { values: number[]; tsMs: number; autoConverted: boolean; bucketDateKey: string }
  >();

  for (const point of data) {
    const dateKey = getOsloDateKey(point.timestampUtc);
    if (!dateKey) continue;

    const bucketDateKey =
      bucket === "week" ? getWeekStartDateKey(dateKey) : dateKey;
    if (!bucketDateKey) continue;

    const bucketDate = dateKeyToUtcDate(bucketDateKey);
    if (!bucketDate) continue;

    const key = bucketDateKey;
    const existing = groups.get(key);

    if (existing) {
      existing.values.push(point.value);
      existing.autoConverted = existing.autoConverted || point.autoConverted;
      continue;
    }

    groups.set(key, {
      values: [point.value],
      tsMs: bucketDate.getTime(),
      autoConverted: point.autoConverted,
      bucketDateKey,
    });
  }

  return Array.from(groups.entries())
    .map(([key, group]) => {
      const value =
        metric === "weight"
          ? Math.max(...group.values)
          : group.values.reduce((sum, item) => sum + item, 0);

      return {
        key,
        bucketDateKey: group.bucketDateKey,
        timestampUtc: new Date(group.tsMs).toISOString(),
        tsMs: group.tsMs,
        value,
        sourceCount: group.values.length,
        autoConverted: group.autoConverted,
      };
    })
    .sort((a, b) => a.tsMs - b.tsMs);
}

function chooseBucket(
  pointCount: number,
  range: ProgressTimeRange,
  forcedBucket?: ProgressBucket
) {
  if (forcedBucket) return forcedBucket;
  if (pointCount > 60) return "week";
  if ((range === "6m" || range === "1y" || range === "all") && pointCount > 16) {
    return "week";
  }
  return "day";
}

function getGapThresholdDays(range: ProgressTimeRange, bucket: ProgressBucket) {
  if (bucket === "week") return 21;
  if (range === "1m") return 10;
  if (range === "3m") return 14;
  if (range === "6m" || range === "1y") return 21;
  return 45;
}

function getTrendWindow(pointCount: number, bucket: ProgressBucket) {
  if (bucket === "week") return pointCount > 16 ? 4 : 3;
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

function detectPlateau(points: { tsMs: number; value: number }[]) {
  if (points.length < 4) return false;
  const recent = points.slice(-4);
  const values = recent.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return maxValue - minValue <= Math.max(1, average * 0.015);
}

function computeMilestoneLabel(value: number, previousPr: number) {
  const prevMilestone = Math.floor(previousPr / 10) * 10;
  const nextMilestone = Math.floor(value / 10) * 10;
  if (nextMilestone >= 20 && nextMilestone > prevMilestone) {
    return `${nextMilestone} kg`;
  }
  return null;
}

export function prepareProgressSeries({
  data,
  metric,
  range,
  targetUnit,
  forcedBucket,
}: {
  data: ProgressInputPoint[];
} & PrepareProgressSeriesOptions): PreparedProgressSeries {
  const defaults = metricDefaults(metric);
  const { cleaned, removed } = sanitizePoints(data, metric, range, targetUnit);

  if (cleaned.length === 0) {
    return {
      points: [],
      bucket: forcedBucket ?? "day",
      unitLabel: defaults.unitLabel,
      rangeLabel: formatRangeLabel(range),
      dataLabel: defaults.dataLabel,
      trendLabel: defaults.trendLabel,
      totalChange: null,
      totalChangePercent: null,
      averageChangePerWeek: null,
      plateau: false,
      hasLongGaps: false,
      removed,
      yDomain: {
        min: 0,
        max: 1,
        paddedMin: 0,
        paddedMax: 1,
        lowerBound: 0,
        upperBound: 1,
        clipped: false,
      },
    };
  }

  const daily = aggregatePoints(cleaned, metric, "day");
  removed.aggregatedAway = Math.max(0, cleaned.length - daily.length);

  const bucket = chooseBucket(daily.length, range, forcedBucket);
  const aggregated =
    bucket === "day" ? daily : aggregatePoints(cleaned, metric, "week");

  const values = aggregated.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const rangeSpan = maxValue - minValue;
  const pad = rangeSpan === 0 ? Math.max(1, maxValue * 0.08, 0.5) : rangeSpan * 0.14;
  const lowerBound = defaults.fromZero ? 0 : Math.max(0, minValue - pad);
  const paddedMin = defaults.fromZero ? 0 : minValue - pad;
  const paddedMax = maxValue + pad;
  const upperBound = paddedMax;
  const clipped = false;
  const trendValues = movingAverage(values, getTrendWindow(values.length, bucket));
  const gapThresholdDays = getGapThresholdDays(range, bucket);

  let hasLongGaps = false;
  const highestValue = Math.max(...aggregated.map((point) => point.value));
  const highestPointTsMs = Math.max(
    ...aggregated
      .filter((point) => point.value === highestValue)
      .map((point) => point.tsMs)
  );

  const points: PreparedProgressPoint[] = aggregated.map((point, index) => {
    const value = point.value;
    const previous = aggregated[index - 1];
    const previousTrend = trendValues[index];
    const gapDaysFromPrev = previous ? daysBetween(previous.tsMs, point.tsMs) : null;
    const hasGapBefore = gapDaysFromPrev != null && gapDaysFromPrev > gapThresholdDays;
    const previousValue = previous?.value ?? null;
    const deltaFromPrev =
      previousValue != null ? Number((value - previousValue).toFixed(1)) : null;
    const deltaPercentFromPrev =
      previousValue && previousValue > 0
        ? Number((((value - previousValue) / previousValue) * 100).toFixed(1))
        : null;
    const isPr = value === highestValue && point.tsMs === highestPointTsMs;
    const previousHighestValue =
      index > 0 ? Math.max(...aggregated.slice(0, index).map((item) => item.value)) : 0;
    const milestoneLabel =
      value > previousHighestValue
        ? computeMilestoneLabel(value, previousHighestValue)
        : null;
    if (hasGapBefore) {
      hasLongGaps = true;
    }

    return {
      key: point.key,
      timestampUtc: point.timestampUtc,
      bucketStartUtc: point.timestampUtc,
      shortLabel: formatShortLabel(point.bucketDateKey, bucket),
      fullLabel: formatFullLabel(point.bucketDateKey, bucket),
      value,
      clampedValue: clamp(value, lowerBound, upperBound),
      trendValue: previousTrend,
      trendClampedValue:
        previousTrend != null ? clamp(previousTrend, lowerBound, upperBound) : null,
      sourceCount: point.sourceCount,
      isOutlier: false,
      isPr,
      milestoneLabel,
      deltaFromPrev,
      deltaPercentFromPrev,
      gapDaysFromPrev,
      hasGapBefore,
      autoConverted: point.autoConverted,
    };
  });

  const first = points[0];
  const last = points[points.length - 1];
  const totalChange =
    first && last ? Number((last.value - first.value).toFixed(1)) : null;
  const totalChangePercent =
    first && last && first.value > 0
      ? Number((((last.value - first.value) / first.value) * 100).toFixed(1))
      : null;
  const totalDays =
    first && last ? Math.max(1, daysBetween(Date.parse(first.timestampUtc), Date.parse(last.timestampUtc))) : 1;
  const averageChangePerWeek =
    totalChange != null ? Number(((totalChange / totalDays) * 7).toFixed(1)) : null;

  return {
    points,
    bucket,
    unitLabel: defaults.unitLabel,
    rangeLabel: formatRangeLabel(range),
    dataLabel: defaults.dataLabel,
    trendLabel: defaults.trendLabel,
    totalChange,
    totalChangePercent,
    averageChangePerWeek,
    plateau: detectPlateau(
      points.map((point) => ({ tsMs: Date.parse(point.timestampUtc), value: point.value }))
    ),
    hasLongGaps,
    removed,
    yDomain: {
      min: minValue,
      max: maxValue,
      paddedMin,
      paddedMax,
      lowerBound,
      upperBound,
      clipped,
    },
  };
}

export function getProgressMetricConfig(metric: ProgressMetricKind) {
  return metricDefaults(metric);
}

export function getProgressRangeLabel(range: ProgressTimeRange) {
  return formatRangeLabel(range);
}

export function getProgressDayKey(timestampUtc: string) {
  return getOsloDateKey(timestampUtc);
}
