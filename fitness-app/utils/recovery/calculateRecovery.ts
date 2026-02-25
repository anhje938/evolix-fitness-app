import type { AdvancedMuscleFilterValue } from "@/types/muscles";
import type {
  CompletedExerciseForRecovery,
  CompletedWorkoutForRecovery,
  RecoveryMap,
} from "@/types/recovery";

const DEFAULT_RECOVERY_HOURS = 48;
const MAX_RECOVERY_HOURS = 96;
const SECONDARY_WEIGHT = 0.5;
const VOLUME_NORM_KG = 4500;
const SETS_NORM = 8;
const MIN_RELATIVE_LOAD = 0.55;

const ALL_ADVANCED_MUSCLES: AdvancedMuscleFilterValue[] = [
  "ALL",
  "Bryst",
  "Fremre skulder",
  "Sideskulder",
  "Bakre skulder",
  "Øvre rygg",
  "Nedre rygg",
  "Lats",
  "Traps",
  "Biceps",
  "Triceps",
  "Brachialis",
  "Brachioradialis",
  "Underarm",
  "Abs",
  "Obliques",
  "Quadriceps",
  "Hamstrings",
  "Rumpe",
  "Innside lår",
  "Utside lår",
  "Bakside legg",
  "Framside legg",
];

const BASE_RECOVERY_HOURS: Partial<Record<AdvancedMuscleFilterValue, number>> = {
  ALL: DEFAULT_RECOVERY_HOURS,
  Bryst: 48,
  "Fremre skulder": 60,
  Sideskulder: 60,
  "Bakre skulder": 60,
  "Øvre rygg": 72,
  "Nedre rygg": 96,
  Lats: 72,
  Traps: 72,
  Biceps: 60,
  Triceps: 60,
  Brachialis: 60,
  Brachioradialis: 60,
  Underarm: 48,
  Abs: 48,
  Obliques: 48,
  Quadriceps: 96,
  Hamstrings: 96,
  Rumpe: 96,
  "Innside lår": 72,
  "Utside lår": 72,
  "Bakside legg": 72,
  "Framside legg": 48,
};

type FatigueState = Record<AdvancedMuscleFilterValue, number>;
type HoursState = Record<AdvancedMuscleFilterValue, number>;
type LastStimulusState = Record<AdvancedMuscleFilterValue, string | null>;

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function nonNegative(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, x);
}

function hoursSince(now: Date, eventUtc: string): number {
  const t = new Date(eventUtc).getTime();
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY;
  return nonNegative((now.getTime() - t) / (1000 * 60 * 60));
}

function makeEmptyFatigue(): FatigueState {
  const out = {} as FatigueState;
  for (const m of ALL_ADVANCED_MUSCLES) out[m] = 0;
  return out;
}

function makeEmptyHours(): HoursState {
  const out = {} as HoursState;
  for (const m of ALL_ADVANCED_MUSCLES) out[m] = BASE_RECOVERY_HOURS[m] ?? DEFAULT_RECOVERY_HOURS;
  return out;
}

function makeEmptyLastStimulus(): LastStimulusState {
  const out = {} as LastStimulusState;
  for (const m of ALL_ADVANCED_MUSCLES) out[m] = null;
  return out;
}

function volumeScore(volume: number) {
  return clamp01(nonNegative(volume) / VOLUME_NORM_KG);
}

function setsScore(setsCount: number | undefined) {
  return clamp01(nonNegative(Number(setsCount ?? 0)) / SETS_NORM);
}

function relativeLoadScore(relativeLoad01: number | undefined) {
  const raw = clamp01(Number(relativeLoad01 ?? 0));
  if (raw <= MIN_RELATIVE_LOAD) return 0;
  return clamp01((raw - MIN_RELATIVE_LOAD) / (1 - MIN_RELATIVE_LOAD));
}

function prScore(prProximity01: number | undefined) {
  return clamp01(Number(prProximity01 ?? 0));
}

function effortScore(ex: CompletedExerciseForRecovery) {
  const explicit = ex.effortScore01;
  if (Number.isFinite(explicit as number)) return clamp01(Number(explicit));

  const rel = relativeLoadScore(ex.relativeLoad01);
  const pr = prScore(ex.prProximity01);
  return clamp01(0.6 * rel + 0.4 * pr);
}

function stressFromExercise(ex: CompletedExerciseForRecovery) {
  const v = volumeScore(ex.volume);
  const s = setsScore(ex.setsCount);
  const e = effortScore(ex);
  return clamp01(0.5 * v + 0.2 * s + 0.3 * e);
}

