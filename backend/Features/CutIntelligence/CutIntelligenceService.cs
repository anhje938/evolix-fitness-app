using backend.Data;
using backend.Features.Training.WorkoutSessions.Entities;
using backend.Features.Users;
using Microsoft.EntityFrameworkCore;

namespace backend.Features.CutIntelligence
{
    public class CutIntelligenceService
    {
        private const string AlgorithmVersion = "cut-intelligence-mvp-v1";

        private readonly AppDbContext _db;

        public CutIntelligenceService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<CutReportDto> GenerateCurrentAsync(
            string userId,
            CancellationToken ct = default)
        {
            var now = DateTime.UtcNow;
            var today = now.Date;
            var tomorrow = today.AddDays(1);
            var last7Start = today.AddDays(-6);
            var previous7Start = today.AddDays(-13);
            var previousPrevious7Start = today.AddDays(-20);
            var current14Start = today.AddDays(-13);
            var previousTrainingStart = today.AddDays(-41);

            var weights = await _db.WeightLogs
                .AsNoTracking()
                .Where(x => x.UserId == userId &&
                            x.TimestampUtc >= previousPrevious7Start &&
                            x.TimestampUtc < tomorrow)
                .OrderBy(x => x.TimestampUtc)
                .Select(x => new WeightPoint(x.TimestampUtc.Date, x.WeightKg))
                .ToListAsync(ct);

            var foodLogs = await _db.FoodLogs
                .AsNoTracking()
                .Where(x => x.UserId == userId &&
                            x.TimestampUtc >= last7Start &&
                            x.TimestampUtc < tomorrow)
                .Select(x => new FoodPoint(
                    x.TimestampUtc,
                    x.TimestampUtc.Date,
                    x.Calories,
                    x.Proteins,
                    x.Carbs,
                    x.Fats))
                .ToListAsync(ct);

            var sessions = await _db.WorkoutSessions
                .AsNoTracking()
                .AsSplitQuery()
                .Include(x => x.ExerciseLogs)
                    .ThenInclude(x => x.Sets)
                .Include(x => x.ExerciseLogs)
                    .ThenInclude(x => x.Exercise)
                .Where(x => x.UserId == userId &&
                            x.StartedAtUtc >= previousTrainingStart &&
                            x.StartedAtUtc < tomorrow &&
                            x.FinishedAtUtc != null)
                .ToListAsync(ct);

            var settings = await _db.UserSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == userId, ct);

            var warnings = new List<string>();
            if (settings?.WeightDirection != WeightDirection.Lose)
            {
                warnings.Add("Cut-start er estimert fra loggene dine. Sett målet til vektnedgang for mer presis tolkning.");
            }

            var estimatedCutStart = settings?.CutStartDateUtc?.Date ??
                                    EstimateCutStart(weights, foodLogs, sessions, today);
            var daysSinceCutStart = Math.Max(0, (today - estimatedCutStart).Days + 1);

            var last7Weights = weights
                .Where(x => x.Date >= last7Start && x.Date < tomorrow)
                .ToList();
            var previous7Weights = weights
                .Where(x => x.Date >= previous7Start && x.Date < last7Start)
                .ToList();
            var previousPrevious7Weights = weights
                .Where(x => x.Date >= previousPrevious7Start && x.Date < previous7Start)
                .ToList();

            var averageWeight7d = AverageOrNull(last7Weights.Select(x => x.WeightKg));
            var averageWeightPrevious7d = AverageOrNull(previous7Weights.Select(x => x.WeightKg));
            var averageWeightPreviousPrevious7d = AverageOrNull(previousPrevious7Weights.Select(x => x.WeightKg));
            double? weeklyChangeKg = averageWeight7d.HasValue && averageWeightPrevious7d.HasValue
                ? averageWeight7d.Value - averageWeightPrevious7d.Value
                : null;
            double? weeklyChangePercent = weeklyChangeKg.HasValue && averageWeightPrevious7d > 0
                ? weeklyChangeKg.Value / averageWeightPrevious7d.Value * 100
                : null;
            double? previousWeeklyChangePercent = averageWeightPrevious7d.HasValue &&
                                                   averageWeightPreviousPrevious7d > 0
                ? (averageWeightPrevious7d.Value - averageWeightPreviousPrevious7d.Value) /
                  averageWeightPreviousPrevious7d.Value * 100
                : null;
            var hasTwoSlowWeeks = IsSlowLossWeek(weeklyChangePercent) &&
                                  IsSlowLossWeek(previousWeeklyChangePercent);
            double? estimatedDailyDeficit = weeklyChangeKg < 0
                ? Math.Abs(weeklyChangeKg.Value) * 7700 / 7
                : null;

            if (!averageWeightPrevious7d.HasValue)
            {
                warnings.Add("Forrige 7-dagers vektsnitt mangler. Vekttrenden blir sikrere når du har 14 dager med målinger.");
            }

            if (HasLikelyWaterShift(last7Weights))
            {
                warnings.Add("Vekten har endret seg mer enn 1,5 % på 3 dager. Dette kan være vannvekt, så store justeringer bør unngås.");
            }

