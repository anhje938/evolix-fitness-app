import type { SessionDetailsDto } from "@/api/exercise/sessionDetails";
import { getSessionDetails } from "@/api/exercise/sessionDetails";
import type { Exercise } from "@/types/exercise";
import type {
  CompletedExerciseForRecovery,
  CompletedWorkoutForRecovery,
} from "@/types/recovery";
import { estimate1RMFromTopSet } from "@/utils/exercise/oneRepMax";
import { calculateRecovery } from "@/utils/recovery/calculateRecovery";
import { toBodyHighlighterData } from "@/utils/recovery/toBodyHighlighterData";
import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

type AnySession = any;

const MAX_SESSION_DETAILS = 32;
const BODYWEIGHT_PROXY_KG = 35;

function safeArray<T>(x: any): T[] {
  return Array.isArray(x) ? (x as T[]) : [];
}

function firstArray<T>(...candidates: any[]): T[] {
  for (const c of candidates) {
    if (Array.isArray(c)) return c as T[];
  }
  return [];
}

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function numberOrZero(x: any) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function groupsFromFallbackMuscle(muscle: string | null | undefined): string[] {
  switch ((muscle ?? "").trim()) {
    case "Bryst":
      return ["Bryst", "Fremre skulder", "Triceps"];
    case "Rygg":
      return ["Øvre rygg", "Lats", "Biceps"];
    case "Bein":
      return ["Quadriceps", "Hamstrings", "Rumpe"];
    case "Skuldre":
      return ["Fremre skulder", "Sideskulder", "Bakre skulder"];
    case "Armer":
      return ["Biceps", "Triceps", "Brachialis", "Brachioradialis"];
    case "Core":
      return ["Abs", "Obliques"];
    default:
      return [];
  }
}

function estimateVolumeFromSets(sets: any[]): number {
  let volume = 0;
  let repsOnly = 0;

  for (const set of sets) {
    const w = numberOrZero(set.weightKg ?? set.weight);
    const r = numberOrZero(set.reps);

    if (w > 0 && r > 0) volume += w * r;
    else if (r > 0) repsOnly += r;
  }

  if (volume > 0) return volume;
  if (repsOnly > 0) return repsOnly * BODYWEIGHT_PROXY_KG;
  return 0;
}

function sortSessionsNewestFirst(sessions: AnySession[]) {
  return [...safeArray<AnySession>(sessions)].sort((a, b) => {
    const at =
      Date.parse(
        a.finishedAtUtc ??
          a.completedAtUtc ??
          a.performedAtUtc ??
          a.startedAtUtc ??
          ""
      ) || 0;
    const bt =
      Date.parse(
        b.finishedAtUtc ??
          b.completedAtUtc ??
          b.performedAtUtc ??
          b.startedAtUtc ??
          ""
      ) || 0;
    return bt - at;
  });
}

