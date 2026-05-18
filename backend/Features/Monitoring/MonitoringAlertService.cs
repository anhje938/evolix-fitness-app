using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace backend.Features.Monitoring;

public sealed class MonitoringAlertService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly HttpClient _httpClient;
    private readonly ILogger<MonitoringAlertService> _logger;
    private readonly MonitoringOptions _options;

    public MonitoringAlertService(
        HttpClient httpClient,
        IOptions<MonitoringOptions> options,
        ILogger<MonitoringAlertService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _options = options.Value;
    }

    public async Task AlertAsync(
        string area,
        string eventName,
        string message,
        LogLevel level = LogLevel.Warning,
        string? traceId = null,
        IReadOnlyDictionary<string, string?>? properties = null,
        Exception? exception = null,
        CancellationToken ct = default)
    {
        using var scope = _logger.BeginScope(new Dictionary<string, object?>
        {
            ["monitoring.area"] = area,
            ["monitoring.event"] = eventName,
            ["traceId"] = traceId
        });

        _logger.Log(
            level,
            exception,
            "Monitoring alert {Area}.{EventName}: {Message}",
            area,
            eventName,
            message);

        if (!_options.Enabled || string.IsNullOrWhiteSpace(_options.AlertWebhookUrl))
        {
            return;
        }

        try
        {
            using var request = new HttpRequestMessage(
                HttpMethod.Post,
                _options.AlertWebhookUrl);

            if (!string.IsNullOrWhiteSpace(_options.AlertBearerToken))
            {
                request.Headers.Authorization = new AuthenticationHeaderValue(
                    "Bearer",
                    _options.AlertBearerToken);
            }

            var payload = new
            {
                area,
                eventName,
                message,
                severity = level.ToString(),
                traceId,
                environment = string.IsNullOrWhiteSpace(_options.EnvironmentName)
                    ? null
                    : _options.EnvironmentName,
                occurredAtUtc = DateTimeOffset.UtcNow,
                exception = exception?.GetType().Name,
                exceptionMessage = exception?.Message,
                properties = properties ?? new Dictionary<string, string?>()
            };

            request.Content = new StringContent(
                JsonSerializer.Serialize(payload, JsonOptions),
                Encoding.UTF8,
                "application/json");

            using var response = await _httpClient.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Monitoring webhook returned status {StatusCode}.",
                    response.StatusCode);
            }
        }
        catch (Exception alertException) when (alertException is not OperationCanceledException)
        {
            _logger.LogWarning(
                alertException,
                "Monitoring webhook delivery failed for {Area}.{EventName}.",
                area,
                eventName);
        }
    }
}
