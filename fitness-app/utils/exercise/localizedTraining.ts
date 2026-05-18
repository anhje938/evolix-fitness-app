import type { AppLanguage } from "@/types/userSettings";
import type { Program, Workout } from "@/types/exercise";

function localizedValue(
  language: AppLanguage,
  primary: string | null | undefined,
  english: string | null | undefined
) {
  const fallback = primary?.trim() ?? "";
  if (language !== "en") return fallback;

  const translated = english?.trim();
  return translated || fallback;
}

export function getProgramDisplay(program: Program, language: AppLanguage) {
  return {
    name: localizedValue(language, program.name, program.englishName),
    goal: localizedValue(language, program.goal, program.englishGoal),
    level: localizedValue(language, program.level, program.englishLevel),
  };
}

export function getWorkoutDisplay(workout: Workout, language: AppLanguage) {
  return {
    name: localizedValue(language, workout.name, workout.englishName),
    dayLabel: localizedValue(
      language,
      workout.dayLabel,
      workout.englishDayLabel
    ),
    description: localizedValue(
      language,
      workout.description,
      workout.englishDescription
    ),
  };
}
