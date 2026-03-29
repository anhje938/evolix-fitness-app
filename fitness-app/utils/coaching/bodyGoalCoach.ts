import type { Food } from "@/types/meal";
import type { UserSettings } from "@/types/userSettings";
import type { Weight } from "@/types/weight";
import {
  formatDateLongNO,
  getDateKeyEpochDay,
  getOsloDateKey,
  getOsloTodayDateKey,
} from "@/utils/date";

export type BodyGoalCoachStatus =
  | "insufficientData"
  | "goalReached"
  | "onTrack"
  | "increaseCalories"
  | "decreaseCalories"
  | "deadlineRisk";

export type BodyGoalCoachConfidence = "low" | "medium" | "high" | null;

export type BodyGoalCoachRecommendation = {
  status: BodyGoalCoachStatus;
  statusLabel: string;
  confidence: BodyGoalCoachConfidence;
  confidenceLabel: string;
  headline: string;
  summary: string;
  note: string;
  goalDateUtc: string;
  daysRemaining: number | null;
  latestWeightKg: number | null;
  latestMeasuredWeightKg: number | null;
  goalWeightKg: number | null;
  deltaToGoalKg: number | null;
  currentTrendKgPerWeek: number | null;
  requiredTrendKgPerWeek: number | null;
  recentAverageCalories: number | null;
  maintenanceCalories: number | null;
  recommendedCalories: number | null;
  recommendedCaloriesMin: number | null;
  recommendedCaloriesMax: number | null;
  trackedWeightDays: number;
  trackedCalorieDays: number;
  consecutiveCalorieDays: number;
  excludedCalorieDays: number;
  usesLoggedCalories: boolean;
};

type BuildBodyGoalCoachArgs = {
  foodList: Food[];
  userSettings: UserSettings;
  weightList: Weight[];
};

type DailyWeightPoint = {
  dateKey: string;
  epochDay: number;
  measuredWeightKg: number;
};

type TrendWeightPoint = DailyWeightPoint & {
  trendWeightKg: number;
};

type DailyCaloriesPoint = {
  dateKey: string;
  epochDay: number;
  calories: number;
};

type CalorieCoachWindow = {
  eligiblePoints: DailyCaloriesPoint[];
  recentConsecutivePoints: DailyCaloriesPoint[];
  excludedDays: number;
};

const ANALYSIS_WINDOW_DAYS = 28;
const MIN_CONSECUTIVE_CALORIE_DAYS = 7;
const MIN_LOGGED_CALORIE_DAYS = 7;
const MIN_WEIGHT_MEASUREMENT_DAYS = 7;
const MIN_WEIGHT_SPAN_DAYS = 10;
const EMA_ALPHA = 0.2;
const KCAL_PER_KG = 7700;
const MIN_RECOMMENDED_CALORIES = 1200;
const MAX_WEEKLY_GAIN_KG = 0.75;
const MAX_WEEKLY_LOSS_KG = 1.0;
const MAX_WEEKLY_LOSS_BODYWEIGHT_FRACTION = 0.01;
const MIN_WEEKLY_ADJUSTMENT_TO_SHOW = 25;
const COMPLETED_CALORIE_DAYS_LAG = 1;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundToStep(value: number, step: number) {
  if (!Number.isFinite(value) || step <= 0) return value;
  return Math.round(value / step) * step;
}

