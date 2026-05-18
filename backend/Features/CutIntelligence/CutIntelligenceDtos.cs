namespace backend.Features.CutIntelligence
{
    public class CutReportDto
    {
        public int Score { get; set; }
        public string ScoreLabel { get; set; } = "";
        public string Status { get; set; } = "";
        public string Confidence { get; set; } = "";
        public CutReadinessDto Readiness { get; set; } = new();
        public List<CutScoreFactorDto> ScoreBreakdown { get; set; } = [];
        public CutWeightTrendDto WeightTrend { get; set; } = new();
        public CutNutritionSummaryDto NutritionSummary { get; set; } = new();
        public CutStrengthSummaryDto StrengthSummary { get; set; } = new();
        public CutTrainingLoadSummaryDto TrainingLoadSummary { get; set; } = new();
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
        public int PointsLost { get; set; }
        public string Reason { get; set; } = "";
    }

    public class CutWeightTrendDto
    {
        public double? AverageWeight7d { get; set; }
        public double? AverageWeightPrevious7d { get; set; }
        public double? WeeklyWeightChangeKg { get; set; }
        public double? WeeklyWeightChangePercent { get; set; }
        public double? EstimatedDailyDeficit { get; set; }
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
    }
}
