using backend.Data;
using backend.Features.Development;
using backend.Features.Users;
using Microsoft.EntityFrameworkCore;

namespace backend.Features.AdaptivePlanning
{
    public class WeeklyReportService
    {
        public const string AlgorithmVersion = "weekly-check-in-v1.4";
        private const double KcalPerKg = 7700;

        private readonly AppDbContext _db;
        private readonly WeightTrendService _weightTrend;
        private readonly NutritionAnalysisService _nutrition;
        private readonly TrainingAnalysisService _training;
        private readonly RecoveryAnalysisService _recovery;
        private readonly ExpoGoMockUserSettings _expoGoMockUserSettings;

        public WeeklyReportService(
            AppDbContext db,
            WeightTrendService weightTrend,
            NutritionAnalysisService nutrition,
            TrainingAnalysisService training,
            RecoveryAnalysisService recovery,
            ExpoGoMockUserSettings expoGoMockUserSettings)
        {
            _db = db;
            _weightTrend = weightTrend;
            _nutrition = nutrition;
            _training = training;
            _recovery = recovery;
            _expoGoMockUserSettings = expoGoMockUserSettings;
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
            var boundedLimit = Math.Clamp(limit, 1, 52);
            var reports = await IncludeReportGraph(_db.WeeklyReports.AsNoTracking())
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.WeekStart)
                .ThenByDescending(x => x.GeneratedAtUtc)
                .Take(boundedLimit * 4)
                .ToListAsync(ct);

            return reports
                .GroupBy(x => new { x.WeekStart, x.WeekEnd })
                .Select(group => group
                    .OrderByDescending(x => x.AlgorithmVersion == AlgorithmVersion)
                    .ThenByDescending(x => x.GeneratedAtUtc)
                    .First())
                .OrderByDescending(x => x.WeekStart)
                .Take(boundedLimit)
                .ToList();
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

        private async Task<WeeklyReport?> FindPreviousReportAsync(
            string userId,
            WeekWindow week,
            CancellationToken ct)
        {
            var previousStart = week.Start.AddDays(-7);
            var previousEnd = week.Start.AddDays(-1);

            return await IncludeReportGraph(_db.WeeklyReports.AsNoTracking())
                .Where(x => x.UserId == userId &&
                            x.WeekStart == previousStart &&
                            x.WeekEnd == previousEnd)
                .OrderByDescending(x => x.GeneratedAtUtc)
                .FirstOrDefaultAsync(ct);
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
            settings = _expoGoMockUserSettings.Apply(userId, settings);

            var weight = await _weightTrend.AnalyzeAsync(userId, week, settings, ct);
            var nutrition = await _nutrition.AnalyzeAsync(userId, week, settings, ct);
            var training = await _training.AnalyzeAsync(userId, week, ct);
            var recoveryTraining = await _training.AnalyzeRollingAsync(
                userId,
                week.StartUtc.AddDays(-14),
                week.EndExclusiveUtc,
                ct);
            var recovery = _recovery.Analyze(recoveryTraining);
            var previousReport = await FindPreviousReportAsync(userId, week, ct);
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
                SummaryText = BuildSummary(week, dataQuality, weight, nutrition),
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

            foreach (var recommendation in BuildRecommendations(
                         userId,
                         report,
                         settings,
                         weight,
                         nutrition,
                         dataQuality,
                         previousReport))
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

        private static bool IsEarlyInCurrentWeek(WeekWindow week)
        {
            var today = AdaptivePlanningClock.Today();
            if (today < week.Start || today > week.End) return false;
            return today.DayNumber - week.Start.DayNumber <= 1;
        }

        private static bool IsEarlyInReportWeek(WeeklyReport report)
        {
            var generatedDate = AdaptivePlanningClock.ToLocalDate(report.GeneratedAtUtc);
            if (generatedDate < report.WeekStart || generatedDate > report.WeekEnd) return false;
            return generatedDate.DayNumber - report.WeekStart.DayNumber <= 1;
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
            WeekWindow week,
            DataQualityLevel dataQuality,
            WeightTrendAnalysis weight,
            NutritionAnalysis nutrition)
        {
            if (dataQuality == DataQualityLevel.Low)
            {
                if (IsEarlyInCurrentWeek(week))
                    return "Uken er i gang. EvoliX bruker de første loggene som tidlige signaler og venter med justeringer til grunnlaget er tydeligere.";

                if (nutrition.LoggedDays > 0 || weight.RecentLogsCount > 0)
                    return "EvoliX har foreløpige signaler fra mat og vekt. Planen holdes rolig til trenden er tydeligere.";
                return "EvoliX bygger grunnlag for en trygg vurdering av uken.";
            }

            if (nutrition.AverageProtein.HasValue &&
                nutrition.AverageProtein.Value < nutrition.TargetProtein)
                return "Protein ligger litt lavt. Prioriter protein og jevn logging før kalorimålet justeres videre.";

            if (weight.Status is "onTrack" or "maintaining")
                return "Du er nær riktig spor. Hold målene stabile og vurder på nytt etter neste uke.";

            return "Uken gir nyttige signaler, men store endringer bør vente til samme mønster varer over flere uker.";
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
                    : $"Hold kalorimålet nær {nutrition.TargetCalories} kcal.")
            };

