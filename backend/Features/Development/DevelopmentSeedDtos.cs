namespace backend.Features.Development
{
    public class DevelopmentSeedResult
    {
        public int FoodLogs { get; set; }
        public int WeightLogs { get; set; }
        public int WorkoutSessions { get; set; }
        public int Exercises { get; set; }
        public DateTime FoodAndWeightFromUtc { get; set; }
        public DateTime FoodAndWeightToUtc { get; set; }
        public DateTime TrainingFromUtc { get; set; }
        public DateTime TrainingToUtc { get; set; }
    }
}
