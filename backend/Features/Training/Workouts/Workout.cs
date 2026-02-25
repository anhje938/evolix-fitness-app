using backend.Features.Training.Exercises;
using backend.Features.Training.WorkoutPrograms;

namespace backend.Features.Training.Workouts
{
    public class Workout
    {
        public Guid Id { get; set; }

        public string Name { get; set; } = null!;
        public string? Description { get; set; }

        // Optional: label used in splits, e.g. "Push", "Pull", "Legs", "Upper"
        public string? DayLabel { get; set; }

        // Foreign key → Program 
        public Guid? WorkoutProgramId { get; set; }
        public WorkoutProgram? WorkoutProgram { get; set; }   

        // null = global workout | not null = custom workout created by user
        public string? UserId { get; set; }
        public bool IsCustom => UserId != null;

        public List<Exercise> Exercises { get; set; } = new();
    }
}
