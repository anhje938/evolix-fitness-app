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
        private readonly TrainingAnalysisService _trainingAnalysisService;
        private readonly RecoveryAnalysisService _recoveryAnalysisService;

        public AdaptivePlanService(
            AppDbContext db,
            WeeklyReportService weeklyReportService,
            RecommendationService recommendationService,
            TrainingAnalysisService trainingAnalysisService,
            RecoveryAnalysisService recoveryAnalysisService)
        {
            _db = db;
            _weeklyReportService = weeklyReportService;
            _recommendationService = recommendationService;
            _trainingAnalysisService = trainingAnalysisService;
            _recoveryAnalysisService = recoveryAnalysisService;
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
            var recovery = await GetLiveRecoveryAsync(userId, ct);
            var latestWorkout = await _db.WorkoutSessions
                .AsNoTracking()
                .Where(x => x.UserId == userId && x.FinishedAtUtc != null)
                .OrderByDescending(x => x.StartedAtUtc)
                .Select(x => new { x.Title, x.StartedAtUtc })
                .FirstOrDefaultAsync(ct);

            var mainAction = recovery.RecommendedNextSession is { Length: > 0 } &&
                             recovery.RecommendedNextSession != "Logg en Ã¸kt"
                ? $"{recovery.RecommendedNextSession}"
                : "Logg dagens plan";
            var why = recovery.Insight.Length > 0 ? recovery.Insight : report.SummaryText;
            var focus = pending.FirstOrDefault(x => x.ExerciseTargetChange != null)?.Title
                ?? pending.FirstOrDefault()?.Title
                ?? BuildLatestWorkoutFocus(latestWorkout?.Title, latestWorkout?.StartedAtUtc)
                ?? "Hold planen stabil i dag";
            var recoveryLine = $"{recovery.IntensityRecommendation}. Klar: {recovery.ReadyMusclesText}.";

            return new TodayFocusDto
            {
                MainAction = mainAction,
                Why = why,
                Focus = focus,
                Nutrition = todayNutrition.Line,
                Recovery = recoveryLine,
                DataQuality = CombineTodayQuality(report.DataQuality, todayNutrition.Confidence, recovery.Confidence),
                WeeklyReportId = report.Id,
                Recommendations = pending.Take(3).Select(AdaptiveMapper.ToDto).ToList()
            };
        }

        private async Task<TodayNutritionFocus> GetTodayNutritionAsync(
            string userId,
            UserSettings settings,
            CancellationToken ct)
        {
            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);
            var totals = await _db.FoodLogs
                .AsNoTracking()
                .Where(x => x.UserId == userId &&
                            x.TimestampUtc >= today &&
                            x.TimestampUtc < tomorrow)
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
                    Line = $"Logg fÃ¸rste mÃ¥ltid. Dagens mÃ¥l: {settings.ProteinGoal} g protein.",
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
                : $"ProteinmÃ¥let er truffet. Ca. {caloriesRemaining} kcal igjen.";

            return new TodayNutritionFocus
            {
                Line = line,
                Confidence = confidence
            };
        }

        private async Task<RecoveryAnalysis> GetLiveRecoveryAsync(
            string userId,
            CancellationToken ct)
        {
            var now = DateTime.UtcNow;
            var rollingTraining = await _trainingAnalysisService.AnalyzeRollingAsync(
                userId,
                now.AddDays(-14),
                now.AddMinutes(1),
                ct);

            return _recoveryAnalysisService.Analyze(rollingTraining);
        }

        private static string? BuildLatestWorkoutFocus(string? title, DateTime? startedAtUtc)
        {
            if (string.IsNullOrWhiteSpace(title) || !startedAtUtc.HasValue) return null;

            var hoursAgo = (DateTime.UtcNow - startedAtUtc.Value).TotalHours;
            return hoursAgo <= 30
                ? $"Sist Ã¸kt: {title.Trim()}. La recovery styre neste valg."
                : null;
        }

        private static DataQualityLevel CombineTodayQuality(
            DataQualityLevel report,
            DataQualityLevel nutrition,
            DataQualityLevel recovery)
        {
            var levels = new[] { report, nutrition, recovery };
            var usable = levels.Count(x => x != DataQualityLevel.Low);
            if (usable >= 2 && levels.Count(x => x == DataQualityLevel.High) >= 2)
                return DataQualityLevel.High;
            if (usable >= 2) return DataQualityLevel.Medium;
            return DataQualityLevel.Low;
        }

        private sealed class TodayNutritionFocus
        {
            public string Line { get; set; } = "";
            public DataQualityLevel Confidence { get; set; }
        }
    }
}
