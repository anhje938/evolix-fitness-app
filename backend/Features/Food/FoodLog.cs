namespace backend.Features.Food
{
    public class FoodLog
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public string UserId { get; set; }

        public string Title { get; set; }
        public int Calories { get; set; }
        public int Proteins { get; set; }
        public int Carbs { get; set; }
        public int Fats { get; set; }

        public DateTime TimestampUtc {get; set;}
    }
}
