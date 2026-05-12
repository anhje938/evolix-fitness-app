using System.ComponentModel.DataAnnotations;

namespace backend.Features.Training.Exercises
{
    public class CreateExerciseRequest
    {
        [Required]
        [MaxLength(120)]
        public string Name { get; set; } = null!;
        [MaxLength(1000)]
        public string? Description { get; set; }
        [MaxLength(80)]
        public string? Muscle { get; set; }
        [MaxLength(300)]
        public string? SpecificMuscleGroups { get; set; }
        [MaxLength(120)]
        public string? Equipment { get; set; }
        [MaxLength(80)]
        public string? Category { get; set; }
        [MaxLength(80)]
        public string? EquipmentType { get; set; }
        public bool IsBodyweight { get; set; }
        public bool IsIsolation { get; set; }
        public bool IsCompound { get; set; }
        [Range(typeof(decimal), "0.01", "100")]
        public decimal? DefaultProgressionStepKg { get; set; }
        [MaxLength(20)]
        public List<ExerciseMuscleDto> Muscles { get; set; } = [];

        public bool IsGlobal { get; set; } = false;
    }

    public class ExerciseResponse
    {
        public Guid Id { get; set; }
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
        public List<ExerciseMuscleDto> Muscles { get; set; } = [];
        public int UsageCount { get; set; }
        public string? UserId { get; set; }
    }

    public class UpdateExerciseRequest
    {
        [Required]
        [MaxLength(120)]
        public string Name { get; set; } = null!;
        [MaxLength(1000)]
        public string? Description { get; set; }
        [MaxLength(80)]
        public string? Muscle { get; set; }
        [MaxLength(300)]
        public string? SpecificMuscleGroups { get; set; }
        [MaxLength(120)]
        public string? Equipment { get; set; }
        [MaxLength(80)]
        public string? Category { get; set; }
        [MaxLength(80)]
        public string? EquipmentType { get; set; }
        public bool? IsBodyweight { get; set; }
        public bool? IsIsolation { get; set; }
        public bool? IsCompound { get; set; }
        [Range(typeof(decimal), "0.01", "100")]
        public decimal? DefaultProgressionStepKg { get; set; }
        [MaxLength(20)]
        public List<ExerciseMuscleDto>? Muscles { get; set; }
    }

    public class ExerciseMuscleDto
    {
        [Required]
        [MaxLength(80)]
        public string Muscle { get; set; } = "";
        public MuscleRole Role { get; set; }
        [Range(typeof(decimal), "0.1", "1")]
        public decimal Contribution { get; set; }
    }
}
