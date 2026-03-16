namespace backend.Features.Food
{
    public class ComposedMeal
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string UserId { get; set; } = "";
        public string Name { get; set; } = "";
        public bool IsFavorite { get; set; }
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedUtc { get; set; } = DateTime.UtcNow;
        public DateTime? LastUsedUtc { get; set; }

        public ICollection<ComposedMealIngredient> Ingredients { get; set; } =
            new List<ComposedMealIngredient>();
    }

    public class ComposedMealIngredient
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid ComposedMealId { get; set; }
        public ComposedMeal ComposedMeal { get; set; } = null!;

        public string Name { get; set; } = "";
        public decimal AmountGrams { get; set; }

        // Stored as values for the ingredient amount (not per 100 g),
        // to keep logging and client calculations deterministic.
        public int Calories { get; set; }
        public int Proteins { get; set; }
        public int Carbs { get; set; }
        public int Fats { get; set; }

        public int SortOrder { get; set; }
    }
}
