namespace backend.Features.AdaptivePlanning
{
    public class CoachSettings
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string UserId { get; set; } = "";

        public bool AdaptiveNutritionEnabled { get; set; } = true;
        public bool AdaptiveTrainingEnabled { get; set; } = true;
        public bool AutoApplyLowRiskSuggestions { get; set; } = false;

        // 1 = Monday, 7 = Sunday. Default Monday report.
        public int PreferredReportDay { get; set; } = 1;

        public AggressivenessLevel AggressivenessLevel { get; set; } =
            AggressivenessLevel.Balanced;

        public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
