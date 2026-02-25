using backend.Auth;
using backend.Features.AuthAuth;
using backend.Features.Users;

namespace backend.Features.Auth
{
    public class AuthService
    {
        private readonly IAppleTokenService _appleTokenService;
        private readonly UserService _userService;
        private readonly JwtService _jwtService;

        public AuthService(
            IAppleTokenService appleTokenService,
            UserService userService,
            JwtService jwtService)
        {
            _appleTokenService = appleTokenService;
            _userService = userService;
            _jwtService = jwtService;
        }

        public async Task<AuthResponse> HandleAppleLoginAsync(
            string idToken,
            CancellationToken ct = default)
        {
            var claims = await _appleTokenService.ValidateIdTokenAsync(idToken, ct);

            
            //Email could be null 
            var user = await _userService.GetOrCreateUserFromAppleAsync(
                claims.Sub,
                claims.Email,
                ct);

            var jwt = _jwtService.GenerateToken(user);
            
            return new AuthResponse
            {
                UserId = user.Id,
                Email = user.Email,
                Jwt = jwt
            };
        }
    }
}