function formatNumber(value: number, digits = 0) {
  return value.toLocaleString("nb-NO", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatWeight(value: number | null) {
  return value === null ? "-" : `${formatNumber(value, 1)} kg`;
}

function formatTrend(value: number | null) {
  if (value === null) return "mangler data";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value, 2)} kg/uke`;
}

function formatCalories(value: number | null) {
  return value === null ? "-" : `${formatNumber(value, 0)} kcal`;
}

function formatCaloriesRange(min: number | null, max: number | null) {
  if (min === null || max === null) return "Logg mer data";
  if (min === max) return `${formatNumber(min, 0)} kcal`;
  return `${formatNumber(min, 0)}-${formatNumber(max, 0)} kcal`;
}

function toDailyWeightPoints(weightList: Weight[]): DailyWeightPoint[] {
  const grouped = new Map<
    string,
    {
      epochDay: number;
      totalWeight: number;
      count: number;
    }
  >();

  for (const entry of weightList) {
    const dateKey = getOsloDateKey(entry.timestampUtc);
    const epochDay = getDateKeyEpochDay(dateKey);
    const weightKg = Number(entry.weightKg);
    if (!dateKey || epochDay === null || !Number.isFinite(weightKg)) continue;

    const current = grouped.get(dateKey);
    if (current) {
      current.totalWeight += weightKg;
      current.count += 1;
      continue;
    }

    grouped.set(dateKey, {
      epochDay,
      totalWeight: weightKg,
      count: 1,
    });
  }

  return [...grouped.entries()]
    .map(([dateKey, item]) => ({
      dateKey,
      epochDay: item.epochDay,
      measuredWeightKg: item.totalWeight / item.count,
    }))
    .sort((a, b) => a.epochDay - b.epochDay);
}

function toDailyCaloriesPoints(foodList: Food[]): DailyCaloriesPoint[] {
  const grouped = new Map<
    string,
    {
      epochDay: number;
      calories: number;
    }
  >();

  for (const entry of foodList) {
    const dateKey = getOsloDateKey(entry.timestampUtc);
    const epochDay = getDateKeyEpochDay(dateKey);
    const calories = Number(entry.calories);
    if (!dateKey || epochDay === null || !Number.isFinite(calories)) continue;

    const current = grouped.get(dateKey);
    if (current) {
      current.calories += calories;
      continue;
    }

    grouped.set(dateKey, {
      epochDay,
      calories,
    });
  }

  return [...grouped.entries()]
    .map(([dateKey, item]) => ({
      dateKey,
      epochDay: item.epochDay,
      calories: item.calories,
    }))
    .sort((a, b) => a.epochDay - b.epochDay);
}

function toTrendWeightPoints(points: DailyWeightPoint[]): TrendWeightPoint[] {
  let previousTrend: number | null = null;

  return points.map((point) => {
    const trendWeightKg =
      previousTrend === null
        ? point.measuredWeightKg
        : EMA_ALPHA * point.measuredWeightKg + (1 - EMA_ALPHA) * previousTrend;

    previousTrend = trendWeightKg;

    return {
      ...point,
      trendWeightKg,
    };
  });
}

function toExcludedDateKeySet(dateKeys: string[] | undefined) {
  return new Set(
    (dateKeys ?? [])
      .map((value) => String(value ?? "").trim())
      .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
  );
}

function getCalorieCoachWindow(
  caloriePoints: DailyCaloriesPoint[],
  excludedDateKeys: Set<string>,
  todayEpochDay: number
): CalorieCoachWindow {
  const analysisEndEpochDay = todayEpochDay - COMPLETED_CALORIE_DAYS_LAG;
  const analysisStartEpochDay = analysisEndEpochDay - (ANALYSIS_WINDOW_DAYS - 1);
  const windowPoints = caloriePoints.filter(
    (point) =>
      point.epochDay >= analysisStartEpochDay && point.epochDay <= analysisEndEpochDay
  );
  const excludedDays = windowPoints.filter((point) =>
    excludedDateKeys.has(point.dateKey)
  ).length;
  const eligiblePoints = windowPoints.filter(
    (point) => !excludedDateKeys.has(point.dateKey)
  );
  const eligibleByEpochDay = new Map(
    eligiblePoints.map((point) => [point.epochDay, point] as const)
  );
  const recentConsecutivePoints: DailyCaloriesPoint[] = [];

  for (let day = analysisEndEpochDay; day >= analysisStartEpochDay; day -= 1) {
    const point = eligibleByEpochDay.get(day);
    if (!point) break;
    recentConsecutivePoints.unshift(point);
  }

  return {
    eligiblePoints,
    recentConsecutivePoints,
    excludedDays,
  };
}

function getConfidenceMeta(
  trackedCalorieDays: number,
  trackedWeightDays: number,
  weightSpanDays: number
) {
  if (
    trackedCalorieDays >= 24 &&
    trackedWeightDays >= 12 &&
    weightSpanDays >= 21
  ) {
    return {
      confidence: "high" as const,
      confidenceLabel: "Høy sikkerhet",
      rangeHalfWidth: 100,
    };
  }

  if (
    trackedCalorieDays >= 18 &&
    trackedWeightDays >= 9 &&
    weightSpanDays >= 14
  ) {
    return {
      confidence: "medium" as const,
      confidenceLabel: "Middels sikkerhet",
      rangeHalfWidth: 150,
    };
  }

  return {
    confidence: "low" as const,
    confidenceLabel: "Lav sikkerhet",
    rangeHalfWidth: 225,
  };
}

function getGoalDirection(deltaToGoalKg: number | null) {
  if (deltaToGoalKg === null) return "maintain" as const;
  if (deltaToGoalKg > 0.3) return "gain" as const;
  if (deltaToGoalKg < -0.3) return "lose" as const;
  return "maintain" as const;
}

function getSafeWeeklyRate(
  goalDirection: "gain" | "lose" | "maintain",
  trendWeightKg: number
) {
  if (goalDirection === "gain") return MAX_WEEKLY_GAIN_KG;
  if (goalDirection === "lose") {
    return Math.min(
      MAX_WEEKLY_LOSS_KG,
      Math.max(0.25, trendWeightKg * MAX_WEEKLY_LOSS_BODYWEIGHT_FRACTION)
    );
  }
  return 0;
}

function buildInsufficientDataRecommendation(args: {
  goalDateUtc: string;
  goalWeightKg: number | null;
  latestMeasuredWeightKg: number | null;
  trackedWeightDays: number;
  trackedCalorieDays: number;
  consecutiveCalorieDays: number;
  excludedCalorieDays: number;
}): BodyGoalCoachRecommendation {
  const goalDateLabel = formatDateLongNO(args.goalDateUtc);
  const excludedDaysText =
    args.excludedCalorieDays > 0
      ? ` ${args.excludedCalorieDays} dager er markert som «ikke tell», og coachen hopper derfor over dem.`
      : "";

  return {
    status: "insufficientData",
    statusLabel: "For lite data",
    confidence: null,
    confidenceLabel: "Ingen sikkerhet",
    headline: "Logg litt mer før coachen gir tips",
    summary: `Coachen trenger minst ${MIN_CONSECUTIVE_CALORIE_DAYS} gyldige kalori-dager på rad frem til i går og minst ${MIN_WEIGHT_MEASUREMENT_DAYS} vektmålinger de siste ${ANALYSIS_WINDOW_DAYS} dagene for å gi råd mot ${formatWeight(args.goalWeightKg)} innen ${goalDateLabel}.`,
    note: `Coachen bruker bare dager den kan stole på. Akkurat nå har du ${args.consecutiveCalorieDays} dager på rad med brukbar kalorilogging, ${args.trackedCalorieDays} brukbare kaloridager totalt de siste ${ANALYSIS_WINDOW_DAYS} dagene og ${args.trackedWeightDays} vektmålinger.${excludedDaysText}`,
    goalDateUtc: args.goalDateUtc,
    daysRemaining: null,
    latestWeightKg: null,
    latestMeasuredWeightKg: args.latestMeasuredWeightKg,
    goalWeightKg: args.goalWeightKg,
    deltaToGoalKg: null,
    currentTrendKgPerWeek: null,
    requiredTrendKgPerWeek: null,
    recentAverageCalories: null,
    maintenanceCalories: null,
    recommendedCalories: null,
    recommendedCaloriesMin: null,
    recommendedCaloriesMax: null,
    trackedWeightDays: args.trackedWeightDays,
    trackedCalorieDays: args.trackedCalorieDays,
    consecutiveCalorieDays: args.consecutiveCalorieDays,
    excludedCalorieDays: args.excludedCalorieDays,
    usesLoggedCalories: args.trackedCalorieDays > 0,
  };
}

export function buildBodyGoalCoach({
  foodList,
  userSettings,
  weightList,
}: BuildBodyGoalCoachArgs): BodyGoalCoachRecommendation {
  const todayEpochDay = getDateKeyEpochDay(getOsloTodayDateKey());
  const goalDateUtc = userSettings.weightGoalTimeUtc;
  const goalWeightKg = Number.isFinite(Number(userSettings.weightGoalKg))
    ? Number(userSettings.weightGoalKg)
    : null;

  if (todayEpochDay === null || !goalDateUtc) {
    return buildInsufficientDataRecommendation({
      goalDateUtc,
      goalWeightKg,
      latestMeasuredWeightKg: null,
      trackedWeightDays: 0,
      trackedCalorieDays: 0,
      consecutiveCalorieDays: 0,
      excludedCalorieDays: 0,
    });
  }

  const analysisStartEpochDay = todayEpochDay - (ANALYSIS_WINDOW_DAYS - 1);
  const allWeightPoints = toDailyWeightPoints(weightList);
  const weightPoints = allWeightPoints.filter(
    (point) =>
      point.epochDay >= analysisStartEpochDay && point.epochDay <= todayEpochDay
  );
  const calorieWindow = getCalorieCoachWindow(
    toDailyCaloriesPoints(foodList),
    toExcludedDateKeySet(userSettings.foodCoachExcludedDateKeys),
    todayEpochDay
  );
  const caloriePoints = calorieWindow.recentConsecutivePoints;
  const trackedCalorieDays = caloriePoints.length;
  const totalEligibleCalorieDays = calorieWindow.eligiblePoints.length;
  const consecutiveCalorieDays = calorieWindow.recentConsecutivePoints.length;
  const excludedCalorieDays = calorieWindow.excludedDays;
  const trendPoints = toTrendWeightPoints(weightPoints);
  const trackedWeightDays = weightPoints.length;
  const latestMeasuredWeightKg =
    weightPoints[weightPoints.length - 1]?.measuredWeightKg ?? null;

  const firstTrendPoint = trendPoints[0] ?? null;
  const lastTrendPoint = trendPoints[trendPoints.length - 1] ?? null;
  const weightSpanDays =
    firstTrendPoint && lastTrendPoint
      ? lastTrendPoint.epochDay - firstTrendPoint.epochDay
      : 0;

  if (
    trackedCalorieDays < MIN_LOGGED_CALORIE_DAYS ||
    consecutiveCalorieDays < MIN_CONSECUTIVE_CALORIE_DAYS ||
    trackedWeightDays < MIN_WEIGHT_MEASUREMENT_DAYS ||
    weightSpanDays < MIN_WEIGHT_SPAN_DAYS ||
    !firstTrendPoint ||
    !lastTrendPoint
  ) {
    return buildInsufficientDataRecommendation({
      goalDateUtc,
      goalWeightKg,
      latestMeasuredWeightKg,
      trackedWeightDays,
      trackedCalorieDays: totalEligibleCalorieDays,
      consecutiveCalorieDays,
      excludedCalorieDays,
    });
  }

  const confidenceMeta = getConfidenceMeta(
    trackedCalorieDays,
    trackedWeightDays,
    weightSpanDays
  );
  const recentAverageCalories = Math.round(
    caloriePoints.reduce((sum, point) => sum + point.calories, 0) /
      trackedCalorieDays
  );
  const latestTrendWeightKg = lastTrendPoint.trendWeightKg;
  const deltaToGoalKg =
    goalWeightKg === null ? null : goalWeightKg - latestTrendWeightKg;
  const currentTrendKgPerDay =
    (lastTrendPoint.trendWeightKg - firstTrendPoint.trendWeightKg) /
    Math.max(weightSpanDays, 1);
  const currentTrendKgPerWeek = currentTrendKgPerDay * 7;
  const maintenanceCalories = roundToStep(
    recentAverageCalories - currentTrendKgPerDay * KCAL_PER_KG,
    25
  );
  const goalEpochDay = getDateKeyEpochDay(getOsloDateKey(goalDateUtc));
  const daysRemaining =
    goalEpochDay === null ? null : goalEpochDay - todayEpochDay;
  const goalDirection = getGoalDirection(deltaToGoalKg);
  const goalReached =
    deltaToGoalKg !== null && Math.abs(deltaToGoalKg) <= 0.3;
  const rawRequiredTrendKgPerWeek =
    deltaToGoalKg === null || daysRemaining === null
      ? null
      : daysRemaining > 0
      ? deltaToGoalKg / (daysRemaining / 7)
      : goalDirection === "gain"
      ? MAX_WEEKLY_GAIN_KG
      : goalDirection === "lose"
      ? -getSafeWeeklyRate(goalDirection, latestTrendWeightKg)
      : 0;
  const safeWeeklyRate = getSafeWeeklyRate(goalDirection, latestTrendWeightKg);
  const requiredTrendKgPerWeek =
    rawRequiredTrendKgPerWeek === null
      ? null
      : goalDirection === "gain"
      ? clamp(rawRequiredTrendKgPerWeek, 0, safeWeeklyRate)
      : goalDirection === "lose"
      ? clamp(rawRequiredTrendKgPerWeek, -safeWeeklyRate, 0)
      : 0;
  const recommendedCaloriesMidpoint =
    requiredTrendKgPerWeek === null
      ? null
      : roundToStep(
          Math.max(
            MIN_RECOMMENDED_CALORIES,
            maintenanceCalories + (requiredTrendKgPerWeek / 7) * KCAL_PER_KG
          ),
          25
        );
  const recommendedCaloriesMin =
    recommendedCaloriesMidpoint === null
      ? null
      : Math.max(
          MIN_RECOMMENDED_CALORIES,
          roundToStep(
            recommendedCaloriesMidpoint - confidenceMeta.rangeHalfWidth,
            25
          )
        );
  const recommendedCaloriesMax =
    recommendedCaloriesMidpoint === null
      ? null
      : roundToStep(
          recommendedCaloriesMidpoint + confidenceMeta.rangeHalfWidth,
          25
        );
  const isAggressiveGoal =
    rawRequiredTrendKgPerWeek !== null &&
    requiredTrendKgPerWeek !== null &&
    Math.abs(rawRequiredTrendKgPerWeek - requiredTrendKgPerWeek) >
      (MIN_WEEKLY_ADJUSTMENT_TO_SHOW / KCAL_PER_KG) * 7;
  const onTrack =
    !goalReached &&
    rawRequiredTrendKgPerWeek !== null &&
    Math.abs(currentTrendKgPerWeek - rawRequiredTrendKgPerWeek) <=
      Math.max(0.08, Math.abs(rawRequiredTrendKgPerWeek) * 0.2);
  const calorieAdjustment =
    recommendedCaloriesMidpoint === null
      ? null
      : roundToStep(recommendedCaloriesMidpoint - recentAverageCalories, 25);

  let status: BodyGoalCoachStatus;
  let statusLabel: string;
  let headline: string;

  if (goalReached) {
    status = "goalReached";
    statusLabel = "Ved mål";
    headline = "Trendvekten ligger rundt målet";
  } else if (daysRemaining !== null && daysRemaining <= 0) {
    status = "deadlineRisk";
    statusLabel = "Frist passert";
    headline = "Måldatoen er passert";
  } else if (isAggressiveGoal) {
    status = "deadlineRisk";
    statusLabel = "Stram plan";
    headline = "Målet krever en aggressiv fart";
  } else if (onTrack) {
    status = "onTrack";
    statusLabel = "På kurs";
    headline = "Kaloriene og trendvekten peker riktig vei";
  } else if ((calorieAdjustment ?? 0) > 0) {
    status = "increaseCalories";
    statusLabel = "Øk litt";
    headline = "Du bør spise litt mer";
  } else {
    status = "decreaseCalories";
    statusLabel = "Kutt litt";
    headline = "Du bør spise litt mindre";
  }

  const goalDateLabel = formatDateLongNO(goalDateUtc);
  const summary = goalReached
    ? `Basert på trendvekten fra målingene dine ligger du omtrent ved mål. Hold deg rundt ${formatCaloriesRange(recommendedCaloriesMin, recommendedCaloriesMax)} hvis du vil stabilisere vekten videre.`
    : `Basert på ${trackedCalorieDays} gyldige kalori-dager på rad frem til i går og trendvekten fra ${trackedWeightDays} måledager estimerer coachen vedlikeholdet ditt rundt ${formatCalories(maintenanceCalories)}. For å nå ${formatWeight(goalWeightKg)} innen ${goalDateLabel} ser et realistisk startområde ut til å være ${formatCaloriesRange(recommendedCaloriesMin, recommendedCaloriesMax)}.`;
  const note = goalReached
    ? `${confidenceMeta.confidenceLabel}. Rådet bygger kun på loggede kalorier og vektmålinger, og bør justeres først når 1-2 nye uker peker samme vei. Skippede dager teller aldri som 0 kcal.`
    : isAggressiveGoal
    ? `${confidenceMeta.confidenceLabel}. Nåværende frist krever omtrent ${formatTrend(rawRequiredTrendKgPerWeek)}. Coachen har derfor klippet rådet til en mer realistisk fart rundt ${formatTrend(requiredTrendKgPerWeek)}. Skippede dager teller aldri som 0 kcal.`
    : `${confidenceMeta.confidenceLabel}. Coachens retning styres bare av loggede kalorier og trendvekt fra målinger, ikke av kalori-målet i settings. Skippede eller manglende dager teller ikke og erstattes aldri av 0.`;

  return {
    status,
    statusLabel,
    confidence: confidenceMeta.confidence,
    confidenceLabel: confidenceMeta.confidenceLabel,
    headline,
    summary,
    note,
    goalDateUtc,
    daysRemaining,
    latestWeightKg: latestTrendWeightKg,
    latestMeasuredWeightKg,
    goalWeightKg,
    deltaToGoalKg,
    currentTrendKgPerWeek,
    requiredTrendKgPerWeek,
    recentAverageCalories,
    maintenanceCalories,
    recommendedCalories: recommendedCaloriesMidpoint,
    recommendedCaloriesMin,
    recommendedCaloriesMax,
    trackedWeightDays,
    trackedCalorieDays,
    consecutiveCalorieDays,
    excludedCalorieDays,
    usesLoggedCalories: trackedCalorieDays > 0,
  };
}

export function formatBodyGoalCoachCalories(value: number | null) {
  return formatCalories(value);
}

export function formatBodyGoalCoachCaloriesRange(
  min: number | null,
  max: number | null
) {
  return formatCaloriesRange(min, max);
}

export function formatBodyGoalCoachWeight(value: number | null) {
  return formatWeight(value);
}

export function formatBodyGoalCoachTrend(value: number | null) {
  return formatTrend(value);
}
