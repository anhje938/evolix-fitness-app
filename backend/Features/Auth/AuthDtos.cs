namespace backend.Features.Auth
{
    // APPLE ID TOKEN 
    public class AppleLoginRequest
    {
        public string IdToken { get; set; } = "";
    }

    // APP RETURN
    public class AuthResponse
    {
        public string UserId { get; set; } = "";
        public string? Email { get; set; }
        public string Jwt { get; set; } = "";   // din egen token
    }
}
