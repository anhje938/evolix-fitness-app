// oneRm.ts
import type { ExerciseHistoryPointDto } from "@/api/exercise/exerchiseHistory";

export type OneRmFormula =
  | "epley"
  | "brzycki"
  | "lombardi"
  | "oconner"
  | "mayhew"
  | "wathan"
  | "ensemble";

export type OneRmConfidence = "high" | "medium" | "low";

export type OneRmEstimate = {
  oneRm: number;
  formula: OneRmFormula;
  confidence: OneRmConfidence;
  repsUsed: number;
  weightUsedKg: number;
  methods: Record<string, number>;
};

export type OneRmOptions = {
  roundTo?: number; // default 1
  conservative?: boolean; // default false
  allowHighRep?: boolean; // default true
  rpe?: number | null;
  rir?: number | null;
};

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

const roundToStep = (value: number, step: number) => {
  if (!Number.isFinite(value)) return 0;
  if (!Number.isFinite(step) || step <= 0) return value;
  return Math.round(value / step) * step;
};

const repsInt = (reps: number) => Math.max(1, Math.floor(reps));

// Infer reps like ExerciseTab (fallback when backend doesn't send topSetReps)
export const inferTopSetReps = (h: ExerciseHistoryPointDto): number => {
  const direct = h.topSetReps ?? 0;
  if (direct > 0) return direct;

  const w = h.topSetWeightKg ?? 0;
  const vol = h.totalVolumeKg ?? 0;

  if (h.totalSets === 1 && w > 0 && vol > 0) {
    const r = Math.round(vol / w);
    return Number.isFinite(r) && r > 0 ? r : 1;
  }

  return 1;
};

const wasRepsMissing = (h: ExerciseHistoryPointDto) => (h.topSetReps ?? 0) <= 0;

export function estimate1RMFromTopSet(
  weightKg: number | null | undefined,
  reps: number | null | undefined,
  opts?: OneRmOptions,
  formula: OneRmFormula = "ensemble"
): OneRmEstimate {
  const w = weightKg ?? 0;
  const rRaw = reps ?? 0;

  const step = opts?.roundTo ?? 1;
  const conservative = opts?.conservative ?? false;
  const allowHighRep = opts?.allowHighRep ?? true;

  if (w <= 0) {
    return {
      oneRm: 0,
      formula,
      confidence: "low",
      repsUsed: 0,
      weightUsedKg: 0,
      methods: {},
    };
  }

  const r = repsInt(rRaw);

  if (!allowHighRep && r > 20) {
    return {
      oneRm: 0,
      formula,
      confidence: "low",
      repsUsed: r,
      weightUsedKg: w,
      methods: {},
    };
  }

  if (r === 1) {
    const one = roundToStep(w, step);
    return {
      oneRm: one,
      formula,
      confidence: "high",
      repsUsed: r,
      weightUsedKg: w,
      methods: {
        epley: one,
        brzycki: one,
        lombardi: one,
        oconner: one,
        mayhew: one,
        wathan: one,
      },
    };
  }

  const epley = (weight: number, repsN: number) => weight * (1 + repsN / 30);
  const brzycki = (weight: number, repsN: number) => weight * (36 / (37 - repsN));
  const lombardi = (weight: number, repsN: number) => weight * Math.pow(repsN, 0.10);
  const oconner = (weight: number, repsN: number) => weight * (1 + repsN / 40);
  const mayhew = (weight: number, repsN: number) =>
    (100 * weight) / (52.2 + 41.9 * Math.exp(-0.055 * repsN));
  const wathan = (weight: number, repsN: number) =>
    (100 * weight) / (48.8 + 53.8 * Math.exp(-0.075 * repsN));

  const rForBrzycki = Math.min(r, 36);

  const raw = {
    epley: epley(w, r),
    brzycki: brzycki(w, rForBrzycki),
    lombardi: lombardi(w, r),
    oconner: oconner(w, r),
    mayhew: mayhew(w, r),
    wathan: wathan(w, r),
  };

  const weights = (() => {
    if (r <= 5)
      return {
        epley: 0.25,
        brzycki: 0.25,
        wathan: 0.3,
        mayhew: 0.1,
        lombardi: 0.05,
        oconner: 0.05,
      };
    if (r <= 10)
      return {
        epley: 0.15,
        brzycki: 0.15,
        wathan: 0.3,
        mayhew: 0.25,
        lombardi: 0.1,
        oconner: 0.05,
      };
    if (r <= 20)
      return {
        epley: 0.05,
        brzycki: 0.05,
        wathan: 0.3,
        mayhew: 0.3,
        lombardi: 0.25,
        oconner: 0.05,
      };
    return {
      epley: 0.02,
      brzycki: 0.02,
      wathan: 0.28,
      mayhew: 0.28,
      lombardi: 0.38,
      oconner: 0.02,
    };
  })();

  let ensemble =
    raw.epley * weights.epley +
    raw.brzycki * weights.brzycki +
    raw.wathan * weights.wathan +
    raw.mayhew * weights.mayhew +
    raw.lombardi * weights.lombardi +
    raw.oconner * weights.oconner;

  if (opts?.rir != null && Number.isFinite(opts.rir)) {
    const rir = clamp(opts.rir as number, 0, 6);
    ensemble *= 1 - 0.025 * rir;
  } else if (opts?.rpe != null && Number.isFinite(opts.rpe)) {
    const rpe = clamp(opts.rpe as number, 6, 10);
    const rirApprox = clamp(10 - rpe, 0, 4);
    ensemble *= 1 - 0.025 * rirApprox;
  }

  const vals = Object.values(raw);
  const min = Math.min(...vals);
  const max = Math.max(...vals);

  if (conservative) ensemble = ensemble * 0.65 + min * 0.35;

  const clamped = clamp(ensemble, min * 0.95, max * 1.05);

  const confidence: OneRmConfidence =
    r <= 6 ? "high" : r <= 12 ? "medium" : r <= 20 ? "medium" : "low";

  const byFormula: Record<OneRmFormula, number> = {
    epley: raw.epley,
    brzycki: raw.brzycki,
    lombardi: raw.lombardi,
    oconner: raw.oconner,
    mayhew: raw.mayhew,
    wathan: raw.wathan,
    ensemble: clamped,
  };

  const chosen = byFormula[formula] ?? clamped;

  return {
    oneRm: roundToStep(chosen, step),
    formula,
    confidence,
    repsUsed: r,
    weightUsedKg: w,
    methods: Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, roundToStep(v, step)])
    ),
  };
}

export function estimate1RMFromHistoryPoint(
  h: ExerciseHistoryPointDto,
  opts?: OneRmOptions,
  formula: OneRmFormula = "ensemble"
): OneRmEstimate {
  const reps = inferTopSetReps(h);
  const missing = wasRepsMissing(h);

  const est = estimate1RMFromTopSet(h.topSetWeightKg, reps, opts, formula);

  if (missing && est.confidence === "high") {
    return { ...est, confidence: "medium" };
  }

  return est;
}

export function estimateWeightFrom1RM(
  oneRmKg: number,
  reps: number,
  roundToKg = 1,
  conservative = false
): number {
  const orm = Math.max(0, oneRmKg);
  const r = repsInt(reps);

  if (orm <= 0) return 0;
  if (r === 1) return roundToStep(orm, roundToKg);

  let lo = 0;
  let hi = orm;

  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    const est = estimate1RMFromTopSet(mid, r, { roundTo: 0, conservative }, "ensemble").oneRm;
    if (est > orm) hi = mid;
    else lo = mid;
  }

  return roundToStep((lo + hi) / 2, roundToKg);
}
