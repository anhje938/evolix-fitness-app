namespace backend.Features.AdaptivePlanning
{
    public static class AdaptiveMapper
    {
        public static WeeklyReportDto ToDto(WeeklyReport report)
        {
            return new WeeklyReportDto
            {
                Id = report.Id,
                WeekStart = report.WeekStart,
                WeekEnd = report.WeekEnd,
                GeneratedAtUtc = report.GeneratedAtUtc,
                DataQuality = report.DataQuality,
                OverallScore = report.OverallScore,
                SummaryText = report.SummaryText,
                AlgorithmVersion = report.AlgorithmVersion,
                Weight = report.WeightSummary == null ? null : new WeeklyReportWeightDto
                {
                    StartTrendWeightKg = report.WeightSummary.StartTrendWeightKg,
                    EndTrendWeightKg = report.WeightSummary.EndTrendWeightKg,
                    WeeklyChangeKg = report.WeightSummary.WeeklyChangeKg,
                    ExpectedWeeklyChangeKg = report.WeightSummary.ExpectedWeeklyChangeKg,
                    EstimatedGoalDate = report.WeightSummary.EstimatedGoalDate,
                    WeightLogsCount = report.WeightSummary.WeightLogsCount,
                    Status = report.WeightSummary.Status,
                    Insight = report.WeightSummary.Insight
                },
                Nutrition = report.NutritionSummary == null ? null : new WeeklyReportNutritionDto
                {
                    LoggedDays = report.NutritionSummary.LoggedDays,
                    AverageCalories = report.NutritionSummary.AverageCalories,
                    TargetCalories = report.NutritionSummary.TargetCalories,
                    AverageProtein = report.NutritionSummary.AverageProtein,
                    TargetProtein = report.NutritionSummary.TargetProtein,
                    AverageCarbs = report.NutritionSummary.AverageCarbs,
                    TargetCarbs = report.NutritionSummary.TargetCarbs,
                    AverageFat = report.NutritionSummary.AverageFat,
                    TargetFat = report.NutritionSummary.TargetFat,
                    Status = report.NutritionSummary.Status,
                    Insight = report.NutritionSummary.Insight
                },
                Training = report.TrainingSummary == null ? null : new WeeklyReportTrainingDto
                {
                    CompletedWorkouts = report.TrainingSummary.CompletedWorkouts,
                    TotalSets = report.TrainingSummary.TotalSets,
                    TotalReps = report.TrainingSummary.TotalReps,
                    TotalVolumeKg = report.TrainingSummary.TotalVolumeKg,
                    ExercisesImproved = report.TrainingSummary.ExercisesImproved,
                    ExercisesMaintained = report.TrainingSummary.ExercisesMaintained,
                    ExercisesDecreased = report.TrainingSummary.ExercisesDecreased,
                    BestProgressExerciseId = report.TrainingSummary.BestProgressExerciseId,
                    BestProgressText = report.TrainingSummary.BestProgressText,
                    Insight = report.TrainingSummary.Insight
                },
                Recovery = report.RecoverySummary == null ? null : new WeeklyReportRecoveryDto
                {
                    ReadyMusclesText = report.RecoverySummary.ReadyMusclesText,
                    RestMusclesText = report.RecoverySummary.RestMusclesText,
                    RecommendedNextSession = report.RecoverySummary.RecommendedNextSession,
                    IntensityRecommendation = report.RecoverySummary.IntensityRecommendation,
                    Insight = report.RecoverySummary.Insight
                },
                MuscleBalance = report.MuscleBalance
                    .OrderByDescending(x => x.Sets)
                    .Select(x => new WeeklyReportMuscleBalanceDto
                    {
                        Muscle = x.Muscle,
                        Sets = x.Sets,
                        VolumeKg = x.VolumeKg
                    })
                    .ToList(),
                NextWeekActions = report.NextWeekActions
                    .OrderBy(x => x.SortOrder)
                    .Select(x => new WeeklyReportActionDto
                    {
                        SortOrder = x.SortOrder,
                        Category = x.Category,
                        Text = x.Text
                    })
                    .ToList(),
                Recommendations = report.Recommendations
                    .OrderBy(x => x.CreatedAtUtc)
                    .Select(ToDto)
                    .ToList()
            };
        }

        public static AdaptiveRecommendationDto ToDto(AdaptiveRecommendation recommendation)
        {
            return new AdaptiveRecommendationDto
            {
                Id = recommendation.Id,
                Type = recommendation.Type,
                Title = recommendation.Title,
                Explanation = recommendation.Explanation,
                Confidence = recommendation.Confidence,
                Status = recommendation.Status,
                CreatedAtUtc = recommendation.CreatedAtUtc,
                AppliesFromDate = recommendation.AppliesFromDate,
                ExpiresAtUtc = recommendation.ExpiresAtUtc,
                NutritionChange = recommendation.NutritionChange == null ? null : new RecommendationNutritionChangeDto
                {
                    CurrentCalories = recommendation.NutritionChange.CurrentCalories,
                    SuggestedCalories = recommendation.NutritionChange.SuggestedCalories,
                    CurrentProtein = recommendation.NutritionChange.CurrentProtein,
                    SuggestedProtein = recommendation.NutritionChange.SuggestedProtein,
                    CurrentCarbs = recommendation.NutritionChange.CurrentCarbs,
                    SuggestedCarbs = recommendation.NutritionChange.SuggestedCarbs,
                    CurrentFat = recommendation.NutritionChange.CurrentFat,
                    SuggestedFat = recommendation.NutritionChange.SuggestedFat
                },
                ExerciseTargetChange = recommendation.ExerciseTargetChange == null ? null : new RecommendationExerciseTargetChangeDto
                {
                    ExerciseId = recommendation.ExerciseTargetChange.ExerciseId,
                    ExerciseName = recommendation.ExerciseTargetChange.Exercise?.Name ?? "",
                    CurrentTargetSets = recommendation.ExerciseTargetChange.CurrentTargetSets,
                    SuggestedTargetSets = recommendation.ExerciseTargetChange.SuggestedTargetSets,
                    MinReps = recommendation.ExerciseTargetChange.MinReps,
                    MaxReps = recommendation.ExerciseTargetChange.MaxReps,
                    CurrentTargetWeightKg = recommendation.ExerciseTargetChange.CurrentTargetWeightKg,
                    SuggestedTargetWeightKg = recommendation.ExerciseTargetChange.SuggestedTargetWeightKg,
                    ProgressionModel = recommendation.ExerciseTargetChange.ProgressionModel
                },
                RecoveryAction = recommendation.RecoveryAction == null ? null : new RecommendationRecoveryActionDto
                {
                    RecommendedSession = recommendation.RecoveryAction.RecommendedSession,
                    Intensity = recommendation.RecoveryAction.Intensity,
                    FocusMusclesText = recommendation.RecoveryAction.FocusMusclesText,
                    RestMusclesText = recommendation.RecoveryAction.RestMusclesText
                },
                TargetDateChange = recommendation.TargetDateChange == null ? null : new RecommendationTargetDateChangeDto
                {
                    CurrentTargetDateUtc = recommendation.TargetDateChange.CurrentTargetDateUtc,
                    SuggestedTargetDateUtc = recommendation.TargetDateChange.SuggestedTargetDateUtc,
                    CurrentWeeklyPaceKg = recommendation.TargetDateChange.CurrentWeeklyPaceKg,
                    SuggestedWeeklyPaceKg = recommendation.TargetDateChange.SuggestedWeeklyPaceKg
                }
            };
        }
    }
}
