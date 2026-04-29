using backend.Common;
using backend.Data;
using Microsoft.EntityFrameworkCore;

namespace backend.Features.AdaptivePlanning
{
    public class RecommendationService
    {
        private readonly AppDbContext _db;

        public RecommendationService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<List<AdaptiveRecommendation>> GetPendingAsync(
            string userId,
            CancellationToken ct = default)
        {
            await ExpireOldAsync(userId, ct);

            return await IncludeGraph(_db.AdaptiveRecommendations.AsNoTracking())
                .Where(x => x.UserId == userId && x.Status == AdaptiveRecommendationStatus.Pending)
                .OrderByDescending(x => x.CreatedAtUtc)
                .ToListAsync(ct);
        }

        public async Task<AdaptiveRecommendation> AcceptAsync(
            string userId,
            Guid recommendationId,
            CancellationToken ct = default)
        {
            var recommendation = await IncludeGraph(_db.AdaptiveRecommendations)
                .FirstOrDefaultAsync(
                    x => x.Id == recommendationId && x.UserId == userId,
                    ct);

            if (recommendation == null)
                throw new NotFoundException("Recommendation not found");

            if (recommendation.Status != AdaptiveRecommendationStatus.Pending)
                return recommendation;

            await ApplyRecommendationAsync(userId, recommendation, ct);
            recommendation.Status = AdaptiveRecommendationStatus.Accepted;
            await _db.SaveChangesAsync(ct);

            return recommendation;
        }

        public async Task<AdaptiveRecommendation> DismissAsync(
            string userId,
            Guid recommendationId,
            CancellationToken ct = default)
        {
            var recommendation = await IncludeGraph(_db.AdaptiveRecommendations)
                .FirstOrDefaultAsync(
                    x => x.Id == recommendationId && x.UserId == userId,
                    ct);

            if (recommendation == null)
                throw new NotFoundException("Recommendation not found");

            if (recommendation.Status == AdaptiveRecommendationStatus.Pending)
            {
                recommendation.Status = AdaptiveRecommendationStatus.Dismissed;
                await _db.SaveChangesAsync(ct);
            }

            return recommendation;
        }

        private async Task ApplyRecommendationAsync(
            string userId,
            AdaptiveRecommendation recommendation,
            CancellationToken ct)
        {
            if (recommendation.NutritionChange != null)
            {
                var settings = await _db.UserSettings
                    .FirstOrDefaultAsync(x => x.UserId == userId, ct);

                if (settings != null)
                {
                    settings.CalorieGoal = recommendation.NutritionChange.SuggestedCalories ?? settings.CalorieGoal;
                    settings.ProteinGoal = recommendation.NutritionChange.SuggestedProtein ?? settings.ProteinGoal;
                    settings.CarbGoal = recommendation.NutritionChange.SuggestedCarbs ?? settings.CarbGoal;
                    settings.FatGoal = recommendation.NutritionChange.SuggestedFat ?? settings.FatGoal;
                    settings.UpdatedUtc = DateTime.UtcNow;

                    _db.NutritionTargetsHistory.Add(new NutritionTargetsHistory
                    {
                        UserId = userId,
                        Calories = settings.CalorieGoal,
                        Protein = settings.ProteinGoal,
                        Carbs = settings.CarbGoal,
                        Fat = settings.FatGoal,
                        Source = "adaptiveRecommendation",
                        CreatedAtUtc = DateTime.UtcNow,
                        ActiveFrom = recommendation.AppliesFromDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
                        Recommendation = recommendation
                    });
                }
            }

            if (recommendation.ExerciseTargetChange != null)
            {
                var change = recommendation.ExerciseTargetChange;
                var target = await _db.ExerciseTargets
                    .FirstOrDefaultAsync(
                        x => x.UserId == userId && x.ExerciseId == change.ExerciseId,
                        ct);

                if (target == null)
                {
                    target = new ExerciseTarget
                    {
                        UserId = userId,
                        ExerciseId = change.ExerciseId
                    };
                    _db.ExerciseTargets.Add(target);
                }

                target.TargetSets = change.SuggestedTargetSets ?? target.TargetSets;
                target.MinReps = change.MinReps ?? target.MinReps;
                target.MaxReps = change.MaxReps ?? target.MaxReps;
                target.TargetWeightKg = change.SuggestedTargetWeightKg ?? target.TargetWeightKg;
                target.ProgressionModel = change.ProgressionModel;
                target.UpdatedAtUtc = DateTime.UtcNow;
            }

            if (recommendation.TargetDateChange != null)
            {
                var settings = await _db.UserSettings
                    .FirstOrDefaultAsync(x => x.UserId == userId, ct);
                if (settings != null)
                {
                    settings.WeightGoalTimeUtc = recommendation.TargetDateChange.SuggestedTargetDateUtc;
                    settings.UpdatedUtc = DateTime.UtcNow;
                }
            }
        }

        private async Task ExpireOldAsync(string userId, CancellationToken ct)
        {
            var now = DateTime.UtcNow;
            var expired = await _db.AdaptiveRecommendations
                .Where(x => x.UserId == userId &&
                            x.Status == AdaptiveRecommendationStatus.Pending &&
                            x.ExpiresAtUtc <= now)
                .ToListAsync(ct);

            if (expired.Count == 0) return;

            foreach (var item in expired)
                item.Status = AdaptiveRecommendationStatus.Expired;

            await _db.SaveChangesAsync(ct);
        }

        private static IQueryable<AdaptiveRecommendation> IncludeGraph(
            IQueryable<AdaptiveRecommendation> query)
        {
            return query
                .Include(x => x.NutritionChange)
                .Include(x => x.ExerciseTargetChange)
                    .ThenInclude(x => x!.Exercise)
                .Include(x => x.RecoveryAction)
                .Include(x => x.TargetDateChange);
        }
    }
}
