using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace backend.Auth
{
    public static class ClaimsExtensions
    {
        // Get user id from token
        public static string? GetUserId(this ClaimsPrincipal user)
        {
            return user.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? user.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        }

        // Check if user is admin
        public static bool IsAdmin(this ClaimsPrincipal user)
        {
            // Role-based check
            if (user.IsInRole("Admin")) return true;

            // Fallback: custom claim
            var adminClaim = user.FindFirst("is_admin")?.Value;
            return string.Equals(adminClaim, "true", StringComparison.OrdinalIgnoreCase);
        }
    }
}
