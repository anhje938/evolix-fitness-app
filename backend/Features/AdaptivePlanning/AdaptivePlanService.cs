namespace backend.Features.AdaptivePlanning
{
    public class AdaptivePlanService
    {
        private readonly WeeklyReportService _weeklyReportService;
        private readonly RecommendationService _recommendationService;

        public AdaptivePlanService(
            WeeklyReportService weeklyReportService,
            RecommendationService recommendationService)
        {
            _weeklyReportService = weeklyReportService;
            _recommendationService = recommendationService;
        }

        public async Task<TodayFocusDto> GetTodayFocusAsync(
            string userId,
            CancellationToken ct = default)
        {
            var report = await _weeklyReportService.GetOrGenerateCurrentAsync(userId, ct);
            var pending = await _recommendationService.GetPendingAsync(userId, ct);
            var recovery = report.RecoverySummary;
            var nutrition = report.NutritionSummary;

            var mainAction = recovery?.RecommendedNextSession is { Length: > 0 }
                ? $"Tren {recovery.RecommendedNextSession}"
                : "Logg dagens plan";
            var why = recovery?.Insight ?? report.SummaryText;
            var focus = pending.FirstOrDefault(x => x.ExerciseTargetChange != null)?.Title
                ?? pending.FirstOrDefault()?.Title
                ?? "Hold planen stabil i dag";
            var nutritionLine = nutrition == null
                ? "Logg mat for bedre råd."
                : nutrition.AverageProtein.HasValue && nutrition.AverageProtein.Value < nutrition.TargetProtein
                    ? $"Prioriter protein: mål {nutrition.TargetProtein} g."
                    : $"Hold ca. {nutrition.TargetCalories} kcal.";
            var recoveryLine = recovery == null
                ? "Recovery trenger mer treningsdata."
                : $"{recovery.IntensityRecommendation}. Klar: {recovery.ReadyMusclesText}.";

            return new TodayFocusDto
            {
                MainAction = mainAction,
                Why = why,
                Focus = focus,
                Nutrition = nutritionLine,
                Recovery = recoveryLine,
                DataQuality = report.DataQuality,
                WeeklyReportId = report.Id,
                Recommendations = pending.Take(3).Select(AdaptiveMapper.ToDto).ToList()
            };
        }
    }
}
