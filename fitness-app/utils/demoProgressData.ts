import type {
  ExerciseHistoryPointDto,
  ExerciseSessionSetItemDto,
  ExerciseSessionSetsDto,
} from "@/api/exercise/exerchiseHistory";
import type { Exercise } from "@/types/exercise";
import type { Weight } from "@/types/weight";
import { estimate1RMFromTopSet } from "@/utils/exercise/oneRepMax";

// Set this to false to instantly go back to the live system only.
export const ENABLE_DEMO_PROGRESS_DATA = true;

export const DEMO_BENCH_EXERCISE_ID = "__demo_bench_press__";

const DEMO_WEIGHT_DAYS = 60;
const DEMO_WEIGHT_START_KG = 70.4;
const DEMO_WEIGHT_END_KG = 89.6;
const DAY_MS = 24 * 60 * 60 * 1000;
const BENCH_NAME_RE = /\b(bench|benk|benkpress)\b/i;

function roundToDecimals(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

function clamp(value: number, minValue: number, maxValue: number) {
  return Math.max(minValue, Math.min(maxValue, value));
}

function toIsoDaysAgo(daysAgo: number, hourUtc: number, minuteUtc: number) {
  const date = new Date();
  date.setTime(date.getTime() - daysAgo * DAY_MS);
  date.setUTCHours(hourUtc, minuteUtc, 0, 0);
  return date.toISOString();
}

function sortWeightsByTimestampDesc(list: Weight[]) {
  return [...list].sort(
    (a, b) =>
      new Date(b.timestampUtc).getTime() - new Date(a.timestampUtc).getTime()
  );
}

function getLatestWeightKg(list: Weight[]) {
  const latest = sortWeightsByTimestampDesc(list)[0];
  return latest?.weightKg ?? null;
}

function getSessionTopSetWeightKg(session: ExerciseSessionSetsDto) {
  let topWeightKg: number | null = null;

  for (const set of session.sets ?? []) {
    if (set.weightKg == null || !Number.isFinite(set.weightKg)) continue;
    if (topWeightKg == null || set.weightKg > topWeightKg) {
      topWeightKg = set.weightKg;
    }
  }

  return topWeightKg;
}

function getDemoBenchBaselineKg(history: ExerciseSessionSetsDto[]) {
  const recentTopWeights = [...history]
    .sort(
      (a, b) =>
        new Date(b.performedAtUtc).getTime() -
        new Date(a.performedAtUtc).getTime()
    )
    .slice(0, 4)
    .map(getSessionTopSetWeightKg)
    .filter((value): value is number => value != null && Number.isFinite(value));

  if (recentTopWeights.length === 0) return null;

  const average =
    recentTopWeights.reduce((sum, value) => sum + value, 0) /
    recentTopWeights.length;

  return roundToStep(average, 2.5);
}

function scoreSet(set: ExerciseSessionSetItemDto) {
  return estimate1RMFromTopSet(
    set.weightKg,
    set.reps,
    { roundTo: 1, conservative: true, allowHighRep: true },
    "ensemble"
  ).oneRm;
}

function pickBestSet(sets: ExerciseSessionSetItemDto[]) {
  let best: ExerciseSessionSetItemDto | null = null;
  let bestScore = 0;

  for (const set of sets) {
    const score = scoreSet(set);
    if (score > bestScore) {
      best = set;
      bestScore = score;
      continue;
    }

    if (
      score === bestScore &&
      (set.weightKg ?? 0) > (best?.weightKg ?? 0)
    ) {
      best = set;
    }
  }

  return best;
}

export function createDemoBenchExercise(): Exercise {
  return {
    id: DEMO_BENCH_EXERCISE_ID,
    name: "Benkpress (demo)",
    description: "Midlertidig 60-dagers demo for progresjon",
    muscle: "Bryst",
    specificMuscleGroups: ["Bryst", "Triceps", "Forside skulder"],
    equipment: "Stang",
    userId: "demo-user",
  };
}

export function shouldUseDemoBenchData(
  exercise: Pick<Exercise, "id" | "name"> | null | undefined
) {
  if (!ENABLE_DEMO_PROGRESS_DATA || !exercise) return false;
  if (exercise.id === DEMO_BENCH_EXERCISE_ID) return true;
  return BENCH_NAME_RE.test(exercise.name);
}

export function mergeExercisesWithDemo(exercises: Exercise[]) {
  if (!ENABLE_DEMO_PROGRESS_DATA) return exercises;
  if (exercises.some((exercise) => exercise.id === DEMO_BENCH_EXERCISE_ID)) {
    return exercises;
  }
  return [createDemoBenchExercise(), ...exercises];
}

export function mergeWeightEntriesWithDemo(realWeights: Weight[]) {
  if (!ENABLE_DEMO_PROGRESS_DATA) {
    return sortWeightsByTimestampDesc(realWeights);
  }

  const latestWeightKg = getLatestWeightKg(realWeights) ?? 82.4;
  const includeToday = realWeights.length === 0;
  const demoWeights = buildDemoWeightEntries(latestWeightKg, includeToday);

  return sortWeightsByTimestampDesc([...realWeights, ...demoWeights]);
}

export function buildExerciseHistoryFromSessions(
  sessions: ExerciseSessionSetsDto[]
): ExerciseHistoryPointDto[] {
  return [...sessions]
    .sort(
      (a, b) =>
        new Date(a.performedAtUtc).getTime() -
        new Date(b.performedAtUtc).getTime()
    )
    .map((session) => {
      const bestSet = pickBestSet(session.sets ?? []);
      const totalVolumeKg =
        session.totalVolumeKg ??
        roundToDecimals(
          (session.sets ?? []).reduce((sum, set) => {
            const weightKg = Number(set.weightKg ?? 0);
            const reps = Number(set.reps ?? 0);
            return sum + weightKg * reps;
          }, 0),
          1
        );

      return {
        exerciseId: session.exerciseId,
        performedAtUtc: session.performedAtUtc,
        topSetWeightKg: bestSet?.weightKg ?? null,
        topSetReps: bestSet?.reps ?? null,
        totalSets: session.totalSets ?? session.sets.length,
        totalVolumeKg,
      };
    });
}

export function mergeExerciseSetsHistoryWithDemo(
  realHistory: ExerciseSessionSetsDto[],
  exercise: Pick<Exercise, "id" | "name"> | null | undefined
) {
  if (!shouldUseDemoBenchData(exercise)) return realHistory;

  const baselineTopSetKg = getDemoBenchBaselineKg(realHistory);
  const demoHistory = buildDemoBenchSessions({
    exerciseId: exercise?.id ?? DEMO_BENCH_EXERCISE_ID,
    baselineTopSetKg,
  });

  return [...realHistory, ...demoHistory].sort(
    (a, b) =>
      new Date(b.performedAtUtc).getTime() -
      new Date(a.performedAtUtc).getTime()
  );
}

function buildDemoWeightEntries(_latestWeightKg: number, includeToday: boolean) {
  const offsets = Array.from({ length: DEMO_WEIGHT_DAYS }, (_, index) =>
    includeToday ? DEMO_WEIGHT_DAYS - 1 - index : DEMO_WEIGHT_DAYS - index
  );

  return offsets.map((daysAgo, index) => {
    const progress = index / Math.max(1, DEMO_WEIGHT_DAYS - 1);
    const trendWeightKg =
      DEMO_WEIGHT_START_KG +
      (DEMO_WEIGHT_END_KG - DEMO_WEIGHT_START_KG) * progress;
    const weeklyWave = Math.sin(index / 3.2) * 0.35;
    const slowerWave = Math.cos(index / 7.4) * 0.18;
    const waterDrop =
      index % 9 === 2 ? -0.45 : index % 9 === 3 ? -0.18 : 0;
    const heavierDay =
      index % 11 === 0 ? 0.5 : index % 11 === 1 ? 0.22 : 0;
    const midBlockSurge = index >= 24 && index <= 38 ? 0.4 : 0;
    const valueKg = roundToDecimals(
      clamp(
        trendWeightKg +
          weeklyWave +
          slowerWave +
          waterDrop +
          heavierDay +
          midBlockSurge,
        70,
        90
      ),
      1
    );

    return {
      id: `demo-weight-${daysAgo}-${index}`,
      weightKg: valueKg,
      timestampUtc: toIsoDaysAgo(daysAgo, 6 + (index % 3), (index % 4) * 10),
    };
  });
}

function buildDemoBenchSessions({
  exerciseId,
  baselineTopSetKg,
}: {
  exerciseId: string;
  baselineTopSetKg: number | null;
}) {
  const sessionDaysAgo = [
    59, 56, 53, 50, 47, 44, 41, 38, 35, 32, 29,
    26, 23, 20, 17, 14, 11, 8, 5, 3, 1,
  ];
  const repPattern = [
    8, 8, 7, 7, 6, 8, 7, 6, 6, 5, 8,
    6, 5, 5, 4, 6, 5, 4, 4, 3, 5,
  ];
  const sessionCount = sessionDaysAgo.length;
  const targetTopSetKg = clamp(
    roundToStep((baselineTopSetKg ?? 87.5) + 2.5, 2.5),
    55,
    130
  );
  const startTopSetKg = Math.max(40, roundToStep(targetTopSetKg - 15, 2.5));
  const rangeKg = targetTopSetKg - startTopSetKg;

  return sessionDaysAgo.map((daysAgo, index) => {
    const progress = index / Math.max(1, sessionCount - 1);
    const fatigueWave = Math.sin(index / 2.7) * 0.9;
    const deloadOffset = index === 10 ? -2.5 : index === 15 ? -1.25 : 0;
    const topWeightKg = clamp(
      roundToStep(startTopSetKg + rangeKg * progress + fatigueWave + deloadOffset, 2.5),
      40,
      160
    );
    const topReps = repPattern[index];

    const setPlan = [
      { weightKg: topWeightKg, reps: topReps },
      {
        weightKg: Math.max(40, roundToStep(topWeightKg - 5, 2.5)),
        reps: Math.min(topReps + 1, 9),
      },
      {
        weightKg: Math.max(40, roundToStep(topWeightKg - 7.5, 2.5)),
        reps: Math.min(topReps + 2, 10),
      },
      {
        weightKg: Math.max(40, roundToStep(topWeightKg - 10, 2.5)),
        reps: Math.min(topReps + 3, 12),
      },
    ];

    if (index % 3 === 0 || index % 5 === 0) {
      setPlan.push({
        weightKg: Math.max(40, roundToStep(topWeightKg - 12.5, 2.5)),
        reps: Math.min(topReps + 4, 12),
      });
    }

    const sets = setPlan.map<ExerciseSessionSetItemDto>((set, setIndex) => ({
      setId: `demo-set-${index + 1}-${setIndex + 1}`,
      workoutExerciseLogId: `demo-log-${index + 1}`,
      setNumber: setIndex + 1,
      weightKg: set.weightKg,
      reps: set.reps,
      rir: setIndex === 0 ? 1 : Math.min(3, 1 + setIndex),
      setType: setIndex === 0 ? "top" : "backoff",
      notes: null,
    }));

    const totalReps = sets.reduce((sum, set) => sum + (set.reps ?? 0), 0);
    const totalVolumeKg = roundToDecimals(
      sets.reduce(
        (sum, set) => sum + (set.weightKg ?? 0) * (set.reps ?? 0),
        0
      ),
      1
    );

    return {
      sessionId: `demo-bench-session-${index + 1}`,
      exerciseId,
      performedAtUtc: toIsoDaysAgo(
        daysAgo,
        16 + (index % 3),
        index % 2 === 0 ? 20 : 45
      ),
      sets,
      totalSets: sets.length,
      totalReps,
      totalVolumeKg,
    };
  });
}