            var dailyNutrition = foodLogs
                .GroupBy(x => x.Date)
                .Select(g => new DailyNutrition(
                    g.Key,
                    g.Sum(x => x.Calories),
                    g.Sum(x => x.ProteinGrams),
                    g.Sum(x => x.CarbsGrams),
                    g.Sum(x => x.FatGrams)))
                .ToList();

            var avgCalories = AverageOrNull(dailyNutrition.Select(x => (double)x.Calories));
            var avgProtein = AverageOrNull(dailyNutrition.Select(x => (double)x.ProteinGrams));
            var avgCarbs = AverageOrNull(dailyNutrition.Select(x => (double)x.CarbsGrams));
            var avgFat = AverageOrNull(dailyNutrition.Select(x => (double)x.FatGrams));
            var carbTiming = BuildCarbTiming(foodLogs, sessions, last7Start, tomorrow);
            double? proteinPerKg = avgProtein.HasValue && averageWeight7d > 0
                ? avgProtein.Value / averageWeight7d.Value
                : null;
            double? carbsPerKg = avgCarbs.HasValue && averageWeight7d > 0
                ? avgCarbs.Value / averageWeight7d.Value
                : null;
            double? fatPerKg = avgFat.HasValue && averageWeight7d > 0
                ? avgFat.Value / averageWeight7d.Value
                : null;
            double? fatCaloriesPercent = avgFat.HasValue && avgCalories > 0
                ? avgFat.Value * 9 / avgCalories.Value * 100
                : null;
            var loggingAdherence = dailyNutrition.Select(x => x.Date).Distinct().Count() / 7d * 100;

            if (weeklyChangeKg.HasValue && avgCalories.HasValue)
            {
                var lostWeight = Math.Max(0, -weeklyChangeKg.Value);
                if (lostWeight > 0.15 && estimatedDailyDeficit.HasValue)
                {
                    warnings.Add("Kaloriestimatet fra vekttrend er grovt. Avvik kan skyldes logging, vannvekt eller feil estimert vedlikehold.");
                }
            }

            var strength = BuildStrengthSummary(sessions, current14Start);
            var training = BuildTrainingLoadSummary(sessions, current14Start, today);
            var readiness = BuildReadiness(
                daysSinceCutStart,
                last7Weights.Count,
                dailyNutrition.Select(x => x.Date).Distinct().Count(),
                training.SessionsLast14d);
            var minimumIssues = readiness.Items
                .Where(x => !x.IsReady)
                .Select(x => $"{x.Label}: {x.Current}/{x.Required} {x.Unit}".Trim())
                .ToList();

            var confidence = GetConfidence(
                last7Weights.Count,
                dailyNutrition.Select(x => x.Date).Distinct().Count(),
                strength.ComparableExercises,
                daysSinceCutStart);
            var status = minimumIssues.Count > 0
                ? "notEnoughData"
                : GetStatus(weeklyChangePercent, proteinPerKg, loggingAdherence, strength, training, hasTwoSlowWeeks);
            var scoreBreakdown = status == "notEnoughData"
                ? new List<CutScoreFactorDto>()
                : BuildScoreBreakdown(
                    weeklyChangePercent,
                    proteinPerKg,
                    loggingAdherence,
                    strength,
                    training,
                    fatPerKg,
                    carbsPerKg,
                    hasTwoSlowWeeks);
            var score = status == "notEnoughData"
                ? 0
                : Math.Clamp(100 - scoreBreakdown.Sum(x => x.PointsLost), 0, 100);

            var report = new CutReportDto
            {
                Score = score,
                ScoreLabel = ScoreLabel(score),
                Status = status,
                Confidence = confidence,
                Readiness = readiness,
                ScoreBreakdown = scoreBreakdown,
                GeneratedAt = now,
                AlgorithmVersion = AlgorithmVersion,
                Warnings = warnings,
                WeightTrend = new CutWeightTrendDto
                {
                    AverageWeight7d = Round(averageWeight7d),
                    AverageWeightPrevious7d = Round(averageWeightPrevious7d),
                    WeeklyWeightChangeKg = Round(weeklyChangeKg),
                    WeeklyWeightChangePercent = Round(weeklyChangePercent),
                    EstimatedDailyDeficit = Round(estimatedDailyDeficit),
                    WeightLogsLast7d = last7Weights.Count,
                    DaysSinceEstimatedCutStart = daysSinceCutStart,
                    Points = BuildWeightTrendPoints(weights),
                    Summary = BuildWeightSummary(weeklyChangeKg, weeklyChangePercent, estimatedDailyDeficit)
                },
                NutritionSummary = new CutNutritionSummaryDto
                {
                    AverageCalories7d = Round(avgCalories),
                    AverageProtein7d = Round(avgProtein),
                    AverageCarbs7d = Round(avgCarbs),
                    AverageFat7d = Round(avgFat),
                    AveragePreWorkoutCarbs = Round(carbTiming.AveragePreWorkoutCarbs),
                    AveragePostWorkoutCarbs = Round(carbTiming.AveragePostWorkoutCarbs),
                    ProteinPerKg = Round(proteinPerKg),
                    CarbsPerKg = Round(carbsPerKg),
                    FatPerKg = Round(fatPerKg),
                    FatCaloriesPercent = Round(fatCaloriesPercent),
                    LoggedDaysLast7d = dailyNutrition.Select(x => x.Date).Distinct().Count(),
                    LoggingAdherencePercent = Round(loggingAdherence) ?? 0,
                    Summary = BuildNutritionSummary(proteinPerKg, carbsPerKg, fatPerKg, fatCaloriesPercent, dailyNutrition.Count)
                },
                StrengthSummary = strength,
                TrainingLoadSummary = training,
            };

