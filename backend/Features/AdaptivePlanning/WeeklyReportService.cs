using backend.Data;
using backend.Features.Users;
using Microsoft.EntityFrameworkCore;

namespace backend.Features.AdaptivePlanning
{
    public class WeeklyReportService
    {
        public const string AlgorithmVersion = "adaptive-plan-v1.0";
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
            var workouts = await _db.WorkoutSessions
                .AsNoTracking()
                .CountAsync(x =>
                    x.UserId == userId &&
                    x.FinishedAtUtc != null &&
                    ((x.FinishedAtUtc.HasValue && x.FinishedAtUtc.Value > dataThrough) ||
                     x.StartedAtUtc > dataThrough),
                    ct);
            var settingsChanged = await _db.UserSettings
                .AsNoTracking()
                .AnyAsync(x => x.UserId == userId && x.UpdatedUtc > dataThrough, ct);

            var reasons = new List<string>();
            if (workouts > 0) reasons.Add($"{workouts} nye Ã¸kter");
            if (foodLogs > 0) reasons.Add($"{foodLogs} nye mÃ¥ltider");
            if (weightLogs > 0) reasons.Add($"{weightLogs} nye vektmÃ¥linger");
            if (settingsChanged) reasons.Add("endrede innstillinger");

            return new WeeklyReportFreshness
            {
                DataThroughUtc = dataThrough,
                IsStale = reasons.Count > 0,
                StaleReason = reasons.Count == 0
                    ? ""
                    : $"Rapporten er basert pÃ¥ data fram til {dataThrough:dd.MM HH:mm} UTC. Etter dette finnes {string.Join(", ", reasons)}."
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
            var dataQuality = CombineQuality(weight.Confidence, nutrition.Confidence, training.Confidence);
            int? score = CalculateScore(weight, nutrition, training, recovery);

            var report = new WeeklyReport
            {
                UserId = userId,
                WeekStart = week.Start,
                WeekEnd = week.End,
                GeneratedAtUtc = DateTime.UtcNow,
                DataQuality = dataQuality,
                OverallScore = score,
                SummaryText = BuildSummary(dataQuality, weight, nutrition, training),
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

            foreach (var action in BuildNextWeekActions(weight, nutrition, training, recovery))
            {
                report.NextWeekActions.Add(action);
            }

            foreach (var recommendation in BuildRecommendations(userId, report, settings, weight, nutrition, training, recovery, dataQuality))
            {
                report.Recommendations.Add(recommendation);
            }

            _db.WeeklyReports.Add(report);
            await _db.SaveChangesAsync(ct);

            return await FindReportAsync(userId, week, ct) ?? report;
        }

        private static WeekWindow GetCurrentWeek()
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
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
            var usable = levels.Count(x => x != DataQualityLevel.Low);
            if (usable == 0) return DataQualityLevel.Low;
            if (levels.All(x => x == DataQualityLevel.High)) return DataQualityLevel.High;
            if (usable >= 2) return DataQualityLevel.Medium;
            if (levels.Any(x => x == DataQualityLevel.High)) return DataQualityLevel.Medium;
            return DataQualityLevel.Medium;
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

            var trainingScore = Math.Min(35,
                Math.Min(training.CompletedWorkouts, 4) * 5 +
                Math.Min(training.ExercisesImproved, 5) * 2 +
                (training.TotalSets > 0 ? 8 : 0));
            if (training.Confidence != DataQualityLevel.Low)
            {
                weightedScore += trainingScore;
                availableWeight += 35;
            }

            if (recovery.Confidence != DataQualityLevel.Low)
            {
                var recoveryScore = recovery.RestMusclesText == "Ingen tydelige begrensninger" ? 15 : 11;
                weightedScore += recoveryScore;
                availableWeight += 15;
            }

            if (weight.Confidence != DataQualityLevel.Low)
            {
                var progressScore = weight.Status is "onTrack" or "maintaining" ? 15 :
                    weight.Status == "slightlyBehind" ? 11 : 8;
                weightedScore += progressScore;
                availableWeight += 15;
            }

            if (availableWeight <= 0) return null;

            return Math.Clamp((int)Math.Round(weightedScore / availableWeight * 100), 0, 100);
        }

        private static string BuildSummary(
            DataQualityLevel dataQuality,
            WeightTrendAnalysis weight,
            NutritionAnalysis nutrition,
            TrainingAnalysis training)
        {
            if (dataQuality == DataQualityLevel.Low)
            {
                if (nutrition.LoggedDays > 0 || training.CompletedWorkouts > 0 || weight.RecentLogsCount > 0)
                    return "EvoliX har forelopige signaler, men trenger mer dekning for storre planendringer.";
                return "EvoliX trenger litt mer data for planen kan justeres trygt.";
            }

            if (training.ExercisesImproved > 0 &&
                nutrition.AverageProtein.HasValue &&
                nutrition.AverageProtein.Value < nutrition.TargetProtein)
                return "Treningen viste fremgang, men protein ligger litt lavt. Neste uke bor protein og jevn logging prioriteres.";

            if (weight.Status is "onTrack" or "maintaining")
                return "Du er naer riktig spor. EvoliX anbefaler sma, rolige justeringer og ny vurdering etter neste uke.";

            return "Uken gir nok data til en forsiktig justering av planen.";
        }

