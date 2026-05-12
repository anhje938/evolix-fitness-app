using System.ComponentModel.DataAnnotations;

namespace backend.Features.Users
{
    public class DeleteUserRequest
    {
        [MaxLength(4096)]
        public string? AuthorizationCode { get; set; }
    }

    public class UpdateUserSettingsDto
    {
        [Range(18, 120)]
        public int? Age { get; set; }
        [MaxLength(32)]
        public string? Gender { get; set; }
        [MaxLength(8)]
        public string? Language { get; set; }
        public bool? HasCompletedRegistration { get; set; }
        public bool? HasDismissedRegistrationOnboarding { get; set; }
        [Range(800, 10000)]
        public int? CalorieGoal { get; set; }
        [Range(0, 1000)]
        public int? ProteinGoal { get; set; }
        [Range(0, 1000)]
        public int? FatGoal { get; set; }
        [Range(0, 2000)]
        public int? CarbGoal { get; set; }
        [Range(typeof(decimal), "20", "500")]
        public decimal? WeightGoalKg { get; set; }
        public DateTime? WeightGoalTimeUtc { get; set; }
        public WeightDirection? WeightDirection { get; set; }
        public MuscleFilter? MuscleFilter { get; set; }
        [MaxLength(20)]
        public string[]? HomeProgressCircles { get; set; }
        [MaxLength(20)]
        public string[]? HomeSectionOrder { get; set; }
        [MaxLength(200)]
        public string[]? RecoveryMapHiddenMuscles { get; set; }
        [MaxLength(366)]
        public string[]? FoodCoachExcludedDateKeys { get; set; }
        public bool? ShowOnlyCustomTrainingContent { get; set; }
        public bool? UseFoodCoach { get; set; }
        public bool? UseWorkoutCoach { get; set; }
    }
}