            report.Recommendations = BuildRecommendations(
                report,
                minimumIssues,
                proteinPerKg,
                carbsPerKg,
                fatPerKg,
                weeklyChangePercent,
                hasTwoSlowWeeks,
                strength,
                training,
                settings?.CalorieGoal ?? 2500,
                settings?.ProteinGoal ?? 180);

            return report;
        }

        public async Task<CutReadinessDto> GetReadinessAsync(
            string userId,
            CancellationToken ct = default)
        {
            var report = await GenerateCurrentAsync(userId, ct);
            return report.Readiness;
        }

        public async Task<ApplyCutRecommendationResultDto> ApplyRecommendationAsync(
            string userId,
            string recommendationId,
            CancellationToken ct = default)
        {
            var settings = await _db.UserSettings
                .FirstOrDefaultAsync(x => x.UserId == userId, ct);
            if (settings == null)
            {
                return new ApplyCutRecommendationResultDto
                {
                    Applied = false,
                    Message = "Fant ikke brukerinnstillinger.",
                };
            }

            var report = await GenerateCurrentAsync(userId, ct);
            var recommendation = report.Recommendations
                .FirstOrDefault(x => string.Equals(
                    x.Id,
                    recommendationId,
                    StringComparison.Ordinal));
            if (recommendation?.CanApply != true)
            {
                return new ApplyCutRecommendationResultDto
                {
                    Applied = false,
                    Message = "Denne anbefalingen kan ikke brukes automatisk.",
                    CalorieGoal = settings.CalorieGoal,
                    ProteinGoal = settings.ProteinGoal,
                };
            }

            if (recommendation.SuggestedCalories.HasValue)
            {
                var delta = recommendation.SuggestedCalories.Value - settings.CalorieGoal;
                delta = Math.Clamp(delta, -250, 250);
                settings.CalorieGoal = Math.Clamp(settings.CalorieGoal + delta, 800, 10000);
            }

            if (recommendation.SuggestedProtein.HasValue)
            {
                settings.ProteinGoal = Math.Clamp(recommendation.SuggestedProtein.Value, 0, 1000);
            }

            settings.UpdatedUtc = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);

