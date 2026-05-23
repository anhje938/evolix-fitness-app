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

        public async Task<AuthResponse> RegisterWithPasswordAsync(
            string email,
            string username,
            string password,
            RefreshTokenRequestContext context,
            CancellationToken ct = default)
        {
            ValidateEmail(email);
            ValidateUsername(username);
            ValidatePassword(password);

            var passwordHash = PasswordHasher.Hash(password);

            try
            {
                var user = await _userService.CreateUserWithPasswordAsync(
                    email,
                    username,
                    passwordHash,
                    ct);
                return await _refreshTokenService.IssueTokensAsync(user, context, ct);
            }
            catch (InvalidOperationException)
            {
                throw new AuthInputException(
                    "account_exists",
                    "E-post eller brukernavn er allerede i bruk.");
            }
        }

        public async Task<AuthResponse> LoginWithPasswordAsync(
            string email,
            string password,
            RefreshTokenRequestContext context,
            CancellationToken ct = default)
        {
            ValidateEmail(email);
            if (string.IsNullOrWhiteSpace(password))
            {
                throw new AuthInputException("invalid_credentials", "Feil e-post eller passord.");
            }

            var user = await _userService.GetUserByEmailAsync(email, ct);
            if (user?.AuthProvider != "password" ||
                string.IsNullOrWhiteSpace(user.PasswordHash) ||
                !PasswordHasher.Verify(password, user.PasswordHash))
            {
                throw new AuthInputException("invalid_credentials", "Feil e-post eller passord.");
            }

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

        private static void ValidateEmail(string email)
        {
            if (UserService.NormalizeEmail(email) == null)
                throw new AuthInputException("invalid_email", "Skriv en gyldig e-postadresse.");
        }

        private static void ValidateUsername(string username)
        {
            if (UserService.NormalizeUsername(username) == null)
            {
                throw new AuthInputException(
                    "invalid_username",
                    "Brukernavn må være 3-24 tegn og kan bruke bokstaver, tall, punktum, bindestrek og understrek.");
            }
        }

        private static void ValidatePassword(string password)
        {
            if (string.IsNullOrWhiteSpace(password) || password.Length < 8)
                throw new AuthInputException("weak_password", "Passordet må ha minst 8 tegn.");

            if (!password.Any(char.IsLetter) || !password.Any(char.IsDigit))
                throw new AuthInputException("weak_password", "Passordet må inneholde minst én bokstav og ett tall.");
        }
    }
}
