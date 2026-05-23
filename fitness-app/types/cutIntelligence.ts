export type GoalReportType = "cut" | "leanBulk" | "maintenance";

export type CutReportStatus =
  | "excellent"
  | "onTrack"
  | "slightlyAggressive"
  | "tooAggressive"
  | "tooSlow"
  | "strengthRisk"
  | "fatigueRisk"
  | "inconsistentData"
  | "limitedData"
  | "notEnoughData"
  | "tooFast"
  | "dirtyBulkRisk"
  | "poorTrainingResponse"
  | "strengthProgressing"
  | "stable"
  | "driftingUp"
  | "driftingDown"
  | "recompProgress"
  | "maintenanceFound";

export type CutReportConfidence = "high" | "medium" | "low";

export type CutReport = {
  goalType: GoalReportType;
  score: number;
  scoreLabel: string;
  status: CutReportStatus;
  confidence: CutReportConfidence;
  isLimitedReport: boolean;
  notEnoughData: boolean;
  readiness: CutReadiness;
  scoreBreakdown: CutScoreFactor[];
  statusReasons: string[];
  weightTrend: CutWeightTrend;
  nutritionSummary: CutNutritionSummary;
  strengthSummary: CutStrengthSummary;
  trainingLoadSummary: CutTrainingLoadSummary;
  adherenceSummary: CutAdherenceSummary;
  timelineSummary: CutTimelineSummary;
  previousComparison: CutPreviousReportComparison;
  recommendations: CutRecommendation[];
  warnings: string[];
  generatedAt: string;
  algorithmVersion: string;
};

export type CutReadiness = {
  isReady: boolean;
  readyItemCount: number;
  totalItemCount: number;
  summary: string;
  items: CutReadinessItem[];
};

export type CutReadinessItem = {
  id: string;
  label: string;
  current: number;
  required: number;
  isReady: boolean;
  unit: string;
};

export type CutScoreFactor = {
  id: string;
  label: string;
  score: number;
  weightPercent: number;
  pointsLost: number;
  reason: string;
};

export type CutWeightTrend = {
  averageWeight7d: number | null;
  averageWeightPrevious7d: number | null;
  weeklyWeightChangeKg: number | null;
  weeklyWeightChangePercent: number | null;
  previousWeeklyWeightChangePercent: number | null;
  weightLossPercent: number | null;
  weightGainPercent: number | null;
  weightDriftPercent: number | null;
  estimatedDailyDeficit: number | null;
  estimatedDailySurplus: number | null;
  possibleWaterWeight: boolean;
  weightLogsLast7d: number;
  daysSinceEstimatedCutStart: number;
  points: CutWeightPoint[];
  summary: string;
};

export type CutWeightPoint = {
  date: string;
  weightKg: number;
  rollingAverage7d: number | null;
};

export type CutNutritionSummary = {
  averageCalories7d: number | null;
  averageProtein7d: number | null;
  averageCarbs7d: number | null;
  averageFat7d: number | null;
  averagePreWorkoutCarbs: number | null;
  averagePostWorkoutCarbs: number | null;
  proteinPerKg: number | null;
  carbsPerKg: number | null;
  fatPerKg: number | null;
  fatCaloriesPercent: number | null;
  loggedDaysLast7d: number;
  loggingAdherencePercent: number;
  proteinTargetAdherencePercent: number;
  calorieTargetAdherencePercent: number;
  averageCalorieTargetDelta: number | null;
  estimatedMaintenanceCalories: number | null;
  maintenanceEstimateConfidence: CutReportConfidence;
  summary: string;
};

export type CutStrengthSummary = {
  comparableExercises: number;
  averageStrengthChangePercent: number | null;
  exercisesProgressing: number;
  exercisesStable: number;
  exercisesMildRegression: number;
  exercisesSignificantRegression: number;
  keyExercises: CutExerciseStrength[];
  summary: string;
};

export type CutExerciseStrength = {
  exerciseId: string;
  exerciseName: string;
  currentEstimated1Rm: number;
  previousEstimated1Rm: number;
  changePercent: number;
  trend: string;
};

export type CutTrainingLoadSummary = {
  sessionsLast14d: number;
  sessionsPrevious14d: number;
  weeklyVolumeCurrent: number | null;
  weeklyVolumePrevious: number | null;
  volumeChangePercent: number | null;
  fatigueRisk: boolean;
  summary: string;
};

export type CutAdherenceSummary = {
  mealLoggingAdherencePercent: number;
  weighInAdherencePercent: number;
  proteinTargetAdherencePercent: number;
  calorieTargetAdherencePercent: number;
  workoutAdherencePercent: number | null;
  summary: string;
};

export type CutTimelineSummary = {
  targetWeightKg: number | null;
  estimatedWeeksToGoal: number | null;
  maintenanceStabilityStreakWeeks: number;
  summary: string;
};

export type CutPreviousReportComparison = {
  hasPreviousReport: boolean;
  previousScore: number | null;
  scoreChange: number | null;
  previousStatus: CutReportStatus | null;
  statusChanged: boolean;
  consecutiveWeeksOnTrack: number;
  consecutiveWeeksOffTrack: number;
  repeatedProblems: string[];
  resolvedProblems: string[];
  lastRecommendationIds: string[];
  summary: string;
};

export type CutRecommendation = {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  category: string;
  reason: string;
  suggestedAction: string;
  expectedOutcome: string;
  confidence: CutReportConfidence;
  canApply: boolean;
  applyKind: string | null;
  suggestedCalories: number | null;
  suggestedProtein: number | null;
};

export type ApplyCutRecommendationResult = {
  applied: boolean;
  message: string;
  calorieGoal: number | null;
  proteinGoal: number | null;
  canUndo: boolean;
};
