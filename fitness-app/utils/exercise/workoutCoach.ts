import type { ExerciseSessionSetsDto } from "@/api/exercise/exerchiseHistory";
import type { SessionExercise } from "@/types/exercise";

const MAX_RECENT_SESSIONS = 6;
const TARGET_WINDOW = 3;
const PLATEAU_WINDOW = 5;
const REENTRY_DAYS = 21;
const LOAD_INCREASE_MIN_SESSIONS = 5;
const MIN_SETS = 1;
const MAX_SETS = 6;
const MIN_REPS = 3;
const MAX_REPS = 20;

export type WorkoutCoachStatus =
  | "increase"
  | "hold"
  | "decrease"
  | "plateau"
  | "reentry";

export type WorkoutCoachMode = "load" | "reps";
export type WorkoutCoachConfidence = "low" | "medium" | "high";

export type WorkoutCoachSetPlan = {
  reps: number;
  weightKg: number | null;
};

export type WorkoutCoachRecommendation = {
  status: WorkoutCoachStatus;
  mode: WorkoutCoachMode;
  statusLabel: string;
  headline: string;
  summary: string;
  reason: string;
  plan: WorkoutCoachSetPlan[];
  recommendedSets: number;
  recommendedReps: number;
  recommendedTotalReps: number;
  recommendedWeightKg: number | null;
  stretchPlan: WorkoutCoachSetPlan[] | null;
  stretchSummary: string | null;
  stretchReason: string | null;
  stepKg: number | null;
  lastPerformedAtUtc: string;
  daysSinceLastSession: number;
  plateauDetected: boolean;
  lastSessionSummary: string;
  lastSessionSetLabel: string;
  lastSessionDetailLabel: string;
  historySampleSize: number;
  confidence: WorkoutCoachConfidence;
  confidenceLabel: string;
  dataSummary: string;
};

export type WorkoutCoachProgress = {
  completedSets: number;
  targetSets: number;
  completedReps: number;
  targetReps: number;
};

type NormalizedSession = {
  sessionId: string;
  performedAtUtc: string;
  setCount: number;
  totalReps: number;
  topWeightKg: number | null;
  workingWeightKg: number | null;
  weightedSetCount: number;
  repsAtWorkingWeight: number[];
  totalRepsAtWorkingWeight: number;
  referenceSetCount: number;
  referenceReps: number;
  referenceRepsList: number[];
  referenceTotalReps: number;
};

function clamp(value: number, minValue: number, maxValue: number) {
  return Math.max(minValue, Math.min(maxValue, value));
}

function roundToStep(value: number, step: number) {
  if (!Number.isFinite(step) || step <= 0) {
    return Math.round(value * 10) / 10;
  }

  return Math.round(value / step) * step;
}

