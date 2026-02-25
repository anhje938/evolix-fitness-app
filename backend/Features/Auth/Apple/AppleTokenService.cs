using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.Features.AuthAuth;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace backend.Auth;

public class AppleTokenService : IAppleTokenService
{
    private const string Issuer = "https://appleid.apple.com";
    private readonly AppleSettings _settings;
    private readonly IConfigurationManager<OpenIdConnectConfiguration> _configManager;

    public AppleTokenService(IOptions<AppleSettings> options)
    {
        _settings = options.Value;

        var documentRetriever = new HttpDocumentRetriever { RequireHttps = true };

        _configManager = new ConfigurationManager<OpenIdConnectConfiguration>(
            $"{Issuer}/.well-known/openid-configuration",
            new OpenIdConnectConfigurationRetriever(),
            documentRetriever
        );
    }

    public async Task<AppleClaims> ValidateIdTokenAsync(string idToken, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(idToken))
            throw new ArgumentException("idToken is required", nameof(idToken));

        if (string.IsNullOrWhiteSpace(_settings.ClientId))
            throw new InvalidOperationException("AppleSettings.ClientId is not configured.");

        var config = await _configManager.GetConfigurationAsync(ct);

        var tokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = Issuer,
            ValidateIssuer = true,

            ValidAudience = _settings.ClientId,
            ValidateAudience = true,

            IssuerSigningKeys = config.SigningKeys,
            ValidateIssuerSigningKey = true,

            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(5)
        };

        // Avoid inbound claim type remapping (e.g. "sub" -> NameIdentifier).
        var handler = new JwtSecurityTokenHandler
        {
            MapInboundClaims = false
        };

        ClaimsPrincipal principal;
        try
        {
            principal = handler.ValidateToken(idToken, tokenValidationParameters, out _);
        }
        catch (Exception ex)
        {
            throw new SecurityTokenException("Invalid Apple ID token", ex);
        }

        var sub = principal.FindFirstValue("sub")
                  ?? principal.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? throw new SecurityTokenException("Missing 'sub' claim from Apple token");

        // Email kan være null (vanlig etter første innlogging)
        var email = principal.FindFirstValue("email");

        var emailVerifiedRaw = principal.FindFirstValue("email_verified");
        var emailVerified = string.Equals(emailVerifiedRaw, "true", StringComparison.OrdinalIgnoreCase)
                            || string.Equals(emailVerifiedRaw, "1", StringComparison.OrdinalIgnoreCase);

        return new AppleClaims
        {
            Sub = sub,
            Email = email,
            EmailVerified = emailVerified,
            IsAdmin = false // Admin skal styres av din egen DB
        };
    }
}
