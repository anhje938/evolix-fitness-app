using backend.Auth;

namespace backend.Features.AuthAuth;

public interface IAppleTokenService
{
    Task<AppleClaims> ValidateIdTokenAsync(string idToken, CancellationToken ct = default);
}
