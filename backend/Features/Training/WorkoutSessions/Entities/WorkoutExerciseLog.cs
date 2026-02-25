using backend.Features.Training.Exercises;

namespace backend.Features.Training.WorkoutSessions.Entities
{
    public class WorkoutExerciseLog
    {
        public Guid Id { get; set; }

        public Guid WorkoutSessionId { get; set; }
        public WorkoutSession WorkoutSession { get; set; } = null!;

        public Guid ExerciseId { get; set; }
        public Exercise Exercise { get; set; } = null!; // fra Exercises-feature

        public int Order { get; set; }
        public string? Notes { get; set; }

        public ICollection<SetLog> Sets { get; set; } = new List<SetLog>();
    }
}
