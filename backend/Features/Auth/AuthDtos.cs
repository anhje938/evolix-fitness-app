namespace backend.Features.Auth
{
    // APPLE ID TOKEN 
    public class AppleLoginRequest
    {
        public string IdToken { get; set; } = "";
        public string? AuthorizationCode { get; set; }
    }

    public class RefreshTokenRequest
    {
        public string RefreshToken { get; set; } = "";
    }

    // APP RETURN
    public class AuthResponse
    {
        public string UserId { get; set; } = "";
        public string? Email { get; set; }
        public string Jwt { get; set; } = "";
        public string AccessToken { get; set; } = "";
        public string RefreshToken { get; set; } = "";
        public DateTime AccessTokenExpiresAtUtc { get; set; }
    }
}
