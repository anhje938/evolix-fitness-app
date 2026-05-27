using System.Text.Json;
using backend.Data;
using backend.Features.AdaptivePlanning;
using backend.Features.Development;
using backend.Features.Training.WorkoutSessions.Entities;
using backend.Features.Users;
using Microsoft.EntityFrameworkCore;

namespace backend.Features.CutIntelligence
{
    public class CutIntelligenceService
    {
        private const string AlgorithmVersion = "goal-report-v2";
        private const double KcalPerKg = 7700;

        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

        private readonly AppDbContext _db;
        private readonly ExpoGoMockUserSettings _expoGoMockUserSettings;

        public CutIntelligenceService(
            AppDbContext db,
            ExpoGoMockUserSettings expoGoMockUserSettings)
        {
            _db = db;
            _expoGoMockUserSettings = expoGoMockUserSettings;
        }

        public async Task<CutReportDto> GenerateCurrentAsync(
            string userId,
            CancellationToken ct = default,
            bool persistSnapshot = true)
        {
            var now = AdaptivePlanningClock.NowUtc();
            var today = now.Date;
            var tomorrow = today.AddDays(1);
            var last7Start = today.AddDays(-6);
            var previous7Start = today.AddDays(-13);
            var previousPrevious7Start = today.AddDays(-20);
            var requestedAnalysisStart = today.AddDays(-41);
            var current14Start = today.AddDays(-13);
            var current28Start = today.AddDays(-27);

            var settings = await _db.UserSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == userId, ct)
                ?? new UserSettings { UserId = userId };
            settings = _expoGoMockUserSettings.Apply(userId, settings);

            var goalType = MapGoalType(settings.WeightDirection);
            var configuredGoalStart = settings.CutStartDateUtc?.Date;
            var analysisStart =
                configuredGoalStart.HasValue && configuredGoalStart.Value > requestedAnalysisStart
                    ? configuredGoalStart.Value
                    : requestedAnalysisStart;

            var weights = await _db.WeightLogs
                .AsNoTracking()
                .Where(x => x.UserId == userId &&
                            x.TimestampUtc >= analysisStart &&
                            x.TimestampUtc < tomorrow)
                .OrderBy(x => x.TimestampUtc)
                .Select(x => new WeightPoint(x.TimestampUtc.Date, x.WeightKg))
                .ToListAsync(ct);

            var foodLogs = await _db.FoodLogs
                .AsNoTracking()
                .Where(x => x.UserId == userId &&
                            x.TimestampUtc >= analysisStart &&
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
                            x.StartedAtUtc >= analysisStart &&
                            x.StartedAtUtc < tomorrow &&
                            x.FinishedAtUtc != null)
                .ToListAsync(ct);

            var previousReports = await _db.GoalReportSnapshots
                .AsNoTracking()
                .Where(x => x.UserId == userId &&
                            x.GoalType == goalType &&
                            x.AlgorithmVersion == AlgorithmVersion)
                .OrderByDescending(x => x.WeekStart)
                .Take(6)
                .ToListAsync(ct);

            var goalStart = configuredGoalStart ??
                            EstimateGoalStart(weights, foodLogs, sessions, today);
            var daysSinceGoalStart = Math.Max(0, (today - goalStart).Days + 1);

            var last7Weights = weights
                .Where(x => x.Date >= last7Start && x.Date < tomorrow)
                .ToList();
            var previous7Weights = weights
                .Where(x => x.Date >= previous7Start && x.Date < last7Start)
                .ToList();
            var previousPrevious7Weights = weights
                .Where(x => x.Date >= previousPrevious7Start && x.Date < previous7Start)
                .ToList();

            var dailyNutrition = foodLogs
                .GroupBy(x => x.Date)
                .Select(g => new DailyNutrition(
                    g.Key,
                    g.Sum(x => x.Calories),
                    g.Sum(x => x.ProteinGrams),
                    g.Sum(x => x.CarbsGrams),
                    g.Sum(x => x.FatGrams)))
                .OrderBy(x => x.Date)
                .ToList();
            var currentNutrition = dailyNutrition
                .Where(x => x.Date >= last7Start && x.Date < tomorrow)
                .ToList();
            var current14Nutrition = dailyNutrition
                .Where(x => x.Date >= current14Start && x.Date < tomorrow)
                .ToList();
            var current28Nutrition = dailyNutrition
                .Where(x => x.Date >= current28Start && x.Date < tomorrow)
                .ToList();
            var current28Weights = weights
                .Where(x => x.Date >= current28Start && x.Date < tomorrow)
                .ToList();
            var current28Sessions = sessions
                .Where(x => x.StartedAtUtc.Date >= current28Start && x.StartedAtUtc.Date < tomorrow)
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
            var possibleWaterWeight = HasLikelyWaterShift(last7Weights);

            var avgCalories = AverageOrNull(currentNutrition.Select(x => (double)x.Calories));
            var avgCalories14 = AverageOrNull(current14Nutrition.Select(x => (double)x.Calories));
            var avgProtein = AverageOrNull(currentNutrition.Select(x => (double)x.ProteinGrams));
            var avgCarbs = AverageOrNull(currentNutrition.Select(x => (double)x.CarbsGrams));
            var avgFat = AverageOrNull(currentNutrition.Select(x => (double)x.FatGrams));
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

            var strength = BuildStrengthSummary(sessions, current14Start, goalType);
            var training = BuildTrainingLoadSummary(sessions, current14Start, goalType);

            var loggedDaysLast7 = currentNutrition.Select(x => x.Date).Distinct().Count();
            var adherence = BuildAdherenceSummary(
                last7Weights.Count,
                currentNutrition,
                settings,
                training.SessionsLast14d);
            var readiness = BuildReadiness(
                goalType,
                daysSinceGoalStart,
                current28Weights.Count,
                current28Nutrition.Count(x => x.Calories >= 800),
                current28Sessions.Count);

            var notEnoughData = (last7Weights.Count < 2 ||
                                loggedDaysLast7 < 2) &&
                                training.SessionsLast14d == 0;
            var isLimitedReport = !notEnoughData &&
                                  last7Weights.Count >= 2 &&
                                  loggedDaysLast7 >= 2 &&
                                  (training.SessionsLast14d < 2 || strength.ComparableExercises == 0);

            var warnings = BuildWarnings(
                goalType,
                averageWeightPrevious7d,
                weeklyChangeKg,
                avgCalories,
                possibleWaterWeight);

            var confidence = GetConfidence(
                last7Weights.Count,
                loggedDaysLast7,
                strength.ComparableExercises,
                daysSinceGoalStart,
                possibleWaterWeight,
                isLimitedReport,
                adherence.MealLoggingAdherencePercent);
            if (notEnoughData) confidence = "low";

            var scoreBreakdown = notEnoughData
                ? new List<CutScoreFactorDto>()
                : BuildScoreBreakdown(
                    goalType,
                    weeklyChangePercent,
                    previousWeeklyChangePercent,
                    proteinPerKg,
                    carbsPerKg,
                    fatPerKg,
                    fatCaloriesPercent,
                    strength,
                    training,
                    adherence,
                    possibleWaterWeight,
                    isLimitedReport);
            var score = notEnoughData
                ? 0
                : Math.Clamp((int)Math.Round(scoreBreakdown.Sum(x => x.Score * x.WeightPercent / 100d)), 0, 100);

            var statusContext = new StatusContext(
                goalType,
                weeklyChangePercent,
                previousWeeklyChangePercent,
                proteinPerKg,
                strength,
                training,
                adherence,
                confidence,
                isLimitedReport,
                notEnoughData,
                possibleWaterWeight);
            var status = GetStatus(statusContext);
            var statusReasons = BuildStatusReasons(statusContext, status);

            var maintenance = EstimateMaintenance(
                goalType,
                weeklyChangePercent,
                previousWeeklyChangePercent,
                avgCalories14 ?? avgCalories,
                adherence,
                possibleWaterWeight);

            var timeline = BuildTimeline(
                goalType,
                settings,
                averageWeight7d,
                weeklyChangeKg,
                weeklyChangePercent,
                previousWeeklyChangePercent);

            var report = new CutReportDto
            {
                GoalType = goalType,
                Score = score,
                ScoreLabel = ScoreLabel(score),
                Status = status,
                Confidence = confidence,
                IsLimitedReport = isLimitedReport,
                NotEnoughData = notEnoughData,
                Readiness = readiness,
                ScoreBreakdown = scoreBreakdown,
                StatusReasons = statusReasons,
                GeneratedAt = now,
                AlgorithmVersion = AlgorithmVersion,
                Warnings = warnings,
                WeightTrend = new CutWeightTrendDto
                {
                    AverageWeight7d = Round(averageWeight7d),
                    AverageWeightPrevious7d = Round(averageWeightPrevious7d),
                    WeeklyWeightChangeKg = Round(weeklyChangeKg),
                    WeeklyWeightChangePercent = Round(weeklyChangePercent),
                    PreviousWeeklyWeightChangePercent = Round(previousWeeklyChangePercent),
                    WeightLossPercent = goalType == "cut" ? Round(weeklyChangePercent.HasValue ? -weeklyChangePercent.Value : null) : null,
                    WeightGainPercent = goalType == "leanBulk" ? Round(weeklyChangePercent) : null,
                    WeightDriftPercent = goalType == "maintenance" ? Round(weeklyChangePercent.HasValue ? Math.Abs(weeklyChangePercent.Value) : null) : null,
                    EstimatedDailyDeficit = Round(weeklyChangeKg < 0 ? Math.Abs(weeklyChangeKg.Value) * KcalPerKg / 7 : null),
                    EstimatedDailySurplus = Round(weeklyChangeKg > 0 ? weeklyChangeKg.Value * KcalPerKg / 7 : null),
                    PossibleWaterWeight = possibleWaterWeight,
                    WeightLogsLast7d = last7Weights.Count,
                    DaysSinceEstimatedCutStart = daysSinceGoalStart,
                    Points = BuildWeightTrendPoints(weights),
                    Summary = BuildWeightSummary(goalType, weeklyChangeKg, weeklyChangePercent, possibleWaterWeight)
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
                    LoggedDaysLast7d = loggedDaysLast7,
                    LoggingAdherencePercent = Round(adherence.MealLoggingAdherencePercent) ?? 0,
                    ProteinTargetAdherencePercent = Round(adherence.ProteinTargetAdherencePercent) ?? 0,
                    CalorieTargetAdherencePercent = Round(adherence.CalorieTargetAdherencePercent) ?? 0,
                    AverageCalorieTargetDelta = Round(avgCalories.HasValue ? avgCalories.Value - settings.CalorieGoal : null),
                    EstimatedMaintenanceCalories = maintenance.Calories,
                    MaintenanceEstimateConfidence = maintenance.Confidence,
                    Summary = BuildNutritionSummary(goalType, proteinPerKg, carbsPerKg, fatPerKg, fatCaloriesPercent, loggedDaysLast7)
                },
                StrengthSummary = strength,
                TrainingLoadSummary = training,
                AdherenceSummary = adherence,
                TimelineSummary = timeline,
                MonthlySummary = BuildMonthlySummary(
                    goalType: goalType,
                    periodStart: current28Start,
                    periodEnd: today,
                    daysSinceGoalStart: daysSinceGoalStart,
                    nutritionDays: current28Nutrition,
                    weights: current28Weights,
                    sessions: current28Sessions,
                    reportStatus: status,
                    confidence: confidence,
                    averageWeight7d: averageWeight7d,
                    weeklyChangePercent: weeklyChangePercent,
                    previousWeeklyChangePercent: previousWeeklyChangePercent,
                    proteinPerKg: proteinPerKg,
                    settings: settings)
            };

