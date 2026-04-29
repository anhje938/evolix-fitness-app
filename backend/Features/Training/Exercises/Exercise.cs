using backend.Features.Training.Workouts;

namespace backend.Features.Training.Exercises
{
    public class Exercise
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public string? Muscle { get; set; }
        public string? SpecificMuscleGroups { get; set; }
        public string? Equipment { get; set; }
        public string? Category { get; set; }
        public string? EquipmentType { get; set; }
        public bool IsBodyweight { get; set; }
        public bool IsIsolation { get; set; }
        public bool IsCompound { get; set; }
        public decimal? DefaultProgressionStepKg { get; set; }

        // null = global exercise | not null = custom user exercise
        public string? UserId { get; set; }

        // Quick flag to detect type
        public bool IsCustom => UserId != null;

        public List<WorkoutExercise> WorkoutExercises { get; set; } = new();
        public List<ExerciseMuscle> ExerciseMuscles { get; set; } = new();
    }
}
