import type { Exercise, Program, Workout } from "@/types/exercise";

function hasUserId(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function asBool(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const raw = value.trim().toLowerCase();
    if (raw === "true" || raw === "1") return true;
    if (raw === "false" || raw === "0") return false;
  }
  return null;
}

export function isUserCreatedExercise(exercise: Exercise): boolean {
  const fromCustomField = asBool((exercise as { isCustom?: unknown }).isCustom);
  if (fromCustomField !== null) return fromCustomField;
  return hasUserId(exercise.userId);
}

export function isUserCreatedWorkout(workout: Workout): boolean {
  const fromCustomField = asBool(workout.isCustom);
  if (fromCustomField !== null) return fromCustomField;
  return hasUserId(workout.userId ?? undefined);
}

export function isUserCreatedProgram(program: Program): boolean {
  const fromCustomField = asBool(program.isCustom);
  if (fromCustomField !== null) return fromCustomField;
  return hasUserId(program.userId ?? undefined);
}
