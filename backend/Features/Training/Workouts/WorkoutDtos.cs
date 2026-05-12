using System.ComponentModel.DataAnnotations;

namespace backend.Features.Training.Workouts
{
    public class CreateWorkoutRequest
    {
        [Required]
        [MaxLength(120)]
        public string Name { get; set; } = null!;
        [MaxLength(80)]
        public string? DayLabel { get; set; }
        [MaxLength(1000)]
        public string? Description { get; set; }
        public Guid? WorkoutProgramId { get; set; }
        public bool IsPremium { get; set; }
        [MaxLength(120)]
        public List<Guid> ExerciseIds { get; set; } = [];
    }

    public class WorkoutResponse
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = null!;
        public string Description { get; set; } = null!;
        public string DayLabel { get; set; } = null!;
        public Guid? WorkoutProgramId { get; set; }
        public bool IsPremium { get; set; }
        public bool WorkoutProgramIsPremium { get; set; }
        public List<Guid> ExerciseIds { get; set; } = [];
        public string? UserId { get; set; }
        public bool IsCustom { get; set; }
    }

    public class UpdateWorkoutRequest
    {
        [Required]
        [MaxLength(120)]
        public string Name { get; set; } = null!;
        [MaxLength(80)]
        public string? DayLabel { get; set; }
        [MaxLength(1000)]
        public string? Description { get; set; }
        public Guid? WorkoutProgramId { get; set; }
        public bool? IsPremium { get; set; }
        [MaxLength(120)]
        public List<Guid>? ExerciseIds { get; set; }
    }
}
