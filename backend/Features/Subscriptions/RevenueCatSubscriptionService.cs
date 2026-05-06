using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace backend.Features.Subscriptions
{
    public class RevenueCatSubscriptionService
    {
        private static readonly Uri BaseUri = new("https://api.revenuecat.com/");

        private readonly HttpClient _httpClient;
        private readonly IMemoryCache _cache;
        private readonly RevenueCatOptions _options;
        private readonly ILogger<RevenueCatSubscriptionService> _logger;

        public RevenueCatSubscriptionService(
            HttpClient httpClient,
            IMemoryCache cache,
            IOptions<RevenueCatOptions> options,
            ILogger<RevenueCatSubscriptionService> logger)
        {
            _httpClient = httpClient;
            _cache = cache;
            _options = options.Value;
            _logger = logger;
        }

        public async Task<bool> HasPremiumAccessAsync(
            string userId,
            CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(userId))
            {
                return false;
            }

            if (string.IsNullOrWhiteSpace(_options.SecretApiKey))
            {
                _logger.LogWarning("RevenueCat secret API key is not configured.");
                return false;
            }

            var cacheKey = $"revenuecat:premium:{userId}";
            if (_cache.TryGetValue<bool>(cacheKey, out var cached))
            {
                return cached;
            }

            var hasPremium = await FetchPremiumAccessAsync(userId, ct);
            _cache.Set(
                cacheKey,
                hasPremium,
                hasPremium ? TimeSpan.FromMinutes(5) : TimeSpan.FromMinutes(1));

            return hasPremium;
        }

        private async Task<bool> FetchPremiumAccessAsync(
            string userId,
            CancellationToken ct)
        {
            var request = new HttpRequestMessage(
                HttpMethod.Get,
                new Uri(BaseUri, $"v1/subscribers/{Uri.EscapeDataString(userId)}"));
            request.Headers.Authorization = new AuthenticationHeaderValue(
                "Bearer",
                _options.SecretApiKey);

            try
            {
                using var response = await _httpClient.SendAsync(request, ct);
                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    return false;
                }

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning(
                        "RevenueCat subscriber lookup failed with status {StatusCode}.",
                        response.StatusCode);
                    return false;
                }

                await using var stream = await response.Content.ReadAsStreamAsync(ct);
                using var document = await JsonDocument.ParseAsync(stream, cancellationToken: ct);

                return ReadPremiumEntitlement(document.RootElement);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "RevenueCat subscriber lookup failed.");
                return false;
            }
        }

        private bool ReadPremiumEntitlement(JsonElement root)
        {
            if (!root.TryGetProperty("subscriber", out var subscriber))
            {
                return false;
            }

            if (!subscriber.TryGetProperty("entitlements", out var entitlements))
            {
                return false;
            }

            if (!entitlements.TryGetProperty(
                    _options.PremiumEntitlementId,
                    out var entitlement))
            {
                return false;
            }

            if (!entitlement.TryGetProperty("expires_date", out var expiresDate))
            {
                return false;
            }

            if (expiresDate.ValueKind == JsonValueKind.Null)
            {
                return true;
            }

            var rawExpiresDate = expiresDate.GetString();
            return DateTimeOffset.TryParse(rawExpiresDate, out var parsed) &&
                   parsed > DateTimeOffset.UtcNow;
        }
    }
}
