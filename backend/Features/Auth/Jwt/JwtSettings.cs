namespace backend.Features.Auth;

public class JwtSettings
{
    public string Issuer { get; set; } = "";
    public string Audience { get; set; } = "";
    public string SecretKey { get; set; } = ""; // minst 32 chars
    public int ExpirationMinutes { get; set; } = 60;
}
