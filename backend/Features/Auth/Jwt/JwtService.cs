using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using backend.Features.Users;

namespace backend.Features.Auth
{
    public class JwtService
    {
        private readonly JwtSettings _settings;
        private readonly byte[] _keyBytes;

        public JwtService(IOptions<JwtSettings> options)
        {
            _settings = options.Value;
            _keyBytes = Encoding.UTF8.GetBytes(_settings.SecretKey);
        }

        // Generate token from User entity
        public string GenerateToken(User user)
        {
            var claims = new List<Claim>
            {
                // User id
                new Claim(JwtRegisteredClaimNames.Sub, user.Id),
                new Claim(ClaimTypes.NameIdentifier, user.Id),

                // Simple role system
                new Claim(ClaimTypes.Role, user.IsAdmin ? "Admin" : "User"),

                // Extra explicit flag (optional)
                new Claim("is_admin", user.IsAdmin ? "true" : "false")
            };

            var credentials = new SigningCredentials(
                new SymmetricSecurityKey(_keyBytes),
                SecurityAlgorithms.HmacSha256
            );

            var token = new JwtSecurityToken(
                issuer: _settings.Issuer,
                audience: _settings.Audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(_settings.ExpirationMinutes),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
