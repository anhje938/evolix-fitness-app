using backend.Data;
using backend.Features.Users;
using Microsoft.EntityFrameworkCore;

namespace backend.Features.AdaptivePlanning
{
    public class NutritionAnalysisService
    {
        private const int MinimumCompleteCalorieDay = 800;

        private readonly AppDbContext _db;

        public NutritionAnalysisService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<NutritionAnalysis> AnalyzeAsync(
            string userId,
            WeekWindow week,
            UserSettings settings,
            CancellationToken ct = default)
        {
            var logs = await _db.FoodLogs
                .AsNoTracking()
                .Where(x => x.UserId == userId &&
                            x.TimestampUtc >= week.StartUtc &&
                            x.TimestampUtc < week.EndExclusiveUtc)
                .Select(x => new
                {
                    x.TimestampUtc,
                    x.Calories,
                    x.Proteins,
                    x.Carbs,
                    x.Fats
                })
                .ToListAsync(ct);

            var days = logs
                .GroupBy(x => AdaptivePlanningClock.ToLocalDate(x.TimestampUtc))
                .Select(g => new
                {
                    Calories = g.Sum(x => x.Calories),
                    Protein = g.Sum(x => x.Proteins),
                    Carbs = g.Sum(x => x.Carbs),
                    Fat = g.Sum(x => x.Fats)
                })
                .ToList();

            var completeDays = days
                .Where(x => x.Calories >= MinimumCompleteCalorieDay)
                .ToList();
            var incompleteDays = days.Count - completeDays.Count;
            var loggedDays = completeDays.Count;
            int? avgCalories = loggedDays > 0 ? (int)Math.Round(completeDays.Average(x => x.Calories)) : null;
            int? avgProtein = loggedDays > 0 ? (int)Math.Round(completeDays.Average(x => x.Protein)) : null;
            int? avgCarbs = loggedDays > 0 ? (int)Math.Round(completeDays.Average(x => x.Carbs)) : null;
            int? avgFat = loggedDays > 0 ? (int)Math.Round(completeDays.Average(x => x.Fat)) : null;
            var confidence = loggedDays >= 5
                ? DataQualityLevel.High
                : loggedDays >= 3
                    ? DataQualityLevel.Medium
                    : DataQualityLevel.Low;
            var status = GetStatus(avgCalories, settings.CalorieGoal, loggedDays);

            return new NutritionAnalysis
            {
                LoggedDays = loggedDays,
                AverageCalories = avgCalories,
                TargetCalories = settings.CalorieGoal,
                AverageProtein = avgProtein,
                TargetProtein = settings.ProteinGoal,
                AverageCarbs = avgCarbs,
                TargetCarbs = settings.CarbGoal,
                AverageFat = avgFat,
                TargetFat = settings.FatGoal,
                Confidence = confidence,
                Status = status,
                Insight = BuildInsight(avgCalories, avgProtein, settings, loggedDays, incompleteDays, confidence)
            };
        }

        private static string GetStatus(int? avgCalories, int targetCalories, int loggedDays)
        {
            if (loggedDays < 3 || !avgCalories.HasValue || targetCalories <= 0) return "notEnoughData";

            var diffRatio = Math.Abs(avgCalories.Value - targetCalories) / (double)targetCalories;
            return diffRatio <= 0.08 ? "onTarget" : "attention";
        }

        private static string BuildInsight(
            int? avgCalories,
            int? avgProtein,
            UserSettings settings,
            int loggedDays,
            int incompleteDays,
            DataQualityLevel confidence)
        {
            var incompleteText = incompleteDays > 0
                ? $" {incompleteDays} korte matdager er holdt utenfor snittet."
                : "";

            if (confidence == DataQualityLevel.Low)
                return $"Du logget {loggedDays} brukbare matdager. EvoliX trenger minst 3 dager for rolige råd og helst 5+ for høy sikkerhet.{incompleteText}";

            var proteinGap = avgProtein.HasValue ? settings.ProteinGoal - avgProtein.Value : 0;
            if (proteinGap > 15)
                return $"Kaloriene kan vurderes, men protein ligger i snitt {proteinGap} g under målet. Prioriter protein først.{incompleteText}";

            if (avgCalories.HasValue)
            {
                var calorieGap = avgCalories.Value - settings.CalorieGoal;
                if (Math.Abs(calorieGap) <= Math.Max(100, settings.CalorieGoal * 0.05))
                    return $"Kaloriene dine ligger stabilt nær målet denne uken.{incompleteText}";
            }

            return $"Matloggen gir nok data til en forsiktig vurdering av neste uke.{incompleteText}";
        }
    }
}