function median(values: number[]) {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function getDaysSince(isoUtc: string) {
  const performedMs = new Date(isoUtc).getTime();
  if (!Number.isFinite(performedMs)) return 0;

  const diffMs = Date.now() - performedMs;
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}

function getLoadStepKg(weightKg: number) {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return 1;
  if (weightKg <= 12) return 0.5;
  if (weightKg <= 30) return 1;
  return 2.5;
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(1).replace(".", ",");
}

function formatLoad(weightKg: number | null) {
  if (weightKg == null || !Number.isFinite(weightKg) || weightKg <= 0) {
    return null;
  }

  return `${formatNumber(weightKg)} kg`;
}

function formatCompactLoad(weightKg: number | null) {
  if (weightKg == null || !Number.isFinite(weightKg) || weightKg <= 0) {
    return null;
  }

  return `${formatNumber(weightKg)}kg`;
}

function isWarmupSet(setType: string | null | undefined) {
  const normalized = String(setType ?? "").trim().toLowerCase();
  return (
    normalized.includes("warm") ||
    normalized.includes("oppvarm") ||
    normalized.includes("varm")
  );
}

function sumPlanReps(plan: WorkoutCoachSetPlan[]) {
  return plan.reduce((sum, set) => sum + set.reps, 0);
}

function getPlanRepsLabel(plan: WorkoutCoachSetPlan[]) {
  if (plan.length === 0) return "0 reps";

  const reps = plan.map((set) => set.reps);
  const allSame = reps.every((value) => value === reps[0]);
  return allSame ? `${reps[0]} reps` : `${reps.join("/")} reps`;
}

function getPlanWeightLabel(plan: WorkoutCoachSetPlan[]) {
  const weights = plan.map((set) => set.weightKg);
  const first = weights[0] ?? null;
  const allSame = weights.every((value) => value === first);
  return allSame ? formatCompactLoad(first) : null;
}

function getPlanSummaryParts(
  plan: WorkoutCoachSetPlan[],
  options?: {
    useAtLeastLabel?: boolean;
  }
) {
  const setCount = plan.length;
  const setLabel =
    options?.useAtLeastLabel && setCount === 1
      ? "minst 1 sett"
      : `${setCount} sett`;
  const repsLabel = getPlanRepsLabel(plan);
  const loadLabel = getPlanWeightLabel(plan);

  return {
    setLabel,
    detailLabel: loadLabel ? `${repsLabel} x ${loadLabel}` : repsLabel,
  };
}

function formatPlanSummary(plan: WorkoutCoachSetPlan[]) {
  const parts = getPlanSummaryParts(plan, { useAtLeastLabel: true });
  return `${parts.setLabel} -> ${parts.detailLabel}`;
}

function hasSameLoad(
  left: number | null,
  right: number | null,
  stepKg: number | null
) {
  if (left == null || right == null) return false;

  const tolerance = stepKg != null ? Math.max(stepKg * 0.35, 0.25) : 0.25;
  return Math.abs(left - right) <= tolerance;
}

function pickWorkingWeightKg(
  weightedSets: Array<{ weightKg: number; reps: number }>
) {
  if (weightedSets.length === 0) return null;

  const counts = new Map<string, { weightKg: number; count: number }>();

  for (const set of weightedSets) {
    const key = set.weightKg.toFixed(2);
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { weightKg: set.weightKg, count: 1 });
    }
  }

  const ranked = [...counts.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.weightKg - a.weightKg;
  });

  const mostCommon = ranked[0];
  if (mostCommon.count >= 2) return mostCommon.weightKg;

  return weightedSets.reduce(
    (best, set) => Math.max(best, set.weightKg),
    weightedSets[0].weightKg
  );
}

function normalizeSession(session: ExerciseSessionSetsDto): NormalizedSession | null {
  const sets = [...(session.sets ?? [])]
    .sort((a, b) => a.setNumber - b.setNumber)
    .filter(
      (set) =>
        !isWarmupSet(set.setType) &&
        Number.isFinite(set.reps) &&
        (set.reps ?? 0) > 0
    );

  if (sets.length === 0) return null;

  const weightedSets = sets
    .filter(
      (set) => Number.isFinite(set.weightKg) && (set.weightKg ?? 0) > 0
    )
    .map((set) => ({
      weightKg: Number(set.weightKg),
      reps: Number(set.reps),
    }));

  const topWeightKg =
    weightedSets.length > 0
      ? weightedSets.reduce((best, set) => Math.max(best, set.weightKg), 0)
      : null;
  const workingWeightKg = pickWorkingWeightKg(weightedSets);

  const repsAtWorkingWeight =
    workingWeightKg == null
      ? []
      : weightedSets
          .filter((set) => hasSameLoad(set.weightKg, workingWeightKg, null))
          .map((set) => set.reps);
  const useWorkingWeightAsReference = repsAtWorkingWeight.length >= 2;

  const totalReps = sets.reduce((sum, set) => sum + Number(set.reps ?? 0), 0);
  const referenceRepsSource =
    useWorkingWeightAsReference
      ? repsAtWorkingWeight
      : sets.map((set) => Number(set.reps ?? 0));
  const referenceRepsList = referenceRepsSource.map((reps) =>
    clamp(Math.round(reps), MIN_REPS, MAX_REPS)
  );
  const referenceSetCount =
    useWorkingWeightAsReference ? repsAtWorkingWeight.length : sets.length;
  const referenceReps = clamp(
    Math.round(median(referenceRepsSource)),
    MIN_REPS,
    MAX_REPS
  );
  const referenceTotalReps =
    useWorkingWeightAsReference
      ? repsAtWorkingWeight.reduce((sum, reps) => sum + reps, 0)
      : totalReps;

  return {
    sessionId: session.sessionId,
    performedAtUtc: session.performedAtUtc,
    setCount: sets.length,
    totalReps,
    topWeightKg,
    workingWeightKg,
    weightedSetCount: repsAtWorkingWeight.length,
    repsAtWorkingWeight,
    totalRepsAtWorkingWeight: repsAtWorkingWeight.reduce(
      (sum, reps) => sum + reps,
      0
    ),
    referenceSetCount,
    referenceReps,
    referenceRepsList,
    referenceTotalReps,
  };
}

