namespace backend.Features.Users
{
    public class UpdateUserSettingsDto
    {
        // Goals
        public int? CalorieGoal { get; set; }
        public int? ProteinGoal { get; set; }
        public int? FatGoal { get; set; }
        public int? CarbGoal { get; set; }

        // Weight
        public decimal? WeightGoalKg { get; set; }
        public WeightDirection? WeightDirection { get; set; }

        // UI / filters
        public MuscleFilter? MuscleFilter { get; set; }

        // Home UI
        public string[]? HomeProgressCircles { get; set; }
    }
}
