namespace backend.Features.Food
{
    using Microsoft.Extensions.Caching.Memory;
    using System.Net.Http.Json;
    using System.Text.Json;

    public class BarcodeLookupService
    {
        private static readonly TimeSpan LookupTimeout = TimeSpan.FromSeconds(20);
        private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(24);

        private static readonly string[] LookupUrlTemplates =
        [
            "https://world.openfoodfacts.org/api/v2/product/{0}?fields=code,status,product_name,nutriments",
            "https://no.openfoodfacts.org/api/v2/product/{0}?fields=code,status,product_name,nutriments"
        ];

        private readonly HttpClient _http;
        private readonly IMemoryCache _cache;

        public BarcodeLookupService(HttpClient http, IMemoryCache cache)
        {
            _http = http;
            _cache = cache;
        }

        public async Task<OpenFoodFactsResponse?> LookupAsync(
            string barcode,
            CancellationToken ct = default)
        {
            var normalizedBarcode = NormalizeBarcode(barcode);
            if (string.IsNullOrWhiteSpace(normalizedBarcode))
                return null;

            var cacheKey = BuildCacheKey(normalizedBarcode);
            if (_cache.TryGetValue(cacheKey, out OpenFoodFactsResponse? cached) && cached != null)
                return cached;

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(LookupTimeout);

            var safeBarcode = Uri.EscapeDataString(normalizedBarcode);
            var result = await LookupAnyEndpointAsync(safeBarcode, cts.Token);

            if (IsUsableResponse(result))
            {
                _cache.Set(cacheKey, result, CacheDuration);
            }

            return result;
        }

        private async Task<OpenFoodFactsResponse?> LookupAnyEndpointAsync(
            string safeBarcode,
            CancellationToken ct)
        {
            var tasks = LookupUrlTemplates
                .Select(template =>
                {
                    var url = string.Format(
                        System.Globalization.CultureInfo.InvariantCulture,
                        template,
                        safeBarcode);
                    return TryLookupUrlAsync(url, ct);
                })
                .ToList();

            while (tasks.Count > 0)
            {
                var completed = await Task.WhenAny(tasks);
                tasks.Remove(completed);

                var result = await completed;
                if (IsUsableResponse(result))
                    return result;

                // If endpoint confirms barcode is unknown, return quickly.
                if (result != null && result.status == 0)
                    return result;
            }

            return null;
        }

        private async Task<OpenFoodFactsResponse?> TryLookupUrlAsync(
            string url,
            CancellationToken ct)
        {
            try
            {
                return await _http.GetFromJsonAsync<OpenFoodFactsResponse>(url, ct);
            }
            catch (HttpRequestException)
            {
                return null;
            }
            catch (TaskCanceledException)
            {
                return null;
            }
            catch (NotSupportedException)
            {
                return null;
            }
            catch (JsonException)
            {
                return null;
            }
        }

        private static bool IsUsableResponse(OpenFoodFactsResponse? response)
        {
            return response?.status == 1 &&
                   response.product != null &&
                   response.product.nutriments != null;
        }

        private static string BuildCacheKey(string barcode)
        {
            return $"off:product:{barcode}";
        }

        private static string NormalizeBarcode(string raw)
        {
            var trimmed = (raw ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(trimmed))
                return string.Empty;

            var digitsOnly = new string(trimmed.Where(char.IsDigit).ToArray());
            if (digitsOnly.Length >= 8 && digitsOnly.Length <= 14)
                return digitsOnly;

            return trimmed.Length <= 80
                ? trimmed
                : trimmed[..80];
        }
    }
}
