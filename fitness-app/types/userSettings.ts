import type { AdvancedMuscleFilterValue } from "./muscles";

export type HomeGoalTile = "calories" | "protein" | "carbs" | "fat";
export type HomeSectionKey = "quickStart" | "goals" | "weight" | "recoveryMap";
export type RecoveryMapMuscleKey = Exclude<AdvancedMuscleFilterValue, "ALL">;
export type AppLanguage = "nb" | "en";
export type UserGender = "male" | "female";

export interface UserSettings {
  age: number | null;
  gender: UserGender | null;
  language: AppLanguage;
  hasCompletedRegistration: boolean;
  hasDismissedRegistrationOnboarding: boolean;
  calorieGoal: number;
  proteinGoal: number;
  fatGoal: number;
  carbGoal: number;
  showOnlyCustomTrainingContent: boolean;
  muscleFilter: "basic" | "advanced";
  recoveryMapHiddenMuscles: RecoveryMapMuscleKey[];
  homeGoalTiles: HomeGoalTile[];
  homeSectionOrder: HomeSectionKey[];
  useFoodCoach: boolean;
  useWorkoutCoach: boolean;
  foodCoachExcludedDateKeys: string[];
  weightGoalKg: number;
  weightGoalTimeUtc: string;
  cutStartDateUtc: string | null;
  cutStartWeightKg: number | null;
  weightDirection?: "gain" | "lose" | "maintain";
  expoGoCoachAnchorDateUtc?: string | null;
}
