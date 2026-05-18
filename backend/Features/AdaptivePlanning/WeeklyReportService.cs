using backend.Data;
using backend.Features.Users;
using Microsoft.EntityFrameworkCore;

namespace backend.Features.AdaptivePlanning
{
    public class WeeklyReportService
    {
        public const string AlgorithmVersion = "adaptive-plan-v1.2";
        private const double KcalPerKg = 7700;

        private readonly AppDbContext _db;
        private readonly WeightTrendService _weightTrend;
        private readonly NutritionAnalysisService _nutrition;
        private readonly TrainingAnalysisService _training;
        private readonly RecoveryAnalysisService _recovery;

        public WeeklyReportService(
            AppDbContext db,
            WeightTrendService weightTrend,
            NutritionAnalysisService nutrition,
            TrainingAnalysisService training,
            RecoveryAnalysisService recovery)
        {
            _db = db;
            _weightTrend = weightTrend;
            _nutrition = nutrition;
            _training = training;
            _recovery = recovery;
        }

        public async Task<WeeklyReport> GetOrGenerateCurrentAsync(
            string userId,
            CancellationToken ct = default)
        {
            var week = GetCurrentWeek();
            var existing = await FindReportAsync(userId, week, ct);
            if (existing != null) return existing;
            return await GenerateAsync(userId, week, ct);
        }

        public async Task<List<WeeklyReport>> GetHistoryAsync(
            string userId,
            int limit = 12,
            CancellationToken ct = default)
        {
            return await IncludeReportGraph(_db.WeeklyReports.AsNoTracking())
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.WeekStart)
                .Take(Math.Clamp(limit, 1, 52))
                .ToListAsync(ct);
        }

        public async Task<WeeklyReport> GenerateCurrentAsync(
            string userId,
            CancellationToken ct = default)
        {
            var week = GetCurrentWeek();
            var existing = await FindReportAsync(userId, week, ct);
            if (existing != null) return existing;
            return await GenerateAsync(userId, week, ct);
        }

        public async Task<WeeklyReport> RegenerateCurrentAsync(
            string userId,
            CancellationToken ct = default)
        {
            var week = GetCurrentWeek();
            var existing = await FindReportAsync(userId, week, ct);
            if (existing != null)
            {
                if (existing.Recommendations.Count > 0)
                {
                    _db.AdaptiveRecommendations.RemoveRange(existing.Recommendations);
                }

                _db.WeeklyReports.Remove(existing);
                await _db.SaveChangesAsync(ct);
            }

            return await GenerateAsync(userId, week, ct);
        }

        public async Task<WeeklyReportFreshness> GetFreshnessAsync(
            string userId,
            WeeklyReport report,
            CancellationToken ct = default)
        {
            var dataThrough = report.GeneratedAtUtc;
            var foodLogs = await _db.FoodLogs
                .AsNoTracking()
                .CountAsync(x => x.UserId == userId && x.TimestampUtc > dataThrough, ct);
            var weightLogs = await _db.WeightLogs
                .AsNoTracking()
                .CountAsync(x => x.UserId == userId && x.TimestampUtc > dataThrough, ct);
            var settingsChanged = await _db.UserSettings
                .AsNoTracking()
                .AnyAsync(x => x.UserId == userId && x.UpdatedUtc > dataThrough, ct);

            var reasons = new List<string>();
            if (foodLogs > 0) reasons.Add($"{foodLogs} nye måltider");
            if (weightLogs > 0) reasons.Add($"{weightLogs} nye vektmålinger");
            if (settingsChanged) reasons.Add("endrede innstillinger");

            return new WeeklyReportFreshness
            {
                DataThroughUtc = dataThrough,
                IsStale = reasons.Count > 0,
                StaleReason = reasons.Count == 0
                    ? ""
                    : $"Rapporten er basert på data fram til {dataThrough:dd.MM HH:mm} UTC. Etter dette finnes {string.Join(", ", reasons)}."
            };
        }

