namespace backend.Features.Training.Exercises
{
    public enum MuscleRole
    {
        Primary = 0,
        Secondary = 1
    }

    public class ExerciseMuscle
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid ExerciseId { get; set; }
        public Exercise Exercise { get; set; } = null!;

        public string Muscle { get; set; } = "";

        public MuscleRole Role { get; set; }

        public decimal Contribution { get; set; }
    }
}
