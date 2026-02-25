export type HomeGoalTile = "calories" | "protein" | "carbs" | "fat";

export interface UserSettings {
  calorieGoal: number;
  proteinGoal: number;
  fatGoal: number;
  carbGoal: number;
  muscleFilter: "basic" | "advanced";


  // NEW: hvilke mål som vises på Home
  homeGoalTiles: HomeGoalTile[]; // f.eks ["calories","protein","carbs","fat"]

  weightGoalKg: number;
  weightDirection?: "gain" | "lose" | "maintain";
}