        private async Task<WeeklyReport?> FindReportAsync(
            string userId,
            WeekWindow week,
            CancellationToken ct)
        {
            return await IncludeReportGraph(_db.WeeklyReports)
                .FirstOrDefaultAsync(
                    x => x.UserId == userId &&
                         x.WeekStart == week.Start &&
                         x.WeekEnd == week.End &&
                         x.AlgorithmVersion == AlgorithmVersion,
                    ct);
        }

        private async Task<WeeklyReport> GenerateAsync(
            string userId,
            WeekWindow week,
            CancellationToken ct)
        {
            var settings = await _db.UserSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == userId, ct)
                ?? new UserSettings { UserId = userId };

            var weight = await _weightTrend.AnalyzeAsync(userId, week, settings, ct);
            var nutrition = await _nutrition.AnalyzeAsync(userId, week, settings, ct);
            var training = await _training.AnalyzeAsync(userId, week, ct);
            var recoveryTraining = await _training.AnalyzeRollingAsync(
                userId,
                week.StartUtc.AddDays(-14),
                week.EndExclusiveUtc,
                ct);
            var recovery = _recovery.Analyze(recoveryTraining);
            var dataQuality = CombineQuality(weight.Confidence, nutrition.Confidence);
            int? score = CalculateScore(weight, nutrition, training, recovery);

            var report = new WeeklyReport
            {
                UserId = userId,
                WeekStart = week.Start,
                WeekEnd = week.End,
                GeneratedAtUtc = DateTime.UtcNow,
                DataQuality = dataQuality,
                OverallScore = score,
                SummaryText = BuildSummary(dataQuality, weight, nutrition),
                AlgorithmVersion = AlgorithmVersion,
                WeightSummary = new WeeklyReportWeightSummary
                {
                    StartTrendWeightKg = weight.PreviousAverageKg,
                    EndTrendWeightKg = weight.RecentAverageKg,
                    WeeklyChangeKg = weight.WeeklyChangeKg,
                    ExpectedWeeklyChangeKg = weight.ExpectedWeeklyChangeKg,
                    EstimatedGoalDate = weight.EstimatedGoalDate,
                    WeightLogsCount = weight.RecentLogsCount,
                    Status = weight.Status,
                    Insight = weight.Insight
                },
                NutritionSummary = new WeeklyReportNutritionSummary
                {
                    LoggedDays = nutrition.LoggedDays,
                    AverageCalories = nutrition.AverageCalories,
                    TargetCalories = nutrition.TargetCalories,
                    AverageProtein = nutrition.AverageProtein,
                    TargetProtein = nutrition.TargetProtein,
                    AverageCarbs = nutrition.AverageCarbs,
                    TargetCarbs = nutrition.TargetCarbs,
                    AverageFat = nutrition.AverageFat,
                    TargetFat = nutrition.TargetFat,
                    Status = nutrition.Status,
                    Insight = nutrition.Insight
                },
                TrainingSummary = new WeeklyReportTrainingSummary
                {
                    CompletedWorkouts = training.CompletedWorkouts,
                    TotalSets = training.TotalSets,
                    TotalReps = training.TotalReps,
                    TotalVolumeKg = training.TotalVolumeKg,
                    ExercisesImproved = training.ExercisesImproved,
                    ExercisesMaintained = training.ExercisesMaintained,
                    ExercisesDecreased = training.ExercisesDecreased,
                    BestProgressExerciseId = training.BestProgressExerciseId,
                    BestProgressText = training.BestProgressText,
                    Insight = training.Insight
                },
                RecoverySummary = new WeeklyReportRecoverySummary
                {
                    ReadyMusclesText = recovery.ReadyMusclesText,
                    RestMusclesText = recovery.RestMusclesText,
                    RecommendedNextSession = recovery.RecommendedNextSession,
                    IntensityRecommendation = recovery.IntensityRecommendation,
                    Insight = recovery.Insight
                }
            };

