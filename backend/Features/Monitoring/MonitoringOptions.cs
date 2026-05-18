namespace backend.Features.Monitoring;

public sealed class MonitoringOptions
{
    public bool Enabled { get; set; } = true;
    public string EnvironmentName { get; set; } = "";
    public string AlertWebhookUrl { get; set; } = "";
    public string AlertBearerToken { get; set; } = "";
    public int SlowRequestThresholdMs { get; set; } = 3000;
}
