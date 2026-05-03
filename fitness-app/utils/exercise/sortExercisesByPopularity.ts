import type { Exercise } from "@/types/exercise";

function usage(exercise: Exercise) {
  const value = Number(exercise.usageCount ?? 0);
  return Number.isFinite(value) ? value : 0;
}

export function sortExercisesByPopularity(exercises: Exercise[]) {
  return [...exercises].sort((a, b) => {
    const usageDiff = usage(b) - usage(a);
    if (usageDiff !== 0) return usageDiff;
    return a.name.localeCompare(b.name, "nb");
  });
}