function getRepScore(session: NormalizedSession, weighted: boolean) {
  return session.referenceTotalReps;
}

function normalizeRepsList(
  repsList: number[],
  setCount: number,
  fallbackReps: number
) {
  const normalized = repsList
    .slice(0, setCount)
    .map((reps) => clamp(Math.round(reps), MIN_REPS, MAX_REPS));

  while (normalized.length < setCount) {
    normalized.push(clamp(fallbackReps, MIN_REPS, MAX_REPS));
  }

  return normalized;
}

function buildPlanFromTotalReps(
  setCount: number,
  targetTotalReps: number,
  weightKg: number | null,
  sourceReps: number[],
  fallbackReps: number
) {
  const minTotal = setCount * MIN_REPS;
  const maxTotal = setCount * MAX_REPS;
  const normalizedTarget = clamp(
    Math.round(targetTotalReps),
    minTotal,
    maxTotal
  );
  const reps = normalizeRepsList(sourceReps, setCount, fallbackReps);

  let delta = normalizedTarget - reps.reduce((sum, value) => sum + value, 0);

  while (delta > 0) {
    const index = reps.reduce((bestIndex, value, currentIndex) => {
      if (value >= MAX_REPS) return bestIndex;
      if (bestIndex === -1) return currentIndex;
      return value < reps[bestIndex] ? currentIndex : bestIndex;
    }, -1);

    if (index === -1) break;
    reps[index] += 1;
    delta -= 1;
  }

  while (delta < 0) {
    const index = reps.reduce((bestIndex, value, currentIndex) => {
      if (value <= MIN_REPS) return bestIndex;
      if (bestIndex === -1) return currentIndex;
      return value > reps[bestIndex] ? currentIndex : bestIndex;
    }, -1);

    if (index === -1) break;
    reps[index] -= 1;
    delta += 1;
  }

  return reps.map((repsValue) => ({
    reps: repsValue,
    weightKg,
  }));
}

function getPlanMedianReps(plan: WorkoutCoachSetPlan[]) {
  return clamp(
    Math.round(median(plan.map((set) => set.reps))),
    MIN_REPS,
    MAX_REPS
  );
}

function getCoachConfidence(
  historySampleSize: number,
  daysSinceLastSession: number
): WorkoutCoachConfidence {
  if (daysSinceLastSession >= REENTRY_DAYS) return "low";
  if (historySampleSize >= 5) return "high";
  if (historySampleSize >= 3) return "medium";
  return "low";
}

function getConfidenceLabel(confidence: WorkoutCoachConfidence) {
  if (confidence === "high") return "Høy sikkerhet";
  if (confidence === "medium") return "Middels sikkerhet";
  return "Lav sikkerhet";
}

function buildDataSummary(
  confidence: WorkoutCoachConfidence,
  historySampleSize: number
) {
  const sessionLabel =
    historySampleSize === 1 ? "1 logget økt" : `${historySampleSize} loggede økter`;

  if (confidence === "low") {
    return `Basert på ${sessionLabel}. Bruk som et tidlig forslag, ikke en hard fasit.`;
  }

  return `Basert på ${sessionLabel}. Coachen prioriterer små steg og stabil utførelse.`;
}

