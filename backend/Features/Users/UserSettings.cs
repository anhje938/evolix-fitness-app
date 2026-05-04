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

       
        public int? Age { get; set; }
        public string? Gender { get; set; }
        public string Language { get; set; } = "nb";
        public bool HasCompletedRegistration { get; set; } = false;

        public int CalorieGoal { get; set; } = 2500;
        public int ProteinGoal { get; set; } = 180;
        public int FatGoal { get; set; } = 70;
        public int CarbGoal { get; set; } = 220;
        
        public decimal WeightGoalKg { get; set; } = 84m;
        public DateTime WeightGoalTimeUtc { get; set; } = DateTime.UtcNow.Date.AddDays(84).AddHours(12);

        
        public WeightDirection WeightDirection { get; set; } = WeightDirection.Maintain;
        public MuscleFilter MuscleFilter { get; set; } = MuscleFilter.Advanced;

        
        public string HomeProgressCirclesJson { get; set; } =
            "[\"calories\",\"protein\",\"carbs\",\"fat\"]";
        public string HomeSectionOrderJson { get; set; } =
            "[\"quickStart\",\"goals\",\"weight\",\"recoveryMap\"]";
        public string RecoveryMapHiddenMusclesJson { get; set; } = "[]";
        public string FoodCoachExcludedDateKeysJson { get; set; } = "[]";
        public bool ShowOnlyCustomTrainingContent { get; set; } = false;
        public bool UseFoodCoach { get; set; } = true;
        public bool UseWorkoutCoach { get; set; } = true;

        public DateTime UpdatedUtc { get; set; } = DateTime.UtcNow;
        public int SchemaVersion { get; set; } = 1;
    }
}