            return new ApplyCutRecommendationResultDto
            {
                Applied = true,
                Message = "Anbefalingen er brukt i målene dine.",
                CalorieGoal = settings.CalorieGoal,
                ProteinGoal = settings.ProteinGoal,
            };
        }

        private static DateTime EstimateCutStart(
            List<WeightPoint> weights,
            List<FoodPoint> foodLogs,
            List<WorkoutSession> sessions,
            DateTime today)
        {
            var dates = new List<DateTime>();
            dates.AddRange(weights.Select(x => x.Date));
            dates.AddRange(foodLogs.Select(x => x.Date));
            dates.AddRange(sessions.Select(x => x.StartedAtUtc.Date));
            return dates.Count == 0 ? today : dates.Min();
        }

        private static CutReadinessDto BuildReadiness(
            int daysSinceCutStart,
            int weightLogsLast7,
            int foodDaysLast7,
            int strengthSessionsLast14)
        {
            var items = new List<CutReadinessItemDto>
            {
                ReadinessItem("cut_days", "Dager siden cut-start", daysSinceCutStart, 7, "dager"),
                ReadinessItem("weight_logs", "Vektmålinger siste 7 dager", weightLogsLast7, 4, "målinger"),
                ReadinessItem("food_logs", "Matloggede dager siste 7 dager", foodDaysLast7, 4, "dager"),
                ReadinessItem("strength_sessions", "Styrkeøkter siste 14 dager", strengthSessionsLast14, 2, "økter"),
            };
            var readyCount = items.Count(x => x.IsReady);

            return new CutReadinessDto
            {
                IsReady = readyCount == items.Count,
                ReadyItemCount = readyCount,
                TotalItemCount = items.Count,
                Items = items,
                Summary = readyCount == items.Count
                    ? "Datagrunnlaget er godt nok for en full Cut Rapport."
                    : $"Rapporten bygger fortsatt datagrunnlag: {readyCount}/{items.Count} krav er oppfylt.",
            };
        }

        private static CutReadinessItemDto ReadinessItem(
            string id,
            string label,
            int current,
            int required,
            string unit)
        {
            return new CutReadinessItemDto
            {
                Id = id,
                Label = label,
                Current = current,
                Required = required,
                Unit = unit,
                IsReady = current >= required,
            };
        }

        private static List<CutWeightPointDto> BuildWeightTrendPoints(
            List<WeightPoint> weights)
        {
            return weights
                .OrderBy(x => x.Date)
                .Select(point =>
                {
                    var rollingStart = point.Date.AddDays(-6);
                    var rollingAverage = AverageOrNull(weights
                        .Where(x => x.Date >= rollingStart && x.Date <= point.Date)
                        .Select(x => x.WeightKg));
                    return new CutWeightPointDto
                    {
                        Date = point.Date,
                        WeightKg = Round(point.WeightKg) ?? point.WeightKg,
                        RollingAverage7d = Round(rollingAverage),
                    };
                })
                .ToList();
        }

        private static CutStrengthSummaryDto BuildStrengthSummary(
            List<WorkoutSession> sessions,
            DateTime current14Start)
        {
            var currentBest = new Dictionary<Guid, StrengthPoint>();
            var previousBest = new Dictionary<Guid, StrengthPoint>();
            var currentVolume = new Dictionary<Guid, double>();

            foreach (var session in sessions)
            {
                var isCurrent = session.StartedAtUtc >= current14Start;
                foreach (var exerciseLog in session.ExerciseLogs)
                {
                    foreach (var set in exerciseLog.Sets)
                    {
                        if (!IsUsableStrengthSet(set)) continue;

                        var weightKg = set.WeightKg.GetValueOrDefault();
                        var reps = set.Reps.GetValueOrDefault();
                        var estimated1Rm = weightKg * (1 + reps / 30d);
                        var point = new StrengthPoint(
                            exerciseLog.ExerciseId,
                            exerciseLog.Exercise?.Name ?? "Øvelse",
                            estimated1Rm,
                            exerciseLog.Exercise?.IsCompound == true);

                        var target = isCurrent ? currentBest : previousBest;
                        if (!target.TryGetValue(exerciseLog.ExerciseId, out var existing) ||
                            estimated1Rm > existing.Estimated1Rm)
                        {
                            target[exerciseLog.ExerciseId] = point;
                        }

                        if (isCurrent)
                        {
                                currentVolume[exerciseLog.ExerciseId] =
                                    currentVolume.GetValueOrDefault(exerciseLog.ExerciseId) +
                                    weightKg * reps;
                        }
                    }
                }
            }

            var comparable = currentBest
                .Where(x => previousBest.ContainsKey(x.Key))
                .Select(x =>
                {
                    var previous = previousBest[x.Key];
                    var change = (x.Value.Estimated1Rm - previous.Estimated1Rm) / previous.Estimated1Rm * 100;
                    return new CutExerciseStrengthDto
                    {
                        ExerciseId = x.Key,
                        ExerciseName = x.Value.ExerciseName,
                        CurrentEstimated1Rm = Round(x.Value.Estimated1Rm) ?? x.Value.Estimated1Rm,
                        PreviousEstimated1Rm = Round(previous.Estimated1Rm) ?? previous.Estimated1Rm,
                        ChangePercent = Round(change) ?? change,
                        Trend = StrengthTrend(change),
                    };
                })
                .OrderByDescending(x => currentBest[x.ExerciseId].IsCompound)
                .ThenByDescending(x => currentVolume.GetValueOrDefault(x.ExerciseId))
                .ToList();

            var keyExercises = comparable.Take(5).ToList();
            var averageChange = keyExercises.Count > 0
                ? keyExercises.Average(x => x.ChangePercent)
                : (double?)null;

            return new CutStrengthSummaryDto
            {
                ComparableExercises = comparable.Count,
                AverageStrengthChangePercent = Round(averageChange),
                ExercisesProgressing = comparable.Count(x => x.ChangePercent > 2),
                ExercisesStable = comparable.Count(x => x.ChangePercent >= -2 && x.ChangePercent <= 2),
                ExercisesMildRegression = comparable.Count(x => x.ChangePercent < -2 && x.ChangePercent >= -5),
                ExercisesSignificantRegression = comparable.Count(x => x.ChangePercent < -5),
                KeyExercises = keyExercises,
                Summary = BuildStrengthSummaryText(averageChange, comparable.Count),
            };
        }

        private static CutTrainingLoadSummaryDto BuildTrainingLoadSummary(
            List<WorkoutSession> sessions,
            DateTime current14Start,
            DateTime today)
        {
            var previous14Start = current14Start.AddDays(-14);
            var currentSessions = sessions
                .Where(x => x.StartedAtUtc >= current14Start && HasStrengthSets(x))
                .ToList();
            var previousSessions = sessions
                .Where(x => x.StartedAtUtc >= previous14Start &&
                            x.StartedAtUtc < current14Start &&
                            HasStrengthSets(x))
                .ToList();

            var currentWeeklyVolume = SumVolume(currentSessions) / 2d;
            var previousWeeklyVolume = SumVolume(previousSessions) / 2d;
            double? volumeChange = previousWeeklyVolume > 0
                ? (currentWeeklyVolume - previousWeeklyVolume) / previousWeeklyVolume * 100
                : null;

            return new CutTrainingLoadSummaryDto
            {
                SessionsLast14d = currentSessions.Count,
                SessionsPrevious14d = previousSessions.Count,
                WeeklyVolumeCurrent = Round(currentWeeklyVolume),
                WeeklyVolumePrevious = Round(previousWeeklyVolume),
                VolumeChangePercent = Round(volumeChange),
                Summary = BuildTrainingSummaryText(currentSessions.Count, previousSessions.Count, volumeChange),
            };
        }

        private static double SumVolume(
            IEnumerable<WorkoutSession> sessions)
        {
            return sessions
                .SelectMany(x => x.ExerciseLogs)
                .SelectMany(x => x.Sets)
                .Where(x => x.WeightKg is > 0 && x.Reps is > 0)
                .Sum(x => x.WeightKg!.Value * x.Reps!.Value);
        }

        private static bool HasStrengthSets(WorkoutSession session)
        {
            return session.ExerciseLogs
                .SelectMany(x => x.Sets)
                .Any(IsUsableStrengthSet);
        }

        private static bool IsUsableStrengthSet(SetLog set)
        {
            if (set.WeightKg is not > 0 || set.Reps is not > 0) return false;
            if (set.Reps.Value > 15) return false;

            var setType = set.SetType?.Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(setType)) return true;

            return setType is not ("warmup" or "warm-up" or "oppvarming" or "drop" or "dropset");
        }

        private static string GetStatus(
            double? weeklyChangePercent,
            double? proteinPerKg,
            double loggingAdherence,
            CutStrengthSummaryDto strength,
            CutTrainingLoadSummaryDto training,
            bool hasTwoSlowWeeks)
        {
            var lossRate = weeklyChangePercent.HasValue ? -weeklyChangePercent.Value : (double?)null;
            var strengthDrop = strength.AverageStrengthChangePercent ?? 0;

            if (strength.ExercisesSignificantRegression >= 2 || strengthDrop < -3) return "strengthRisk";
            if (lossRate > 1.25 || (lossRate > 1.0 && strengthDrop < -3)) return "tooAggressive";
            if (lossRate is > 1.0 and <= 1.25 && strengthDrop >= -3) return "slightlyAggressive";
            if (hasTwoSlowWeeks && loggingAdherence >= 70) return "tooSlow";
            if (lossRate is >= 0.4 and <= 0.9 &&
                proteinPerKg >= 1.6 &&
                strengthDrop >= -2 &&
                loggingAdherence >= 80 &&
                training.SessionsLast14d >= Math.Max(2, training.SessionsPrevious14d - 1))
            {
                return "excellent";
            }
            if (lossRate is >= 0.25 and <= 1.0 && strengthDrop > -5 && proteinPerKg >= 1.4) return "onTrack";
            return "inconsistentData";
        }

        private static List<CutScoreFactorDto> BuildScoreBreakdown(
            double? weeklyChangePercent,
            double? proteinPerKg,
            double loggingAdherence,
            CutStrengthSummaryDto strength,
            CutTrainingLoadSummaryDto training,
            double? fatPerKg,
            double? carbsPerKg,
            bool hasTwoSlowWeeks)
        {
            var factors = new List<CutScoreFactorDto>();
            var lossRate = weeklyChangePercent.HasValue ? -weeklyChangePercent.Value : (double?)null;
            var strengthChange = strength.AverageStrengthChangePercent;

            if (lossRate is >= 1.0 and <= 1.25)
                factors.Add(ScoreFactor("fast_loss", "Vekttap for raskt", 10, "Vekttapet ligger mellom 1,0 og 1,25 % per uke."));
            else if (lossRate > 1.25)
                factors.Add(ScoreFactor("very_fast_loss", "Vekttap for raskt", 20, "Vekttapet er over 1,25 % per uke."));

            if (lossRate < 0.25)
                factors.Add(ScoreFactor("slow_loss", "Vekttap for tregt", 10, "Vekttapet er under 0,25 % denne uken."));
            if (hasTwoSlowWeeks || weeklyChangePercent >= 0)
                factors.Add(ScoreFactor("no_loss_two_weeks", "Ingen tydelig progresjon", 15, "Trenden er for treg over to uker eller går ikke ned."));

            if (proteinPerKg is >= 1.2 and < 1.4)
                factors.Add(ScoreFactor("low_protein", "Protein lavt", 10, "Protein ligger mellom 1,2 og 1,4 g/kg."));
            else if (proteinPerKg < 1.2)
                factors.Add(ScoreFactor("very_low_protein", "Protein lavt", 20, "Protein er under 1,2 g/kg."));

            if (strengthChange is < -2 and >= -5)
                factors.Add(ScoreFactor("mild_strength_drop", "Styrkefall", 10, "Nøkkelstyrken er ned 2–5 %."));
            else if (strengthChange < -5)
                factors.Add(ScoreFactor("large_strength_drop", "Styrkefall", 20, "Nøkkelstyrken er ned mer enn 5 %."));

            if (loggingAdherence is >= 50 and <= 70)
                factors.Add(ScoreFactor("medium_logging", "Dårlig logging", 10, "Matloggingen dekker 50–70 % av uken."));
            else if (loggingAdherence < 50)
                factors.Add(ScoreFactor("low_logging", "Dårlig logging", 20, "Matloggingen dekker under 50 % av uken."));

            if (training.SessionsPrevious14d > 0 &&
                training.SessionsLast14d < training.SessionsPrevious14d * 0.75)
            {
                factors.Add(ScoreFactor("training_drop", "Trening inkonsistent", 10, "Økter siste 14 dager er ned mer enn 25 %."));
            }
            if (training.SessionsLast14d < 4)
                factors.Add(ScoreFactor("low_training_frequency", "Trening inkonsistent", 15, "Færre enn 2 styrkeøkter per uke."));

            if (fatPerKg < 0.4)
                factors.Add(ScoreFactor("very_low_fat", "Fett lavt", 10, "Fett er under 0,4 g/kg."));
            else if (fatPerKg < 0.5)
                factors.Add(ScoreFactor("low_fat", "Fett lavt", 5, "Fett er under 0,5 g/kg."));

            if (carbsPerKg < 2 && strengthChange < -2)
                factors.Add(ScoreFactor("low_carbs_strength_drop", "Lav carbs + styrkefall", 10, "Karbohydrater er under 2 g/kg samtidig som styrken faller."));

            return factors;
        }

        private static CutScoreFactorDto ScoreFactor(
            string id,
            string label,
            int pointsLost,
            string reason)
        {
            return new CutScoreFactorDto
            {
                Id = id,
                Label = label,
                PointsLost = pointsLost,
                Reason = reason,
            };
        }

        private static List<CutRecommendationDto> BuildRecommendations(
            CutReportDto report,
            List<string> minimumIssues,
            double? proteinPerKg,
            double? carbsPerKg,
            double? fatPerKg,
            double? weeklyChangePercent,
            bool hasTwoSlowWeeks,
            CutStrengthSummaryDto strength,
            CutTrainingLoadSummaryDto training,
            int currentCalorieGoal,
            int currentProteinGoal)
        {
            var items = new List<(int Order, CutRecommendationDto Recommendation)>();
            var lossRate = weeklyChangePercent.HasValue ? -weeklyChangePercent.Value : (double?)null;
            var strengthFalling = strength.AverageStrengthChangePercent < -2;

            if (minimumIssues.Count > 0)
            {
                items.Add((1, Rec(
                    "build_cut_data_foundation",
                    "Bygg datagrunnlaget først",
                    "high",
                    "data",
                    $"Mangler: {string.Join(", ", minimumIssues)}.",
                    "Logg vekt minst 4 ganger, mat minst 4 dager og fullfør minst 2 styrkeøkter før du gjør store endringer.",
                    "high")));
            }

            if (lossRate > 1.25 || (lossRate > 1.0 && strength.AverageStrengthChangePercent < -3))
            {
                items.Add((2, Rec(
                    "increase_calories_fast_cut",
                    "Senk farten på cutten",
                    "high",
                    "nutrition",
                    $"Vekttapet er ca. {Round(lossRate) ?? lossRate:F1} % per uke, som er aggressivt for styrke og muskelbevaring.",
                    "Øk inntaket med 150–250 kcal per dag neste uke og vurder trenden på nytt.",
                    report.Confidence,
                    "calories",
                    suggestedCalories: Math.Min(currentCalorieGoal + 200, currentCalorieGoal + 250))));
            }

            if (strength.ExercisesSignificantRegression >= 2 || strength.AverageStrengthChangePercent < -3)
            {
                items.Add((3, Rec(
                    "protect_strength_retention",
                    "Beskytt styrken",
                    "high",
                    "training",
                    $"Nøkkelstyrken er ned ca. {Round(strength.AverageStrengthChangePercent) ?? strength.AverageStrengthChangePercent:F1} %.",
                    "Hold belastningen teknisk solid, unngå ekstra failure-sett og vurder én roligere uke før du kutter mer kalorier.",
                    report.Confidence)));
            }

            if (proteinPerKg < 1.4)
            {
                items.Add((4, Rec(
                    "increase_protein_low_cut",
                    "Øk protein",
                    "high",
                    "nutrition",
                    $"Proteininntaket er ca. {Round(proteinPerKg) ?? proteinPerKg:F1} g/kg i en cut.",
                    "Øk protein med 25–40 g per dag.",
                    report.Confidence,
                    "protein",
                    suggestedProtein: currentProteinGoal + 30)));
            }
            else if (proteinPerKg is >= 1.4 and < 1.6 && strengthFalling)
            {
                items.Add((4, Rec(
                    "increase_protein_strength_drop",
                    "Løft protein litt",
                    "medium",
                    "nutrition",
                    $"Protein er ca. {Round(proteinPerKg) ?? proteinPerKg:F1} g/kg samtidig som styrken faller.",
                    "Øk protein med 15–30 g per dag.",
                    report.Confidence,
                    "protein",
                    suggestedProtein: currentProteinGoal + 25)));
            }

            if (report.NutritionSummary.LoggingAdherencePercent < 70)
            {
                items.Add((5, Rec(
                    "improve_logging_consistency",
                    "Gjør loggingen mer stabil",
                    "medium",
                    "data",
                    $"Mat er logget {report.NutritionSummary.LoggedDaysLast7d} av 7 dager.",
                    "Logg minst 5 av 7 dager neste uke før du gjør større kaloriendringer.",
                    report.Confidence)));
            }

            if (hasTwoSlowWeeks && report.NutritionSummary.LoggingAdherencePercent >= 70)
            {
                items.Add((6, Rec(
                    "reduce_calories_slow_cut",
                    "Lag et lite underskudd",
                    "medium",
                    "nutrition",
                    "Vekttrenden har gått tregt i to uker, og loggingen er god nok til å justere forsiktig.",
                    "Reduser inntaket med 100–200 kcal per dag neste uke.",
                    report.Confidence,
                    "calories",
                    suggestedCalories: Math.Max(currentCalorieGoal - 150, currentCalorieGoal - 250))));
            }

            if (training.VolumeChangePercent > 20 && strengthFalling)
            {
                items.Add((7, Rec(
                    "reduce_volume_fatigue",
                    "Reduser volum én uke",
                    "medium",
                    "training",
                    $"Treningsvolumet er opp ca. {Round(training.VolumeChangePercent) ?? training.VolumeChangePercent:F0} % mens styrken faller.",
                    "Kutt 10–20 % av settene i én uke og behold de viktigste tunge toppsettene.",
                    report.Confidence)));
            }
            else if (training.VolumeChangePercent < -25 && strengthFalling)
            {
                items.Add((7, Rec(
                    "stabilize_training_frequency",
                    "Stabiliser treningen",
                    "medium",
                    "training",
                    "Volumet har falt mye samtidig som styrken faller.",
                    "Hold treningsfrekvensen stabil én uke før du endrer kostholdet.",
                    report.Confidence)));
            }

            if (strengthFalling && proteinPerKg >= 1.6 && lossRate <= 1.25 && carbsPerKg < 2)
            {
                items.Add((8, Rec(
                    "add_training_carbs",
                    "Flytt karbohydrater til økten",
                    "medium",
                    "nutrition",
                    $"Karbohydrater er ca. {Round(carbsPerKg) ?? carbsPerKg:F1} g/kg mens styrken faller.",
                    "Bruk 30–60 g karbohydrater før eller etter trening. Hvis kaloriene skal holdes like, flytt carbs fra resten av dagen.",
                    report.Confidence)));
            }

            if (fatPerKg < 0.5 || report.NutritionSummary.FatCaloriesPercent < 20)
            {
                items.Add((9, Rec(
                    "keep_fat_from_dropping_lower",
                    "Ikke kutt fett mer nå",
                    "low",
                    "nutrition",
                    "Fettinntaket ligger lavt i forhold til kroppsvekt eller kalorier.",
                    "Hold fett minst rundt 0,5 g/kg og finn eventuelt underskudd fra andre steder.",
                    report.Confidence)));
            }

            if (items.Count == 0)
            {
                items.Add((10, Rec(
                    "hold_current_cut_plan",
                    "Behold planen",
                    "medium",
                    "plan",
                    "Vekttrend, styrke og logging ser kontrollerte ut.",
                    "Kjør samme plan én uke til og vurder kun små justeringer etter neste 7-dagers snitt.",
                    report.Confidence)));
            }

            return items
                .OrderBy(x => x.Order)
                .Take(3)
                .Select(x => x.Recommendation)
                .ToList();
        }

        private static CutRecommendationDto Rec(
            string id,
            string title,
            string priority,
            string category,
            string reason,
            string action,
            string confidence,
            string? applyKind = null,
            int? suggestedCalories = null,
            int? suggestedProtein = null)
        {
            return new CutRecommendationDto
            {
                Id = id,
                Title = title,
                Priority = priority,
                Category = category,
                Reason = reason,
                SuggestedAction = action,
                Confidence = confidence,
                CanApply = applyKind != null,
                ApplyKind = applyKind,
                SuggestedCalories = suggestedCalories,
                SuggestedProtein = suggestedProtein,
            };
        }

        private static string GetConfidence(
            int weightLogs,
            int foodDays,
            int comparableExercises,
            int daysSinceCutStart)
        {
            if (weightLogs >= 5 && foodDays >= 5 && comparableExercises >= 2 && daysSinceCutStart >= 14)
                return "high";
            if (weightLogs >= 3 && foodDays >= 3 && comparableExercises >= 1)
                return "medium";
            return "low";
        }

        private static string BuildWeightSummary(double? changeKg, double? changePercent, double? deficit)
        {
            if (!changeKg.HasValue || !changePercent.HasValue)
                return "Logg flere vektmålinger for å se 7-dagers trend mot forrige uke.";

            var direction = changeKg.Value < 0 ? "ned" : changeKg.Value > 0 ? "opp" : "stabil";
            var deficitText = deficit.HasValue
                ? $" Estimert underskudd er ca. {Math.Round(deficit.Value)} kcal per dag."
                : "";
            return $"7-dagers snitt er {direction} {Math.Abs(changeKg.Value):0.0} kg ({Math.Abs(changePercent.Value):0.0} %).{deficitText}";
        }

        private static string BuildNutritionSummary(
            double? proteinPerKg,
            double? carbsPerKg,
            double? fatPerKg,
            double? fatPercent,
            int loggedDays)
        {
            if (loggedDays == 0) return "Logg mat for å vurdere protein, karbohydrater og fett i cutten.";

            var proteinText = proteinPerKg switch
            {
                null => "Protein kan ikke vurderes uten stabil vekt.",
                < 1.4 => "Protein er lavt for en cut.",
                < 1.6 => "Protein er ok, men kan være suboptimalt ved styrkefall.",
                <= 2.2 => "Protein ligger i et bra cut-område.",
                > 2.4 => "Protein er sannsynligvis høyere enn nødvendig for de fleste.",
                _ => "Protein er høyt nok for de fleste."
            };

            var carbText = carbsPerKg < 2 ? " Karbohydrater er lave for hard styrketrening." : "";
            var fatText = fatPerKg < 0.5 || fatPercent < 20 ? " Fett ligger lavt, så ikke kutt det mer først." : "";
            return $"{proteinText}{carbText}{fatText}";
        }

        private static CarbTimingSummary BuildCarbTiming(
            List<FoodPoint> foodLogs,
            List<WorkoutSession> sessions,
            DateTime from,
            DateTime to)
        {
            var strengthSessions = sessions
                .Where(x => x.StartedAtUtc >= from &&
                            x.StartedAtUtc < to &&
                            HasStrengthSets(x))
                .ToList();
            if (strengthSessions.Count == 0)
            {
                return new CarbTimingSummary(null, null);
            }

            var pre = new List<double>();
            var post = new List<double>();
            foreach (var session in strengthSessions)
            {
                var preStart = session.StartedAtUtc.AddHours(-3);
                var postEnd = session.StartedAtUtc.AddHours(3);
                pre.Add(foodLogs
                    .Where(x => x.TimestampUtc >= preStart && x.TimestampUtc <= session.StartedAtUtc)
                    .Sum(x => (double)x.CarbsGrams));
                post.Add(foodLogs
                    .Where(x => x.TimestampUtc > session.StartedAtUtc && x.TimestampUtc <= postEnd)
                    .Sum(x => (double)x.CarbsGrams));
            }

            return new CarbTimingSummary(AverageOrNull(pre), AverageOrNull(post));
        }

        private static string BuildStrengthSummaryText(double? averageChange, int comparable)
        {
            if (comparable == 0)
                return "Trenger flere like øvelser over tid før styrketrenden kan vurderes.";
            if (averageChange > 2) return "Styrken er i progresjon på sammenlignbare øvelser.";
            if (averageChange >= -2) return "Styrken er stort sett stabil, som er positivt under cut.";
            if (averageChange >= -5) return "Styrken faller mildt. Det kan være normalt, men bør følges med på.";
            return "Styrken faller tydelig på sammenlignbare øvelser.";
        }

        private static string BuildTrainingSummaryText(int currentSessions, int previousSessions, double? volumeChange)
        {
            if (!volumeChange.HasValue)
                return $"Du har {currentSessions} styrkeøkter siste 14 dager. Mer historikk gjør belastningen lettere å tolke.";
            if (volumeChange > 20) return "Treningsvolumet er tydelig høyere enn forrige periode.";
            if (volumeChange < -25) return "Treningsvolumet er betydelig lavere enn forrige periode.";
            return "Treningsbelastningen er relativt stabil.";
        }

        private static string StrengthTrend(double change)
        {
            if (change > 2) return "progression";
            if (change >= -2) return "stable";
            if (change >= -5) return "mildRegression";
            return "significantRegression";
        }

        private static string ScoreLabel(int score)
        {
            if (score >= 90) return "Excellent cut";
            if (score >= 75) return "Good cut";
            if (score >= 60) return "Needs adjustment";
            if (score >= 40) return "High risk cut";
            return "Poorly controlled cut";
        }

        private static bool IsSlowLossWeek(double? weeklyChangePercent)
        {
            if (!weeklyChangePercent.HasValue) return false;
            var lossRate = -weeklyChangePercent.Value;
            return lossRate < 0.25;
        }

        private static bool HasLikelyWaterShift(List<WeightPoint> points)
        {
            var ordered = points.OrderBy(x => x.Date).ToList();
            for (var i = 0; i < ordered.Count; i++)
            {
                for (var j = i + 1; j < ordered.Count; j++)
                {
                    if ((ordered[j].Date - ordered[i].Date).TotalDays > 3) break;
                    var pct = Math.Abs(ordered[j].WeightKg - ordered[i].WeightKg) / ordered[i].WeightKg * 100;
                    if (pct > 1.5) return true;
                }
            }
            return false;
        }

        private static double? AverageOrNull(IEnumerable<double> values)
        {
            var list = values.Where(double.IsFinite).ToList();
            return list.Count == 0 ? null : list.Average();
        }

        private static double? Round(double? value, int digits = 1)
        {
            return value.HasValue && double.IsFinite(value.Value)
                ? Math.Round(value.Value, digits)
                : null;
        }

        private sealed record WeightPoint(DateTime Date, double WeightKg);
        private sealed record FoodPoint(DateTime TimestampUtc, DateTime Date, int Calories, int ProteinGrams, int CarbsGrams, int FatGrams);
        private sealed record DailyNutrition(DateTime Date, int Calories, int ProteinGrams, int CarbsGrams, int FatGrams);
        private sealed record StrengthPoint(Guid ExerciseId, string ExerciseName, double Estimated1Rm, bool IsCompound);
        private sealed record CarbTimingSummary(double? AveragePreWorkoutCarbs, double? AveragePostWorkoutCarbs);
    }
}
