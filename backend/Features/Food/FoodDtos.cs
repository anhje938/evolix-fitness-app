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
    }

    public class FoodFromBarcode
    {
        public string Title { get; set; } = "";
        public int CaloriesPr100 { get; set; }
        public int ProteinsPr100 { get; set; }
        public int CarbsPr100 { get; set; }
        public int FatsPr100 { get; set; }
    }
}