            var currentProblemIds = GetProblemIds(report, possibleWaterWeight);
            report.PreviousComparison = BuildPreviousComparison(previousReports, score, status, currentProblemIds);
            report.Recommendations = BuildRecommendations(
                report,
                currentProblemIds,
                proteinPerKg,
                carbsPerKg,
                fatPerKg,
                weeklyChangePercent,
                previousWeeklyChangePercent,
                possibleWaterWeight,
                settings.CalorieGoal,
                settings.ProteinGoal);

            if (persistSnapshot)
            {
                await SaveSnapshotAsync(userId, report, currentProblemIds, ct);
            }

            return report;
        }

        public async Task<CutReadinessDto> GetReadinessAsync(
            string userId,
            CancellationToken ct = default)
        {
            var report = await GenerateCurrentAsync(userId, ct, persistSnapshot: false);
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

            var report = await GenerateCurrentAsync(userId, ct, persistSnapshot: false);
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

            var originalCalories = settings.CalorieGoal;
            var originalProtein = settings.ProteinGoal;

            _db.NutritionTargetsHistory.Add(new NutritionTargetsHistory
            {
                UserId = userId,
                Calories = settings.CalorieGoal,
                Protein = settings.ProteinGoal,
                Carbs = settings.CarbGoal,
                Fat = settings.FatGoal,
                Source = $"goalReportBefore:{recommendation.Id}",
                CreatedAtUtc = DateTime.UtcNow,
                ActiveFrom = DateTime.UtcNow.Date
            });

            if (recommendation.SuggestedCalories.HasValue)
            {
                var delta = recommendation.SuggestedCalories.Value - settings.CalorieGoal;
                delta = Math.Clamp(delta, -250, 250);
                if (report.Confidence == "low")
                {
                    delta = Math.Clamp(delta, -100, 100);
                }
                settings.CalorieGoal = Math.Clamp(settings.CalorieGoal + delta, 800, 10000);
            }

            if (recommendation.SuggestedProtein.HasValue)
            {
                settings.ProteinGoal = Math.Clamp(recommendation.SuggestedProtein.Value, 0, 1000);
            }

            settings.UpdatedUtc = DateTime.UtcNow;

            if (settings.CalorieGoal != originalCalories ||
                settings.ProteinGoal != originalProtein)
            {
                _db.NutritionTargetsHistory.Add(new NutritionTargetsHistory
                {
                    UserId = userId,
                    Calories = settings.CalorieGoal,
                    Protein = settings.ProteinGoal,
                    Carbs = settings.CarbGoal,
                    Fat = settings.FatGoal,
                    Source = $"goalReport:{recommendation.Id}",
                    CreatedAtUtc = DateTime.UtcNow,
                    ActiveFrom = DateTime.UtcNow.Date.AddDays(1)
                });
            }

            await _db.SaveChangesAsync(ct);

            return new ApplyCutRecommendationResultDto
            {
                Applied = true,
                Message = "Anbefalingen er brukt i målene dine.",
                CalorieGoal = settings.CalorieGoal,
                ProteinGoal = settings.ProteinGoal,
                CanUndo = true,
            };
        }

        public async Task<ApplyCutRecommendationResultDto> UndoLastRecommendationAsync(
            string userId,
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

            var recentGoalHistory = await _db.NutritionTargetsHistory
                .AsNoTracking()
                .Where(x => x.UserId == userId &&
                            x.Source.StartsWith("goalReport") &&
                            x.CreatedAtUtc >= DateTime.UtcNow.AddHours(-24))
                .OrderByDescending(x => x.CreatedAtUtc)
                .Take(40)
                .ToListAsync(ct);

            var undoneRecommendationIds = recentGoalHistory
                .Where(x => x.Source.StartsWith("goalReportUndo:", StringComparison.Ordinal))
                .Select(x => x.Source["goalReportUndo:".Length..])
                .ToHashSet(StringComparer.Ordinal);

            var previous = recentGoalHistory
                .Where(x => x.Source.StartsWith("goalReportBefore:", StringComparison.Ordinal))
                .FirstOrDefault(x =>
                {
                    var recommendationId = x.Source["goalReportBefore:".Length..];
                    return !undoneRecommendationIds.Contains(recommendationId) &&
                           recentGoalHistory.Any(after =>
                               after.Source == $"goalReport:{recommendationId}" &&
                               after.CreatedAtUtc >= x.CreatedAtUtc);
                });

            if (previous == null)
            {
                return new ApplyCutRecommendationResultDto
                {
                    Applied = false,
                    Message = "Fant ingen nylig målrapport-endring å angre.",
                    CalorieGoal = settings.CalorieGoal,
                    ProteinGoal = settings.ProteinGoal,
                };
            }

            settings.CalorieGoal = previous.Calories;
            settings.ProteinGoal = previous.Protein;
            settings.CarbGoal = previous.Carbs;
            settings.FatGoal = previous.Fat;
            settings.UpdatedUtc = DateTime.UtcNow;

            _db.NutritionTargetsHistory.Add(new NutritionTargetsHistory
            {
                UserId = userId,
                Calories = settings.CalorieGoal,
                Protein = settings.ProteinGoal,
                Carbs = settings.CarbGoal,
                Fat = settings.FatGoal,
                Source = $"goalReportUndo:{previous.Source.Replace("goalReportBefore:", "", StringComparison.Ordinal)}",
                CreatedAtUtc = DateTime.UtcNow,
                ActiveFrom = DateTime.UtcNow.Date
            });

            await _db.SaveChangesAsync(ct);

            return new ApplyCutRecommendationResultDto
            {
                Applied = true,
                Message = "Siste målrapport-endring er angret.",
                CalorieGoal = settings.CalorieGoal,
                ProteinGoal = settings.ProteinGoal,
                CanUndo = false,
            };
        }

        private async Task SaveSnapshotAsync(
            string userId,
            CutReportDto report,
            List<string> problemIds,
            CancellationToken ct)
        {
            var week = GetCurrentWeek();
            var existing = await _db.GoalReportSnapshots
                .FirstOrDefaultAsync(x => x.UserId == userId &&
                                          x.GoalType == report.GoalType &&
                                          x.WeekStart == week.Start &&
                                          x.AlgorithmVersion == AlgorithmVersion,
                    ct);
            var snapshot = existing ?? new GoalReportSnapshot
            {
                UserId = userId,
                GoalType = report.GoalType,
                WeekStart = week.Start,
                WeekEnd = week.End,
                AlgorithmVersion = AlgorithmVersion
            };

            snapshot.GeneratedAtUtc = DateTime.UtcNow;
            snapshot.Score = report.Score;
            snapshot.Status = report.Status;
            snapshot.Confidence = report.Confidence;
            snapshot.IsLimitedReport = report.IsLimitedReport;
            snapshot.ProblemIdsJson = JsonSerializer.Serialize(problemIds, JsonOptions);
            snapshot.RecommendationIdsJson = JsonSerializer.Serialize(
                report.Recommendations.Select(x => x.Id).ToList(),
                JsonOptions);
            snapshot.ReportJson = JsonSerializer.Serialize(report, JsonOptions);

            if (existing == null)
            {
                _db.GoalReportSnapshots.Add(snapshot);
            }

            await _db.SaveChangesAsync(ct);
        }

        private static WeekWindow GetCurrentWeek()
        {
            var today = AdaptivePlanningClock.Today();
            var dayOffset = ((int)today.DayOfWeek + 6) % 7;
            var start = today.AddDays(-dayOffset);
            return new WeekWindow(start, start.AddDays(6));
        }

        private static string MapGoalType(WeightDirection direction)
        {
            return direction switch
            {
                WeightDirection.Gain => "leanBulk",
                WeightDirection.Maintain => "maintenance",
                _ => "cut"
            };
        }

