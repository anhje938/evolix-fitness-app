namespace backend.Features.Training.Exercises
{
    public class CreateExerciseRequest
    {
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


        // Only meaningful for admins: if true and caller is admin → global (UserId = null)
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
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public string? Muscle { get; set; }
        public string? SpecificMuscleGroups { get; set; }
        public string? Equipment { get; set; }
        public string? Category { get; set; }
        public string? EquipmentType { get; set; }
        public bool? IsBodyweight { get; set; }
        public bool? IsIsolation { get; set; }
        public bool? IsCompound { get; set; }
        public decimal? DefaultProgressionStepKg { get; set; }
        public List<ExerciseMuscleDto>? Muscles { get; set; }
    }

    public class ExerciseMuscleDto
    {
        public string Muscle { get; set; } = "";
        public MuscleRole Role { get; set; }
        public decimal Contribution { get; set; }
    }
}
