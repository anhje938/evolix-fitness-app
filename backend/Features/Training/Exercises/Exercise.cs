using backend.Features.Training.Workouts;

namespace backend.Features.Training.Exercises
{
    public class Exercise
    {
        public Guid Id { get; set; }

        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public string? Muscle { get; set; }
        public string? SpecificMuscleGroups { get; set; }
        public string? Equipment { get; set; }

        // null = global exercise | not null = custom user exercise
        public string? UserId { get; set; }

        // Quick flag to detect type
        public bool IsCustom => UserId != null;

        public List<Workout> Workouts { get; set; } = new();
    }
}
