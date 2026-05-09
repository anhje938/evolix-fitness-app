namespace backend.Features.Users
{
    public class DeleteUserRequest
    {
        public string? AuthorizationCode { get; set; }
    }

    public class UpdateUserSettingsDto
    {
        public int? Age { get; set; }
        public string? Gender { get; set; }
        public string? Language { get; set; }
        public bool? HasCompletedRegistration { get; set; }
        public bool? HasDismissedRegistrationOnboarding { get; set; }
        public int? CalorieGoal { get; set; }
        public int? ProteinGoal { get; set; }
        public int? FatGoal { get; set; }
        public int? CarbGoal { get; set; }
        public decimal? WeightGoalKg { get; set; }
        public DateTime? WeightGoalTimeUtc { get; set; }
        public WeightDirection? WeightDirection { get; set; }
        public MuscleFilter? MuscleFilter { get; set; }
        public string[]? HomeProgressCircles { get; set; }
        public string[]? HomeSectionOrder { get; set; }
        public string[]? RecoveryMapHiddenMuscles { get; set; }
        public string[]? FoodCoachExcludedDateKeys { get; set; }
        public bool? ShowOnlyCustomTrainingContent { get; set; }
        public bool? UseFoodCoach { get; set; }
        public bool? UseWorkoutCoach { get; set; }
    }
}