function toCompletedWorkouts(
  sessions: AnySession[],
  exercises: Exercise[],
  detailsBySessionId: Record<string, SessionDetailsDto>
): CompletedWorkoutForRecovery[] {
  const exerciseById = new Map<string, Exercise>();
  for (const ex of safeArray<Exercise>(exercises)) exerciseById.set(ex.id, ex);

  return safeArray<AnySession>(sessions).map((s) => {
    const completedAtUtc =
      s.completedAtUtc ??
      s.performedAtUtc ??
      s.finishedAtUtc ??
      s.finishedAt ??
      s.performedAt ??
      s.startedAtUtc ??
      new Date().toISOString();

    const details = s.id ? detailsBySessionId[s.id] : undefined;
    const logs = details
      ? safeArray<any>(details.exerciseLogs)
      : firstArray<any>(s.exerciseLogs, s.exercises, s.exerciseLogItems);

    let exercisesForRecovery: CompletedExerciseForRecovery[] = logs.map(
      (l: any) => {
        const exerciseId = l.exerciseId ?? l.id ?? "";
        const ex = exerciseById.get(exerciseId);
        const sets = safeArray<any>(l.sets);

        const groups = safeArray<string>(ex?.specificMuscleGroups);
        const fallbackGroups = groupsFromFallbackMuscle(l.muscle ?? ex?.muscle);
        const primaryMuscles = (groups.length ? groups : fallbackGroups) as any[];
        const secondaryMuscles: any[] = [];

        const volume = numberOrZero(l.volume) || estimateVolumeFromSets(sets);
        const setsCount = sets.length;

        let topSetWeightKg = 0;
        let topSetReps = 0;
        let bestSet1RmKg = 0;
        for (const st of sets) {
          const w = numberOrZero(st.weightKg ?? st.weight);
          const r = numberOrZero(st.reps);
          if (w > topSetWeightKg || (w === topSetWeightKg && r > topSetReps)) {
            topSetWeightKg = w;
            topSetReps = r;
          }

          const e1rm = estimate1RMFromTopSet(
            w,
            r,
            { roundTo: 0, conservative: false, allowHighRep: true },
            "ensemble"
          ).oneRm;
          if (e1rm > bestSet1RmKg) bestSet1RmKg = e1rm;
        }

        return {
          exerciseId,
          volume,
          setsCount,
          topSetWeightKg,
          topSetReps,
          bestSet1RmKg,
          primaryMuscles,
          secondaryMuscles,
        };
      }
    );

    const hasAnyMuscleMapping = exercisesForRecovery.some(
      (x) => (x.primaryMuscles?.length ?? 0) > 0
    );

    if (!hasAnyMuscleMapping) {
      const groups = safeArray<string>(s.muscleGroups ?? s.MuscleGroups);
      const totalVolume = numberOrZero(s.totalVolumeKg ?? s.totalVolume);
      const perGroupVolume = groups.length ? totalVolume / groups.length : 0;

      exercisesForRecovery = groups.map((g) => ({
        exerciseId: `summary:${g}`,
        volume: perGroupVolume,
        setsCount: numberOrZero(s.setsCount ?? s.totalSets),
        primaryMuscles: [g] as any[],
        secondaryMuscles: [],
      }));
    }

    return {
      id: s.id ?? `${completedAtUtc}`,
      completedAtUtc,
      exercises: exercisesForRecovery.filter((x) => (x.primaryMuscles?.length ?? 0) > 0),
    };
  });
}

function withPrContext(
  workouts: CompletedWorkoutForRecovery[]
): CompletedWorkoutForRecovery[] {
  const bestByExerciseId = new Map<string, number>();

  for (const w of workouts) {
    for (const ex of w.exercises ?? []) {
      if (!ex.exerciseId || ex.exerciseId.startsWith("summary:")) continue;
      const bestSet = numberOrZero(ex.bestSet1RmKg);
      if (bestSet <= 0) continue;

      const prev = bestByExerciseId.get(ex.exerciseId) ?? 0;
      if (bestSet > prev) bestByExerciseId.set(ex.exerciseId, bestSet);
    }
  }

  return workouts.map((w) => ({
    ...w,
    exercises: (w.exercises ?? []).map((ex) => {
      const bestKnown = bestByExerciseId.get(ex.exerciseId ?? "") ?? 0;
      const thisBest = numberOrZero(ex.bestSet1RmKg);
      const topWeight = numberOrZero(ex.topSetWeightKg);

      const prProximity01 =
        bestKnown > 0 && thisBest > 0 ? clamp01(thisBest / bestKnown) : undefined;
      const relativeLoad01 =
        bestKnown > 0 && topWeight > 0
          ? clamp01(topWeight / bestKnown)
          : prProximity01;

      return {
        ...ex,
        prProximity01,
        relativeLoad01,
      };
    }),
  }));
}

export function useRecoveryMap(args: { sessions: AnySession[]; exercises: Exercise[] }) {
  const { sessions, exercises } = args;

  const detailTargetSessions = useMemo(() => {
    return sortSessionsNewestFirst(sessions)
      .filter((s) => !!s?.id)
      .slice(0, MAX_SESSION_DETAILS);
  }, [sessions]);

  const detailQueries = useQueries({
    queries: detailTargetSessions.map((s) => ({
      queryKey: ["sessionDetails", s.id],
      queryFn: () => getSessionDetails(s.id),
      enabled: !!s.id,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const detailsBySessionId = useMemo(() => {
    const out: Record<string, SessionDetailsDto> = {};
    for (let i = 0; i < detailTargetSessions.length; i++) {
      const id = detailTargetSessions[i]?.id;
      const data = detailQueries[i]?.data;
      if (id && data) out[id] = data;
    }
    return out;
  }, [detailQueries, detailTargetSessions]);

  const recoveryMap = useMemo(() => {
    const workouts = toCompletedWorkouts(sessions, exercises, detailsBySessionId);
    return calculateRecovery(withPrContext(workouts));
  }, [sessions, exercises, detailsBySessionId]);

  const bodyData = useMemo(() => toBodyHighlighterData(recoveryMap), [recoveryMap]);

  const isLoadingDetails = detailQueries.some((q) => q.isLoading);

  return { recoveryMap, bodyData, isLoadingDetails };
}
