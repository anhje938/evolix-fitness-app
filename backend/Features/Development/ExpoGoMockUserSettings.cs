using backend.Features.Users;

namespace backend.Features.Development;

public class ExpoGoMockUserSettings
{
    public const string ClientHeaderName = "X-Evolix-Client-App";
    public const string ExpoGoClientValue = "expo-go";
    public const string CoachAnchorDateHeaderName = "X-Evolix-Coach-Anchor-Date";

    private const string DefaultMockUserId = "mock-user-123";
    private static readonly DateTime MockCutStartDateUtc =
        new(2026, 3, 15, 12, 0, 0, DateTimeKind.Utc);

    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IConfiguration _configuration;
    private readonly IHostEnvironment _environment;

    public ExpoGoMockUserSettings(
        IHttpContextAccessor httpContextAccessor,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        _httpContextAccessor = httpContextAccessor;
        _configuration = configuration;
        _environment = environment;
    }

    public bool IsActiveFor(string userId)
    {
        if (!_environment.IsDevelopment())
        {
            return false;
        }

        if (!string.Equals(userId, GetMockUserId(), StringComparison.Ordinal))
        {
            return false;
        }

        var request = _httpContextAccessor.HttpContext?.Request;
        if (request == null)
        {
            return false;
        }

        return string.Equals(
            request.Headers[ClientHeaderName].ToString(),
            ExpoGoClientValue,
            StringComparison.OrdinalIgnoreCase);
    }

    public UserSettings Apply(string userId, UserSettings settings)
    {
        if (!IsActiveFor(userId))
        {
            return settings;
        }

        var anchorDate = GetCoachAnchorDate();
        settings.CutStartDateUtc = anchorDate.HasValue
            ? anchorDate.Value.ToDateTime(new TimeOnly(12, 0), DateTimeKind.Utc)
            : MockCutStartDateUtc;
        return settings;
    }

    public DateOnly? GetCoachAnchorDate()
    {
        if (!_environment.IsDevelopment())
        {
            return null;
        }

        var request = _httpContextAccessor.HttpContext?.Request;
        if (request == null)
        {
            return null;
        }

        if (!string.Equals(
                request.Headers[ClientHeaderName].ToString(),
                ExpoGoClientValue,
                StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var raw = request.Headers[CoachAnchorDateHeaderName].ToString();
        return DateOnly.TryParseExact(
            raw,
            "yyyy-MM-dd",
            System.Globalization.CultureInfo.InvariantCulture,
            System.Globalization.DateTimeStyles.None,
            out var date)
            ? date
            : null;
    }

    private string GetMockUserId()
    {
        return FirstConfiguredValue(
            "ExpoGoMockUser:UserId",
            "TestFlightMockUser:UserId") ?? DefaultMockUserId;
    }

    private string? FirstConfiguredValue(params string[] keys)
    {
        foreach (var key in keys)
        {
            var value = _configuration[key];
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value.Trim();
            }
        }

        return null;
    }
}
