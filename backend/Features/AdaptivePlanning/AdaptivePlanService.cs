using backend.Data;
using backend.Features.Users;
using Microsoft.EntityFrameworkCore;

namespace backend.Features.AdaptivePlanning
{
    public class AdaptivePlanService
    {
        private readonly AppDbContext _db;
        private readonly WeeklyReportService _weeklyReportService;
        private readonly RecommendationService _recommendationService;

        public AdaptivePlanService(
            AppDbContext db,
            WeeklyReportService weeklyReportService,
            RecommendationService recommendationService)
        {
            _db = db;
            _weeklyReportService = weeklyReportService;
            _recommendationService = recommendationService;
        }

        public async Task<TodayFocusDto> GetTodayFocusAsync(
            string userId,
            CancellationToken ct = default)
        {
            var report = await _weeklyReportService.GetOrGenerateCurrentAsync(userId, ct);
            var pending = await _recommendationService.GetPendingAsync(userId, ct);
            var settings = await _db.UserSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == userId, ct)
                ?? new UserSettings { UserId = userId };
            var todayNutrition = await GetTodayNutritionAsync(userId, settings, ct);
            var planRecommendations = pending
                .Where(IsBodyPlanRecommendation)
                .ToList();
            var primaryRecommendation = planRecommendations.FirstOrDefault(x => x.NutritionChange != null)
                ?? planRecommendations.FirstOrDefault();

            var mainAction = primaryRecommendation?.Title
                ?? BuildMainAction(todayNutrition, report);
            var why = primaryRecommendation?.Explanation
                ?? report.SummaryText;
            var focus = report.WeightSummary?.Insight
                ?? "Logg vekt jevnt, så blir planen mer presis.";
            var secondaryLine = BuildSecondaryLine(report);

            return new TodayFocusDto
            {
                MainAction = mainAction,
                Why = why,
                Focus = focus,
                Nutrition = todayNutrition.Line,
                Recovery = secondaryLine,
                DataQuality = CombineTodayQuality(report.DataQuality, todayNutrition.Confidence),
                WeeklyReportId = report.Id,
                Recommendations = planRecommendations.Take(3).Select(AdaptiveMapper.ToDto).ToList()
            };
        }

        private async Task<TodayNutritionFocus> GetTodayNutritionAsync(
            string userId,
            UserSettings settings,
            CancellationToken ct)
        {
            var today = AdaptivePlanningClock.Today();
            var todayStartUtc = AdaptivePlanningClock.StartOfDayUtc(today);
            var tomorrowStartUtc = AdaptivePlanningClock.EndExclusiveUtc(today);
            var totals = await _db.FoodLogs
                .AsNoTracking()
                .Where(x => x.UserId == userId &&
                            x.TimestampUtc >= todayStartUtc &&
                            x.TimestampUtc < tomorrowStartUtc)
                .GroupBy(x => 1)
                .Select(g => new
                {
                    Meals = g.Count(),
                    Calories = g.Sum(x => x.Calories),
                    Protein = g.Sum(x => x.Proteins)
                })
                .FirstOrDefaultAsync(ct);

            if (totals == null || totals.Meals == 0)
            {
                return new TodayNutritionFocus
                {
                    Line = $"Logg første måltid. Dagens mål: {settings.ProteinGoal} g protein.",
                    Confidence = DataQualityLevel.Low
                };
            }

            var proteinRemaining = Math.Max(0, settings.ProteinGoal - totals.Protein);
            var caloriesRemaining = Math.Max(0, settings.CalorieGoal - totals.Calories);
            var confidence = totals.Meals >= 3
                ? DataQualityLevel.High
                : totals.Meals >= 2
                    ? DataQualityLevel.Medium
                    : DataQualityLevel.Low;

            var line = proteinRemaining > 0
                ? $"Du mangler ca. {proteinRemaining} g protein i dag. {caloriesRemaining} kcal igjen."
                : $"Proteinmålet er truffet. Ca. {caloriesRemaining} kcal igjen.";

            return new TodayNutritionFocus
            {
                Line = line,
                Confidence = confidence
            };
        }

        private static bool IsBodyPlanRecommendation(AdaptiveRecommendation recommendation)
        {
            return recommendation.Type is AdaptiveRecommendationType.HoldCalories
                or AdaptiveRecommendationType.ReduceCalories
                or AdaptiveRecommendationType.IncreaseCalories
                or AdaptiveRecommendationType.IncreaseProtein
                or AdaptiveRecommendationType.AdjustTargetDate
                or AdaptiveRecommendationType.NeedMoreData;
        }

        private static string BuildMainAction(
            TodayNutritionFocus todayNutrition,
            WeeklyReport report)
        {
            if (report.DataQuality == DataQualityLevel.Low)
                return IsEarlyInReportWeek(report)
                    ? "Start uken rolig og logg jevnt"
                    : "Hold planen stabil mens grunnlaget bygges";

            if (report.WeightSummary?.Status is "behind" or "slightlyBehind")
                return "Vurder en liten justering, ikke et stort hopp";

            if (report.WeightSummary?.Status == "tooAggressive")
                return "Gjør planen litt roligere i dag";

            if (report.RecoverySummary?.RestMusclesText is { Length: > 0 } rest &&
                rest != "Ingen tydelige begrensninger" &&
                rest != "Ingen data")
                return "La recovery styre neste økt";

            if (todayNutrition.Confidence == DataQualityLevel.Low)
                return "Få inn dagens første måltid";

            return "Hold planen rolig i dag";
        }

        private static string BuildSecondaryLine(WeeklyReport report)
        {
            if (IsEarlyInReportWeek(report) &&
                (report.NutritionSummary?.LoggedDays ?? 0) < 3)
                return "Tidlig uke: de første loggene setter retningen.";

            if (report.RecoverySummary != null)
                return $"{report.RecoverySummary.RecommendedNextSession}: {report.RecoverySummary.IntensityRecommendation}.";

            if (report.NutritionSummary == null)
                return "Matloggen styrer dagens råd.";

            return report.NutritionSummary.LoggedDays >= 5
                ? "God matdekning denne uken."
                : $"Matlogg: {report.NutritionSummary.LoggedDays} av 7 dager.";
        }

        private static bool IsEarlyInReportWeek(WeeklyReport report)
        {
            var today = AdaptivePlanningClock.Today();
            if (today < report.WeekStart || today > report.WeekEnd) return false;
            return today.DayNumber - report.WeekStart.DayNumber <= 1;
        }

        private static DataQualityLevel CombineTodayQuality(
            DataQualityLevel report,
            DataQualityLevel nutrition)
        {
            var levels = new[] { report, nutrition };
            if (levels.All(x => x == DataQualityLevel.High)) return DataQualityLevel.High;
            if (levels.All(x => x != DataQualityLevel.Low)) return DataQualityLevel.Medium;
            return DataQualityLevel.Low;
        }

        private sealed class TodayNutritionFocus
        {
            public string Line { get; set; } = "";
            public DataQualityLevel Confidence { get; set; }
        }
    }
}
