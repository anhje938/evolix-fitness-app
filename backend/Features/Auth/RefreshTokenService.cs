using System.Security.Cryptography;
using System.Text;
using backend.Data;
using backend.Features.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace backend.Features.Auth;

public class RefreshTokenService
{
    private readonly AppDbContext _db;
    private readonly JwtService _jwtService;
    private readonly RefreshTokenSettings _settings;

    public RefreshTokenService(
        AppDbContext db,
        JwtService jwtService,
        IOptions<RefreshTokenSettings> options)
    {
        _db = db;
        _jwtService = jwtService;
        _settings = options.Value;
    }

    public async Task<AuthResponse> IssueTokensAsync(
        User user,
        RefreshTokenRequestContext context,
        CancellationToken ct = default)
    {
        var utcNow = DateTime.UtcNow;
        var rawRefreshToken = GenerateRefreshToken();
        var entity = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            SessionFamilyId = Guid.NewGuid(),
            TokenHash = ComputeTokenHash(rawRefreshToken),
            CreatedAtUtc = utcNow,
            ExpiresAtUtc = utcNow.AddDays(_settings.LifetimeDays),
            LastUsedAtUtc = utcNow,
            CreatedByIp = TrimOrNull(context.IpAddress, 64),
            CreatedByUserAgent = TrimOrNull(context.UserAgent, 512),
            LastUsedByIp = TrimOrNull(context.IpAddress, 64),
            LastUsedByUserAgent = TrimOrNull(context.UserAgent, 512),
        };

        _db.RefreshTokens.Add(entity);
        await _db.SaveChangesAsync(ct);

        return BuildAuthResponse(user, rawRefreshToken);
    }

    public async Task<AuthResponse> RefreshAsync(
        string refreshToken,
        RefreshTokenRequestContext context,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
            throw new SecurityTokenException("Refresh token is required.");

        var utcNow = DateTime.UtcNow;
        var tokenHash = ComputeTokenHash(refreshToken);

        var current = await _db.RefreshTokens
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.TokenHash == tokenHash, ct);

        if (current == null)
            throw new SecurityTokenException("Refresh token is invalid.");

        if (current.RevokedAtUtc.HasValue)
        {
            if (current.ReplacedByTokenId.HasValue)
            {
                await RevokeFamilyAsync(
                    current.SessionFamilyId,
                    "Refresh token reuse detected.",
                    utcNow,
                    ct);
            }

            throw new SecurityTokenException("Refresh token is no longer active.");
        }

        if (current.ExpiresAtUtc <= utcNow)
        {
            current.RevokedAtUtc = utcNow;
            current.RevokedReason = "Expired";
            current.LastUsedAtUtc = utcNow;
            current.LastUsedByIp = TrimOrNull(context.IpAddress, 64);
            current.LastUsedByUserAgent = TrimOrNull(context.UserAgent, 512);
            await _db.SaveChangesAsync(ct);
            throw new SecurityTokenException("Refresh token has expired.");
        }

        var rawRefreshToken = GenerateRefreshToken();
        var replacement = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = current.UserId,
            SessionFamilyId = current.SessionFamilyId,
            TokenHash = ComputeTokenHash(rawRefreshToken),
            CreatedAtUtc = utcNow,
            ExpiresAtUtc = utcNow.AddDays(_settings.LifetimeDays),
            LastUsedAtUtc = utcNow,
            CreatedByIp = TrimOrNull(context.IpAddress, 64),
            CreatedByUserAgent = TrimOrNull(context.UserAgent, 512),
            LastUsedByIp = TrimOrNull(context.IpAddress, 64),
            LastUsedByUserAgent = TrimOrNull(context.UserAgent, 512),
        };

        current.LastUsedAtUtc = utcNow;
        current.LastUsedByIp = TrimOrNull(context.IpAddress, 64);
        current.LastUsedByUserAgent = TrimOrNull(context.UserAgent, 512);
        current.RevokedAtUtc = utcNow;
        current.RevokedReason = "Rotated";
        current.ReplacedByTokenId = replacement.Id;

        _db.RefreshTokens.Add(replacement);
        await _db.SaveChangesAsync(ct);

        return BuildAuthResponse(current.User, rawRefreshToken);
    }

    public async Task RevokeAsync(
        string refreshToken,
        RefreshTokenRequestContext context,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
            return;

        var tokenHash = ComputeTokenHash(refreshToken);
        var entity = await _db.RefreshTokens
            .FirstOrDefaultAsync(x => x.TokenHash == tokenHash, ct);

        if (entity == null || entity.RevokedAtUtc.HasValue)
            return;

        var utcNow = DateTime.UtcNow;
        entity.RevokedAtUtc = utcNow;
        entity.RevokedReason = "Logged out";
        entity.LastUsedAtUtc = utcNow;
        entity.LastUsedByIp = TrimOrNull(context.IpAddress, 64);
        entity.LastUsedByUserAgent = TrimOrNull(context.UserAgent, 512);

        await _db.SaveChangesAsync(ct);
    }

    public async Task RevokeAllForUserAsync(string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return;

        var utcNow = DateTime.UtcNow;
        var tokens = await _db.RefreshTokens
            .Where(x => x.UserId == userId && !x.RevokedAtUtc.HasValue)
            .ToListAsync(ct);

        if (tokens.Count == 0)
            return;

        foreach (var token in tokens)
        {
            token.RevokedAtUtc = utcNow;
            token.RevokedReason = "Logged out from all devices";
        }

        await _db.SaveChangesAsync(ct);
    }

    private AuthResponse BuildAuthResponse(User user, string refreshToken)
    {
        var access = _jwtService.GenerateAccessToken(user);
        return new AuthResponse
        {
            UserId = user.Id,
            Email = user.Email,
            Jwt = access.Token,
            AccessToken = access.Token,
            RefreshToken = refreshToken,
            AccessTokenExpiresAtUtc = access.ExpiresAtUtc,
        };
    }

    private async Task RevokeFamilyAsync(
        Guid sessionFamilyId,
        string reason,
        DateTime utcNow,
        CancellationToken ct)
    {
        var family = await _db.RefreshTokens
            .Where(x => x.SessionFamilyId == sessionFamilyId && !x.RevokedAtUtc.HasValue)
            .ToListAsync(ct);

        if (family.Count == 0)
            return;

        foreach (var token in family)
        {
            token.RevokedAtUtc = utcNow;
            token.RevokedReason = reason;
        }

        await _db.SaveChangesAsync(ct);
    }

    private static string GenerateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Base64UrlEncoder.Encode(bytes);
    }

    private static string ComputeTokenHash(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes);
    }

    private static string? TrimOrNull(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var trimmed = value.Trim();
        return trimmed.Length <= maxLength
            ? trimmed
            : trimmed[..maxLength];
    }
}