        private static DateTime EstimateGoalStart(
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
            string goalType,
            int daysSinceGoalStart,
            int weightLogsLast28,
            int foodDaysLast28,
            int strengthSessionsLast28)
        {
            var goalLabel = GoalLabel(goalType);
            var items = new List<CutReadinessItemDto>
            {
                ReadinessItem("goal_days", $"Dager siden {goalLabel}-start", daysSinceGoalStart, 28, "dager"),
                ReadinessItem("weight_logs", "Vektmålinger siste 28 dager", weightLogsLast28, 12, "målinger"),
                ReadinessItem("food_logs", "Komplette matdager siste 28 dager", foodDaysLast28, 20, "dager"),
                ReadinessItem("strength_sessions", "Fullførte økter siste 28 dager", strengthSessionsLast28, 6, "økter"),
            };
            var readyCount = items.Count(x => x.IsReady);
            var hasWeightNutrition = weightLogsLast28 >= 8 && foodDaysLast28 >= 12;
            var limited = hasWeightNutrition && strengthSessionsLast28 < 6;

            return new CutReadinessDto
            {
                IsReady = readyCount == items.Count,
                ReadyItemCount = readyCount,
                TotalItemCount = items.Count,
                Items = items,
                Summary = readyCount == items.Count
                    ? $"Datagrunnlaget er godt nok for en månedlig {ReportName(goalType)}."
                    : limited
                        ? "Rapporten har nok vekt og mat til en begrenset vurdering, men trening tolkes forsiktig."
                        : $"Månedsrapporten bygger fortsatt datagrunnlag: {readyCount}/{items.Count} krav er oppfylt.",
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

        private static GoalMonthlySummaryDto BuildMonthlySummary(
            string goalType,
            DateTime periodStart,
            DateTime periodEnd,
            int daysSinceGoalStart,
            List<DailyNutrition> nutritionDays,
            List<WeightPoint> weights,
            List<WorkoutSession> sessions,
            string reportStatus,
            string confidence,
            double? averageWeight7d,
            double? weeklyChangePercent,
            double? previousWeeklyChangePercent,
            double? proteinPerKg,
            UserSettings settings)
        {
            var completeNutritionDays = nutritionDays.Count(x => x.Calories >= 800);
            var weighIns = weights.Select(x => x.Date).Distinct().Count();
            var completedWorkouts = sessions.Count;
            var daysTracked = Math.Min(28, Math.Max(0, daysSinceGoalStart));
            var score = CalculateMonthlyDataQualityScore(
                daysTracked,
                completeNutritionDays,
                weighIns,
                completedWorkouts);
            var monthlyConfidence = score >= 85
                ? "high"
                : score >= 55
                    ? "medium"
                    : "low";

            var missing = new List<string>();
            if (completeNutritionDays < 20)
                missing.Add($"{20 - completeNutritionDays} flere komplette matdager");
            if (weighIns < 12)
                missing.Add($"{12 - weighIns} flere vektmålinger");
            if (completedWorkouts < 6)
                missing.Add($"{6 - completedWorkouts} flere fullførte økter");

            return new GoalMonthlySummaryDto
            {
                PeriodStart = periodStart,
                PeriodEnd = periodEnd,
                DaysTracked = daysTracked,
                NutritionDays = completeNutritionDays,
                WeighIns = weighIns,
                CompletedWorkouts = completedWorkouts,
                DataQualityScore = score,
                Confidence = monthlyConfidence,
                IsHighConfidence = monthlyConfidence == "high",
                Verdict = BuildMonthlyVerdict(goalType, reportStatus, monthlyConfidence),
                TopInsight = BuildMonthlyTopInsight(
                    goalType,
                    monthlyConfidence,
                    weeklyChangePercent,
                    previousWeeklyChangePercent,
                    proteinPerKg,
                    completeNutritionDays),
                Recommendation = BuildMonthlyRecommendation(
                    goalType,
                    monthlyConfidence,
                    reportStatus,
                    weeklyChangePercent,
                    previousWeeklyChangePercent,
                    proteinPerKg,
                    settings),
                MissingForHighConfidence = missing,
                NextMonthFocus = BuildNextMonthFocus(
                    goalType,
                    monthlyConfidence,
                    completeNutritionDays,
                    weighIns,
                    completedWorkouts,
                    proteinPerKg),
                MonthJourney = BuildMonthJourney(periodStart, periodEnd, nutritionDays, weights, sessions)
            };
        }

        private static int CalculateMonthlyDataQualityScore(
            int daysTracked,
            int nutritionDays,
            int weighIns,
            int workouts)
        {
            var timeScore = Math.Min(1, daysTracked / 28d) * 20;
            var nutritionScore = Math.Min(1, nutritionDays / 20d) * 30;
            var weightScore = Math.Min(1, weighIns / 12d) * 25;
            var trainingScore = Math.Min(1, workouts / 6d) * 25;
            return Math.Clamp((int)Math.Round(timeScore + nutritionScore + weightScore + trainingScore), 0, 100);
        }

        private static string BuildMonthlyVerdict(
            string goalType,
            string reportStatus,
            string confidence)
        {
            if (confidence == "low")
                return "Månedsrapporten bygges fortsatt. Hold planen stabil til datagrunnlaget er bedre.";

            return reportStatus switch
            {
                "excellent" or "onTrack" or "strengthProgressing" or "stable" or "maintenanceFound" =>
                    $"{ReportName(goalType)} er hovedsakelig på plan.",
                "tooAggressive" or "tooFast" or "dirtyBulkRisk" =>
                    $"{ReportName(goalType)} går litt for aggressivt over måneden.",
                "tooSlow" or "driftingDown" or "driftingUp" =>
                    $"{ReportName(goalType)} trenger en rolig justering hvis signalet holder seg.",
                "strengthRisk" or "poorTrainingResponse" or "fatigueRisk" =>
                    "Trening og recovery bør vurderes før større kaloriendringer.",
                _ => "Måneden gir nyttige signaler, men konklusjonen bør holdes forsiktig."
            };
        }

        private static string BuildMonthlyTopInsight(
            string goalType,
            string confidence,
            double? weeklyChangePercent,
            double? previousWeeklyChangePercent,
            double? proteinPerKg,
            int nutritionDays)
        {
            if (confidence == "low")
                return "Datakvaliteten er viktigste signal akkurat nå. Mer logging gir en mer presis månedsrapport.";
            if (nutritionDays < 20)
                return "Matloggingen er den største begrensningen for sterke konklusjoner denne måneden.";
            if (proteinPerKg.HasValue && proteinPerKg.Value < 1.6)
                return "Protein ligger lavt for målet. Prioriter protein før større kalorijusteringer.";
            if (weeklyChangePercent.HasValue && previousWeeklyChangePercent.HasValue)
            {
                var sameDirection = Math.Sign(weeklyChangePercent.Value) == Math.Sign(previousWeeklyChangePercent.Value);
                if (sameDirection && Math.Abs(weeklyChangePercent.Value) > 0.25)
                    return "De siste ukene peker i samme retning, så månedsmønsteret er sterkere enn én enkelt uke.";
            }

            return goalType switch
            {
                "leanBulk" => "Bulk-kvaliteten vurderes best mot både vektøkning og styrkerespons, ikke vekt alene.",
                "maintenance" => "Stabil vekt med stabil eller økende styrke er et sterkt vedlikeholdssignal.",
                _ => "Cut-kvaliteten handler om tempo, protein, styrke og logging samlet."
            };
        }

        private static string BuildMonthlyRecommendation(
            string goalType,
            string confidence,
            string reportStatus,
            double? weeklyChangePercent,
            double? previousWeeklyChangePercent,
            double? proteinPerKg,
            UserSettings settings)
        {
            if (confidence == "low")
                return "Ikke endre kalorier ennå. Logg mer data og hold planen stabil.";
            if (proteinPerKg.HasValue && proteinPerKg.Value < 1.6)
                return "Prioriter protein neste måned før du gjør større endringer i kalorimålet.";

            var repeatedSignal = weeklyChangePercent.HasValue &&
                                 previousWeeklyChangePercent.HasValue &&
                                 Math.Sign(weeklyChangePercent.Value) == Math.Sign(previousWeeklyChangePercent.Value);
            if (!repeatedSignal)
                return "Hold kaloriene stabile. Måneden har ikke et tydelig nok gjentatt vektsignal.";

            return reportStatus switch
            {
                "tooSlow" when goalType == "cut" =>
                    $"Vurder en liten reduksjon på 100-200 kcal fra {settings.CalorieGoal} kcal hvis loggingen holder seg god.",
                "tooAggressive" or "tooFast" when goalType == "cut" =>
                    $"Vurder en liten økning på 100-200 kcal fra {settings.CalorieGoal} kcal for å roe tempoet.",
                "dirtyBulkRisk" when goalType == "leanBulk" =>
                    "Ikke øk kaloriene. Vurder lavere surplus eller bedre treningskvalitet neste måned.",
                "tooSlow" when goalType == "leanBulk" =>
                    $"Vurder en liten økning på 100-200 kcal fra {settings.CalorieGoal} kcal hvis styrken også står stille.",
                "driftingUp" when goalType == "maintenance" =>
                    "Vekten driver opp. Vurder 100-150 kcal lavere hvis dette fortsetter.",
                "driftingDown" when goalType == "maintenance" =>
                    "Vekten driver ned. Vurder 100-150 kcal høyere hvis dette fortsetter.",
                _ => "Hold planen stabil neste måned og bygg videre på samme rytme."
            };
        }

        private static List<string> BuildNextMonthFocus(
            string goalType,
            string confidence,
            int nutritionDays,
            int weighIns,
            int workouts,
            double? proteinPerKg)
        {
            var focus = new List<string>();
            if (nutritionDays < 20) focus.Add("Logg mat minst 5 dager per uke");
            if (weighIns < 12) focus.Add("Vei deg 3-5 ganger per uke");
            if (workouts < 6) focus.Add("Fullfør planlagte styrkeøkter jevnt");
            if (proteinPerKg.HasValue && proteinPerKg.Value < 1.6)
                focus.Add("Treff proteinmålet oftere");

            if (focus.Count == 0)
            {
                focus.Add(goalType switch
                {
                    "leanBulk" => "Hold bulk-tempoet kontrollert og prioriter progresjon i hovedøvelsene",
                    "maintenance" => "Hold kaloriene stabile og se etter styrke eller recomp-signal",
                    _ => "Hold kaloriene stabile og beskytt styrken i hovedøvelsene"
                });
            }

            if (confidence != "high")
                focus.Add("Vent med store planendringer til rapporten har høyere sikkerhet");

            return focus.Take(4).ToList();
        }

        private static List<GoalMonthJourneyWeekDto> BuildMonthJourney(
            DateTime periodStart,
            DateTime periodEnd,
            List<DailyNutrition> nutritionDays,
            List<WeightPoint> weights,
            List<WorkoutSession> sessions)
        {
            var journey = new List<GoalMonthJourneyWeekDto>();
            for (var i = 0; i < 4; i++)
            {
                var start = periodStart.AddDays(i * 7);
                var end = i == 3 ? periodEnd : start.AddDays(6);
                var nutrition = nutritionDays.Count(x => x.Date >= start && x.Date <= end && x.Calories >= 800);
                var weighIns = weights.Select(x => x.Date).Distinct().Count(x => x >= start && x <= end);
                var workouts = sessions.Count(x => x.StartedAtUtc.Date >= start && x.StartedAtUtc.Date <= end);
                var status = nutrition >= 5 && weighIns >= 3 && workouts >= 2
                    ? "strong"
                    : nutrition >= 3 && weighIns >= 2
                        ? "mixed"
                        : "needsData";

                journey.Add(new GoalMonthJourneyWeekDto
                {
                    WeekNumber = i + 1,
                    WeekStart = start,
                    WeekEnd = end,
                    Status = status,
                    NutritionDays = nutrition,
                    WeighIns = weighIns,
                    Workouts = workouts
                });
            }

            return journey;
        }

        private static List<string> BuildWarnings(
            string goalType,
            double? averageWeightPrevious7d,
            double? weeklyChangeKg,
            double? avgCalories,
            bool possibleWaterWeight)
        {
            var warnings = new List<string>();
            if (!averageWeightPrevious7d.HasValue)
            {
                warnings.Add("Forrige 7-dagers vektsnitt mangler. Trenden blir sikrere når du har 14 dager med målinger.");
            }

            if (possibleWaterWeight)
            {
                warnings.Add("Vekten har endret seg mer enn 1,5 % på 3 dager. Det kan være væske, salt, karbohydrater eller mageinnhold, så store kaloriendringer unngås.");
            }

            if (weeklyChangeKg.HasValue && avgCalories.HasValue)
            {
                warnings.Add("Kaloriestimat fra vekttrend bruker 7700 kcal/kg som grovt estimat. Avvik kan skyldes logging, vannvekt, mageinnhold, aktivitet eller feil estimert vedlikehold.");
            }

            if (goalType == "maintenance")
            {
                warnings.Add("Vedlikeholdskalorier vises som estimat, ikke fasit.");
            }

            return warnings;
        }

        private static CutAdherenceSummaryDto BuildAdherenceSummary(
            int weightLogsLast28,
            List<DailyNutrition> currentNutrition,
            UserSettings settings,
            int sessionsLast14)
        {
            var mealLogging = currentNutrition.Select(x => x.Date).Distinct().Count() / 7d * 100;
            var weighIn = Math.Min(100, weightLogsLast28 / 5d * 100);
            var proteinDays = settings.ProteinGoal > 0
                ? currentNutrition.Count(x => x.ProteinGrams >= settings.ProteinGoal * 0.9)
                : 0;
            var calorieDays = settings.CalorieGoal > 0
                ? currentNutrition.Count(x => Math.Abs(x.Calories - settings.CalorieGoal) <= 300)
                : 0;
            var loggedDays = Math.Max(1, currentNutrition.Count);
            var proteinAdherence = proteinDays / (double)loggedDays * 100;
            var calorieAdherence = calorieDays / (double)loggedDays * 100;
            double? workoutAdherence = Math.Min(100, sessionsLast14 / 4d * 100);

            var summary = mealLogging < 50
                ? "Matloggingen er for tynn til harde justeringer."
                : mealLogging < 70
                    ? "Loggingen gir signaler, men kalorier bør ikke justeres hardt ennå."
                    : "Loggingen er god nok til forsiktige coachvurderinger.";

            return new CutAdherenceSummaryDto
            {
                MealLoggingAdherencePercent = Round(mealLogging) ?? 0,
                WeighInAdherencePercent = Round(weighIn) ?? 0,
                ProteinTargetAdherencePercent = Round(proteinAdherence) ?? 0,
                CalorieTargetAdherencePercent = Round(calorieAdherence) ?? 0,
                WorkoutAdherencePercent = Round(workoutAdherence),
                Summary = summary
            };
        }

        private static CutStrengthSummaryDto BuildStrengthSummary(
            List<WorkoutSession> sessions,
            DateTime current14Start,
            string goalType)
        {
            var current = new Dictionary<Guid, StrengthAggregate>();
            var previous = new Dictionary<Guid, StrengthAggregate>();

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
                        var target = isCurrent ? current : previous;
                        if (!target.TryGetValue(exerciseLog.ExerciseId, out var aggregate))
                        {
                            aggregate = new StrengthAggregate(
                                exerciseLog.ExerciseId,
                                exerciseLog.Exercise?.Name ?? "Øvelse",
                                exerciseLog.Exercise?.IsCompound == true,
                                exerciseLog.Exercise?.IsIsolation == true);
                            target[exerciseLog.ExerciseId] = aggregate;
                        }

                        aggregate.Exposures++;
                        aggregate.Volume += weightKg * reps;
                        if (estimated1Rm > aggregate.BestEstimated1Rm)
                        {
                            aggregate.BestEstimated1Rm = estimated1Rm;
                        }
                    }
                }
            }