function getStrongThreshold(targetTotalReps: number) {
  return Math.max(targetTotalReps - 1, 1);
}

function getWeakThreshold(targetTotalReps: number, targetSets: number) {
  return Math.max(targetTotalReps - Math.max(targetSets, 2), 1);
}

function getSessionLoad(session: NormalizedSession) {
  return session.workingWeightKg ?? session.topWeightKg;
}

function isSessionImproving(
  current: NormalizedSession,
  previous: NormalizedSession,
  weighted: boolean,
  stepKg: number | null
) {
  if (weighted) {
    const currentLoad = getSessionLoad(current);
    const previousLoad = getSessionLoad(previous);

    if (
      currentLoad != null &&
      previousLoad != null &&
      currentLoad > previousLoad + Math.max((stepKg ?? 1) * 0.35, 0.25)
    ) {
      return true;
    }

    if (hasSameLoad(currentLoad, previousLoad, stepKg)) {
      return getRepScore(current, weighted) > getRepScore(previous, weighted);
    }

    return false;
  }

  return getRepScore(current, weighted) > getRepScore(previous, weighted);
}

function isSessionDeclining(
  current: NormalizedSession,
  previous: NormalizedSession,
  weighted: boolean,
  stepKg: number | null
) {
  if (weighted) {
    const currentLoad = getSessionLoad(current);
    const previousLoad = getSessionLoad(previous);

    if (currentLoad == null || previousLoad == null) return false;

    if (
      currentLoad <
      previousLoad - Math.max((stepKg ?? 1) * 0.35, 0.25)
    ) {
      return true;
    }

    if (hasSameLoad(currentLoad, previousLoad, stepKg)) {
      return getRepScore(current, weighted) < getRepScore(previous, weighted);
    }

    return false;
  }

  return getRepScore(current, weighted) < getRepScore(previous, weighted);
}

function hasRecentIncreaseTrend(
  sessions: NormalizedSession[],
  weighted: boolean,
  stepKg: number | null
) {
  if (sessions.length < 2) return false;
  if (sessions.length < 3) {
    return isSessionImproving(sessions[0], sessions[1], weighted, stepKg);
  }

  return (
    isSessionImproving(sessions[0], sessions[1], weighted, stepKg) &&
    isSessionImproving(sessions[1], sessions[2], weighted, stepKg)
  );
}

function hasRecentDecreaseTrend(
  sessions: NormalizedSession[],
  weighted: boolean,
  stepKg: number | null
) {
  if (sessions.length < 3) return false;

  return (
    isSessionDeclining(sessions[0], sessions[1], weighted, stepKg) &&
    isSessionDeclining(sessions[1], sessions[2], weighted, stepKg)
  );
}

function getLoadProgressPercent(historySampleSize: number) {
  const scaledSample = clamp(historySampleSize, 1, MAX_RECENT_SESSIONS);
  return 0.02 + ((scaledSample - 1) / (MAX_RECENT_SESSIONS - 1)) * 0.03;
}

function getIncreasedLoad(
  currentLoad: number,
  historySampleSize: number,
  stepKg: number | null
) {
  const nextRawLoad = currentLoad * (1 + getLoadProgressPercent(historySampleSize));

  if (stepKg != null) {
    const rounded = roundToStep(nextRawLoad, stepKg);
    return rounded > currentLoad
      ? rounded
      : roundToStep(currentLoad + stepKg, stepKg);
  }

  return Math.round(nextRawLoad * 10) / 10;
}

function getDecreasedLoad(
  currentLoad: number,
  historySampleSize: number,
  stepKg: number | null
) {
  const nextRawLoad = currentLoad * (1 - getLoadProgressPercent(historySampleSize));

  if (stepKg != null) {
    const rounded = roundToStep(nextRawLoad, stepKg);
    const fallback = Math.max(stepKg, currentLoad - stepKg);
    return rounded < currentLoad ? Math.max(rounded, stepKg) : fallback;
  }

  return Math.max(0.5, Math.round(nextRawLoad * 10) / 10);
}

