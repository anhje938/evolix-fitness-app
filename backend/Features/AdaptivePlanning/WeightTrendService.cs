using backend.Data;
using backend.Features.Users;
using Microsoft.EntityFrameworkCore;

namespace backend.Features.AdaptivePlanning
{
    public class WeightTrendService
    {
        private const double MaxWeeklyGainKg = 0.75;
        private const double MaxWeeklyLossKg = 1.0;
        private const double MaxWeeklyLossBodyweightFraction = 0.01;

        private readonly AppDbContext _db;

        public WeightTrendService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<WeightTrendAnalysis> AnalyzeAsync(
            string userId,
            WeekWindow week,
            UserSettings settings,
            CancellationToken ct = default)
        {
            var start = AdaptivePlanningClock.StartOfDayUtc(week.Start.AddDays(-14));
            var end = week.EndExclusiveUtc;

            var raw = await _db.WeightLogs
                .AsNoTracking()
                .Where(x => x.UserId == userId && x.TimestampUtc >= start && x.TimestampUtc < end)
                .OrderBy(x => x.TimestampUtc)
                .Select(x => new { x.TimestampUtc, x.WeightKg })
                .ToListAsync(ct);

            var daily = raw
                .GroupBy(x => AdaptivePlanningClock.ToLocalDate(x.TimestampUtc))
                .Select(g => new WeightPoint(g.Key, g.Average(x => x.WeightKg)))
                .OrderBy(x => x.Date)
                .ToList();

            var filtered = RemoveObviousOutliers(daily);
            var recentStart = week.Start;
            var recentEnd = week.End;
            var previousStart = week.Start.AddDays(-7);
            var previousEnd = week.Start.AddDays(-1);

            var recent = filtered
                .Where(x => x.Date >= recentStart && x.Date <= recentEnd)
                .Select(x => x.WeightKg)
                .ToList();
            var previous = filtered
                .Where(x => x.Date >= previousStart && x.Date <= previousEnd)
                .Select(x => x.WeightKg)
                .ToList();

            var recentAvg = recent.Count > 0 ? recent.Average() : (double?)null;
            var previousAvg = previous.Count > 0 ? previous.Average() : (double?)null;
            var weeklyChange = recentAvg.HasValue && previousAvg.HasValue
                ? recentAvg.Value - previousAvg.Value
                : (double?)null;

            var expected = GetExpectedWeeklyChange(settings, recentAvg);
            var expectedWeeklyChange = expected.Value;
            var estimatedGoalDate = EstimateGoalDate(settings, recentAvg, weeklyChange, week.End);
            var confidence = GetConfidence(recent.Count, previous.Count, filtered.Count);
            var status = GetStatus(settings.WeightDirection, weeklyChange, expectedWeeklyChange, confidence);

            return new WeightTrendAnalysis
            {
                PreviousAverageKg = previousAvg,
                RecentAverageKg = recentAvg,
                WeeklyChangeKg = weeklyChange,
                ExpectedWeeklyChangeKg = expectedWeeklyChange,
                RawExpectedWeeklyChangeKg = expected.RawValue,
                GoalPaceClipped = expected.Clipped,
                EstimatedGoalDate = estimatedGoalDate,
                RecentLogsCount = recent.Count,
                TotalLogsCount = filtered.Count,
                Confidence = confidence,
                Status = status,
                Insight = BuildInsight(status, weeklyChange, expectedWeeklyChange, expected.Clipped, confidence)
            };
        }

        private static List<WeightPoint> RemoveObviousOutliers(List<WeightPoint> points)
        {
            var filtered = new List<WeightPoint>();
            WeightPoint? previous = null;

            foreach (var point in points)
            {
                if (previous != null)
                {
                    var maxJump = Math.Max(2.5, previous.WeightKg * 0.03);
                    if (Math.Abs(point.WeightKg - previous.WeightKg) > maxJump)
                    {
                        continue;
                    }
                }

                filtered.Add(point);
                previous = point;
            }

            return filtered;
        }

        private static ExpectedWeeklyChange GetExpectedWeeklyChange(UserSettings settings, double? trendWeightKg)
        {
            if (!trendWeightKg.HasValue) return new ExpectedWeeklyChange(null, null, false);
            if (settings.WeightDirection == WeightDirection.Maintain) return new ExpectedWeeklyChange(0, 0, false);

            var today = AdaptivePlanningClock.Today();
            var targetDate = AdaptivePlanningClock.ToLocalDate(settings.WeightGoalTimeUtc);
            var daysRemaining = Math.Max(1, targetDate.DayNumber - today.DayNumber);
            var weeksRemaining = daysRemaining / 7.0;
            var raw = ((double)settings.WeightGoalKg - trendWeightKg.Value) / weeksRemaining;
            var safeRate = GetSafeWeeklyRate(settings.WeightDirection, trendWeightKg.Value);
            var clipped = settings.WeightDirection == WeightDirection.Gain
                ? Math.Clamp(raw, 0, safeRate)
                : Math.Clamp(raw, -safeRate, 0);

            return new ExpectedWeeklyChange(clipped, raw, Math.Abs(raw - clipped) > 0.01);
        }

