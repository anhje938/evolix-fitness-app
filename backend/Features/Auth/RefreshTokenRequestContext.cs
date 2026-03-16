namespace backend.Features.Auth;

public sealed class RefreshTokenRequestContext
{
    public string? IpAddress { get; init; }
    public string? UserAgent { get; init; }
}
