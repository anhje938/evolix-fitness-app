using backend.Auth;
using backend.Features.AuthAuth;

namespace backend.Auth;

public class MockAppleTokenService : IAppleTokenService
{
    public Task<AppleClaims> ValidateIdTokenAsync(string idToken, CancellationToken ct = default)
    {
        // For testing:
        // "admin" => admin user
        // ellers => normal user

        if (idToken == "admin")
        {
            return Task.FromResult(new AppleClaims
            {
                Sub = "mock-admin-999",
                Email = "admin@demo.com",
                EmailVerified = true,
                IsAdmin = true
            });
        }

        return Task.FromResult(new AppleClaims
        {
            Sub = "mock-user-123",
            Email = "user@demo.com",
            EmailVerified = true,
            IsAdmin = false
        });
    }
}
