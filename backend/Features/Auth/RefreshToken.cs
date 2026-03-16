using backend.Features.Users;

namespace backend.Features.Auth;

public class RefreshToken
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = "";
    public User User { get; set; } = null!;
    public Guid SessionFamilyId { get; set; }
    public string TokenHash { get; set; } = "";
    public DateTime CreatedAtUtc { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? LastUsedAtUtc { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
    public string? RevokedReason { get; set; }
    public Guid? ReplacedByTokenId { get; set; }
    public string? CreatedByIp { get; set; }
    public string? CreatedByUserAgent { get; set; }
    public string? LastUsedByIp { get; set; }
    public string? LastUsedByUserAgent { get; set; }
}
