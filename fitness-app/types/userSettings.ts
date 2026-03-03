import type { AdvancedMuscleFilterValue } from "./muscles";

export type HomeGoalTile = "calories" | "protein" | "carbs" | "fat";
export type HomeSectionKey = "quickStart" | "goals" | "weight" | "recoveryMap";
export type RecoveryMapMuscleKey = Exclude<AdvancedMuscleFilterValue, "ALL">;

export interface UserSettings {
  calorieGoal: number;
  proteinGoal: number;
  fatGoal: number;
  carbGoal: number;
  showOnlyCustomTrainingContent: boolean;
  muscleFilter: "basic" | "advanced";
  recoveryMapHiddenMuscles: RecoveryMapMuscleKey[];
  homeGoalTiles: HomeGoalTile[];
  homeSectionOrder: HomeSectionKey[];
  weightGoalKg: number;
  weightDirection?: "gain" | "lose" | "maintain";
}
