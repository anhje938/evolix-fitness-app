using System.ComponentModel.DataAnnotations;
using backend.Features.Training.WorkoutPrograms;

namespace backend.Features.Training.Workouts
{
    public class CreateWorkoutRequest
    {
        public string Name { get; set; } = null!;
        public string? DayLabel { get; set; } = null!;
        public string? Description { get; set; }

        // Denne trenger WorkoutService når du lager én økt
        public Guid? WorkoutProgramId { get; set; }

        // Hvilke øvelser som skal inn i økta
        public List<Guid> ExerciseIds { get; set; } = [];
    }

    public class WorkoutResponse
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = null!;
        public string Description { get; set; } = null!;
        public string DayLabel { get; set; } = null!;
        public Guid? WorkoutProgramId { get; set; }
        public List<Guid> ExerciseIds { get; set; } = [];
        public string? UserId { get; set; }
        public bool IsCustom { get; set; }
    }

    public class UpdateWorkoutRequest
    {
        public string Name { get; set; } = null!;
        public string? DayLabel { get; set; } = null!;
        public string? Description { get; set; }
        public Guid? WorkoutProgramId { get; set; }
        public List<Guid>? ExerciseIds { get; set; }
    }
}
