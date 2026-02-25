using System.Text.Json.Serialization;

namespace backend.Features.Food
{
    public class OpenFoodFactsResponse
    {
        public Product product { get; set; }
        public int status { get; set; }     // 1 = found, 0 = not found
    }

    public class Product
    {
        public string product_name { get; set; }
        public Nutriments nutriments { get; set; }
    }

    public class Nutriments
    {
        [JsonPropertyName("energy-kcal_100g")]
        public double energy_kcal_100g { get; set; }
        public double proteins_100g { get; set; }
        public double carbohydrates_100g { get; set; }
        public double fat_100g { get; set; }
    }

   
    public class FoodFromBarcodeDto
    {
        public string Title { get; set; }
        public double CaloriesPr100 { get; set; }
        public double ProteinsPr100 { get; set; }
        public double CarbsPr100 { get; set; }
        public double FatsPr100 { get; set; }
    }
}
