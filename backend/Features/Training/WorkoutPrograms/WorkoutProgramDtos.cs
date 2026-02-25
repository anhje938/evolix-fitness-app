using backend.Features.Training.Workouts;

namespace backend.Features.Training.WorkoutPrograms
{
    public class CreateWorkoutProgramRequest
    {
        public string Name { get; set; } = null!;
        public string? Goal { get; set; }
        public string? Level { get; set; }

        // Øktene i dette programmet
        public List<CreateWorkoutInProgramRequest> Workouts { get; set; } = [];
    }

    // NB: Heter IKKE CreateWorkoutRequest, men CreateWorkoutInProgramRequest
    public class CreateWorkoutInProgramRequest
    {
        public string Name { get; set; } = null!;
        public string DayLabel { get; set; } = null!;
        public string? Description { get; set; }

        // hvilke øvelser som skal være med i økta
        public List<Guid> ExerciseIds { get; set; } = [];
    }

    public class WorkoutProgramResponse
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = null!;
        public string? Goal { get; set; }
        public string? Level { get; set; }
        public bool IsCustom { get; set; }
        public string? UserId { get; set; }

        public List<WorkoutInProgramResponse> Workouts { get; set; } = new();
    }

    public class WorkoutInProgramResponse
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
    }


    public class UpdateWorkoutProgramRequest
    {
        public string? Name { get; set; }
        public string? Goal { get; set; }
        public string? Level { get; set; }

        // De øktene som skal være i programmet etter oppdatering
        public List<Guid> WorkoutIds { get; set; } = new();
    }
}