        private static double GetSafeWeeklyRate(WeightDirection direction, double trendWeightKg)
        {
            if (direction == WeightDirection.Gain) return MaxWeeklyGainKg;
            if (direction == WeightDirection.Lose)
                return Math.Min(
                    MaxWeeklyLossKg,
                    Math.Max(0.25, trendWeightKg * MaxWeeklyLossBodyweightFraction));
            return 0;
        }

        private static DateOnly? EstimateGoalDate(
            UserSettings settings,
            double? trendWeightKg,
            double? weeklyChangeKg,
            DateOnly fallbackStart)
        {
            if (!trendWeightKg.HasValue || !weeklyChangeKg.HasValue) return null;
            if (Math.Abs(weeklyChangeKg.Value) < 0.05) return null;

            var remaining = (double)settings.WeightGoalKg - trendWeightKg.Value;
            if (Math.Sign(remaining) != Math.Sign(weeklyChangeKg.Value)) return null;

            var weeks = remaining / weeklyChangeKg.Value;
            if (!double.IsFinite(weeks) || weeks < 0 || weeks > 260) return null;

            return fallbackStart.AddDays((int)Math.Round(weeks * 7));
        }

        private static DataQualityLevel GetConfidence(int recentCount, int previousCount, int totalCount)
        {
            if (recentCount >= 3 && previousCount >= 3 && totalCount >= 8)
                return DataQualityLevel.High;
            if (recentCount >= 2 && totalCount >= 4)
                return DataQualityLevel.Medium;
            return DataQualityLevel.Low;
        }

        private static string GetStatus(
            WeightDirection direction,
            double? weeklyChange,
            double? expectedWeeklyChange,
            DataQualityLevel confidence)
        {
            if (confidence == DataQualityLevel.Low || !weeklyChange.HasValue || !expectedWeeklyChange.HasValue)
                return "notEnoughData";

            if (direction == WeightDirection.Maintain)
            {
                if (Math.Abs(weeklyChange.Value) <= 0.2) return "maintaining";
                return weeklyChange.Value > 0 ? "gaining" : "losing";
            }

            var expectedAbs = Math.Abs(expectedWeeklyChange.Value);
            if (expectedAbs < 0.05) return "maintaining";
            var actualTowardGoal = direction == WeightDirection.Lose
                ? -weeklyChange.Value
                : weeklyChange.Value;

            if (actualTowardGoal >= expectedAbs * 0.8 && actualTowardGoal <= expectedAbs * 1.3)
                return "onTrack";
            if (actualTowardGoal >= expectedAbs * 0.5 && actualTowardGoal < expectedAbs * 0.8)
                return "slightlyBehind";
            if (actualTowardGoal < expectedAbs * 0.5)
                return "behind";
            return "tooAggressive";
        }

        private static string BuildInsight(
            string status,
            double? weeklyChange,
            double? expectedWeeklyChange,
            bool goalPaceClipped,
            DataQualityLevel confidence)
        {
            if (confidence == DataQualityLevel.Low)
                return "EvoliX trenger flere vektmålinger før vekttrenden kan brukes trygt.";

            var trend = weeklyChange.HasValue ? $"{weeklyChange.Value:+0.0;-0.0;0.0} kg/uke" : "ukjent";
            var expected = expectedWeeklyChange.HasValue ? $"{expectedWeeklyChange.Value:+0.0;-0.0;0.0} kg/uke" : "ukjent";
            var clippedText = goalPaceClipped
                ? " Måldatoen krever mer fart enn anbefalt, så planen er klippet til tryggere tempo."
                : "";

            return status switch
            {
                "onTrack" => $"Vekttrenden er nær målet ditt ({trend} mot plan {expected}).{clippedText}",
                "slightlyBehind" => $"Vekttrenden er litt bak plan ({trend} mot plan {expected}).{clippedText}",
                "behind" => $"Vekttrenden går tregere enn målet tilsier ({trend} mot plan {expected}).{clippedText}",
                "tooAggressive" => $"Vekttrenden går raskere enn planlagt ({trend} mot plan {expected}).{clippedText}",
                "maintaining" => $"Vekttrenden er stabil denne uken.{clippedText}",
                "gaining" => $"Vekttrenden peker oppover ({trend}).{clippedText}",
                "losing" => $"Vekttrenden peker nedover ({trend}).{clippedText}",
                _ => "Vekttrenden trenger mer data."
            };
        }

        private sealed record WeightPoint(DateOnly Date, double WeightKg);
        private sealed record ExpectedWeeklyChange(double? Value, double? RawValue, bool Clipped);
    }
}