            var comparable = current
                .Where(x => previous.ContainsKey(x.Key))
                .Select(x =>
                {
                    var prev = previous[x.Key];
                    var change = prev.BestEstimated1Rm > 0
                        ? (x.Value.BestEstimated1Rm - prev.BestEstimated1Rm) / prev.BestEstimated1Rm * 100
                        : 0;
                    return new
                    {
                        Current = x.Value,
                        Previous = prev,
                        Dto = new CutExerciseStrengthDto
                        {
                            ExerciseId = x.Key,
                            ExerciseName = x.Value.ExerciseName,
                            CurrentEstimated1Rm = Round(x.Value.BestEstimated1Rm) ?? x.Value.BestEstimated1Rm,
                            PreviousEstimated1Rm = Round(prev.BestEstimated1Rm) ?? prev.BestEstimated1Rm,
                            ChangePercent = Round(change) ?? change,
                            Trend = StrengthTrend(change),
                        }
                    };
                })
                .OrderByDescending(x => ExerciseWeight(x.Current))
                .ThenByDescending(x => x.Current.Volume)
                .ToList();

            var keyExercises = comparable.Take(5).Select(x => x.Dto).ToList();
            var weightedAverage = comparable.Count > 0
                ? comparable.Sum(x => x.Dto.ChangePercent * ExerciseWeight(x.Current)) /
                  comparable.Sum(x => ExerciseWeight(x.Current))
                : (double?)null;

