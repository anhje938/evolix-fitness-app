import type { ExerciseSessionSetsDto } from "@/api/exercise/exerchiseHistory";
import type { SessionExercise } from "@/types/exercise";

const MAX_RECENT_SESSIONS = 6;
const TARGET_WINDOW = 3;
const PLATEAU_WINDOW = 5;
const REENTRY_DAYS = 21;
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
  recommendedWeightKg: number | null;
  stepKg: number | null;
  lastPerformedAtUtc: string;
  daysSinceLastSession: number;
  plateauDetected: boolean;
  lastSessionSummary: string;
  lastSessionSetLabel: string;
  lastSessionDetailLabel: string;
  historySampleSize: number;
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

function buildSummaryParts(
  setCount: number,
  reps: number,
  weightKg: number | null,
  options?: {
    useAtLeastLabel?: boolean;
  }
) {
  const setLabel =
    options?.useAtLeastLabel && setCount === 1
      ? "minst 1 sett"
      : `${setCount} sett`;
  const compactLoad = formatCompactLoad(weightKg);

  return {
    setLabel,
    detailLabel: compactLoad ? `${reps} reps x ${compactLoad}` : `${reps} reps`,
  };
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
  const sets = (session.sets ?? []).filter(
    (set) => Number.isFinite(set.reps) && (set.reps ?? 0) > 0
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
    referenceTotalReps,
  };
}

function getRepScore(session: NormalizedSession, weighted: boolean) {
  return session.referenceTotalReps;
}

function buildSessionSummary(session: NormalizedSession, weighted: boolean) {
  const parts = buildSummaryParts(
    session.referenceSetCount,
    session.referenceReps,
    weighted ? session.workingWeightKg ?? session.topWeightKg : null
  );

  return `${parts.setLabel} -> ${parts.detailLabel}`;
}

