import { ExerciseSessionSetItemDto } from "@/api/exercise/exerchiseHistory";
import { estimate1RMFromTopSet } from "./oneRepMax";

export function sessionBest1RmFromSets(sets: ExerciseSessionSetItemDto[]): number {
  let best = 0;

  for (const s of sets ?? []) {
    const est = estimate1RMFromTopSet(
      s.weightKg,
      s.reps,
      { roundTo: 1, conservative: true, allowHighRep: true },
      "ensemble"
    );
    if (est.oneRm > best) best = est.oneRm;
  }

  return best;
}