            return new CutStrengthSummaryDto
            {
                ComparableExercises = comparable.Count,
                AverageStrengthChangePercent = Round(weightedAverage),
                ExercisesProgressing = comparable.Count(x => x.Dto.ChangePercent > 2),
                ExercisesStable = comparable.Count(x => x.Dto.ChangePercent >= -2 && x.Dto.ChangePercent <= 2),
                ExercisesMildRegression = comparable.Count(x => x.Dto.ChangePercent < -2 && x.Dto.ChangePercent >= -5),
                ExercisesSignificantRegression = comparable.Count(x => x.Dto.ChangePercent < -5),
                KeyExercises = keyExercises,
                Summary = BuildStrengthSummaryText(goalType, weightedAverage, comparable.Count),
            };
        }

        private static CutTrainingLoadSummaryDto BuildTrainingLoadSummary(
            List<WorkoutSession> sessions,
            DateTime current14Start,
            string goalType)
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
            var fatigueRisk = volumeChange > 20;

            return new CutTrainingLoadSummaryDto
            {
                SessionsLast14d = currentSessions.Count,
                SessionsPrevious14d = previousSessions.Count,
                WeeklyVolumeCurrent = Round(currentWeeklyVolume),
                WeeklyVolumePrevious = Round(previousWeeklyVolume),
                VolumeChangePercent = Round(volumeChange),
                FatigueRisk = fatigueRisk,
                Summary = BuildTrainingSummaryText(goalType, currentSessions.Count, previousSessions.Count, volumeChange),
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

        private static List<CutScoreFactorDto> BuildScoreBreakdown(
            string goalType,
            double? weeklyChangePercent,
            double? previousWeeklyChangePercent,
            double? proteinPerKg,
            double? carbsPerKg,
            double? fatPerKg,
            double? fatCaloriesPercent,
            CutStrengthSummaryDto strength,
            CutTrainingLoadSummaryDto training,
            CutAdherenceSummaryDto adherence,
            bool possibleWaterWeight,
            bool isLimitedReport)
        {
            var weights = goalType switch
            {
                "leanBulk" => new[] { 30, 30, 20, 10, 10 },
                "maintenance" => new[] { 25, 25, 20, 15, 15 },
                _ => new[] { 30, 25, 25, 10, 10 }
            };

            var weightScore = ScoreWeightTrend(goalType, weeklyChangePercent, previousWeeklyChangePercent, possibleWaterWeight);
            var strengthScore = ScoreStrength(goalType, strength, training, isLimitedReport);
            var nutritionScore = ScoreNutrition(goalType, proteinPerKg, carbsPerKg, fatPerKg, fatCaloriesPercent, adherence);
            var trainingScore = ScoreTraining(training, isLimitedReport);
            var dataScore = ScoreDataQuality(adherence, isLimitedReport, possibleWaterWeight);

            return
            [
                ScoreFactor("weightTrendScore", goalType == "maintenance" ? "Vektstabilitet" : "Vekttrend", weightScore, weights[0], WeightScoreReason(goalType, weeklyChangePercent)),
                ScoreFactor("strengthScore", goalType == "cut" ? "Styrkebevaring" : "Styrkerespons", strengthScore, weights[1], StrengthScoreReason(strength, isLimitedReport)),
                ScoreFactor("nutritionScore", "Ernæring", nutritionScore, weights[2], NutritionScoreReason(proteinPerKg, carbsPerKg, fatPerKg, adherence)),
                ScoreFactor("trainingConsistencyScore", "Treningskonsistens", trainingScore, weights[3], TrainingScoreReason(training, isLimitedReport)),
                ScoreFactor("dataQualityScore", "Datakvalitet", dataScore, weights[4], DataScoreReason(adherence, possibleWaterWeight, isLimitedReport)),
            ];
        }

        private static int ScoreWeightTrend(
            string goalType,
            double? weeklyChangePercent,
            double? previousWeeklyChangePercent,
            bool possibleWaterWeight)
        {
            if (!weeklyChangePercent.HasValue) return 45;
            if (possibleWaterWeight) return 55;

            if (goalType == "cut")
            {
                var loss = -weeklyChangePercent.Value;
                if (loss is >= 0.5 and <= 1.0) return 95;
                if (loss is >= 0.25 and < 0.5) return 85;
                if (loss is > 1.0 and <= 1.25) return 68;
                if (loss > 1.25) return 35;
                return previousWeeklyChangePercent < 0 ? 58 : 45;
            }

            if (goalType == "leanBulk")
            {
                var gain = weeklyChangePercent.Value;
                if (gain is >= 0.1 and <= 0.25) return 95;
                if (gain is > 0.25 and <= 0.5) return 82;
                if (gain is > 0.5 and <= 0.75) return 58;
                if (gain > 0.75) return 35;
                return 55;
            }

            var drift = Math.Abs(weeklyChangePercent.Value);
            if (drift <= 0.25) return 96;
            if (drift <= 0.5) return 72;
            return 45;
        }

        private static int ScoreStrength(
            string goalType,
            CutStrengthSummaryDto strength,
            CutTrainingLoadSummaryDto training,
            bool isLimitedReport)
        {
            if (isLimitedReport || strength.ComparableExercises == 0) return 60;
            var change = strength.AverageStrengthChangePercent ?? 0;
            if (change > 2) return goalType == "cut" ? 95 : 100;
            if (change >= -2) return goalType == "leanBulk" ? 78 : 92;
            if (change >= -5) return 58;
            return 35;
        }

        private static int ScoreNutrition(
            string goalType,
            double? proteinPerKg,
            double? carbsPerKg,
            double? fatPerKg,
            double? fatCaloriesPercent,
            CutAdherenceSummaryDto adherence)
        {
            var score = 100;
            var proteinFloor = goalType == "maintenance" ? 1.2 : 1.4;
            var proteinGood = goalType == "maintenance" ? 1.4 : 1.6;
            if (proteinPerKg < proteinFloor) score -= 28;
            else if (proteinPerKg < proteinGood) score -= 12;
            if (proteinPerKg > 2.4) score -= 4;
            if (carbsPerKg < 1.5) score -= 12;
            else if (carbsPerKg < 2) score -= 6;
            if (fatPerKg < 0.5 || fatCaloriesPercent < 20) score -= 10;
            if (adherence.CalorieTargetAdherencePercent < 50) score -= 12;
            if (adherence.ProteinTargetAdherencePercent < 60) score -= 10;
            return Math.Clamp(score, 0, 100);
        }

        private static int ScoreTraining(CutTrainingLoadSummaryDto training, bool isLimitedReport)
        {
            if (isLimitedReport) return 55;
            var score = training.SessionsLast14d >= 4 ? 95 :
                training.SessionsLast14d >= 2 ? 78 : 42;
            if (training.SessionsPrevious14d > 0 &&
                training.SessionsLast14d < training.SessionsPrevious14d * 0.75)
            {
                score -= 18;
            }
            if (training.VolumeChangePercent > 20) score -= 8;
            return Math.Clamp(score, 0, 100);
        }

        private static int ScoreDataQuality(
            CutAdherenceSummaryDto adherence,
            bool isLimitedReport,
            bool possibleWaterWeight)
        {
            var score = 100;
            if (adherence.MealLoggingAdherencePercent < 50) score -= 35;
            else if (adherence.MealLoggingAdherencePercent < 70) score -= 18;
            if (adherence.WeighInAdherencePercent < 60) score -= 18;
            if (isLimitedReport) score -= 18;
            if (possibleWaterWeight) score -= 12;
            return Math.Clamp(score, 0, 100);
        }

        private static CutScoreFactorDto ScoreFactor(
            string id,
            string label,
            int score,
            int weightPercent,
            string reason)
        {
            return new CutScoreFactorDto
            {
                Id = id,
                Label = label,
                Score = score,
                WeightPercent = weightPercent,
                PointsLost = Math.Max(0, 100 - score),
                Reason = reason,
            };
        }

        private static string GetStatus(StatusContext c)
        {
            if (c.NotEnoughData) return "notEnoughData";
            if (c.IsLimitedReport) return "limitedData";
            if (c.Adherence.MealLoggingAdherencePercent < 50 || c.Confidence == "low") return "inconsistentData";

            var strengthDrop = c.Strength.AverageStrengthChangePercent ?? 0;
            if (c.GoalType == "cut")
            {
                var loss = c.WeeklyChangePercent.HasValue ? -c.WeeklyChangePercent.Value : (double?)null;
                if (loss > 1.25 || (loss > 1.0 && strengthDrop < -3)) return "tooAggressive";
                if (c.Strength.ExercisesSignificantRegression >= 2 || strengthDrop < -3) return "strengthRisk";
                if (c.Training.VolumeChangePercent > 20 && strengthDrop < -2) return "fatigueRisk";
                if (loss is > 1.0 and <= 1.25) return "slightlyAggressive";
                if (loss < 0.25 && c.PreviousWeeklyChangePercent >= -0.25) return "tooSlow";
                if (loss is >= 0.4 and <= 0.9 &&
                    c.ProteinPerKg >= 1.6 &&
                    strengthDrop >= -2 &&
                    c.Adherence.MealLoggingAdherencePercent >= 80 &&
                    c.Training.SessionsLast14d >= 2)
                    return "excellent";
                if (loss is >= 0.25 and <= 1.0) return "onTrack";
            }

            if (c.GoalType == "leanBulk")
            {
                var gain = c.WeeklyChangePercent;
                var strengthProgress = strengthDrop > 2 || c.Strength.ExercisesProgressing >= 2;
                var volumeUp = c.Training.VolumeChangePercent > 5;
                if (gain > 0.75 || (gain > 0.5 && !strengthProgress && !volumeUp)) return "dirtyBulkRisk";
                if (gain > 0.5) return "tooFast";
                if (gain < 0.1) return "tooSlow";
                if (gain is >= 0.1 and <= 0.25 &&
                    strengthProgress &&
                    c.ProteinPerKg >= 1.4 &&
                    c.Adherence.MealLoggingAdherencePercent >= 80)
                    return "excellent";
                if (strengthProgress) return "strengthProgressing";
                if (gain > 0.1 && !strengthProgress && !volumeUp) return "poorTrainingResponse";
                return "onTrack";
            }

            if (c.GoalType == "maintenance")
            {
                var drift = c.WeeklyChangePercent.HasValue ? Math.Abs(c.WeeklyChangePercent.Value) : (double?)null;
                var strengthProgress = strengthDrop > 2 || c.Strength.ExercisesProgressing >= 2;
                if (drift <= 0.25 &&
                    strengthProgress &&
                    c.Adherence.MealLoggingAdherencePercent >= 80)
                    return "recompProgress";
                if (drift <= 0.25 &&
                    c.PreviousWeeklyChangePercent.HasValue &&
                    Math.Abs(c.PreviousWeeklyChangePercent.Value) <= 0.25 &&
                    c.Adherence.MealLoggingAdherencePercent >= 80)
                    return "maintenanceFound";
                if (drift <= 0.25) return c.Adherence.MealLoggingAdherencePercent >= 80 ? "excellent" : "stable";
                if (c.WeeklyChangePercent > 0.25) return "driftingUp";
                if (c.WeeklyChangePercent < -0.25) return "driftingDown";
                return "stable";
            }

            return "inconsistentData";
        }

        private static List<string> BuildStatusReasons(StatusContext c, string status)
        {
            var reasons = new List<string>();
            if (c.NotEnoughData)
            {
                reasons.Add("Det finnes for få vektlogger, matlogger og treningsøkter til at rapporten kan gi nyttig verdi.");
                return reasons;
            }

            if (c.IsLimitedReport)
            {
                reasons.Add("Vekt og mat gir signaler, men treningsdata mangler eller er ikke sammenlignbare.");
            }

            if (c.PossibleWaterWeight)
            {
                reasons.Add("Rask vektendring kan være væske eller mageinnhold, ikke ren fettendring.");
            }

            if (c.WeeklyChangePercent.HasValue)
            {
                reasons.Add($"7-dagers vekttrend er {c.WeeklyChangePercent.Value:0.0} % fra forrige uke.");
            }

            if (c.Strength.AverageStrengthChangePercent.HasValue)
            {
                reasons.Add($"Sammenlignbar styrke er {c.Strength.AverageStrengthChangePercent.Value:0.0} %.");
            }

            if (c.Adherence.MealLoggingAdherencePercent < 70)
            {
                reasons.Add("Matloggingen er under 70 %, så kaloriendringer holdes tilbake.");
            }

            if (reasons.Count == 0)
            {
                reasons.Add($"Status er satt til {status} basert på tempo, ernæring, styrke og datakvalitet.");
            }

            return reasons;
        }

        private static List<string> GetProblemIds(CutReportDto report, bool possibleWaterWeight)
        {
            var problems = new List<string>();
            if (report.NotEnoughData) problems.Add("not_enough_data");
            if (report.IsLimitedReport) problems.Add("limited_training_data");
            if (possibleWaterWeight) problems.Add("possible_water_weight");
            if (report.Status is "tooAggressive" or "dirtyBulkRisk" or "tooFast") problems.Add("unsafe_weight_pace");
            if (report.Status is "strengthRisk" or "poorTrainingResponse") problems.Add("strength_response");
            if (report.TrainingLoadSummary.FatigueRisk) problems.Add("fatigue_risk");
            if (report.NutritionSummary.ProteinPerKg < ProteinLowThreshold(report.GoalType)) problems.Add("low_protein");
            if (report.AdherenceSummary.MealLoggingAdherencePercent < 70) problems.Add("low_logging");
            if (report.TrainingLoadSummary.SessionsLast14d < 2) problems.Add("low_training_consistency");
            if (report.NutritionSummary.CarbsPerKg < 2 &&
                report.StrengthSummary.AverageStrengthChangePercent < -2) problems.Add("low_carbs_strength_drop");
            if (report.NutritionSummary.FatPerKg < 0.5 ||
                report.NutritionSummary.FatCaloriesPercent < 20) problems.Add("low_fat");
            return problems.Distinct().ToList();
        }

        private static CutPreviousReportComparisonDto BuildPreviousComparison(
            List<GoalReportSnapshot> previousReports,
            int score,
            string status,
            List<string> currentProblemIds)
        {
            var previous = previousReports.FirstOrDefault();
            if (previous == null)
            {
                return new CutPreviousReportComparisonDto
                {
                    HasPreviousReport = false,
                    Summary = "Dette er første lagrede målrapport for denne måltypen."
                };
            }

            var previousProblems = DeserializeStringList(previous.ProblemIdsJson);
            var repeated = currentProblemIds.Intersect(previousProblems).ToList();
            var resolved = previousProblems.Except(currentProblemIds).ToList();
            var scoreChange = score - previous.Score;
            var onTrackStatuses = new HashSet<string>
            {
                "excellent", "onTrack", "strengthProgressing", "stable", "recompProgress", "maintenanceFound"
            };
            var consecutiveOn = onTrackStatuses.Contains(status) ? 1 : 0;
            var consecutiveOff = onTrackStatuses.Contains(status) ? 0 : 1;
            foreach (var report in previousReports)
            {
                if (onTrackStatuses.Contains(status) && onTrackStatuses.Contains(report.Status))
                    consecutiveOn++;
                else if (!onTrackStatuses.Contains(status) && !onTrackStatuses.Contains(report.Status))
                    consecutiveOff++;
                else
                    break;
            }

            var summary = scoreChange > 0
                ? $"Score er opp {scoreChange} poeng siden forrige rapport."
                : scoreChange < 0
                    ? $"Score er ned {Math.Abs(scoreChange)} poeng siden forrige rapport."
                    : "Score er uendret siden forrige rapport.";

            return new CutPreviousReportComparisonDto
            {
                HasPreviousReport = true,
                PreviousScore = previous.Score,
                ScoreChange = scoreChange,
                PreviousStatus = previous.Status,
                StatusChanged = previous.Status != status,
                ConsecutiveWeeksOnTrack = consecutiveOn,
                ConsecutiveWeeksOffTrack = consecutiveOff,
                RepeatedProblems = repeated,
                ResolvedProblems = resolved,
                LastRecommendationIds = DeserializeStringList(previous.RecommendationIdsJson),
                Summary = summary
            };
        }

        private static List<CutRecommendationDto> BuildRecommendations(
            CutReportDto report,
            List<string> problemIds,
            double? proteinPerKg,
            double? carbsPerKg,
            double? fatPerKg,
            double? weeklyChangePercent,
            double? previousWeeklyChangePercent,
            bool possibleWaterWeight,
            int currentCalorieGoal,
            int currentProteinGoal)
        {
            var items = new List<(int Order, CutRecommendationDto Recommendation)>();
            var strengthFalling = report.StrengthSummary.AverageStrengthChangePercent < -2;
            var loggingPoor = report.AdherenceSummary.MealLoggingAdherencePercent < 70;
            var targetAdherencePoor = report.AdherenceSummary.CalorieTargetAdherencePercent < 50;
            var lowConfidence = report.Confidence == "low";
            var canAdjustCalories = !lowConfidence &&
                                    !possibleWaterWeight &&
                                    !loggingPoor &&
                                    !targetAdherencePoor &&
                                    report.Score < 85;

            if (report.NotEnoughData)
            {
                items.Add((1, Rec(
                    "build_goal_data_foundation",
                    "Bygg datagrunnlaget først",
                    "high",
                    "data",
                    "Rapporten mangler nok vekt, mat og trening til å tolke trenden trygt.",
                    "Logg vekt minst 4 ganger, mat minst 4 dager og fullfør 2 fullførte økter før neste rapport.",
                    "Neste rapport kan skille mellom faktisk trend og støy.",
                    "high")));
            }

            if (report.IsLimitedReport && !report.NotEnoughData)
            {
                items.Add((1, Rec(
                    "complete_training_signal",
                    "Gjør treningssignalet komplett",
                    "high",
                    "data",
                    "Vekt og mat finnes, men treningsdata mangler eller er ikke sammenlignbar.",
                    "Logg minst 2 fullførte økter med samme nøkkeløvelser de neste 14 dagene.",
                    "Coachingen kan vurdere styrke og volum uten å gjette.",
                    report.Confidence)));
            }

            if (possibleWaterWeight)
            {
                items.Add((2, Rec(
                    "hold_during_water_shift",
                    "Hold planen gjennom vektstøy",
                    "high",
                    "weight",
                    "Vekten flyttet seg mer enn 1,5 % på 3 dager.",
                    "Hold kalorimålet uendret i 7 dager og fortsett 7-dagers snitt før du justerer.",
                    "Du unngår å reagere på væske, salt, karbohydrater eller mageinnhold.",
                        "low")));
            }

            if (!loggingPoor &&
                targetAdherencePoor &&
                report.NutritionSummary.LoggedDaysLast7d >= 4 &&
                !report.NotEnoughData)
            {
                items.Add((2, Rec(
                    "hit_current_calorie_target_first",
                    "Treff kalorimålet før du endrer det",
                    "high",
                    "nutrition",
                    $"Kalorimålet ble truffet på ca. {report.AdherenceSummary.CalorieTargetAdherencePercent:0} % av loggede dager.",
                    "Hold kalorimålet uendret én uke og prøv å ligge nærmere målet før du lar coachen endre target.",
                    "Neste rapport kan skille bedre mellom feil mål og ujevn gjennomføring.",
                    report.Confidence)));
            }

            if (report.GoalType == "cut")
            {
                var lossRate = weeklyChangePercent.HasValue ? -weeklyChangePercent.Value : (double?)null;
                if (lossRate > 1.25 || (lossRate > 1.0 && report.StrengthSummary.AverageStrengthChangePercent < -3))
                {
                    items.Add((3, Rec(
                        "increase_calories_fast_cut",
                        "Senk farten på cutten",
                        "high",
                        "nutrition",
                        $"Vekttapet er ca. {Round(lossRate) ?? lossRate:F1} % per uke, og det er aggressivt.",
                        "Øk kalorimålet med 150-250 kcal per dag neste uke.",
                        "Tempoet bør bli roligere uten å stoppe cutten.",
                        report.Confidence,
                        canAdjustCalories ? "calories" : null,
                        suggestedCalories: currentCalorieGoal + SafeCalorieStep(report.Confidence, 200))));
                }
                else if (lossRate < 0.25 &&
                         previousWeeklyChangePercent >= -0.25 &&
                         canAdjustCalories)
                {
                    items.Add((8, Rec(
                        "reduce_calories_slow_cut",
                        "Lag et lite underskudd",
                        "medium",
                        "nutrition",
                        "Vekttrenden har vært treg i to uker, og loggingen er god nok til en forsiktig justering.",
                        "Senk kalorimålet med 100-200 kcal per dag neste uke.",
                        "7-dagers snitt bør begynne å bevege seg rolig nedover.",
                        report.Confidence,
                        "calories",
                        suggestedCalories: currentCalorieGoal - SafeCalorieStep(report.Confidence, 150))));
                }
            }

            if (report.GoalType == "leanBulk")
            {
                var gain = weeklyChangePercent;
                if (gain > 0.75 || report.Status == "dirtyBulkRisk")
                {
                    items.Add((3, Rec(
                        "slow_dirty_bulk_risk",
                        "Senk bulk-farten",
                        "high",
                        "nutrition",
                        "Vekten øker raskere enn styrke eller volum tilsier.",
                        canAdjustCalories
                            ? "Senk kalorimålet med 150-250 kcal per dag, eller hold kalorier og gjør treningen stabil hvis øktene mangler."
                            : "Hold kaloriene stabile og få 2-4 solide økter før du øker matinntaket.",
                        "Bulk-kvaliteten bør bli bedre og fettøkning mindre sannsynlig.",
                        report.Confidence,
                        canAdjustCalories ? "calories" : null,
                        suggestedCalories: currentCalorieGoal - SafeCalorieStep(report.Confidence, 200))));
                }
                else if (gain < 0.1 &&
                         report.TrainingLoadSummary.SessionsLast14d >= 2 &&
                         canAdjustCalories)
                {
                    items.Add((8, Rec(
                        "increase_calories_slow_bulk",
                        "Øk bulken forsiktig",
                        "medium",
                        "nutrition",
                        "Vekten øker under lean bulk-tempoet med god nok logging og trening.",
                        "Øk kalorimålet med 100-200 kcal per dag neste uke.",
                        "Vekten bør bevege seg sakte opp uten å presse tempoet.",
                        report.Confidence,
                        "calories",
                        suggestedCalories: currentCalorieGoal + SafeCalorieStep(report.Confidence, 150))));
                }
            }

            if (report.GoalType == "maintenance" &&
                canAdjustCalories &&
                weeklyChangePercent.HasValue &&
                previousWeeklyChangePercent.HasValue &&
                Math.Sign(weeklyChangePercent.Value) == Math.Sign(previousWeeklyChangePercent.Value) &&
                Math.Abs(weeklyChangePercent.Value) > 0.25)
            {
                var driftUp = weeklyChangePercent.Value > 0;
                items.Add((8, Rec(
                    driftUp ? "reduce_calories_maintenance_drift" : "increase_calories_maintenance_drift",
                    driftUp ? "Brems drift opp" : "Brems drift ned",
                    "medium",
                    "nutrition",
                    "Vedlikeholdsvekten har driftet samme retning i minst to uker.",
                    driftUp
                        ? "Senk kalorimålet med 100-150 kcal per dag neste uke."
                        : "Øk kalorimålet med 100-150 kcal per dag neste uke.",
                    "Vekten bør komme nærmere stabilt 7-dagers snitt.",
                    report.Confidence,
                    "calories",
                    suggestedCalories: currentCalorieGoal + (driftUp ? -SafeCalorieStep(report.Confidence, 125) : SafeCalorieStep(report.Confidence, 125)))));
            }

            if (report.StrengthSummary.ExercisesSignificantRegression >= 2 ||
                report.StrengthSummary.AverageStrengthChangePercent < -3)
            {
                items.Add((4, Rec(
                    "protect_strength_response",
                    "Beskytt styrken",
                    "high",
                    "training",
                    $"Nøkkelstyrken er ned ca. {Round(report.StrengthSummary.AverageStrengthChangePercent) ?? report.StrengthSummary.AverageStrengthChangePercent:F1} %.",
                    "Hold de viktigste løftene teknisk tunge, kutt ekstra failure-sett og vurder en roligere uke før kostholdet strammes.",
                    "Styrken får bedre sjanse til å stabilisere seg.",
                    report.Confidence)));
            }

            if (proteinPerKg < ProteinLowThreshold(report.GoalType))
            {
                var grams = report.GoalType == "cut" ? 30 :
                    report.GoalType == "leanBulk" ? 25 : 20;
                items.Add((5, Rec(
                    "increase_protein_low_goal",
                    "Øk protein med en fast rutine",
                    "high",
                    "nutrition",
                    $"Protein ligger på ca. {Round(proteinPerKg) ?? proteinPerKg:F1} g/kg.",
                    $"Legg inn en fast proteinservering på {grams} g per dag, for eksempel magert kjøtt, fisk, egg, yoghurt eller proteinpulver.",
                    "Proteinmålet bør treffes oftere uten at kaloriene må økes mye.",
                    report.Confidence,
                    "protein",
                    suggestedProtein: currentProteinGoal + grams)));
            }
            else if (report.GoalType == "cut" &&
                     proteinPerKg is >= 1.4 and < 1.6 &&
                     strengthFalling)
            {
                items.Add((5, Rec(
                    "increase_protein_strength_drop",
                    "Løft protein litt",
                    "medium",
                    "nutrition",
                    "Protein er ok, men styrken faller samtidig.",
                    "Øk protein med 15-30 g per dag uten å senke karbohydratene rundt økt.",
                    "Styrkebevaring får bedre støtte uten stor kaloriendring.",
                    report.Confidence,
                    "protein",
                    suggestedProtein: currentProteinGoal + 20)));
            }

            if (report.AdherenceSummary.ProteinTargetAdherencePercent < 60 &&
                !problemIds.Contains("low_protein"))
            {
                items.Add((6, Rec(
                    "make_protein_adherence_simple",
                    "Gjør proteinmålet enklere",
                    "medium",
                    "nutrition",
                    "Proteinmålet treffes under 60 % av loggede dager.",
                    "Planlegg to faste proteinmåltider før dagen starter, og la resten av maten fylle kaloriene.",
                    "Proteinmålet blir mindre avhengig av tilfeldige måltider.",
                    report.Confidence)));
            }

            if (loggingPoor)
            {
                items.Add((6, Rec(
                    "improve_logging_consistency",
                    "Gjør loggingen mer stabil",
                    "medium",
                    "data",
                    $"Mat er logget {report.NutritionSummary.LoggedDaysLast7d} av 7 dager.",
                    "Logg minst 5 av 7 dager neste uke før du gjør større kaloriendringer.",
                    "Neste rapport får høyere sikkerhet og kan gi tydeligere justering.",
                    report.Confidence)));
            }

            if (report.TrainingLoadSummary.VolumeChangePercent > 20 && strengthFalling)
            {
                items.Add((9, Rec(
                    "reduce_volume_fatigue",
                    "Reduser volum én uke",
                    "medium",
                    "training",
                    $"Volumet er opp ca. {Round(report.TrainingLoadSummary.VolumeChangePercent) ?? report.TrainingLoadSummary.VolumeChangePercent:F0} % mens styrken faller.",
                    "Reduser 10-20 % av settene i én uke og behold de viktigste tunge toppsettene.",
                    "Mindre fatigue bør gjøre styrkesignalet mer lesbart.",
                    report.Confidence)));
            }
            else if (report.TrainingLoadSummary.VolumeChangePercent < -25 && strengthFalling)
            {
                items.Add((7, Rec(
                    "stabilize_training_frequency",
                    "Stabiliser treningen",
                    "medium",
                    "training",
                    "Volumet har falt mye samtidig som styrken faller.",
                    "Hold treningsfrekvensen stabil én uke før du endrer kostholdet.",
                    "Rapporten kan skille treningseffekt fra kostholdseffekt.",
                    report.Confidence)));
            }

            if (strengthFalling && proteinPerKg >= 1.6 && carbsPerKg < 2)
            {
                items.Add((10, Rec(
                    "add_training_carbs",
                    "Flytt karbohydrater til økten",
                    "medium",
                    "nutrition",
                    $"Karbohydrater er ca. {Round(carbsPerKg) ?? carbsPerKg:F1} g/kg mens styrken faller.",
                    "Bruk 30-60 g karbohydrater før eller etter trening. Hvis kaloriene holdes like, flytt carbs fra resten av dagen.",
                    "Øktene bør få bedre driv uten at totalinntaket må øke.",
                    report.Confidence)));
            }

            if (fatPerKg < 0.5 || report.NutritionSummary.FatCaloriesPercent < 20)
            {
                items.Add((11, Rec(
                    "keep_fat_from_dropping_lower",
                    "Ikke senk fett mer nå",
                    "low",
                    "nutrition",
                    "Fett ligger lavt i forhold til kroppsvekt eller kalorier.",
                    "Hold fett rundt minst 0,5 g/kg og finn eventuelt kaloriendring fra snacks eller andre karbohydratkilder.",
                    "Rådet unngår at fett presses unødvendig lavt.",
                    report.Confidence)));
            }

            if (items.Count == 0)
            {
                items.Add((12, Rec(
                    "hold_current_goal_plan",
                    "Behold planen",
                    "medium",
                    "plan",
                    "Vekttrend, ernæring, styrke og logging ser kontrollerte ut.",
                    "Kjør samme plan én uke til og vurder kun små justeringer etter neste 7-dagers snitt.",
                    "Du bygger mer sikker trend uten unødvendig endring.",
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
            string expectedOutcome,
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
                ExpectedOutcome = expectedOutcome,
                Confidence = confidence,
                CanApply = applyKind != null,
                ApplyKind = applyKind,
                SuggestedCalories = suggestedCalories,
                SuggestedProtein = suggestedProtein,
            };
        }

        private static MaintenanceEstimate EstimateMaintenance(
            string goalType,
            double? weeklyChangePercent,
            double? previousWeeklyChangePercent,
            double? avgCalories,
            CutAdherenceSummaryDto adherence,
            bool possibleWaterWeight)
        {
            if (goalType != "maintenance" ||
                !avgCalories.HasValue ||
                !weeklyChangePercent.HasValue ||
                adherence.MealLoggingAdherencePercent < 70 ||
                possibleWaterWeight)
            {
                return new MaintenanceEstimate(null, "low");
            }

            var stableNow = Math.Abs(weeklyChangePercent.Value) <= 0.25;
            var stablePrevious = previousWeeklyChangePercent.HasValue &&
                                 Math.Abs(previousWeeklyChangePercent.Value) <= 0.25;
            if (!stableNow) return new MaintenanceEstimate(null, "low");

            var confidence = stablePrevious && adherence.MealLoggingAdherencePercent >= 80
                ? "high"
                : "medium";
            var calories = (int)(Math.Round(avgCalories.Value / 25.0, MidpointRounding.AwayFromZero) * 25);
            return new MaintenanceEstimate(calories, confidence);
        }

        private static CutTimelineSummaryDto BuildTimeline(
            string goalType,
            UserSettings settings,
            double? averageWeight7d,
            double? weeklyChangeKg,
            double? weeklyChangePercent,
            double? previousWeeklyChangePercent)
        {
            var targetWeight = (double)settings.WeightGoalKg;
            if (goalType == "maintenance")
            {
                var stableWeeks = 0;
                if (weeklyChangePercent.HasValue && Math.Abs(weeklyChangePercent.Value) <= 0.25) stableWeeks++;
                if (previousWeeklyChangePercent.HasValue && Math.Abs(previousWeeklyChangePercent.Value) <= 0.25) stableWeeks++;
                return new CutTimelineSummaryDto
                {
                    TargetWeightKg = Round(targetWeight),
                    MaintenanceStabilityStreakWeeks = stableWeeks,
                    Summary = stableWeeks >= 2
                        ? "Vekten har vært stabil nok til å bruke matinntaket som vedlikeholdssignal."
                        : "Vedlikeholdsstreak bygges fra stabile 7-dagers snitt."
                };
            }

            if (!averageWeight7d.HasValue ||
                !weeklyChangeKg.HasValue ||
                Math.Abs(weeklyChangeKg.Value) < 0.05)
            {
                return new CutTimelineSummaryDto
                {
                    TargetWeightKg = Round(targetWeight),
                    Summary = "Tempoet er for uklart til å estimere uker til målvekt."
                };
            }

            var remaining = targetWeight - averageWeight7d.Value;
            if (Math.Sign(remaining) != Math.Sign(weeklyChangeKg.Value))
            {
                return new CutTimelineSummaryDto
                {
                    TargetWeightKg = Round(targetWeight),
                    Summary = "Vekttrenden går ikke i retning av målvekten akkurat nå."
                };
            }

            var weeks = (int)Math.Ceiling(Math.Abs(remaining / weeklyChangeKg.Value));
            if (weeks is <= 0 or > 104)
            {
                return new CutTimelineSummaryDto
                {
                    TargetWeightKg = Round(targetWeight),
                    Summary = "Måltempoet ser urealistisk ut fra siste 7-dagers snitt."
                };
            }

            return new CutTimelineSummaryDto
            {
                TargetWeightKg = Round(targetWeight),
                EstimatedWeeksToGoal = weeks,
                Summary = $"Med siste 7-dagers tempo er estimatet ca. {weeks} uker til målvekt."
            };
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

        private static string GetConfidence(
            int weightLogs,
            int foodDays,
            int comparableExercises,
            int daysSinceGoalStart,
            bool possibleWaterWeight,
            bool isLimitedReport,
            double mealLoggingAdherence)
        {
            if (possibleWaterWeight || mealLoggingAdherence < 50) return "low";
            if (weightLogs >= 5 &&
                foodDays >= 5 &&
                comparableExercises >= 2 &&
                daysSinceGoalStart >= 14 &&
                !isLimitedReport)
                return "high";
            if (weightLogs >= 3 && foodDays >= 3 && (comparableExercises >= 1 || isLimitedReport))
                return "medium";
            return "low";
        }

        private static string BuildWeightSummary(
            string goalType,
            double? changeKg,
            double? changePercent,
            bool possibleWaterWeight)
        {
            if (!changeKg.HasValue || !changePercent.HasValue)
                return "Logg flere Vektmålinger for å se 7-dagers trend mot forrige uke.";

            var direction = changeKg.Value < 0 ? "ned" : changeKg.Value > 0 ? "opp" : "stabil";
            var goalText = goalType switch
            {
                "leanBulk" => "lean bulk",
                "maintenance" => "vedlikehold",
                _ => "cut"
            };
            var waterText = possibleWaterWeight
                ? " Rask endring kan være væske eller mageinnhold, så trenden tolkes rolig."
                : "";
            return $"7-dagers snitt er {direction} {Math.Abs(changeKg.Value):0.0} kg ({Math.Abs(changePercent.Value):0.0} %) for {goalText}.{waterText}";
        }

        private static string BuildNutritionSummary(
            string goalType,
            double? proteinPerKg,
            double? carbsPerKg,
            double? fatPerKg,
            double? fatPercent,
            int loggedDays)
        {
            if (loggedDays == 0) return "Logg mat for å vurdere protein, karbohydrater og fett.";

            var proteinText = goalType switch
            {
                "maintenance" => proteinPerKg switch
                {
                    null => "Protein kan ikke vurderes uten stabil vekt.",
                    < 1.2 => "Protein er lavt for styrke og recomp.",
                    < 1.4 => "Protein er svakt hvis styrke eller recomp er målet.",
                    <= 2.2 => "Protein ligger i et bra område.",
                    _ => "Protein er høyt nok for de fleste."
                },
                _ => proteinPerKg switch
                {
                    null => "Protein kan ikke vurderes uten stabil vekt.",
                    < 1.4 => "Protein er lavt for målet.",
                    < 1.6 => "Protein er minimum, men kan være suboptimalt ved styrkefall.",
                    <= 2.2 => "Protein ligger i et bra område.",
                    > 2.4 => "Protein er sannsynligvis høyere enn nødvendig for de fleste.",
                    _ => "Protein er høyt nok for de fleste."
                }
            };

            var carbText = carbsPerKg < 2 ? " Karbohydrater kan være lave ved hard styrketrening." : "";
            var fatText = fatPerKg < 0.5 || fatPercent < 20 ? " Fett ligger lavt, så ikke senk det mer først." : "";
            return $"{proteinText}{carbText}{fatText}";
        }

        private static string BuildStrengthSummaryText(string goalType, double? averageChange, int comparable)
        {
            if (comparable == 0)
                return "Trenger flere like øvelser over tid før styrketrenden kan vurderes.";
            if (averageChange > 2) return "Styrken er i progresjon på sammenlignbare øvelser.";
            if (averageChange >= -2)
                return goalType == "cut"
                    ? "Styrken er stort sett stabil, som er positivt under cut."
                    : "Styrken er stort sett stabil.";
            if (averageChange >= -5) return "Styrken faller mildt. Det bør følges med på, men én dårlig økt overtolkes ikke.";
            return "Styrken faller tydelig på sammenlignbare øvelser.";
        }

        private static string BuildTrainingSummaryText(string goalType, int currentSessions, int previousSessions, double? volumeChange)
        {
            if (!volumeChange.HasValue)
                return $"Du har {currentSessions} fullførte økter siste 28 dager. Mer historikk gjør belastningen lettere å tolke.";
            if (volumeChange > 20) return "Treningsvolumet er tydelig høyere enn forrige periode.";
            if (volumeChange < -25) return "Treningsvolumet er betydelig lavere enn forrige periode.";
            return "Treningsbelastningen er relativt stabil.";
        }

        private static string WeightScoreReason(string goalType, double? weeklyChangePercent)
        {
            if (!weeklyChangePercent.HasValue) return "Mangler forrige 7-dagers snitt.";
            return goalType switch
            {
                "leanBulk" => $"Vektoppgang vurderes mot lean bulk-tempo. Siste trend er {weeklyChangePercent.Value:0.0} %.",
                "maintenance" => $"Vektstabilitet vurderes mot ±0,25 % per uke. Siste drift er {Math.Abs(weeklyChangePercent.Value):0.0} %.",
                _ => $"Vekttap vurderes mot konservativt cut-tempo. Siste trend er {-weeklyChangePercent.Value:0.0} %."
            };
        }

        private static string StrengthScoreReason(CutStrengthSummaryDto strength, bool isLimitedReport)
        {
            if (isLimitedReport) return "Treningsdata er begrenset, så styrke scorer forsiktig.";
            if (strength.ComparableExercises == 0) return "Ingen like øvelser kan sammenlignes mellom periodene.";
            return $"Snittendring på sammenlignbare nøkkeløvelser er {strength.AverageStrengthChangePercent:0.0} %.";
        }

        private static string NutritionScoreReason(
            double? proteinPerKg,
            double? carbsPerKg,
            double? fatPerKg,
            CutAdherenceSummaryDto adherence)
        {
            return $"Protein {FormatNullable(proteinPerKg)} g/kg, karbo {FormatNullable(carbsPerKg)} g/kg, fett {FormatNullable(fatPerKg)} g/kg og {adherence.CalorieTargetAdherencePercent:0} % kalorimåltreff.";
        }

        private static string TrainingScoreReason(CutTrainingLoadSummaryDto training, bool isLimitedReport)
        {
            if (isLimitedReport) return "Rapporten er begrenset fordi treningssignalene mangler.";
            return $"{training.SessionsLast14d} fullførte økter siste 28 dager og volumendring {FormatNullable(training.VolumeChangePercent)} %.";
        }

        private static string DataScoreReason(CutAdherenceSummaryDto adherence, bool possibleWaterWeight, bool isLimitedReport)
        {
            var flags = new List<string>();
            if (possibleWaterWeight) flags.Add("mulig vannvekt");
            if (isLimitedReport) flags.Add("begrenset trening");
            var suffix = flags.Count > 0 ? $" Flagget: {string.Join(", ", flags)}." : "";
            return $"Matlogging {adherence.MealLoggingAdherencePercent:0} %, veiing {adherence.WeighInAdherencePercent:0} %.{suffix}";
        }

        private static string ScoreLabel(int score)
        {
            if (score >= 90) return "Excellent";
            if (score >= 75) return "Good";
            if (score >= 60) return "Needs adjustment";
            if (score >= 40) return "High risk";
            return "Poorly controlled";
        }

        private static string StrengthTrend(double change)
        {
            if (change > 2) return "progression";
            if (change >= -2) return "stable";
            if (change >= -5) return "mildRegression";
            return "significantRegression";
        }

        private static double SumVolume(IEnumerable<WorkoutSession> sessions)
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

        private static int SafeCalorieStep(string confidence, int desired)
        {
            var cap = confidence == "low" ? 100 : 250;
            return Math.Clamp(desired, 0, cap);
        }

        private static double ProteinLowThreshold(string goalType)
        {
            return goalType == "maintenance" ? 1.2 : 1.4;
        }

        private static double ExerciseWeight(StrengthAggregate aggregate)
        {
            if (aggregate.IsCompound) return 1.0;
            if (aggregate.IsIsolation) return 0.45;
            return 0.7;
        }

        private static string GoalLabel(string goalType)
        {
            return goalType switch
            {
                "leanBulk" => "lean bulk",
                "maintenance" => "vedlikehold",
                _ => "cut"
            };
        }

        private static string ReportName(string goalType)
        {
            return goalType switch
            {
                "leanBulk" => "Bulk Rapport",
                "maintenance" => "Maintenance Rapport",
                _ => "Cut Rapport"
            };
        }

        private static string FormatNullable(double? value)
        {
            return value.HasValue ? value.Value.ToString("0.0") : "ukjent";
        }

        private static List<string> DeserializeStringList(string json)
        {
            try
            {
                return JsonSerializer.Deserialize<List<string>>(json, JsonOptions) ?? [];
            }
            catch
            {
                return [];
            }
        }

        private sealed record WeightPoint(DateTime Date, double WeightKg);
        private sealed record FoodPoint(DateTime TimestampUtc, DateTime Date, int Calories, int ProteinGrams, int CarbsGrams, int FatGrams);
        private sealed record DailyNutrition(DateTime Date, int Calories, int ProteinGrams, int CarbsGrams, int FatGrams);
        private sealed record CarbTimingSummary(double? AveragePreWorkoutCarbs, double? AveragePostWorkoutCarbs);
        private sealed record MaintenanceEstimate(int? Calories, string Confidence);
        private sealed record WeekWindow(DateOnly Start, DateOnly End);
        private sealed record StatusContext(
            string GoalType,
            double? WeeklyChangePercent,
            double? PreviousWeeklyChangePercent,
            double? ProteinPerKg,
            CutStrengthSummaryDto Strength,
            CutTrainingLoadSummaryDto Training,
            CutAdherenceSummaryDto Adherence,
            string Confidence,
            bool IsLimitedReport,
            bool NotEnoughData,
            bool PossibleWaterWeight);

        private sealed class StrengthAggregate
        {
            public StrengthAggregate(Guid exerciseId, string exerciseName, bool isCompound, bool isIsolation)
            {
                ExerciseId = exerciseId;
                ExerciseName = exerciseName;
                IsCompound = isCompound;
                IsIsolation = isIsolation;
            }

            public Guid ExerciseId { get; }
            public string ExerciseName { get; }
            public bool IsCompound { get; }
            public bool IsIsolation { get; }
            public int Exposures { get; set; }
            public double BestEstimated1Rm { get; set; }
            public double Volume { get; set; }
        }
    }
}
