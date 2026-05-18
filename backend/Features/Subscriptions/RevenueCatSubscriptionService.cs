using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using backend.Features.Monitoring;
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
        private readonly MonitoringAlertService _monitoring;

        public RevenueCatSubscriptionService(
            HttpClient httpClient,
            IMemoryCache cache,
            IOptions<RevenueCatOptions> options,
            ILogger<RevenueCatSubscriptionService> logger,
            MonitoringAlertService monitoring)
        {
            _httpClient = httpClient;
            _cache = cache;
            _options = options.Value;
            _logger = logger;
            _monitoring = monitoring;
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
                await _monitoring.AlertAsync(
                    MonitoringAreas.RevenueCat,
                    "missing_secret_api_key",
                    "RevenueCat secret API key is not configured.",
                    LogLevel.Error,
                    properties: new Dictionary<string, string?>
                    {
                        ["userIdHash"] = HashUserId(userId)
                    },
                    ct: ct);
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
                    await _monitoring.AlertAsync(
                        MonitoringAreas.RevenueCat,
                        "subscriber_lookup_failed",
                        "RevenueCat subscriber lookup failed.",
                        LogLevel.Warning,
                        properties: new Dictionary<string, string?>
                        {
                            ["statusCode"] = ((int)response.StatusCode).ToString(),
                            ["userIdHash"] = HashUserId(userId)
                        },
                        ct: ct);
                    return false;
                }

                await using var stream = await response.Content.ReadAsStreamAsync(ct);
                using var document = await JsonDocument.ParseAsync(stream, cancellationToken: ct);

                return ReadPremiumEntitlement(document.RootElement);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "RevenueCat subscriber lookup failed.");
                await _monitoring.AlertAsync(
                    MonitoringAreas.RevenueCat,
                    "subscriber_lookup_exception",
                    "RevenueCat subscriber lookup threw an exception.",
                    LogLevel.Warning,
                    properties: new Dictionary<string, string?>
                    {
                        ["userIdHash"] = HashUserId(userId)
                    },
                    exception: ex,
                    ct: ct);
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

        private static string HashUserId(string userId)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(userId));
            return Convert.ToHexString(bytes)[..16];
        }
    }
}