function detectPlateau(
  sessions: NormalizedSession[],
  weighted: boolean,
  stepKg: number | null,
  targetTotalReps: number
) {
  const window = sessions.slice(0, PLATEAU_WINDOW);
  if (window.length < PLATEAU_WINDOW) return false;
  if (hasRecentIncreaseTrend(window, weighted, stepKg)) return false;

  const repScores = window.map((session) => getRepScore(session, weighted));
  const bestScore = Math.max(...repScores);
  const worstScore = Math.min(...repScores);
  const repSpread = bestScore - worstScore;
  const allowedRepSpread = Math.max(1, Math.ceil(window[0].referenceSetCount / 2));

  if (weighted) {
    const loads = window.map(getSessionLoad);
    if (loads.some((load) => load == null)) return false;

    const numericLoads = loads as number[];
    const bestLoad = Math.max(...numericLoads);
    const allowedDip =
      stepKg != null ? Math.max(stepKg, bestLoad * 0.03) : Math.max(1, bestLoad * 0.03);

    return (
      !hasRecentDecreaseTrend(window, weighted, stepKg) &&
      repSpread <= allowedRepSpread &&
      window[0].referenceTotalReps <= getStrongThreshold(targetTotalReps) &&
      numericLoads.every(
        (load) => load <= bestLoad + 0.01 && load >= bestLoad - allowedDip
      )
    );
  }

  return (
    !hasRecentDecreaseTrend(window, weighted, stepKg) &&
    repSpread <= allowedRepSpread &&
    window[0].referenceTotalReps <= getStrongThreshold(targetTotalReps)
  );
}

function isReadyForLoadIncrease(
  sessions: NormalizedSession[],
  recommendedTotalReps: number,
  recommendedSets: number,
  stepKg: number | null
) {
  if (sessions.length < LOAD_INCREASE_MIN_SESSIONS) return false;

  const latest = sessions[0];
  const previous = sessions[1];
  const latestLoad = getSessionLoad(latest);
  const previousLoad = getSessionLoad(previous);

  if (latestLoad == null || previousLoad == null) return false;
  if (!hasSameLoad(latestLoad, previousLoad, stepKg)) return false;

  const stableHighThreshold =
    recommendedTotalReps + Math.max(1, Math.ceil(recommendedSets / 2));

  return (
    latest.referenceTotalReps >= stableHighThreshold &&
    previous.referenceTotalReps >= getStrongThreshold(recommendedTotalReps) &&
    !hasRecentDecreaseTrend(sessions, true, stepKg)
  );
}

function buildStatusCopy(
  status: WorkoutCoachStatus,
  mode: WorkoutCoachMode,
  daysSinceLastSession: number
) {
  const loadFocused = mode === "load";
  switch (status) {
    case "increase":
      return {
        statusLabel: "Klar for økning",
        headline: loadFocused
          ? "Coachen vil at du prøver tyngre"
          : "Coachen vil ha flere reps",
      };
    case "decrease":
      return {
        statusLabel: "Ta et lite steg tilbake",
        headline: loadFocused
          ? "Skal ned litt for å bygge opp igjen"
          : "Skal ned litt på reps og bygge opp igjen",
      };
    case "plateau":
      return {
        statusLabel: "Tegn til plateau",
        headline: loadFocused
          ? "Ingen tydelig fremgang de siste øktene"
          : "Repsene står stille akkurat nå",
      };
    case "reentry":
      return {
        statusLabel: "Rolig tilbake",
        headline: `Det er ${daysSinceLastSession} dager siden sist`,
      };
    case "hold":
    default:
      return {
        statusLabel: "Hold deg her",
        headline: loadFocused
          ? "Bygg en ny sterk økt på samme vekt"
          : "Gjenta oppsettet og eie repsene",
      };
  }
}

export function formatWorkoutCoachPlanSummary(
  recommendation: WorkoutCoachRecommendation
) {
  const parts = getPlanSummaryParts(recommendation.plan, {
    useAtLeastLabel: true,
  });

  return `${parts.setLabel} -> ${parts.detailLabel}`;
}

