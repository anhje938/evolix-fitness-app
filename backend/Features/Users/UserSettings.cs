namespace backend.Features.Users
{
    public enum WeightDirection
    {
        Lose = 0,
        Maintain = 1,
        Gain = 2
    }

    public enum MuscleFilter
    {
        Basic = 0,
        Advanced = 1
    }

    public class UserSettings
    {
        public Guid Id { get; set; }

        // FK
        public string UserId { get; set; } = null!;
        public User User { get; set; } = null!;

       
        public int CalorieGoal { get; set; } = 2500;
        public int ProteinGoal { get; set; } = 180;
        public int FatGoal { get; set; } = 70;
        public int CarbGoal { get; set; } = 220;

        public decimal WeightGoalKg { get; set; } = 84m;

        
        public WeightDirection WeightDirection { get; set; } = WeightDirection.Maintain;
        public MuscleFilter MuscleFilter { get; set; } = MuscleFilter.Advanced;

        
        public string HomeProgressCirclesJson { get; set; } =
            "[\"calories\",\"protein\",\"carbs\",\"fat\"]";

        public DateTime UpdatedUtc { get; set; } = DateTime.UtcNow;
        public int SchemaVersion { get; set; } = 1;
    }
}
