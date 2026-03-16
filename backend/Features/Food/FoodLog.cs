namespace backend.Features.Food
{
    public class FoodLog
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public string UserId { get; set; } = "";

        public string Title { get; set; } = "";
        public int Calories { get; set; }
        public int Proteins { get; set; }
        public int Carbs { get; set; }
        public int Fats { get; set; }

        public DateTime TimestampUtc { get; set; }

        // Optional metadata to support composed meal history / quick-repeat.
        public Guid? SourceComposedMealId { get; set; }
        public string? SourceType { get; set; }
        public decimal? SourceServings { get; set; }
    }
}
