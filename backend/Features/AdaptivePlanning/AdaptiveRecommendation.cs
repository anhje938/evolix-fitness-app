using backend.Features.Training.Exercises;

namespace backend.Features.AdaptivePlanning
{
    public class AdaptiveRecommendation
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string UserId { get; set; } = "";

        public Guid? SourceReportId { get; set; }
        public WeeklyReport? SourceReport { get; set; }

        public AdaptiveRecommendationType Type { get; set; }
        public string Title { get; set; } = "";
        public string Explanation { get; set; } = "";
        public RecommendationConfidence Confidence { get; set; }
        public AdaptiveRecommendationStatus Status { get; set; } =
            AdaptiveRecommendationStatus.Pending;

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateOnly AppliesFromDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
        public DateTime ExpiresAtUtc { get; set; } = DateTime.UtcNow.AddDays(7);

        public RecommendationNutritionChange? NutritionChange { get; set; }
        public RecommendationExerciseTargetChange? ExerciseTargetChange { get; set; }
        public RecommendationRecoveryAction? RecoveryAction { get; set; }
        public RecommendationTargetDateChange? TargetDateChange { get; set; }
    }

    public class RecommendationNutritionChange
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid RecommendationId { get; set; }
        public AdaptiveRecommendation Recommendation { get; set; } = null!;

        public int? CurrentCalories { get; set; }
        public int? SuggestedCalories { get; set; }
        public int? CurrentProtein { get; set; }
        public int? SuggestedProtein { get; set; }
        public int? CurrentCarbs { get; set; }
        public int? SuggestedCarbs { get; set; }
        public int? CurrentFat { get; set; }
        public int? SuggestedFat { get; set; }
    }

    public class RecommendationExerciseTargetChange
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid RecommendationId { get; set; }
        public AdaptiveRecommendation Recommendation { get; set; } = null!;

        public Guid ExerciseId { get; set; }
        public Exercise Exercise { get; set; } = null!;

        public int? CurrentTargetSets { get; set; }
        public int? SuggestedTargetSets { get; set; }
        public int? MinReps { get; set; }
        public int? MaxReps { get; set; }
        public decimal? CurrentTargetWeightKg { get; set; }
        public decimal? SuggestedTargetWeightKg { get; set; }
        public ExerciseProgressionModel ProgressionModel { get; set; } =
            ExerciseProgressionModel.DoubleProgression;
    }

    public class RecommendationRecoveryAction
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid RecommendationId { get; set; }
        public AdaptiveRecommendation Recommendation { get; set; } = null!;

        public string RecommendedSession { get; set; } = "";
        public string Intensity { get; set; } = "";
        public string FocusMusclesText { get; set; } = "";
        public string RestMusclesText { get; set; } = "";
    }

    public class RecommendationTargetDateChange
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid RecommendationId { get; set; }
        public AdaptiveRecommendation Recommendation { get; set; } = null!;

        public DateTime CurrentTargetDateUtc { get; set; }
        public DateTime SuggestedTargetDateUtc { get; set; }
        public double CurrentWeeklyPaceKg { get; set; }
        public double SuggestedWeeklyPaceKg { get; set; }
    }
}
