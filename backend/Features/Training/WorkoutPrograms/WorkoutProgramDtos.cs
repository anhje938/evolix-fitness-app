using System.ComponentModel.DataAnnotations;

namespace backend.Features.Training.WorkoutPrograms
{
    public class CreateWorkoutProgramRequest
    {
        [Required]
        [MaxLength(120)]
        public string Name { get; set; } = null!;
        [MaxLength(200)]
        public string? Goal { get; set; }
        [MaxLength(80)]
        public string? Level { get; set; }
        public bool IsPremium { get; set; }
        [MaxLength(60)]
        public List<CreateWorkoutInProgramRequest> Workouts { get; set; } = [];
    }

    public class CreateWorkoutInProgramRequest
    {
        [Required]
        [MaxLength(120)]
        public string Name { get; set; } = null!;
        [MaxLength(80)]
        public string DayLabel { get; set; } = null!;
        [MaxLength(1000)]
        public string? Description { get; set; }
        [MaxLength(120)]
        public List<Guid> ExerciseIds { get; set; } = [];
    }

    public class WorkoutProgramResponse
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = null!;
        public string? Goal { get; set; }
        public string? Level { get; set; }
        public bool IsPremium { get; set; }
        public bool IsCustom { get; set; }
        public string? UserId { get; set; }
        public List<WorkoutInProgramResponse> Workouts { get; set; } = [];
    }

    public class WorkoutInProgramResponse
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
    }

    public class UpdateWorkoutProgramRequest
    {
        [MaxLength(120)]
        public string? Name { get; set; }
        [MaxLength(200)]
        public string? Goal { get; set; }
        [MaxLength(80)]
        public string? Level { get; set; }
        public bool? IsPremium { get; set; }
        [MaxLength(120)]
        public List<Guid> WorkoutIds { get; set; } = [];
    }
}
