using System.ComponentModel.DataAnnotations;

namespace backend.Features.Training.WorkoutSessions
{
    // Request DTO for starting a workout session
    public class StartWorkoutSessionRequest
    {
        public Guid? WorkoutId { get; set; }
        public DateTime? StartedAtUtc { get; set; }
        [MaxLength(160)]
        public string? Title { get; set; }
    }

    public class CompleteWorkoutSessionRequest
    {
        [Required]
        [MaxLength(100)]
        public string ClientRequestId { get; set; } = null!;

        public Guid? WorkoutId { get; set; }
        public DateTime? StartedAtUtc { get; set; }
        public DateTime? FinishedAtUtc { get; set; }
        [MaxLength(160)]
        public string? Title { get; set; }
        [MaxLength(2000)]
        public string? Notes { get; set; }

        [MaxLength(120)]
        public List<UpdateWorkoutSessionExerciseLogRequest> ExerciseLogs { get; set; } = new();
    }

    public class UpdateWorkoutSessionRequest
    {
        public DateTime? StartedAtUtc { get; set; }
        public DateTime? FinishedAtUtc { get; set; }
        [MaxLength(160)]
        public string? Title { get; set; }
        [MaxLength(2000)]
        public string? Notes { get; set; }

        [MaxLength(120)]
        public List<UpdateWorkoutSessionExerciseLogRequest> ExerciseLogs { get; set; } = new();
    }

    public class UpdateWorkoutSessionExerciseLogRequest
    {
        [Required]
        public Guid ExerciseId { get; set; }

        public int? Order { get; set; }
        [MaxLength(1000)]
        public string? Notes { get; set; }
        [MaxLength(80)]
        public List<UpdateWorkoutSessionSetRequest> Sets { get; set; } = new();
    }

    public class UpdateWorkoutSessionSetRequest
    {
        [Range(1, 500)]
        public int? SetNumber { get; set; }
        [Range(0, 2000)]
        public double? WeightKg { get; set; }
        [Range(0, 10000)]
        public int? Reps { get; set; }
        [Range(0, 10)]
        public double? Rir { get; set; }
        [Range(0, 1000000)]
        public double? DistanceMeters { get; set; }
        public TimeSpan? Duration { get; set; }
        [MaxLength(40)]
        public string? SetType { get; set; }
        [MaxLength(1000)]
        public string? Notes { get; set; }
    }

    // Request DTO for adding a set to a session
    public class AddSetRequest
    {
        [Required]
        public Guid ExerciseId { get; set; }

        [Range(1, 500)]
        public int? SetNumber { get; set; }

        [Range(0, 2000)]
        public double? WeightKg { get; set; }
        [Range(0, 10000)]
        public int? Reps { get; set; }
        [Range(0, 10)]
        public double? Rir { get; set; }

        [Range(0, 1000000)]
        public double? DistanceMeters { get; set; }
        public TimeSpan? Duration { get; set; }

        [MaxLength(40)]
        public string? SetType { get; set; }

        [MaxLength(1000)]
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

        // Reps for topp-settet i denne økten
        public int? TopSetReps { get; set; }

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
