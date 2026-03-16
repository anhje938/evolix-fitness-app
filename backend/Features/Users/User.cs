using backend.Features.Auth;

namespace backend.Features.Users;

public class User
{
    public string Id { get; set; } = "";
    public string? Email { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
    public bool IsAdmin { get; set; } = false;
    public UserSettings Settings { get; set; } = null!;
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}
