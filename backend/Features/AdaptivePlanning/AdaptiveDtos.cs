namespace backend.Features.AdaptivePlanning
{
    public class TodayFocusDto
    {
        public string MainAction { get; set; } = "";
        public string Why { get; set; } = "";
        public string Focus { get; set; } = "";
        public string Nutrition { get; set; } = "";
        public string Recovery { get; set; } = "";
        public DataQualityLevel DataQuality { get; set; }
        public Guid? WeeklyReportId { get; set; }
        public List<AdaptiveRecommendationDto> Recommendations { get; set; } = [];
    }

    public class WeeklyReportDto
    {
        public Guid Id { get; set; }
        public DateOnly WeekStart { get; set; }
        public DateOnly WeekEnd { get; set; }
        public DateTime GeneratedAtUtc { get; set; }
        public DateTime DataThroughUtc { get; set; }
        public bool IsStale { get; set; }
        public string StaleReason { get; set; } = "";
        public DataQualityLevel DataQuality { get; set; }
        public int? OverallScore { get; set; }
        public string SummaryText { get; set; } = "";
        public string AlgorithmVersion { get; set; } = "";
        public WeeklyReportWeightDto? Weight { get; set; }
        public WeeklyReportNutritionDto? Nutrition { get; set; }
        public WeeklyReportTrainingDto? Training { get; set; }
        public WeeklyReportRecoveryDto? Recovery { get; set; }
        public List<WeeklyReportMuscleBalanceDto> MuscleBalance { get; set; } = [];
        public List<WeeklyReportActionDto> NextWeekActions { get; set; } = [];
        public List<AdaptiveRecommendationDto> Recommendations { get; set; } = [];
    }

    public class WeeklyReportWeightDto
    {
        public double? StartTrendWeightKg { get; set; }
        public double? EndTrendWeightKg { get; set; }
        public double? WeeklyChangeKg { get; set; }
        public double? ExpectedWeeklyChangeKg { get; set; }
        public DateOnly? EstimatedGoalDate { get; set; }
        public int WeightLogsCount { get; set; }
        public string Status { get; set; } = "";
        public string Insight { get; set; } = "";
    }

    public class WeeklyReportNutritionDto
    {
        public int LoggedDays { get; set; }
        public int? AverageCalories { get; set; }
        public int TargetCalories { get; set; }
        public int? AverageProtein { get; set; }
        public int TargetProtein { get; set; }
        public int? AverageCarbs { get; set; }
        public int TargetCarbs { get; set; }
        public int? AverageFat { get; set; }
        public int TargetFat { get; set; }
        public string Status { get; set; } = "";
        public string Insight { get; set; } = "";
    }

    public class WeeklyReportTrainingDto
    {
        public int CompletedWorkouts { get; set; }
        public int TotalSets { get; set; }
        public int TotalReps { get; set; }
        public double TotalVolumeKg { get; set; }
        public int ExercisesImproved { get; set; }
        public int ExercisesMaintained { get; set; }
        public int ExercisesDecreased { get; set; }
        public Guid? BestProgressExerciseId { get; set; }
        public string BestProgressText { get; set; } = "";
        public string Insight { get; set; } = "";
    }

    public class WeeklyReportRecoveryDto
    {
        public string ReadyMusclesText { get; set; } = "";
        public string RestMusclesText { get; set; } = "";
        public string RecommendedNextSession { get; set; } = "";
        public string IntensityRecommendation { get; set; } = "";
        public string Insight { get; set; } = "";
    }

    public class WeeklyReportMuscleBalanceDto
    {
        public string Muscle { get; set; } = "";
        public decimal Sets { get; set; }
        public double VolumeKg { get; set; }
    }

    public class WeeklyReportActionDto
    {
        public int SortOrder { get; set; }
        public string Category { get; set; } = "";
        public string Text { get; set; } = "";
    }

    public class AdaptiveRecommendationDto
    {
        public Guid Id { get; set; }
        public AdaptiveRecommendationType Type { get; set; }
        public string Title { get; set; } = "";
        public string Explanation { get; set; } = "";
        public RecommendationConfidence Confidence { get; set; }
        public AdaptiveRecommendationStatus Status { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public DateOnly AppliesFromDate { get; set; }
        public DateTime ExpiresAtUtc { get; set; }
        public RecommendationNutritionChangeDto? NutritionChange { get; set; }
        public RecommendationExerciseTargetChangeDto? ExerciseTargetChange { get; set; }
        public RecommendationRecoveryActionDto? RecoveryAction { get; set; }
        public RecommendationTargetDateChangeDto? TargetDateChange { get; set; }
    }

    public class RecommendationNutritionChangeDto
    {
        public int? CurrentCalories { get; set; }
        public int? SuggestedCalories { get; set; }
        public int? CurrentProtein { get; set; }
        public int? SuggestedProtein { get; set; }
        public int? CurrentCarbs { get; set; }
        public int? SuggestedCarbs { get; set; }
        public int? CurrentFat { get; set; }
        public int? SuggestedFat { get; set; }
    }

    public class RecommendationExerciseTargetChangeDto
    {
        public Guid ExerciseId { get; set; }
        public string ExerciseName { get; set; } = "";
        public int? CurrentTargetSets { get; set; }
        public int? SuggestedTargetSets { get; set; }
        public int? MinReps { get; set; }
        public int? MaxReps { get; set; }
        public decimal? CurrentTargetWeightKg { get; set; }
        public decimal? SuggestedTargetWeightKg { get; set; }
        public ExerciseProgressionModel ProgressionModel { get; set; }
    }

    public class RecommendationRecoveryActionDto
    {
        public string RecommendedSession { get; set; } = "";
        public string Intensity { get; set; } = "";
        public string FocusMusclesText { get; set; } = "";
        public string RestMusclesText { get; set; } = "";
    }

    public class RecommendationTargetDateChangeDto
    {
        public DateTime CurrentTargetDateUtc { get; set; }
        public DateTime SuggestedTargetDateUtc { get; set; }
        public double CurrentWeeklyPaceKg { get; set; }
        public double SuggestedWeeklyPaceKg { get; set; }
    }
}
