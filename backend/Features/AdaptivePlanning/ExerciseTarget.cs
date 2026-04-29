using backend.Features.Training.Exercises;

namespace backend.Features.AdaptivePlanning
{
    public class ExerciseTarget
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string UserId { get; set; } = "";

        public Guid ExerciseId { get; set; }
        public Exercise Exercise { get; set; } = null!;

        public int TargetSets { get; set; } = 3;
        public int MinReps { get; set; } = 6;
        public int MaxReps { get; set; } = 8;
        public decimal? TargetWeightKg { get; set; }

        public ExerciseProgressionModel ProgressionModel { get; set; } =
            ExerciseProgressionModel.DoubleProgression;

        public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
