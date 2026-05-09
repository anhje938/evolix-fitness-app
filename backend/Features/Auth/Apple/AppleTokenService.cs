using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using backend.Features.AuthAuth;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace backend.Auth;

public class AppleTokenService : IAppleTokenService
{
    private const string Issuer = "https://appleid.apple.com";
    private static readonly Uri BaseUri = new(Issuer);
    private readonly AppleSettings _settings;
    private readonly IConfigurationManager<OpenIdConnectConfiguration> _configManager;
    private readonly IHttpClientFactory _httpClientFactory;

    public AppleTokenService(
        IOptions<AppleSettings> options,
        IHttpClientFactory httpClientFactory)
    {
        _settings = options.Value;
        _httpClientFactory = httpClientFactory;

        var documentRetriever = new HttpDocumentRetriever { RequireHttps = true };

        _configManager = new ConfigurationManager<OpenIdConnectConfiguration>(
            $"{Issuer}/.well-known/openid-configuration",
            new OpenIdConnectConfigurationRetriever(),
            documentRetriever
        );
    }

    public async Task<AppleClaims> ValidateIdTokenAsync(
        string idToken,
        CancellationToken ct = default)
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

        var email = principal.FindFirstValue("email");
        var emailVerifiedRaw = principal.FindFirstValue("email_verified");
        var emailVerified = string.Equals(emailVerifiedRaw, "true", StringComparison.OrdinalIgnoreCase)
                            || string.Equals(emailVerifiedRaw, "1", StringComparison.OrdinalIgnoreCase);

        return new AppleClaims
        {
            Sub = sub,
            Email = email,
            EmailVerified = emailVerified,
            IsAdmin = false
        };
    }

    public async Task RevokeAuthorizationAsync(
        string? authorizationCode,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(authorizationCode))
            throw new ArgumentException("Apple-autorisering mangler. Prøv igjen.");

        EnsureRevocationSettings();

        var tokens = await ExchangeAuthorizationCodeAsync(
            authorizationCode.Trim(),
            ct);

        if (!string.IsNullOrWhiteSpace(tokens.RefreshToken))
        {
            await RevokeTokenAsync(tokens.RefreshToken, "refresh_token", ct);
        }

        if (!string.IsNullOrWhiteSpace(tokens.AccessToken))
        {
            await RevokeTokenAsync(tokens.AccessToken, "access_token", ct);
        }
    }

    private void EnsureRevocationSettings()
    {
        if (string.IsNullOrWhiteSpace(_settings.ClientId))
            throw new InvalidOperationException("AppleSettings.ClientId is not configured.");
        if (string.IsNullOrWhiteSpace(_settings.TeamId))
            throw new InvalidOperationException("AppleSettings.TeamId is not configured.");
        if (string.IsNullOrWhiteSpace(_settings.KeyId))
            throw new InvalidOperationException("AppleSettings.KeyId is not configured.");
        if (string.IsNullOrWhiteSpace(_settings.PrivateKey))
            throw new InvalidOperationException("AppleSettings.PrivateKey is not configured.");
    }

    private async Task<AppleTokenExchangeResponse> ExchangeAuthorizationCodeAsync(
        string authorizationCode,
        CancellationToken ct)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            new Uri(BaseUri, "/auth/token"))
        {
            Content = new FormUrlEncodedContent(
            [
                new KeyValuePair<string, string>("client_id", _settings.ClientId),
                new KeyValuePair<string, string>("client_secret", CreateClientSecret()),
                new KeyValuePair<string, string>("code", authorizationCode),
                new KeyValuePair<string, string>("grant_type", "authorization_code")
            ])
        };

        using var response = await CreateAppleHttpClient().SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            ThrowAppleApiError(body, "Apple token exchange failed.");
        }

        var payload = JsonSerializer.Deserialize<AppleTokenExchangeResponse>(body);
        if (payload == null)
        {
            throw new InvalidOperationException("Apple token exchange returned an empty response.");
        }

        if (string.IsNullOrWhiteSpace(payload.RefreshToken) &&
            string.IsNullOrWhiteSpace(payload.AccessToken))
        {
            throw new InvalidOperationException(
                "Apple token exchange returned no revocable tokens.");
        }

        return payload;
    }

    private async Task RevokeTokenAsync(
        string token,
        string tokenTypeHint,
        CancellationToken ct)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            new Uri(BaseUri, "/auth/revoke"))
        {
            Content = new FormUrlEncodedContent(
            [
                new KeyValuePair<string, string>("client_id", _settings.ClientId),
                new KeyValuePair<string, string>("client_secret", CreateClientSecret()),
                new KeyValuePair<string, string>("token", token),
                new KeyValuePair<string, string>("token_type_hint", tokenTypeHint)
            ])
        };

        using var response = await CreateAppleHttpClient().SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            ThrowAppleApiError(body, "Apple token revocation failed.");
        }
    }

    private HttpClient CreateAppleHttpClient()
    {
        var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(20);
        return client;
    }

    private string CreateClientSecret()
    {
        var now = DateTimeOffset.UtcNow;

        using var ecdsa = ECDsa.Create();
        ecdsa.ImportPkcs8PrivateKey(ReadPrivateKeyBytes(_settings.PrivateKey), out _);

        var signingCredentials = new SigningCredentials(
            new ECDsaSecurityKey(ecdsa) { KeyId = _settings.KeyId },
            SecurityAlgorithms.EcdsaSha256);

        var token = new JwtSecurityToken(
            issuer: _settings.TeamId,
            audience: Issuer,
            claims:
            [
                new Claim("sub", _settings.ClientId)
            ],
            notBefore: now.UtcDateTime,
            expires: now.AddMinutes(5).UtcDateTime,
            signingCredentials: signingCredentials);

        token.Header["kid"] = _settings.KeyId;

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static byte[] ReadPrivateKeyBytes(string privateKey)
    {
        var sanitized = privateKey
            .Replace("-----BEGIN PRIVATE KEY-----", string.Empty, StringComparison.Ordinal)
            .Replace("-----END PRIVATE KEY-----", string.Empty, StringComparison.Ordinal)
            .Replace("\\n", string.Empty, StringComparison.Ordinal)
            .Replace("\r", string.Empty, StringComparison.Ordinal)
            .Replace("\n", string.Empty, StringComparison.Ordinal)
            .Trim();

        return Convert.FromBase64String(sanitized);
    }

    private static void ThrowAppleApiError(string body, string fallbackMessage)
    {
        try
        {
            var payload = JsonSerializer.Deserialize<AppleApiErrorResponse>(body);
            if (payload?.Error == "invalid_grant")
            {
                throw new ArgumentException(
                    "Apple-autoriseringen utløp. Prøv å slette kontoen på nytt.");
            }

            if (!string.IsNullOrWhiteSpace(payload?.Error))
            {
                throw new InvalidOperationException($"{fallbackMessage} {payload.Error}");
            }
        }
        catch (JsonException)
        {
        }

        throw new InvalidOperationException(fallbackMessage);
    }

    private sealed class AppleTokenExchangeResponse
    {
        [JsonPropertyName("access_token")]
        public string? AccessToken { get; set; }

        [JsonPropertyName("refresh_token")]
        public string? RefreshToken { get; set; }
    }

    private sealed class AppleApiErrorResponse
    {
        [JsonPropertyName("error")]
        public string? Error { get; set; }
    }
}
