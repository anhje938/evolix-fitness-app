using System.ComponentModel.DataAnnotations;

namespace backend.Features.Training.WorkoutSessions
{
    // Request DTO for starting a workout session
    public class StartWorkoutSessionRequest
    {
        // Optional. If null, this is a quick/custom session.
        public Guid? WorkoutId { get; set; }

        // Optional. If null, backend will use DateTime.UtcNow.
        public DateTime? StartedAtUtc { get; set; }

        // Optional. If null, backend may use workout name or keep it null.
        public string? Title { get; set; }
    }

    // Request DTO for replacing an existing workout session
    public class UpdateWorkoutSessionRequest
    {
        public DateTime? StartedAtUtc { get; set; }
        public string? Title { get; set; }
        public string? Notes { get; set; }

        public List<UpdateWorkoutSessionExerciseLogRequest> ExerciseLogs { get; set; } = new();
    }

    public class UpdateWorkoutSessionExerciseLogRequest
    {
        [Required]
        public Guid ExerciseId { get; set; }

        public int? Order { get; set; }
        public string? Notes { get; set; }
        public List<UpdateWorkoutSessionSetRequest> Sets { get; set; } = new();
    }

    public class UpdateWorkoutSessionSetRequest
    {
        public int? SetNumber { get; set; }
        public double? WeightKg { get; set; }
        public int? Reps { get; set; }
        public double? Rir { get; set; }
        public double? DistanceMeters { get; set; }
        public TimeSpan? Duration { get; set; }
        public string? SetType { get; set; }
        public string? Notes { get; set; }
    }

    // Request DTO for adding a set to a session
    public class AddSetRequest
    {
        // Exercise to log this set for
        [Required]
        public Guid ExerciseId { get; set; }

        // Optional set number. If null, backend will calculate next number.
        public int? SetNumber { get; set; }

        // Strength metrics
        public double? WeightKg { get; set; }
        public int? Reps { get; set; }
        public double? Rir { get; set; }

        // Endurance metrics
        public double? DistanceMeters { get; set; }
        public TimeSpan? Duration { get; set; }

        // Optional descriptor, for example "warmup", "top", "backoff"
        public string? SetType { get; set; }

        // Optional notes for this set
        public string? Notes { get; set; }
    }

    // Response DTO for a workout session
    public class WorkoutSessionResponse
    {
        public Guid Id { get; set; }

        public string UserId { get; set; } = null!;

        // Null means quick/custom session
        public Guid? WorkoutId { get; set; }

        // Null means not tied to a program
        public Guid? WorkoutProgramId { get; set; }

        public string? Title { get; set; }
        public string? Notes { get; set; }

        public DateTime StartedAtUtc { get; set; }
        public DateTime? FinishedAtUtc { get; set; }

        public int TotalSets { get; set; }
        public int TotalReps { get; set; }
        public double? TotalVolume { get; set; }

        public int ExercisesCount { get; set; }

        public List<string> MuscleGroups { get; set; } = new();



    }

    // Response DTO for a single set
    public class SetLogResponse
    {
        public Guid Id { get; set; }

        public Guid WorkoutExerciseLogId { get; set; }

        public int SetNumber { get; set; }

        public double? WeightKg { get; set; }
        public int? Reps { get; set; }
        public double? Rir { get; set; }

        public double? DistanceMeters { get; set; }
        public TimeSpan? Duration { get; set; }

        public string? SetType { get; set; }
        public string? Notes { get; set; }
    }


    public class ExerciseHistoryPointResponse
    {
        public Guid ExerciseId { get; set; }

        public DateTime PerformedAtUtc { get; set; }

        // Topp-sett vekt for denne økten (kg)
        public double? TopSetWeightKg { get; set; }

        // Antall sett totalt for denne økten
        public int TotalSets { get; set; }

        // Sum(weight * reps) for alle sett i denne økten (kg)
        public double? TotalVolumeKg { get; set; }
    }

    public class ExerciseSessionSetItemResponse
    {
        public Guid SetId { get; set; }
        public Guid WorkoutExerciseLogId { get; set; }

        public int SetNumber { get; set; }

        public double? WeightKg { get; set; }
        public int? Reps { get; set; }
        public double? Rir { get; set; }

        public string? SetType { get; set; }
        public string? Notes { get; set; }

    }

    public class ExerciseSessionSetsResponse
    {
        public Guid SessionId { get; set; }
        public Guid ExerciseId { get; set; }

        public DateTime PerformedAtUtc { get; set; }

        public List<ExerciseSessionSetItemResponse> Sets { get; set; } = new();

        public int TotalSets { get; set; }
        public int TotalReps { get; set; }
        public double? TotalVolumeKg { get; set; }
    }
}