function dynamicRecoveryHours(baseHours: number, ex: CompletedExerciseForRecovery) {
  const stress = stressFromExercise(ex);
  const pr = prScore(ex.prProximity01);

  let multiplier = 1 + 0.45 * stress + 0.55 * Math.pow(pr, 3);
  if (stress >= 0.85) multiplier += 0.12;
  if (pr >= 0.97) multiplier += 0.2;

  multiplier = Math.max(0.8, Math.min(2.4, multiplier));
  return Math.min(MAX_RECOVERY_HOURS, baseHours * multiplier);
}

function fatigueDose(ex: CompletedExerciseForRecovery) {
  const stress = stressFromExercise(ex);
  if (stress <= 0) return 0;

  // Keep low-load sessions visible while limiting absolute maximum.
  return Math.max(0.08, Math.min(0.95, stress));
}

function readRecoveryValue(entry: any): number {
  if (typeof entry === "number") return clamp01(entry);
  if (!entry) return 1;
  const v =
    entry.value01 ??
    entry.recovery ??
    entry.value ??
    entry.percent ??
    entry.pct ??
    1;
  return clamp01(Number(v));
}

function makeRecoveryEntry(
  recovery01: number,
  fatigue01: number,
  readinessHours: number,
  lastStimulusAtUtc: string | null
) {
  const r = clamp01(recovery01);
  const f = clamp01(fatigue01);
  const h = nonNegative(readinessHours);

  return {
    value: r,
    recovery: r,
    value01: r,
    fatigue: f,
    readinessHours: h,
    lastStimulusAtUtc,
  };
}

export function calculateRecovery(
  workouts: CompletedWorkoutForRecovery[],
  now: Date = new Date()
): RecoveryMap {
  const fatigue = makeEmptyFatigue();
  const readinessHours = makeEmptyHours();
  const lastStimulus = makeEmptyLastStimulus();

  const sorted = [...(workouts ?? [])].sort(
    (a, b) => new Date(b.completedAtUtc).getTime() - new Date(a.completedAtUtc).getTime()
  );

  for (const w of sorted) {
    const ageHours = hoursSince(now, w.completedAtUtc);
    if (!Number.isFinite(ageHours)) continue;

    for (const ex of w.exercises ?? []) {
      const dose = fatigueDose(ex);
      if (dose <= 0) continue;

      for (const muscle of ex.primaryMuscles ?? []) {
        if (!muscle || muscle === "ALL") continue;

        const base = BASE_RECOVERY_HOURS[muscle] ?? DEFAULT_RECOVERY_HOURS;
        const dynamicHours = dynamicRecoveryHours(base, ex);
        const decay = Math.max(0, 1 - ageHours / dynamicHours);
        const add = dose * decay;

        fatigue[muscle] = clamp01(fatigue[muscle] + add);
        readinessHours[muscle] = Math.max(readinessHours[muscle], dynamicHours);
        if (!lastStimulus[muscle] || w.completedAtUtc > (lastStimulus[muscle] as string)) {
          lastStimulus[muscle] = w.completedAtUtc;
        }
      }

      for (const muscle of ex.secondaryMuscles ?? []) {
        if (!muscle || muscle === "ALL") continue;

        const base = BASE_RECOVERY_HOURS[muscle] ?? DEFAULT_RECOVERY_HOURS;
        const dynamicHours = dynamicRecoveryHours(base, ex) * SECONDARY_WEIGHT;
        const decay = Math.max(0, 1 - ageHours / dynamicHours);
        const add = dose * decay * SECONDARY_WEIGHT;

        fatigue[muscle] = clamp01(fatigue[muscle] + add);
        readinessHours[muscle] = Math.max(readinessHours[muscle], dynamicHours);
        if (!lastStimulus[muscle] || w.completedAtUtc > (lastStimulus[muscle] as string)) {
          lastStimulus[muscle] = w.completedAtUtc;
        }
      }
    }
  }

  const recovery = {} as RecoveryMap;

  for (const muscle of ALL_ADVANCED_MUSCLES) {
    if (muscle === "ALL") continue;
    const f = clamp01(fatigue[muscle] ?? 0);
    const r = clamp01(1 - f);
    recovery[muscle] = makeRecoveryEntry(
      r,
      f,
      readinessHours[muscle] ?? DEFAULT_RECOVERY_HOURS,
      lastStimulus[muscle] ?? null
    );
  }

  recovery.ALL = makeRecoveryEntry(
    averageRecovery01(recovery),
    1 - averageRecovery01(recovery),
    DEFAULT_RECOVERY_HOURS,
    null
  );

  return recovery;
}

export const computeRecoveryMap = calculateRecovery;

function averageRecovery01(map: RecoveryMap): number {
  let sum = 0;
  let n = 0;

  for (const m of ALL_ADVANCED_MUSCLES) {
    if (m === "ALL") continue;
    sum += readRecoveryValue((map as any)[m]);
    n++;
  }

  return n ? clamp01(sum / n) : 1;
}
