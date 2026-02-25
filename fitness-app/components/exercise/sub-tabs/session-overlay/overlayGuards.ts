import type { SessionExercise } from "@/types/exercise";

/**
 * ============================================================
 * VALIDATION & UTILITY FUNCTIONS
 * ============================================================
 * Business rules for workout session validation
 */

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function isPositiveInt(n: unknown) {
  return (
    typeof n === "number" && Number.isFinite(n) && n > 0 && Number.isInteger(n)
  );
}

export function isNonNegativeNumber(n: unknown) {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

export function normalizeTitle(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

export function validateSessionForSave(exercises: SessionExercise[]) {
  if (exercises.length === 0) {
    return {
      ok: false as const,
      message: "Legg til minst én øvelse før du fullfører.",
    };
  }

  const exercisesWithNoSets = exercises.filter((ex) => ex.sets.length === 0);
  if (exercisesWithNoSets.length > 0) {
    return {
      ok: false as const,
      message:
        "En eller flere øvelser mangler sett. Legg til minst ett sett på alle øvelser før du fullfører.",
    };
  }

  const completedSets = exercises
    .flatMap((ex) => ex.sets)
    .filter((s) => s.completed);

  if (completedSets.length === 0) {
    return {
      ok: false as const,
      message:
        "Du må markere minst ett sett som ferdig før du kan fullføre økten.",
    };
  }

  // Completed sets: reps must be > 0, weight must be >= 0 if provided
  for (const ex of exercises) {
    for (const s of ex.sets) {
      if (!s.completed) continue;

      if (!isPositiveInt(s.reps)) {
        return {
          ok: false as const,
          message: `Ferdig-markerte sett må ha reps > 0. Sjekk "${ex.name}".`,
        };
      }

      if (s.weight != null && !isNonNegativeNumber(s.weight)) {
        return {
          ok: false as const,
          message: `Vekt kan ikke være negativ. Sjekk "${ex.name}".`,
        };
      }
    }
  }

  return { ok: true as const, message: "" };
}

export function findInvalidCompletedSets(exercises: SessionExercise[]) {
  const issues: { exerciseName: string; setIndex: number; reason: string }[] =
    [];

  for (const ex of exercises) {
    ex.sets.forEach((s, idx) => {
      if (!s.completed) return;

      const reps = s.reps;
      if (reps == null || reps <= 0) {
        issues.push({
          exerciseName: ex.name,
          setIndex: idx + 1,
          reason: "reps må være > 0",
        });
        return;
      }

      if (s.weight != null && s.weight < 0) {
        issues.push({
          exerciseName: ex.name,
          setIndex: idx + 1,
          reason: "vekt kan ikke være negativ",
        });
      }
    });
  }

  return issues;
}