        private static IEnumerable<WeeklyReportNextWeekAction> BuildNextWeekActions(
            WeightTrendAnalysis weight,
            NutritionAnalysis nutrition,
            TrainingAnalysis training,
            RecoveryAnalysis recovery)
        {
            var actions = new List<(string Category, string Text)>
            {
                ("Nutrition", nutrition.AverageProtein.HasValue && nutrition.AverageProtein < nutrition.TargetProtein
                    ? $"Løft protein mot {nutrition.TargetProtein} g per dag."
                    : $"Hold kalorimålet rundt {nutrition.TargetCalories} kcal."),
                ("Recovery", $"{recovery.RecommendedNextSession}: {recovery.IntensityRecommendation}.")
            };

            if (training.MuscleLoads.Count > 0)
            {
                var lowest = training.MuscleLoads.Values.OrderBy(x => x.Sets).FirstOrDefault();
                if (lowest != null)
                    actions.Add(("Training", $"Legg inn noen ekstra sett for {lowest.Muscle} hvis det passer programmet."));
            }

            if (weight.Status is "behind" or "slightlyBehind")
                actions.Add(("Weight", "Vurder en liten kaloriendring, ikke et stort hopp."));

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
            TrainingAnalysis training,
            RecoveryAnalysis recovery,
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
                    Explanation = "EvoliX trenger minst 5 matdager, 3 vektmålinger og helst 2 økter for høy sikkerhet.",
                    Confidence = RecommendationConfidence.Low,
                    AppliesFromDate = appliesFrom,
                    ExpiresAtUtc = DateTime.UtcNow.AddDays(7)
                });
                if (weight.Confidence == DataQualityLevel.Low &&
                    nutrition.Confidence == DataQualityLevel.Low &&
                    training.Confidence == DataQualityLevel.Low)
                {
                    return recommendations;
                }
            }

            if (nutrition.AverageProtein.HasValue && nutrition.AverageProtein.Value < nutrition.TargetProtein * 0.9)
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

            var calorieAdjustment = CalculateDailyCalorieAdjustment(settings, weight);
            if (calorieAdjustment < 0)
            {
                var suggested = Math.Max(1600, settings.CalorieGoal + calorieAdjustment);
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
                        SuggestedCalories = suggested,
                        CurrentProtein = settings.ProteinGoal,
                        SuggestedProtein = settings.ProteinGoal,
                        CurrentCarbs = settings.CarbGoal,
                        CurrentFat = settings.FatGoal
                    }
                });
            }
            else if (calorieAdjustment > 0)
            {
                var suggested = settings.CalorieGoal + calorieAdjustment;
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
                        SuggestedCalories = suggested
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

            if (training.BestProgressExerciseId.HasValue && training.SuggestedBestProgressWeightKg.HasValue)
            {
                recommendations.Add(new AdaptiveRecommendation
                {
                    UserId = userId,
                    SourceReport = report,
                    Type = AdaptiveRecommendationType.IncreaseLoad,
                    Title = $"Øk {training.BestProgressExerciseName}",
                    Explanation = training.BestProgressText,
                    Confidence = ToRecommendationConfidence(training.Confidence),
                    AppliesFromDate = appliesFrom,
                    ExpiresAtUtc = DateTime.UtcNow.AddDays(14),
                    ExerciseTargetChange = new RecommendationExerciseTargetChange
                    {
                        ExerciseId = training.BestProgressExerciseId.Value,
                        SuggestedTargetWeightKg = training.SuggestedBestProgressWeightKg,
                        SuggestedTargetSets = 3,
                        MinReps = 6,
                        MaxReps = 8,
                        ProgressionModel = ExerciseProgressionModel.DoubleProgression
                    }
                });
            }

            recommendations.Add(new AdaptiveRecommendation
            {
                UserId = userId,
                SourceReport = report,
                Type = AdaptiveRecommendationType.RecoveryNextSession,
                Title = $"Neste økt: {recovery.RecommendedNextSession}",
                Explanation = recovery.Insight,
                Confidence = ToRecommendationConfidence(recovery.Confidence),
                AppliesFromDate = appliesFrom,
                ExpiresAtUtc = DateTime.UtcNow.AddDays(7),
                RecoveryAction = new RecommendationRecoveryAction
                {
                    RecommendedSession = recovery.RecommendedNextSession,
                    Intensity = recovery.IntensityRecommendation,
                    FocusMusclesText = recovery.ReadyMusclesText,
                    RestMusclesText = recovery.RestMusclesText
                }
            });

            return recommendations;
        }

        private static int CalculateDailyCalorieAdjustment(
            UserSettings settings,
            WeightTrendAnalysis weight)
        {
            if (!weight.WeeklyChangeKg.HasValue || !weight.ExpectedWeeklyChangeKg.HasValue)
                return 0;
            if (settings.WeightDirection == WeightDirection.Maintain)
                return 0;
            if (weight.Status is not ("behind" or "slightlyBehind" or "tooAggressive"))
                return 0;

            var rawDailyGap = EstimateDailyEnergyGap(weight);
            if (Math.Abs(rawDailyGap) < 50)
                return 0;

            var capped = Math.Clamp(rawDailyGap, -150, 150);
            return (int)(Math.Round(capped / 25.0, MidpointRounding.AwayFromZero) * 25);
        }

        private static double EstimateDailyEnergyGap(WeightTrendAnalysis weight)
        {
            if (!weight.WeeklyChangeKg.HasValue || !weight.ExpectedWeeklyChangeKg.HasValue)
                return 0;

            return (weight.ExpectedWeeklyChangeKg.Value - weight.WeeklyChangeKg.Value) *
                KcalPerKg /
                7.0;
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
