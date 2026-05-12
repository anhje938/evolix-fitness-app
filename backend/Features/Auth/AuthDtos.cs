using System.ComponentModel.DataAnnotations;

namespace backend.Features.Auth
{
    public class AppleLoginRequest
    {
        [Required]
        [MaxLength(8192)]
        public string IdToken { get; set; } = "";
        [MaxLength(4096)]
        public string? AuthorizationCode { get; set; }
    }

    public class RefreshTokenRequest
    {
        [Required]
        [MaxLength(512)]
        public string RefreshToken { get; set; } = "";
    }

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
