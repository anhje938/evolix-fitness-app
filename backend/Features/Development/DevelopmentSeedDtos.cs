namespace backend.Features.Development
{
    public class DevelopmentSeedResult
    {
        public string UserId { get; set; } = "";
        public int FoodLogs { get; set; }
        public int WeightLogs { get; set; }
        public int WorkoutSessions { get; set; }
        public int Exercises { get; set; }
        public int WorkoutPrograms { get; set; }
        public int Workouts { get; set; }
        public int ComposedMeals { get; set; }
        public int ExerciseTargets { get; set; }
        public int NutritionTargetsHistory { get; set; }
        public int AdaptiveRecommendations { get; set; }
        public DateTime FoodAndWeightFromUtc { get; set; }
        public DateTime FoodAndWeightToUtc { get; set; }
        public DateTime TrainingFromUtc { get; set; }
        public DateTime TrainingToUtc { get; set; }
    }
}
