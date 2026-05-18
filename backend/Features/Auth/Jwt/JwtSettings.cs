namespace backend.Features.Auth;

public class JwtSettings
{
    public string Issuer { get; set; } = "";
    public string Audience { get; set; } = "";
    public string SecretKey { get; set; } = ""; // At least 32 bytes in production.
    public int ExpirationMinutes { get; set; } = 15;
}
