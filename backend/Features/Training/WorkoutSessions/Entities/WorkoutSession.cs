// Features/Training/WorkoutSessions/Entities/WorkoutSession.cs
using backend.Features.Training.WorkoutPrograms;
using backend.Features.Training.Workouts;

namespace backend.Features.Training.WorkoutSessions.Entities
{
    public class WorkoutSession
    {
        public Guid Id { get; set; }
        public string UserId { get; set; } = null!;

        public Guid? WorkoutId { get; set; }
        public Workout? Workout { get; set; }   

        public DateTime StartedAtUtc { get; set; }
        public DateTime? FinishedAtUtc { get; set; }


        public Guid? WorkoutProgramId { get; set; }
        public WorkoutProgram? WorkoutProgram { get; set; }


        public string? Title { get; set; }
        public string? Notes { get; set; }

        public int TotalSets { get; set; }
        public int TotalReps { get; set; }
        public double? TotalVolume { get; set; }

        public ICollection<WorkoutExerciseLog> ExerciseLogs { get; set; } = new List<WorkoutExerciseLog>();
    }
}
