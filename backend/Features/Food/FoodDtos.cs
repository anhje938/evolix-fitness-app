namespace backend.Features.Food
{
    public class FoodDto
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public string Title { get; set; } = "";
        public int Calories { get; set; }
        public int Proteins { get; set; }
        public int Carbs { get; set; }
        public int Fats { get; set; }

        public DateTime TimestampUtc { get; set; }

        public Guid? SourceComposedMealId { get; set; }
        public string? SourceType { get; set; }
        public decimal? SourceServings { get; set; }
    }

    public class FoodFromBarcode
    {
        public string Title { get; set; } = "";
        public int CaloriesPr100 { get; set; }
        public int ProteinsPr100 { get; set; }
        public int CarbsPr100 { get; set; }
        public int FatsPr100 { get; set; }
    }

    public class ComposedMealIngredientDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = "";
        public decimal AmountGrams { get; set; }
        public int Calories { get; set; }
        public int Proteins { get; set; }
        public int Carbs { get; set; }
        public int Fats { get; set; }
        public int SortOrder { get; set; }
    }

    public class UpsertComposedMealIngredientDto
    {
        public string Name { get; set; } = "";
        public decimal AmountGrams { get; set; }
        public decimal Calories { get; set; }
        public decimal Proteins { get; set; }
        public decimal Carbs { get; set; }
        public decimal Fats { get; set; }
        public int SortOrder { get; set; }
    }

    public class ComposedMealDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = "";
        public bool IsFavorite { get; set; }
        public DateTime CreatedUtc { get; set; }
        public DateTime UpdatedUtc { get; set; }
        public DateTime? LastUsedUtc { get; set; }

        public int TotalCalories { get; set; }
        public int TotalProteins { get; set; }
        public int TotalCarbs { get; set; }
        public int TotalFats { get; set; }
        public int IngredientCount { get; set; }

        public List<ComposedMealIngredientDto> Ingredients { get; set; } = [];
    }

    public class UpsertComposedMealDto
    {
        public string Name { get; set; } = "";
        public bool IsFavorite { get; set; }
        public List<UpsertComposedMealIngredientDto> Ingredients { get; set; } = [];
    }

    public class SetComposedMealFavoriteDto
    {
        public bool IsFavorite { get; set; }
    }

    public class LogComposedMealDto
    {
        public decimal? Servings { get; set; }
        public DateTime? TimestampUtc { get; set; }
    }

    public class ComposedMealHistoryItemDto
    {
        public Guid FoodLogId { get; set; }
        public Guid ComposedMealId { get; set; }
        public string ComposedMealName { get; set; } = "";
        public string LoggedTitle { get; set; } = "";
        public decimal Servings { get; set; }
        public int Calories { get; set; }
        public int Proteins { get; set; }
        public int Carbs { get; set; }
        public int Fats { get; set; }
        public DateTime TimestampUtc { get; set; }
    }

    public class RelogComposedMealHistoryDto
    {
        public decimal? Servings { get; set; }
        public DateTime? TimestampUtc { get; set; }
    }
}
