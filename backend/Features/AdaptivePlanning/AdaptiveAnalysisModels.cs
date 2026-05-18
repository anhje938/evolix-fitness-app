using backend.Features.Users;

namespace backend.Features.AdaptivePlanning
{
    public sealed record WeekWindow(DateOnly Start, DateOnly End)
    {
        public DateTime StartUtc => AdaptivePlanningClock.StartOfDayUtc(Start);
        public DateTime EndExclusiveUtc => AdaptivePlanningClock.EndExclusiveUtc(End);
    }

    public sealed class WeightTrendAnalysis
    {
        public double? PreviousAverageKg { get; set; }
        public double? RecentAverageKg { get; set; }
        public double? WeeklyChangeKg { get; set; }
        public double? ExpectedWeeklyChangeKg { get; set; }
        public double? RawExpectedWeeklyChangeKg { get; set; }
        public bool GoalPaceClipped { get; set; }
        public DateOnly? EstimatedGoalDate { get; set; }
        public int RecentLogsCount { get; set; }
        public int TotalLogsCount { get; set; }
        public DataQualityLevel Confidence { get; set; }
        public string Status { get; set; } = "";
        public string Insight { get; set; } = "";
    }

    public sealed class NutritionAnalysis
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
        public DataQualityLevel Confidence { get; set; }
        public string Status { get; set; } = "";
        public string Insight { get; set; } = "";
    }

    public sealed class TrainingAnalysis
    {
        public int CompletedWorkouts { get; set; }
        public int TotalSets { get; set; }
        public int TotalReps { get; set; }
        public double TotalVolumeKg { get; set; }
        public int ExercisesImproved { get; set; }
        public int ExercisesMaintained { get; set; }
        public int ExercisesDecreased { get; set; }
        public Guid? BestProgressExerciseId { get; set; }
        public string BestProgressExerciseName { get; set; } = "";
        public string BestProgressText { get; set; } = "";
        public decimal? SuggestedBestProgressWeightKg { get; set; }
        public DataQualityLevel Confidence { get; set; }
        public Dictionary<string, MuscleLoad> MuscleLoads { get; set; } = new(StringComparer.OrdinalIgnoreCase);
        public string Insight { get; set; } = "";
    }

    public sealed class MuscleLoad
    {
        public string Muscle { get; set; } = "";
        public decimal Sets { get; set; }
        public decimal HardSets { get; set; }
        public double VolumeKg { get; set; }
        public DateTime? LastStimulusAtUtc { get; set; }
    }

    public sealed class RecoveryAnalysis
    {
        public string ReadyMusclesText { get; set; } = "";
        public string RestMusclesText { get; set; } = "";
        public string RecommendedNextSession { get; set; } = "";
        public string IntensityRecommendation { get; set; } = "";
        public string Insight { get; set; } = "";
        public DataQualityLevel Confidence { get; set; }
    }

    public sealed class WeeklyReportFreshness
    {
        public DateTime DataThroughUtc { get; set; }
        public bool IsStale { get; set; }
        public string StaleReason { get; set; } = "";
    }
}
