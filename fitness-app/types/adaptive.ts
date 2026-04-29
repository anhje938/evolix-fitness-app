export const DataQualityLevel = {
  Low: 0,
  Medium: 1,
  High: 2,
} as const;

export type DataQualityLevel =
  (typeof DataQualityLevel)[keyof typeof DataQualityLevel];

export const AdaptiveRecommendationType = {
  HoldCalories: 0,
  ReduceCalories: 1,
  IncreaseCalories: 2,
  IncreaseProtein: 3,
  AdjustTargetDate: 4,
  NeedMoreData: 5,
  IncreaseLoad: 6,
  HoldLoadIncreaseReps: 7,
  ReduceLoad: 8,
  AddSet: 9,
  RemoveSet: 10,
  ChangeRepRange: 11,
  Deload: 12,
  PrioritizeMuscle: 13,
  RecoveryNextSession: 14,
} as const;

export type AdaptiveRecommendationType =
  (typeof AdaptiveRecommendationType)[keyof typeof AdaptiveRecommendationType];

export const AdaptiveRecommendationStatus = {
  Pending: 0,
  Accepted: 1,
  Dismissed: 2,
  Expired: 3,
} as const;

export type AdaptiveRecommendationStatus =
  (typeof AdaptiveRecommendationStatus)[keyof typeof AdaptiveRecommendationStatus];

export const RecommendationConfidence = {
  Low: 0,
  Medium: 1,
  High: 2,
} as const;

export type RecommendationConfidence =
  (typeof RecommendationConfidence)[keyof typeof RecommendationConfidence];

export const ExerciseProgressionModel = {
  DoubleProgression: 0,
  Linear: 1,
  Maintain: 2,
} as const;

export type ExerciseProgressionModel =
  (typeof ExerciseProgressionModel)[keyof typeof ExerciseProgressionModel];

export type TodayFocus = {
  mainAction: string;
  why: string;
  focus: string;
  nutrition: string;
  recovery: string;
  dataQuality: DataQualityLevel;
  weeklyReportId: string | null;
  recommendations: AdaptiveRecommendation[];
};

export type WeeklyReport = {
  id: string;
  weekStart: string;
  weekEnd: string;
  generatedAtUtc: string;
  dataQuality: DataQualityLevel;
  overallScore: number | null;
  summaryText: string;
  algorithmVersion: string;
  weight: WeeklyReportWeight | null;
  nutrition: WeeklyReportNutrition | null;
  training: WeeklyReportTraining | null;
  recovery: WeeklyReportRecovery | null;
  muscleBalance: WeeklyReportMuscleBalance[];
  nextWeekActions: WeeklyReportAction[];
  recommendations: AdaptiveRecommendation[];
};

export type WeeklyReportWeight = {
  startTrendWeightKg: number | null;
  endTrendWeightKg: number | null;
  weeklyChangeKg: number | null;
  expectedWeeklyChangeKg: number | null;
  estimatedGoalDate: string | null;
  weightLogsCount: number;
  status: string;
  insight: string;
};

export type WeeklyReportNutrition = {
  loggedDays: number;
  averageCalories: number | null;
  targetCalories: number;
  averageProtein: number | null;
  targetProtein: number;
  averageCarbs: number | null;
  targetCarbs: number;
  averageFat: number | null;
  targetFat: number;
  status: string;
  insight: string;
};

export type WeeklyReportTraining = {
  completedWorkouts: number;
  totalSets: number;
  totalReps: number;
  totalVolumeKg: number;
  exercisesImproved: number;
  exercisesMaintained: number;
  exercisesDecreased: number;
  bestProgressExerciseId: string | null;
  bestProgressText: string;
  insight: string;
};

export type WeeklyReportRecovery = {
  readyMusclesText: string;
  restMusclesText: string;
  recommendedNextSession: string;
  intensityRecommendation: string;
  insight: string;
};

export type WeeklyReportMuscleBalance = {
  muscle: string;
  sets: number;
  volumeKg: number;
};

export type WeeklyReportAction = {
  sortOrder: number;
  category: string;
  text: string;
};

export type AdaptiveRecommendation = {
  id: string;
  type: AdaptiveRecommendationType;
  title: string;
  explanation: string;
  confidence: RecommendationConfidence;
  status: AdaptiveRecommendationStatus;
  createdAtUtc: string;
  appliesFromDate: string;
  expiresAtUtc: string;
  nutritionChange: RecommendationNutritionChange | null;
  exerciseTargetChange: RecommendationExerciseTargetChange | null;
  recoveryAction: RecommendationRecoveryAction | null;
  targetDateChange: RecommendationTargetDateChange | null;
};

export type RecommendationNutritionChange = {
  currentCalories: number | null;
  suggestedCalories: number | null;
  currentProtein: number | null;
  suggestedProtein: number | null;
  currentCarbs: number | null;
  suggestedCarbs: number | null;
  currentFat: number | null;
  suggestedFat: number | null;
};

export type RecommendationExerciseTargetChange = {
  exerciseId: string;
  exerciseName: string;
  currentTargetSets: number | null;
  suggestedTargetSets: number | null;
  minReps: number | null;
  maxReps: number | null;
  currentTargetWeightKg: number | null;
  suggestedTargetWeightKg: number | null;
  progressionModel: ExerciseProgressionModel;
};

export type RecommendationRecoveryAction = {
  recommendedSession: string;
  intensity: string;
  focusMusclesText: string;
  restMusclesText: string;
};

export type RecommendationTargetDateChange = {
  currentTargetDateUtc: string;
  suggestedTargetDateUtc: string;
  currentWeeklyPaceKg: number;
  suggestedWeeklyPaceKg: number;
};
