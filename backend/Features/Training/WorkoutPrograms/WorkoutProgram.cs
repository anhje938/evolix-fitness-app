using backend.Features.Training.Workouts;

namespace backend.Features.Training.WorkoutPrograms
{
    public class WorkoutProgram
    {
        public Guid Id { get; set; }

        public string Name { get; set; } = null!;
        public string? Goal { get; set; }
        public string? Level { get; set; }
        public string? EnglishName { get; set; }
        public string? EnglishGoal { get; set; }
        public string? EnglishLevel { get; set; }
        public bool IsPremium { get; set; }


        // null = global program | not null = custom user program
        public string? UserId { get; set; }
        public bool IsCustom => UserId != null;

        // Program → Workouts (1-many)
        public List<Workout> Workouts { get; set; } = new();
    }
}