export function getWorkoutCoachPlanSummaryParts(
  recommendation: WorkoutCoachRecommendation
) {
  return getPlanSummaryParts(recommendation.plan, { useAtLeastLabel: true });
}

export function buildWorkoutCoachRecommendation(
  history: ExerciseSessionSetsDto[]
): WorkoutCoachRecommendation | null {
  const normalized = [...history]
    .sort(
      (a, b) =>
        new Date(b.performedAtUtc).getTime() -
        new Date(a.performedAtUtc).getTime()
    )
    .map(normalizeSession)
    .filter((session): session is NormalizedSession => session !== null)
    .slice(0, MAX_RECENT_SESSIONS);

  if (normalized.length === 0) return null;

  const latest = normalized[0];
  const targetPool = normalized.slice(0, TARGET_WINDOW);
  const weighted = targetPool.some(
    (session) => (session.workingWeightKg ?? session.topWeightKg ?? 0) > 0
  );
  const typicalSets = clamp(
    Math.round(median(targetPool.map((session) => session.referenceSetCount))),
    MIN_SETS,
    MAX_SETS
  );
  const recommendedSets = clamp(latest.referenceSetCount || typicalSets, MIN_SETS, MAX_SETS);
  const medianReps = clamp(
    Math.round(median(targetPool.map((session) => session.referenceReps))),
    MIN_REPS,
    MAX_REPS
  );
  const medianTotalReps = clamp(
    Math.round(median(targetPool.map((session) => session.referenceTotalReps))),
    recommendedSets * MIN_REPS,
    recommendedSets * MAX_REPS
  );
  const latestTotalReps = clamp(
    latest.referenceTotalReps,
    recommendedSets * MIN_REPS,
    recommendedSets * MAX_REPS
  );
  const latestLoad = getSessionLoad(latest);
  const stepKg =
    weighted && latestLoad != null ? getLoadStepKg(latestLoad) : null;
  const daysSinceLastSession = getDaysSince(latest.performedAtUtc);
  const confidence = getCoachConfidence(normalized.length, daysSinceLastSession);
  const confidenceLabel = getConfidenceLabel(confidence);
  const dataSummary = buildDataSummary(confidence, normalized.length);
  const plateauDetected = detectPlateau(
    normalized,
    weighted,
    stepKg,
    medianTotalReps
  );
  const increasingTrendDetected = hasRecentIncreaseTrend(
    normalized,
    weighted,
    stepKg
  );
  const decreasingTrendDetected = hasRecentDecreaseTrend(
    normalized,
    weighted,
    stepKg
  );
  const lastSessionPlan = buildPlanFromTotalReps(
    latest.referenceSetCount,
    latest.referenceTotalReps,
    weighted ? getSessionLoad(latest) : null,
    latest.referenceRepsList,
    latest.referenceReps
  );
  const lastSessionSummary = formatPlanSummary(lastSessionPlan);
  const lastSessionSummaryParts = getPlanSummaryParts(lastSessionPlan);

  let mode: WorkoutCoachMode = weighted ? "load" : "reps";
  let status: WorkoutCoachStatus = "hold";
  let nextWeightKg = latestLoad;
  let targetTotalReps = latestTotalReps;
  let stretchPlan: WorkoutCoachSetPlan[] | null = null;
  let stretchReason: string | null = null;
  let reason = "";

  if (daysSinceLastSession >= REENTRY_DAYS) {
    status = "reentry";
    nextWeightKg =
      weighted && latestLoad != null && stepKg != null
        ? roundToStep(Math.max(latestLoad * 0.92, stepKg), stepKg)
        : null;
    targetTotalReps = Math.max(
      recommendedSets * MIN_REPS,
      latestTotalReps - Math.max(1, recommendedSets)
    );
    reason =
      "Det har gått en stund siden sist. Start litt lettere og bygg rytmen opp igjen.";
  } else if (weighted) {
    const readyForLoadIncrease =
      latestLoad != null &&
      isReadyForLoadIncrease(normalized, medianTotalReps, recommendedSets, stepKg);

    if (decreasingTrendDetected && latestLoad != null) {
      status = "decrease";
      mode = "load";
      nextWeightKg = getDecreasedLoad(latestLoad, normalized.length, stepKg);
      targetTotalReps = Math.max(
        recommendedSets * MIN_REPS,
        Math.min(latestTotalReps, medianTotalReps)
      );
      reason =
        "Belastning eller reps har falt gjennom flere økter. Ta et lite steg ned og bygg opp igjen med ren utførelse.";
    } else if (plateauDetected) {
      status = "plateau";
      mode = "load";
      nextWeightKg = latestLoad;
      targetTotalReps = latestTotalReps;
      if (confidence !== "low" && latestTotalReps < recommendedSets * MAX_REPS) {
        stretchPlan = buildPlanFromTotalReps(
          recommendedSets,
          latestTotalReps + 1,
          nextWeightKg,
          latest.referenceRepsList,
          medianReps
        );
        stretchReason = "Valgfritt hvis første del av økten føles lett.";
      }
      reason =
        "Belastning og reps har stått nesten stille. Hold samme vekt og jakt en liten kvalitetsrep, ikke et stort hopp.";
    } else if (increasingTrendDetected) {
      status = "increase";

      if (readyForLoadIncrease && latestLoad != null) {
        mode = "load";
        nextWeightKg = getIncreasedLoad(latestLoad, normalized.length, stepKg);
        targetTotalReps = Math.max(
          recommendedSets * MIN_REPS,
          latestTotalReps - Math.max(1, recommendedSets)
        );
        reason =
          "Du har vist nok reps på samme vekt over flere økter. Neste steg er en liten vektøkning med litt lavere repmål.";
      } else {
        mode = "reps";
        nextWeightKg = latestLoad;
        targetTotalReps = Math.min(
          recommendedSets * MAX_REPS,
          latestTotalReps + 1
        );
        if (confidence !== "low" && targetTotalReps < recommendedSets * MAX_REPS) {
          stretchPlan = buildPlanFromTotalReps(
            recommendedSets,
            targetTotalReps + 1,
            nextWeightKg,
            latest.referenceRepsList,
            medianReps
          );
          stretchReason = "Kun hvis teknikken fortsatt er ren etter hovedmålet.";
        }
        reason =
          "Du har hatt en stigende trend, men signalet peker fortsatt på reps før vekt. Hovedmålet er bare én rep mer enn sist.";
      }
    } else {
      status = "hold";
      mode = "load";
      nextWeightKg = latestLoad;
      targetTotalReps = latestTotalReps;
      if (
        confidence !== "low" &&
        latestTotalReps >= getStrongThreshold(medianTotalReps) &&
        latestTotalReps < recommendedSets * MAX_REPS
      ) {
        stretchPlan = buildPlanFromTotalReps(
          recommendedSets,
          latestTotalReps + 1,
          nextWeightKg,
          latest.referenceRepsList,
          medianReps
        );
        stretchReason = "Valgfritt hvis oppvarmingen og første arbeidssett føles lett.";
      }
      reason =
        "Trendene er ikke tydelige nok for et hardt hopp. Gjenta samme belastning og la kvaliteten avgjøre om du tar stretch-målet.";
    }
  } else {
    if (decreasingTrendDetected) {
      status = "decrease";
      mode = "reps";
      targetTotalReps = Math.max(
        recommendedSets * MIN_REPS,
        Math.min(latestTotalReps, medianTotalReps) - Math.max(1, Math.ceil(recommendedSets / 2))
      );
      reason =
        "Repnivået har vært lavere gjennom minst tre økter på rad. Gå litt ned og bygg stabilitet igjen.";
    } else if (plateauDetected) {
      status = "plateau";
      mode = "reps";
      targetTotalReps = latestTotalReps;
      if (confidence !== "low" && latestTotalReps < recommendedSets * MAX_REPS) {
        stretchPlan = buildPlanFromTotalReps(
          recommendedSets,
          latestTotalReps + 1,
          null,
          latest.referenceRepsList,
          medianReps
        );
        stretchReason = "Valgfritt hvis hovedmålet er kontrollert.";
      }
      reason =
        "Repnivået har ligget flatt. Hold hovedmålet realistisk og bruk bare en ekstra rep hvis det er god kontroll.";
    } else if (increasingTrendDetected) {
      status = "increase";
      mode = "reps";
      targetTotalReps = Math.min(
        recommendedSets * MAX_REPS,
        latestTotalReps + 1
      );
      if (confidence !== "low" && targetTotalReps < recommendedSets * MAX_REPS) {
        stretchPlan = buildPlanFromTotalReps(
          recommendedSets,
          targetTotalReps + 1,
          null,
          latest.referenceRepsList,
          medianReps
        );
        stretchReason = "Kun hvis hovedmålet føles klart og kontrollert.";
      }
      reason =
        "Du har hatt en stigende trend. Neste naturlige steg er én rep mer totalt, ikke et større hopp.";
    } else {
      status = "hold";
      mode = "reps";
      targetTotalReps = latestTotalReps;
      if (
        confidence !== "low" &&
        latestTotalReps >= getStrongThreshold(medianTotalReps) &&
        latestTotalReps < recommendedSets * MAX_REPS
      ) {
        stretchPlan = buildPlanFromTotalReps(
          recommendedSets,
          latestTotalReps + 1,
          null,
          latest.referenceRepsList,
          medianReps
        );
        stretchReason = "Valgfritt hvis du har god margin.";
      }
      reason =
        "Trendene er ikke tydelige nok ennå. Gjenta samme nivå og bruk stretch-målet bare hvis dagsformen er god.";
    }

    nextWeightKg = null;
  }

  const plan = buildPlanFromTotalReps(
    recommendedSets,
    targetTotalReps,
    nextWeightKg,
    latest.referenceRepsList,
    medianReps
  );
  const recommendedReps = getPlanMedianReps(plan);
  const recommendedTotalReps = sumPlanReps(plan);
  const copy = buildStatusCopy(status, mode, daysSinceLastSession);
  const recommendation: WorkoutCoachRecommendation = {
    status,
    mode,
    statusLabel: copy.statusLabel,
    headline: copy.headline,
    summary:
      status === "increase"
        ? mode === "load"
          ? "Neste steg ser ut til å være en liten vektøkning."
          : "Neste steg ser ut til å være litt flere reps."
        : status === "decrease"
        ? mode === "load"
          ? "Coachen vil ha en liten justering ned for å sikre flyt."
          : "Coachen vil ha litt mindre reps for å bygge opp igjen."
        : status === "plateau"
        ? "Målet er å bryte stagnasjonen uten å miste momentum."
        : status === "reentry"
        ? "Bygg deg rolig tilbake etter pausen."
        : "En ny kontrollert økt på samme oppsett er det sterkeste signalet akkurat nå.",
    reason,
    plan,
    recommendedSets,
    recommendedReps,
    recommendedTotalReps,
    recommendedWeightKg: nextWeightKg,
    stretchPlan,
    stretchSummary: stretchPlan ? formatPlanSummary(stretchPlan) : null,
    stretchReason,
    stepKg,
    lastPerformedAtUtc: latest.performedAtUtc,
    daysSinceLastSession,
    plateauDetected,
    lastSessionSummary,
    lastSessionSetLabel: lastSessionSummaryParts.setLabel,
    lastSessionDetailLabel: lastSessionSummaryParts.detailLabel,
    historySampleSize: normalized.length,
    confidence,
    confidenceLabel,
    dataSummary,
  };

  return recommendation;
}
export function buildWorkoutCoachProgress(
  exercise: SessionExercise,
  recommendation: WorkoutCoachRecommendation
): WorkoutCoachProgress {
  const completedSets = exercise.sets.filter(
    (set) => set.completed && Number.isFinite(set.reps) && (set.reps ?? 0) > 0
  );
  const completedReps = completedSets.reduce(
    (sum, set) => sum + Number(set.reps ?? 0),
    0
  );

  return {
    completedSets: completedSets.length,
    targetSets: recommendation.recommendedSets,
    completedReps,
    targetReps: recommendation.recommendedTotalReps,
  };
}

