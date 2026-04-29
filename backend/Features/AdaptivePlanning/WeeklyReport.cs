namespace backend.Features.AdaptivePlanning
{
    public class WeeklyReport
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string UserId { get; set; } = "";

        public DateOnly WeekStart { get; set; }
        public DateOnly WeekEnd { get; set; }
        public DateTime GeneratedAtUtc { get; set; } = DateTime.UtcNow;

        public DataQualityLevel DataQuality { get; set; }
        public int? OverallScore { get; set; }
        public string SummaryText { get; set; } = "";
        public string AlgorithmVersion { get; set; } = "";

        public WeeklyReportWeightSummary? WeightSummary { get; set; }
        public WeeklyReportNutritionSummary? NutritionSummary { get; set; }
        public WeeklyReportTrainingSummary? TrainingSummary { get; set; }
        public WeeklyReportRecoverySummary? RecoverySummary { get; set; }
        public ICollection<WeeklyReportMuscleBalanceSummary> MuscleBalance { get; set; } =
            new List<WeeklyReportMuscleBalanceSummary>();
        public ICollection<WeeklyReportNextWeekAction> NextWeekActions { get; set; } =
            new List<WeeklyReportNextWeekAction>();
        public ICollection<AdaptiveRecommendation> Recommendations { get; set; } =
            new List<AdaptiveRecommendation>();
    }

    public class WeeklyReportWeightSummary
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid WeeklyReportId { get; set; }
        public WeeklyReport WeeklyReport { get; set; } = null!;

        public double? StartTrendWeightKg { get; set; }
        public double? EndTrendWeightKg { get; set; }
        public double? WeeklyChangeKg { get; set; }
        public double? ExpectedWeeklyChangeKg { get; set; }
        public DateOnly? EstimatedGoalDate { get; set; }
        public int WeightLogsCount { get; set; }
        public string Status { get; set; } = "";
        public string Insight { get; set; } = "";
    }

    public class WeeklyReportNutritionSummary
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid WeeklyReportId { get; set; }
        public WeeklyReport WeeklyReport { get; set; } = null!;

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

    public class WeeklyReportTrainingSummary
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid WeeklyReportId { get; set; }
        public WeeklyReport WeeklyReport { get; set; } = null!;

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

    public class WeeklyReportRecoverySummary
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid WeeklyReportId { get; set; }
        public WeeklyReport WeeklyReport { get; set; } = null!;

        public string ReadyMusclesText { get; set; } = "";
        public string RestMusclesText { get; set; } = "";
        public string RecommendedNextSession { get; set; } = "";
        public string IntensityRecommendation { get; set; } = "";
        public string Insight { get; set; } = "";
    }

    public class WeeklyReportMuscleBalanceSummary
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid WeeklyReportId { get; set; }
        public WeeklyReport WeeklyReport { get; set; } = null!;

        public string Muscle { get; set; } = "";
        public decimal Sets { get; set; }
        public double VolumeKg { get; set; }
    }

    public class WeeklyReportNextWeekAction
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid WeeklyReportId { get; set; }
        public WeeklyReport WeeklyReport { get; set; } = null!;

        public int SortOrder { get; set; }
        public string Category { get; set; } = "";
        public string Text { get; set; } = "";
    }
}
