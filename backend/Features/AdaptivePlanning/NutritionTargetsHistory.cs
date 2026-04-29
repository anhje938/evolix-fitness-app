namespace backend.Features.AdaptivePlanning
{
    public class NutritionTargetsHistory
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string UserId { get; set; } = "";

        public int Calories { get; set; }
        public int Protein { get; set; }
        public int Carbs { get; set; }
        public int Fat { get; set; }

        public string Source { get; set; } = "";
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime ActiveFrom { get; set; } = DateTime.UtcNow.Date;

        public Guid? RecommendationId { get; set; }
        public AdaptiveRecommendation? Recommendation { get; set; }
    }
}