function buildPlan(
  setCount: number,
  reps: number,
  weightKg: number | null
): WorkoutCoachSetPlan[] {
  return Array.from({ length: setCount }, () => ({
    reps,
    weightKg,
  }));
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

    return (
      currentLoad <
      previousLoad - Math.max((stepKg ?? 1) * 0.35, 0.25)
    );
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
  _targetTotalReps: number
) {
  const window = sessions.slice(0, PLATEAU_WINDOW);
  if (window.length < PLATEAU_WINDOW) return false;

  if (weighted) {
    const loads = window.map(getSessionLoad);
    if (loads.some((load) => load == null)) return false;

    const numericLoads = loads as number[];
    const bestLoad = Math.max(...numericLoads);
    const allowedDip =
      stepKg != null ? Math.max(stepKg, bestLoad * 0.03) : Math.max(1, bestLoad * 0.03);

    return (
      !hasRecentDecreaseTrend(window, weighted, stepKg) &&
      numericLoads.every(
        (load) => load <= bestLoad + 0.01 && load >= bestLoad - allowedDip
      )
    );
  }

  const repScores = window.map((session) => getRepScore(session, weighted));
  const bestScore = Math.max(...repScores);

  return (
    !hasRecentDecreaseTrend(window, weighted, stepKg) &&
    repScores.every((score) => score >= bestScore - 1)
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
  const parts = buildSummaryParts(
    recommendation.recommendedSets,
    recommendation.recommendedReps,
    recommendation.recommendedWeightKg,
    { useAtLeastLabel: true }
  );

  return `${parts.setLabel} -> ${parts.detailLabel}`;
}

export function getWorkoutCoachPlanSummaryParts(
  recommendation: WorkoutCoachRecommendation
) {
  return buildSummaryParts(
    recommendation.recommendedSets,
    recommendation.recommendedReps,
    recommendation.recommendedWeightKg,
    { useAtLeastLabel: true }
  );
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
  const recommendedSets = clamp(
    Math.round(median(targetPool.map((session) => session.referenceSetCount))),
    MIN_SETS,
    MAX_SETS
  );
  const recommendedReps = clamp(
    Math.round(median(targetPool.map((session) => session.referenceReps))),
    MIN_REPS,
    MAX_REPS
  );
  const targetTotalReps = recommendedSets * recommendedReps;
  const latestLoad = getSessionLoad(latest);
  const stepKg =
    weighted && latestLoad != null ? getLoadStepKg(latestLoad) : null;
  const daysSinceLastSession = getDaysSince(latest.performedAtUtc);
  const plateauDetected = detectPlateau(
    normalized,
    weighted,
    stepKg,
    targetTotalReps
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
  const lastSessionSummary = buildSessionSummary(latest, weighted);
  const lastSessionSummaryParts = buildSummaryParts(
    latest.referenceSetCount,
    latest.referenceReps,
    weighted ? getSessionLoad(latest) : null
  );

  let mode: WorkoutCoachMode = weighted ? "load" : "reps";
  let status: WorkoutCoachStatus = "hold";
  let nextWeightKg = latestLoad;
  let nextReps = recommendedReps;
  let reason = "";

  if (daysSinceLastSession >= REENTRY_DAYS) {
    status = "reentry";
    nextWeightKg =
      weighted && latestLoad != null && stepKg != null
        ? roundToStep(Math.max(latestLoad * 0.92, stepKg), stepKg)
        : null;
    nextReps = weighted
      ? recommendedReps
      : clamp(recommendedReps - 1, MIN_REPS, MAX_REPS);
    reason =
      "Det har gått en stund siden sist. Start litt lettere og bygg rytmen opp igjen.";
  } else if (weighted) {
    const shouldIncreaseLoad = normalized.length >= 4 && latestLoad != null;
    const loadProgressPercent = getLoadProgressPercent(normalized.length);

    if (decreasingTrendDetected && latestLoad != null) {
      status = "decrease";
      mode = "load";
      nextWeightKg = getDecreasedLoad(latestLoad, normalized.length, stepKg);
      reason =
        "Vekten har vært lavere gjennom minst tre økter på rad. Ta et tydelig steg ned og bygg opp igjen med ren utførelse.";
    } else if (plateauDetected) {
      status = "plateau";
      mode = "load";
      nextWeightKg = latestLoad;
      reason =
        "Belastningen har vært lik eller litt lavere gjennom de siste fem øktene. Det er et tydelig plateau akkurat nå.";
    } else if (increasingTrendDetected) {
      status = "increase";

      if (shouldIncreaseLoad && latestLoad != null) {
        mode = "load";
        nextWeightKg = getIncreasedLoad(latestLoad, normalized.length, stepKg);
        reason = `Du har hatt en stigende trend de siste to øktene. Neste steg er en kontrollert vektøkning på omtrent ${formatNumber(loadProgressPercent * 100)} %.`;
      } else {
        mode = "reps";
        nextWeightKg = latestLoad;
        nextReps = clamp(recommendedReps + 1, MIN_REPS, MAX_REPS);
        reason =
          "Du har hatt en stigende trend de siste to øktene. Prioriter én ekstra rep før du øker vekten.";
      }
    } else {
      status = "hold";
      mode = "load";
      nextWeightKg = latestLoad;
      reason =
        "Trendene er ikke tydelige nok ennå. Hold deg på samme belastning til du har et klarere signal.";
    }
  } else {
    if (decreasingTrendDetected) {
      status = "decrease";
      mode = "reps";
      nextReps = clamp(recommendedReps - 1, MIN_REPS, MAX_REPS);
      reason =
        "Repnivået har vært lavere gjennom minst tre økter på rad. Gå litt ned og bygg stabilitet igjen.";
    } else if (plateauDetected) {
      status = "plateau";
      mode = "reps";
      nextReps = recommendedReps;
      reason =
        "Repnivået har ligget flatt eller litt lavere gjennom de siste fem øktene. Det ser ut som et plateau akkurat nå.";
    } else if (increasingTrendDetected) {
      status = "increase";
      mode = "reps";
      nextReps = clamp(recommendedReps + 1, MIN_REPS, MAX_REPS);
      reason =
        "Du har hatt en stigende trend de siste to øktene. Neste naturlige steg er å legge på én rep.";
    } else {
      status = "hold";
      mode = "reps";
      reason =
        "Trendene er ikke tydelige nok ennå. Hold deg på samme reps til du får et klarere signal.";
    }

    nextWeightKg = null;
  }

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
    plan: buildPlan(recommendedSets, nextReps, nextWeightKg),
    recommendedSets,
    recommendedReps: nextReps,
    recommendedWeightKg: nextWeightKg,
    stepKg,
    lastPerformedAtUtc: latest.performedAtUtc,
    daysSinceLastSession,
    plateauDetected,
    lastSessionSummary,
    lastSessionSetLabel: lastSessionSummaryParts.setLabel,
    lastSessionDetailLabel: lastSessionSummaryParts.detailLabel,
    historySampleSize: normalized.length,
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
    targetReps:
      recommendation.recommendedSets * recommendation.recommendedReps,
  };
}