            if (weight.Status is "behind" or "slightlyBehind")
                actions.Add(("Weight", "Hold planen rolig. Vurder bare en liten kalorijustering hvis samme signal varer en uke til."));
            else if (weight.Status is "tooAggressive")
                actions.Add(("Weight", "Ikke press tempoet høyere. Hold igjen hvis vektnedgangen fortsetter raskt."));
            else if (weight.GoalPaceClipped)
                actions.Add(("Weight", "Måldatoen ser stram ut. Flytt datoen heller enn å bruke en aggressiv kaloriplan."));
            else
                actions.Add(("Weight", "Hold vektmålingene jevne, helst 3 ganger i uken."));

            if (training.CompletedWorkouts == 0)
                actions.Add(("Training", "Logg minst én fullført økt for bedre treningsinnsikt."));
            else if (training.CompletedWorkouts == 1)
                actions.Add(("Training", "Én økt gir tidlig signal. Gjenta planlagte økter før treningen vurderes hardt."));
            else
                actions.Add(("Training", "Hold treningsvolumet stabilt og se etter progresjon i hovedøvelsene."));

            if (!string.Equals(recovery.RestMusclesText, "Ingen tydelige begrensninger", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(recovery.RestMusclesText, "Ingen data", StringComparison.OrdinalIgnoreCase))
            {
                actions.Add(("Recovery", $"Ta hensyn til {recovery.RestMusclesText} før neste tunge økt."));
            }

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
            DataQualityLevel dataQuality,
            WeeklyReport? previousReport)
        {
            var recommendations = new List<AdaptiveRecommendation>();
            var confidence = ToRecommendationConfidence(dataQuality);
            var appliesFrom = report.WeekEnd.AddDays(1);

            if (dataQuality == DataQualityLevel.Low)
            {
                var earlyWeek = IsEarlyInReportWeek(report);

                recommendations.Add(new AdaptiveRecommendation
                {
                    UserId = userId,
                    SourceReport = report,
                    Type = AdaptiveRecommendationType.NeedMoreData,
                    Title = earlyWeek
                        ? "Tidlige signaler fra uken"
                        : "Tidlige signaler, ingen hard justering",
                    Explanation = earlyWeek
                        ? "Tidlig i uken vurderes roligere. Logg mat og vekt som vanlig, så bruker EvoliX de første signalene uten å presse en justering."
                        : "EvoliX ser noen signaler, men grunnlaget er ikke tydelig nok for en konkret justering. Hold planen stabil og vurder igjen når flere logger er inne.",
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
                    Explanation = $"Du lå i snitt {nutrition.TargetProtein - nutrition.AverageProtein.Value} g under proteinmålet. Få protein nærmere målet før kalorimålet endres videre.",
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
                    Explanation = "Måldatoen krever høyere fart enn EvoliX vil anbefale. Bruk en mer moderat kaloriplan eller flytt datoen litt ut.",
                    Confidence = confidence,
                    AppliesFromDate = appliesFrom,
                    ExpiresAtUtc = DateTime.UtcNow.AddDays(7),
                    TargetDateChange = targetDateChange
                });
            }

            if (!IsFollowingCalorieTarget(nutrition))
            {
                recommendations.Add(new AdaptiveRecommendation
                {
                    UserId = userId,
                    SourceReport = report,
                    Type = AdaptiveRecommendationType.HoldCalories,
                    Title = "Treff kalorimålet før målet endres",
                    Explanation = "Snittinntaket ligger for langt unna kalorimålet til å vite om målet eller gjennomføringen bør justeres. Hold målet og logg nærmere planen én uke til.",
                    Confidence = confidence,
                    AppliesFromDate = appliesFrom,
                    ExpiresAtUtc = DateTime.UtcNow.AddDays(7)
                });

                return recommendations;
            }

            if (dataQuality != DataQualityLevel.High ||
                !HasRepeatedWeightSignal(previousReport, weight))
            {
                recommendations.Add(new AdaptiveRecommendation
                {
                    UserId = userId,
                    SourceReport = report,
                    Type = AdaptiveRecommendationType.HoldCalories,
                    Title = "Ikke endre kalorier ennå",
                    Explanation = "Denne uken gir et signal, men ikke nok til en tydelig planendring. Hold kaloriene stabile og se om samme mønster varer neste uke.",
                    Confidence = confidence,
                    AppliesFromDate = appliesFrom,
                    ExpiresAtUtc = DateTime.UtcNow.AddDays(7),
                    NutritionChange = new RecommendationNutritionChange
                    {
                        CurrentCalories = settings.CalorieGoal,
                        SuggestedCalories = settings.CalorieGoal
                    }
                });

                return recommendations;
            }

            var suggestedCalories = CalculateSuggestedCalories(settings, weight, nutrition);
            var calorieAdjustment = suggestedCalories - settings.CalorieGoal;
            if (calorieAdjustment < 0)
            {
                var isMaintenance = settings.WeightDirection == WeightDirection.Maintain;
                recommendations.Add(new AdaptiveRecommendation
                {
                    UserId = userId,
                    SourceReport = report,
                    Type = AdaptiveRecommendationType.ReduceCalories,
                    Title = isMaintenance ? "Brems vektoppgang rolig" : "Senk kalorimålet litt",
                    Explanation = isMaintenance
                        ? "Vekten driver oppover mens kalorimålet følges godt nok over flere uker. EvoliX anbefaler en liten justering og ny vurdering etter 7 dager."
                        : "Vekttrenden går litt tregere enn målet over flere uker. EvoliX anbefaler en liten justering og ny vurdering etter 7 dager.",
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
                var isMaintenance = settings.WeightDirection == WeightDirection.Maintain;
                recommendations.Add(new AdaptiveRecommendation
                {
                    UserId = userId,
                    SourceReport = report,
                    Type = AdaptiveRecommendationType.IncreaseCalories,
                    Title = isMaintenance ? "Brems vektnedgang rolig" : "Øk kalorimålet litt",
                    Explanation = isMaintenance
                        ? "Vekten driver nedover mens kalorimålet følges godt nok over flere uker. EvoliX anbefaler en liten justering og ny vurdering etter 7 dager."
                        : "Vekttrenden går raskere enn planlagt over flere uker. En liten økning kan gjøre planen mer bærekraftig.",
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

        private static bool HasRepeatedWeightSignal(
            WeeklyReport? previousReport,
            WeightTrendAnalysis weight)
        {
            if (previousReport?.WeightSummary == null) return false;

            var status = weight.Status;
            if (status is not ("behind" or "slightlyBehind" or "tooAggressive" or "gaining" or "losing"))
                return false;

            return previousReport.WeightSummary.Status == status;
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
            {
                if (weight.Status is not ("gaining" or "losing"))
                    return settings.CalorieGoal;

                var maintenanceEstimateForDrift =
                    nutrition.AverageCalories.Value -
                    weight.WeeklyChangeKg.Value * KcalPerKg / 7.0;
                var driftGapFromCurrentGoal = maintenanceEstimateForDrift - settings.CalorieGoal;
                if (Math.Abs(driftGapFromCurrentGoal) < 50)
                    return settings.CalorieGoal;

                var cappedDriftGap = Math.Clamp(driftGapFromCurrentGoal, -125, 125);
                var suggestedMaintenance = settings.CalorieGoal + cappedDriftGap;
                return Math.Max(
                    1200,
                    (int)(Math.Round(suggestedMaintenance / 25.0, MidpointRounding.AwayFromZero) * 25));
            }
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

        private static bool IsFollowingCalorieTarget(NutritionAnalysis nutrition)
        {
            if (!nutrition.AverageCalories.HasValue || nutrition.TargetCalories <= 0)
                return false;

            var allowedGap = Math.Max(150, nutrition.TargetCalories * 0.08);
            return Math.Abs(nutrition.AverageCalories.Value - nutrition.TargetCalories) <= allowedGap;
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
