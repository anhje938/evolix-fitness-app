namespace backend.Features.Training.WorkoutSessions.Entities
{
    public class SetLog
    {
        public Guid Id { get; set; }

        public Guid WorkoutExerciseLogId { get; set; }
        public WorkoutExerciseLog WorkoutExerciseLog { get; set; } = null!;

        public int SetNumber { get; set; }

        public double? WeightKg { get; set; }
        public int? Reps { get; set; }

        public double? Rir { get; set; }
        public double? DistanceMeters { get; set; }
        public TimeSpan? Duration { get; set; }

        public string? SetType { get; set; }
        public string? Notes { get; set; }
    }
}
