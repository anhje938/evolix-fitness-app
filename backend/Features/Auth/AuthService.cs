using backend.Auth;
using backend.Features.AuthAuth;
using backend.Features.Users;

namespace backend.Features.Auth
{
    public class AuthService
    {
        private readonly IAppleTokenService _appleTokenService;
        private readonly UserService _userService;
        private readonly RefreshTokenService _refreshTokenService;

        public AuthService(
            IAppleTokenService appleTokenService,
            UserService userService,
            RefreshTokenService refreshTokenService)
        {
            _appleTokenService = appleTokenService;
            _userService = userService;
            _refreshTokenService = refreshTokenService;
        }

        public async Task<AuthResponse> HandleAppleLoginAsync(
            string idToken,
            RefreshTokenRequestContext context,
            CancellationToken ct = default)
        {
            var claims = await _appleTokenService.ValidateIdTokenAsync(idToken, ct);

            
            //Email could be null 
            var user = await _userService.GetOrCreateUserFromAppleAsync(
                claims.Sub,
                claims.Email,
                ct);

            return await _refreshTokenService.IssueTokensAsync(user, context, ct);
        }

        public Task<AuthResponse> RefreshAsync(
            string refreshToken,
            RefreshTokenRequestContext context,
            CancellationToken ct = default)
        {
            return _refreshTokenService.RefreshAsync(refreshToken, context, ct);
        }

        public Task LogoutAsync(
            string refreshToken,
            RefreshTokenRequestContext context,
            CancellationToken ct = default)
        {
            return _refreshTokenService.RevokeAsync(refreshToken, context, ct);
        }

        public Task LogoutAllAsync(string userId, CancellationToken ct = default)
        {
            return _refreshTokenService.RevokeAllForUserAsync(userId, ct);
        }
    }
}
