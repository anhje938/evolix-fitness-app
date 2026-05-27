namespace backend.Features.CutIntelligence
{
    public class CutReportDto
    {
        public string GoalType { get; set; } = "cut";
        public int Score { get; set; }
        public string ScoreLabel { get; set; } = "";
        public string Status { get; set; } = "";
        public string Confidence { get; set; } = "";
        public bool IsLimitedReport { get; set; }
        public bool NotEnoughData { get; set; }
        public CutReadinessDto Readiness { get; set; } = new();
        public List<CutScoreFactorDto> ScoreBreakdown { get; set; } = [];
        public List<string> StatusReasons { get; set; } = [];
        public CutWeightTrendDto WeightTrend { get; set; } = new();
        public CutNutritionSummaryDto NutritionSummary { get; set; } = new();
        public CutStrengthSummaryDto StrengthSummary { get; set; } = new();
        public CutTrainingLoadSummaryDto TrainingLoadSummary { get; set; } = new();
        public CutAdherenceSummaryDto AdherenceSummary { get; set; } = new();
        public CutTimelineSummaryDto TimelineSummary { get; set; } = new();
        public GoalMonthlySummaryDto MonthlySummary { get; set; } = new();
        public CutPreviousReportComparisonDto PreviousComparison { get; set; } = new();
        public List<CutRecommendationDto> Recommendations { get; set; } = [];
        public List<string> Warnings { get; set; } = [];
        public DateTime GeneratedAt { get; set; }
        public string AlgorithmVersion { get; set; } = "";
    }

    public class CutReadinessDto
    {
        public bool IsReady { get; set; }
        public int ReadyItemCount { get; set; }
        public int TotalItemCount { get; set; }
        public string Summary { get; set; } = "";
        public List<CutReadinessItemDto> Items { get; set; } = [];
    }

    public class CutReadinessItemDto
    {
        public string Id { get; set; } = "";
        public string Label { get; set; } = "";
        public int Current { get; set; }
        public int Required { get; set; }
        public bool IsReady { get; set; }
        public string Unit { get; set; } = "";
    }

    public class CutScoreFactorDto
    {
        public string Id { get; set; } = "";
        public string Label { get; set; } = "";
        public int Score { get; set; }
        public int WeightPercent { get; set; }
        public int PointsLost { get; set; }
        public string Reason { get; set; } = "";
    }

    public class CutWeightTrendDto
    {
        public double? AverageWeight7d { get; set; }
        public double? AverageWeightPrevious7d { get; set; }
        public double? WeeklyWeightChangeKg { get; set; }
        public double? WeeklyWeightChangePercent { get; set; }
        public double? PreviousWeeklyWeightChangePercent { get; set; }
        public double? WeightLossPercent { get; set; }
        public double? WeightGainPercent { get; set; }
        public double? WeightDriftPercent { get; set; }
        public double? EstimatedDailyDeficit { get; set; }
        public double? EstimatedDailySurplus { get; set; }
        public bool PossibleWaterWeight { get; set; }
        public int WeightLogsLast7d { get; set; }
        public int DaysSinceEstimatedCutStart { get; set; }
        public List<CutWeightPointDto> Points { get; set; } = [];
        public string Summary { get; set; } = "";
    }

    public class CutWeightPointDto
    {
        public DateTime Date { get; set; }
        public double WeightKg { get; set; }
        public double? RollingAverage7d { get; set; }
    }

    public class CutNutritionSummaryDto
    {
        public double? AverageCalories7d { get; set; }
        public double? AverageProtein7d { get; set; }
        public double? AverageCarbs7d { get; set; }
        public double? AverageFat7d { get; set; }
        public double? AveragePreWorkoutCarbs { get; set; }
        public double? AveragePostWorkoutCarbs { get; set; }
        public double? ProteinPerKg { get; set; }
        public double? CarbsPerKg { get; set; }
        public double? FatPerKg { get; set; }
        public double? FatCaloriesPercent { get; set; }
        public int LoggedDaysLast7d { get; set; }
        public double LoggingAdherencePercent { get; set; }
        public double ProteinTargetAdherencePercent { get; set; }
        public double CalorieTargetAdherencePercent { get; set; }
        public double? AverageCalorieTargetDelta { get; set; }
        public int? EstimatedMaintenanceCalories { get; set; }
        public string MaintenanceEstimateConfidence { get; set; } = "low";
        public string Summary { get; set; } = "";
    }

    public class CutStrengthSummaryDto
    {
        public int ComparableExercises { get; set; }
        public double? AverageStrengthChangePercent { get; set; }
        public int ExercisesProgressing { get; set; }
        public int ExercisesStable { get; set; }
        public int ExercisesMildRegression { get; set; }
        public int ExercisesSignificantRegression { get; set; }
        public List<CutExerciseStrengthDto> KeyExercises { get; set; } = [];
        public string Summary { get; set; } = "";
    }

    public class CutExerciseStrengthDto
    {
        public Guid ExerciseId { get; set; }
        public string ExerciseName { get; set; } = "";
        public double CurrentEstimated1Rm { get; set; }
        public double PreviousEstimated1Rm { get; set; }
        public double ChangePercent { get; set; }
        public string Trend { get; set; } = "";
    }

    public class CutTrainingLoadSummaryDto
    {
        public int SessionsLast14d { get; set; }
        public int SessionsPrevious14d { get; set; }
        public double? WeeklyVolumeCurrent { get; set; }
        public double? WeeklyVolumePrevious { get; set; }
        public double? VolumeChangePercent { get; set; }
        public bool FatigueRisk { get; set; }
        public string Summary { get; set; } = "";
    }

    public class CutAdherenceSummaryDto
    {
        public double MealLoggingAdherencePercent { get; set; }
        public double WeighInAdherencePercent { get; set; }
        public double ProteinTargetAdherencePercent { get; set; }
        public double CalorieTargetAdherencePercent { get; set; }
        public double? WorkoutAdherencePercent { get; set; }
        public string Summary { get; set; } = "";
    }

    public class CutTimelineSummaryDto
    {
        public double? TargetWeightKg { get; set; }
        public int? EstimatedWeeksToGoal { get; set; }
        public int MaintenanceStabilityStreakWeeks { get; set; }
        public string Summary { get; set; } = "";
    }

    public class GoalMonthlySummaryDto
    {
        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }
        public int DaysTracked { get; set; }
        public int DaysRequired { get; set; } = 28;
        public int NutritionDays { get; set; }
        public int WeighIns { get; set; }
        public int CompletedWorkouts { get; set; }
        public int DataQualityScore { get; set; }
        public string Confidence { get; set; } = "low";
        public bool IsHighConfidence { get; set; }
        public string Verdict { get; set; } = "";
        public string TopInsight { get; set; } = "";
        public string Recommendation { get; set; } = "";
        public List<string> MissingForHighConfidence { get; set; } = [];
        public List<string> NextMonthFocus { get; set; } = [];
        public List<GoalMonthJourneyWeekDto> MonthJourney { get; set; } = [];
    }

    public class GoalMonthJourneyWeekDto
    {
        public int WeekNumber { get; set; }
        public DateTime WeekStart { get; set; }
        public DateTime WeekEnd { get; set; }
        public string Status { get; set; } = "";
        public int NutritionDays { get; set; }
        public int WeighIns { get; set; }
        public int Workouts { get; set; }
    }

    public class CutPreviousReportComparisonDto
    {
        public bool HasPreviousReport { get; set; }
        public int? PreviousScore { get; set; }
        public int? ScoreChange { get; set; }
        public string? PreviousStatus { get; set; }
        public bool StatusChanged { get; set; }
        public int ConsecutiveWeeksOnTrack { get; set; }
        public int ConsecutiveWeeksOffTrack { get; set; }
        public List<string> RepeatedProblems { get; set; } = [];
        public List<string> ResolvedProblems { get; set; } = [];
        public List<string> LastRecommendationIds { get; set; } = [];
        public string Summary { get; set; } = "";
    }

    public class CutRecommendationDto
    {
        public string Id { get; set; } = "";
        public string Title { get; set; } = "";
        public string Priority { get; set; } = "";
        public string Category { get; set; } = "";
        public string Reason { get; set; } = "";
        public string SuggestedAction { get; set; } = "";
        public string ExpectedOutcome { get; set; } = "";
        public string Confidence { get; set; } = "";
        public bool CanApply { get; set; }
        public string? ApplyKind { get; set; }
        public int? SuggestedCalories { get; set; }
        public int? SuggestedProtein { get; set; }
    }

    public class ApplyCutRecommendationRequest
    {
        public string RecommendationId { get; set; } = "";
    }

    public class ApplyCutRecommendationResultDto
    {
        public bool Applied { get; set; }
        public string Message { get; set; } = "";
        public int? CalorieGoal { get; set; }
        public int? ProteinGoal { get; set; }
        public bool CanUndo { get; set; }
    }
}
