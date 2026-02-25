namespace backend.Features.Food
{
    using System.Net.Http.Json;

    public class BarcodeLookupService
    {
        private readonly HttpClient _http;

        public BarcodeLookupService(HttpClient http)
        {
            _http = http;
        }

        public async Task<OpenFoodFactsResponse?> LookupAsync(string barcode, CancellationToken ct = default)
        {
            var url = $"https://world.openfoodfacts.org/api/v0/product/{barcode}.json";

            // Makes a GET request and auto deserializes JSON
            var response = await _http.GetFromJsonAsync<OpenFoodFactsResponse>(url, ct);

            return response;
        }
    }

}