            foreach (var load in training.MuscleLoads.Values.OrderByDescending(x => x.Sets).Take(12))
            {
                report.MuscleBalance.Add(new WeeklyReportMuscleBalanceSummary
                {
                    Muscle = load.Muscle,
                    Sets = decimal.Round(load.Sets, 2),
                    VolumeKg = Math.Round(load.VolumeKg, 1)
                });
            }

            foreach (var action in BuildNextWeekActions(weight, nutrition))
            {
                report.NextWeekActions.Add(action);
            }

            foreach (var recommendation in BuildRecommendations(userId, report, settings, weight, nutrition, dataQuality))
            {
                report.Recommendations.Add(recommendation);
            }

            _db.WeeklyReports.Add(report);
            await _db.SaveChangesAsync(ct);

            return await FindReportAsync(userId, week, ct) ?? report;
        }

        private static WeekWindow GetCurrentWeek()
        {
            var today = AdaptivePlanningClock.Today();
            var dayOffset = ((int)today.DayOfWeek + 6) % 7;
            var start = today.AddDays(-dayOffset);
            return new WeekWindow(start, start.AddDays(6));
        }

        private static IQueryable<WeeklyReport> IncludeReportGraph(IQueryable<WeeklyReport> query)
        {
            return query
                .Include(x => x.WeightSummary)
                .Include(x => x.NutritionSummary)
                .Include(x => x.TrainingSummary)
                .Include(x => x.RecoverySummary)
                .Include(x => x.MuscleBalance)
                .Include(x => x.NextWeekActions)
                .Include(x => x.Recommendations)
                    .ThenInclude(x => x.NutritionChange)
                .Include(x => x.Recommendations)
                    .ThenInclude(x => x.ExerciseTargetChange)
                    .ThenInclude(x => x!.Exercise)
                .Include(x => x.Recommendations)
                    .ThenInclude(x => x.RecoveryAction)
                .Include(x => x.Recommendations)
                    .ThenInclude(x => x.TargetDateChange);
        }

        private static DataQualityLevel CombineQuality(params DataQualityLevel[] levels)
        {
            if (levels.Length == 0) return DataQualityLevel.Low;
            if (levels.All(x => x == DataQualityLevel.High)) return DataQualityLevel.High;
            if (levels.All(x => x != DataQualityLevel.Low)) return DataQualityLevel.Medium;
            return DataQualityLevel.Low;
        }

        private static int? CalculateScore(
            WeightTrendAnalysis weight,
            NutritionAnalysis nutrition,
            TrainingAnalysis training,
            RecoveryAnalysis recovery)
        {
            double weightedScore = 0;
            double availableWeight = 0;

            var nutritionScore = 0.0;
            if (nutrition.AverageCalories.HasValue && nutrition.TargetCalories > 0)
            {
                var adherence = 1 - Math.Abs(nutrition.AverageCalories.Value - nutrition.TargetCalories) /
                    (double)nutrition.TargetCalories;
                nutritionScore += Math.Clamp(adherence, 0, 1) * 15;
            }

            if (nutrition.AverageProtein.HasValue && nutrition.TargetProtein > 0)
            {
                nutritionScore += Math.Clamp(nutrition.AverageProtein.Value /
                    (double)nutrition.TargetProtein, 0, 1) * 10;
            }
            nutritionScore += Math.Clamp(nutrition.LoggedDays / 7.0, 0, 1) * 10;
            if (nutrition.Confidence != DataQualityLevel.Low)
            {
                weightedScore += nutritionScore;
                availableWeight += 35;
            }

            if (weight.Confidence != DataQualityLevel.Low)
            {
                var progressScore = weight.Status is "onTrack" or "maintaining" ? 65 :
                    weight.Status == "slightlyBehind" ? 50 : 38;
                weightedScore += progressScore;
                availableWeight += 65;
            }

            if (training.Confidence != DataQualityLevel.Low)
            {
                var trainingScore = training.CompletedWorkouts >= 3 ? 15 :
                    training.CompletedWorkouts == 2 ? 12 : 8;
                if (training.ExercisesDecreased > training.ExercisesImproved)
                    trainingScore -= 3;
                weightedScore += Math.Clamp(trainingScore, 0, 15);
                availableWeight += 15;
            }

            if (recovery.Confidence != DataQualityLevel.Low)
            {
                var recoveryScore = recovery.RestMusclesText == "Ingen tydelige begrensninger" ? 10 : 7;
                weightedScore += recoveryScore;
                availableWeight += 10;
            }

            if (availableWeight <= 0) return null;

            return Math.Clamp((int)Math.Round(weightedScore / availableWeight * 100), 0, 100);
        }

        private static string BuildSummary(
            DataQualityLevel dataQuality,
            WeightTrendAnalysis weight,
            NutritionAnalysis nutrition)
        {
            if (dataQuality == DataQualityLevel.Low)
            {
                if (nutrition.LoggedDays > 0 || weight.RecentLogsCount > 0)
                    return "EvoliX har foreløpige signaler, men trenger bedre dekning i både mat og vekt før planen bør justeres.";
                return "EvoliX trenger litt mer data for planen kan justeres trygt.";
            }

            if (nutrition.AverageProtein.HasValue &&
                nutrition.AverageProtein.Value < nutrition.TargetProtein)
                return "Protein ligger litt lavt. Prioriter protein og jevn logging før kaloriene justeres hardere.";

            if (weight.Status is "onTrack" or "maintaining")
                return "Du er nær riktig spor. Hold målene stabile og vurder på nytt etter neste uke.";

            return "Uken gir nok data til en forsiktig justering av mat- og vektplanen.";
        }

        private static IEnumerable<WeeklyReportNextWeekAction> BuildNextWeekActions(
            WeightTrendAnalysis weight,
            NutritionAnalysis nutrition)
        {
            var actions = new List<(string Category, string Text)>
            {
                ("Nutrition", nutrition.AverageProtein.HasValue && nutrition.AverageProtein < nutrition.TargetProtein
                    ? $"Løft protein mot {nutrition.TargetProtein} g per dag."
                    : $"Hold kalorimålet rundt {nutrition.TargetCalories} kcal.")
            };

            if (weight.Status is "behind" or "slightlyBehind")
                actions.Add(("Weight", "Vurder en liten kaloriendring, ikke et stort hopp."));
            else if (weight.Status is "tooAggressive")
                actions.Add(("Weight", "Øk handlingsrommet litt hvis tempoet blir for hardt."));
            else if (weight.GoalPaceClipped)
                actions.Add(("Weight", "Måldatoen ser stram ut. Flytt datoen heller enn å presse kaloriene hardt."));
            else
                actions.Add(("Weight", "Hold vektmålingene jevne, helst 3 ganger i uken."));

            return actions.Select((x, i) => new WeeklyReportNextWeekAction
            {
                SortOrder = i + 1,
                Category = x.Category,
                Text = x.Text
            });
        }

        private static IEnumerable<AdaptiveRecommendation> BuildRecommendations(
            string userId,
            WeeklyReport report,
            UserSettings settings,
            WeightTrendAnalysis weight,
            NutritionAnalysis nutrition,
            DataQualityLevel dataQuality)
        {
            var recommendations = new List<AdaptiveRecommendation>();
            var confidence = ToRecommendationConfidence(dataQuality);
            var appliesFrom = report.WeekEnd.AddDays(1);

            if (dataQuality == DataQualityLevel.Low)
            {
                recommendations.Add(new AdaptiveRecommendation
                {
                    UserId = userId,
                    SourceReport = report,
                    Type = AdaptiveRecommendationType.NeedMoreData,
                    Title = "Logg litt mer før EvoliX justerer planen",
                    Explanation = "EvoliX trenger minst 5 matdager for rolige råd og 8 vektmålinger fordelt over to uker for høy sikkerhet. Før det vises bare tidlige signaler.",
                    Confidence = RecommendationConfidence.Low,
                    AppliesFromDate = appliesFrom,
                    ExpiresAtUtc = DateTime.UtcNow.AddDays(7)
                });
            }

            if (nutrition.Confidence != DataQualityLevel.Low &&
                nutrition.AverageProtein.HasValue &&
                nutrition.AverageProtein.Value < nutrition.TargetProtein * 0.9)
            {
                recommendations.Add(new AdaptiveRecommendation
                {
                    UserId = userId,
                    SourceReport = report,
                    Type = AdaptiveRecommendationType.IncreaseProtein,
                    Title = "Øk proteinmålet i praksis",
                    Explanation = $"Du lå i snitt {nutrition.TargetProtein - nutrition.AverageProtein.Value} g under proteinmålet. Få protein nærmere målet før kaloriene kuttes mer.",
                    Confidence = confidence,
                    AppliesFromDate = appliesFrom,
                    ExpiresAtUtc = DateTime.UtcNow.AddDays(7)
                });
            }

            if (weight.Confidence == DataQualityLevel.Low ||
                nutrition.Confidence == DataQualityLevel.Low)
            {
                return recommendations;
            }

            if (weight.GoalPaceClipped)
            {
                var targetDateChange = BuildTargetDateChange(settings, weight);
                recommendations.Add(new AdaptiveRecommendation
                {
                    UserId = userId,
                    SourceReport = report,
                    Type = AdaptiveRecommendationType.AdjustTargetDate,
                    Title = "Gjør måldatoen roligere",
                    Explanation = "Måldatoen krever høyere fart enn EvoliX vil anbefale. Bruk en roligere kaloriplan eller flytt datoen litt ut.",
                    Confidence = confidence,
                    AppliesFromDate = appliesFrom,
                    ExpiresAtUtc = DateTime.UtcNow.AddDays(7),
                    TargetDateChange = targetDateChange
                });
            }

            var suggestedCalories = CalculateSuggestedCalories(settings, weight, nutrition);
            var calorieAdjustment = suggestedCalories - settings.CalorieGoal;
            if (calorieAdjustment < 0)
            {
                recommendations.Add(new AdaptiveRecommendation
                {
                    UserId = userId,
                    SourceReport = report,
                    Type = AdaptiveRecommendationType.ReduceCalories,
                    Title = "Senk kalorimålet litt",
                    Explanation = "Vekttrenden går litt tregere enn målet. EvoliX anbefaler en liten justering og ny vurdering etter 7 dager.",
                    Confidence = confidence,
                    AppliesFromDate = appliesFrom,
                    ExpiresAtUtc = DateTime.UtcNow.AddDays(7),
                    NutritionChange = new RecommendationNutritionChange
                    {
                        CurrentCalories = settings.CalorieGoal,
                        SuggestedCalories = suggestedCalories,
                        CurrentProtein = settings.ProteinGoal,
                        SuggestedProtein = settings.ProteinGoal,
                        CurrentCarbs = settings.CarbGoal,
                        CurrentFat = settings.FatGoal
                    }
                });
            }
            else if (calorieAdjustment > 0)
            {
                recommendations.Add(new AdaptiveRecommendation
                {
                    UserId = userId,
                    SourceReport = report,
                    Type = AdaptiveRecommendationType.IncreaseCalories,
                    Title = "Øk kalorimålet litt",
                    Explanation = "Vekttrenden går raskere enn planlagt. En liten økning kan gjøre planen mer bærekraftig.",
                    Confidence = confidence,
                    AppliesFromDate = appliesFrom,
                    ExpiresAtUtc = DateTime.UtcNow.AddDays(7),
                    NutritionChange = new RecommendationNutritionChange
                    {
                        CurrentCalories = settings.CalorieGoal,
                        SuggestedCalories = suggestedCalories
                    }
                });
            }
            else
            {
                recommendations.Add(new AdaptiveRecommendation
                {
                    UserId = userId,
                    SourceReport = report,
                    Type = AdaptiveRecommendationType.HoldCalories,
                    Title = "Hold kaloriene like",
                    Explanation = "Dataene peker ikke på behov for en stor endring. Hold målet stabilt og vurder på nytt neste uke.",
                    Confidence = confidence,
                    AppliesFromDate = appliesFrom,
                    ExpiresAtUtc = DateTime.UtcNow.AddDays(7),
                    NutritionChange = new RecommendationNutritionChange
                    {
                        CurrentCalories = settings.CalorieGoal,
                        SuggestedCalories = settings.CalorieGoal
                    }
                });
            }

            return recommendations;
        }

        private static int CalculateSuggestedCalories(
            UserSettings settings,
            WeightTrendAnalysis weight,
            NutritionAnalysis nutrition)
        {
            if (!weight.WeeklyChangeKg.HasValue ||
                !weight.ExpectedWeeklyChangeKg.HasValue ||
                !nutrition.AverageCalories.HasValue)
                return settings.CalorieGoal;
            if (settings.WeightDirection == WeightDirection.Maintain)
                return settings.CalorieGoal;
            if (weight.Status is not ("behind" or "slightlyBehind" or "tooAggressive"))
                return settings.CalorieGoal;

            var estimatedMaintenance =
                nutrition.AverageCalories.Value -
                weight.WeeklyChangeKg.Value * KcalPerKg / 7.0;
            var targetCalories =
                estimatedMaintenance +
                weight.ExpectedWeeklyChangeKg.Value * KcalPerKg / 7.0;
            var rawGapFromCurrentGoal = targetCalories - settings.CalorieGoal;

            if (Math.Abs(rawGapFromCurrentGoal) < 50)
                return settings.CalorieGoal;

            var cappedGap = Math.Clamp(rawGapFromCurrentGoal, -150, 150);
            var suggested = settings.CalorieGoal + cappedGap;
            return Math.Max(
                1200,
                (int)(Math.Round(suggested / 25.0, MidpointRounding.AwayFromZero) * 25));
        }

        private static RecommendationTargetDateChange? BuildTargetDateChange(
            UserSettings settings,
            WeightTrendAnalysis weight)
        {
            if (!weight.RecentAverageKg.HasValue ||
                !weight.ExpectedWeeklyChangeKg.HasValue ||
                Math.Abs(weight.ExpectedWeeklyChangeKg.Value) < 0.01)
                return null;

            var remainingKg = (double)settings.WeightGoalKg - weight.RecentAverageKg.Value;
            if (Math.Sign(remainingKg) != Math.Sign(weight.ExpectedWeeklyChangeKg.Value))
                return null;

            var weeks = remainingKg / weight.ExpectedWeeklyChangeKg.Value;
            if (!double.IsFinite(weeks) || weeks <= 0 || weeks > 260)
                return null;

            var suggestedDate = AdaptivePlanningClock.Today().AddDays((int)Math.Ceiling(weeks * 7));
            return new RecommendationTargetDateChange
            {
                CurrentTargetDateUtc = settings.WeightGoalTimeUtc,
                SuggestedTargetDateUtc = AdaptivePlanningClock.ToUtc(suggestedDate, new TimeOnly(12, 0)),
                CurrentWeeklyPaceKg = weight.RawExpectedWeeklyChangeKg ?? weight.ExpectedWeeklyChangeKg.Value,
                SuggestedWeeklyPaceKg = weight.ExpectedWeeklyChangeKg.Value
            };
        }

        private static RecommendationConfidence ToRecommendationConfidence(DataQualityLevel quality)
        {
            return quality switch
            {
                DataQualityLevel.High => RecommendationConfidence.High,
                DataQualityLevel.Medium => RecommendationConfidence.Medium,
                _ => RecommendationConfidence.Low
            };
        }
    }
}
