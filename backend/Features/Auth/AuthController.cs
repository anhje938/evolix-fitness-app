using System.IdentityModel.Tokens.Jwt;
using System.Security.Cryptography;
using System.Security.Claims;
using System.Text.Json;
using backend.Auth;
using backend.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace backend.Features.Auth
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : BaseApiController
    {
        private readonly AuthService _auth;
        private readonly ILogger<AuthController> _logger;
        private readonly IConfiguration _config;
        private readonly IHostEnvironment _env;

        private bool ReturnDebugDetails => _env.IsDevelopment();

        public AuthController(
            AuthService auth,
            ILogger<AuthController> logger,
            IConfiguration config,
            IHostEnvironment env)
        {
            _auth = auth;
            _logger = logger;
            _config = config;
            _env = env;
        }

        [HttpGet("debug")]
        public IActionResult DebugConfig()
        {
            if (!_env.IsDevelopment())
                return NotFound();

            // OBS: Ikke returner SecretKey. Kun "exists"-sjekk.
            var env = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
            var appleClientId = _config["AppleSettings:ClientId"];
            var jwtIssuer = _config["Jwt:Issuer"];
            var jwtAudience = _config["Jwt:Audience"];
            var jwtSecretExists = !string.IsNullOrWhiteSpace(_config["Jwt:SecretKey"]);

            return Ok(new
            {
                environment = env,
                appleClientId,
                jwt = new { jwtIssuer, jwtAudience, secretKeyExists = jwtSecretExists }
            });
        }

        [HttpPost("apple")]
        public async Task<ActionResult<AuthResponse>> LoginWithApple(
            [FromBody] AppleLoginRequest request,
            CancellationToken ct = default)
        {
            var reqId = HttpContext.TraceIdentifier;

            if (request == null)
                return BadRequest("body is required");

            if (string.IsNullOrWhiteSpace(request.IdToken))
                return BadRequest("idToken is required");

            // Logg request meta
            _logger.LogInformation("Apple login start. traceId={traceId} contentLength={len} userAgent={ua} ip={ip}",
                reqId,
                Request.ContentLength,
                Request.Headers.UserAgent.ToString(),
                HttpContext.Connection.RemoteIpAddress?.ToString());

            // Parse JWT (uten å validere signatur) for å logge aud/iss/exp/kid
            JwtSecurityToken? jwt = null;
            try
            {
                jwt = new JwtSecurityTokenHandler().ReadJwtToken(request.IdToken);

                var aud = jwt.Audiences.FirstOrDefault();
                var iss = jwt.Issuer;
                var expUtc = jwt.ValidTo;     // UTC
                var nbfUtc = jwt.ValidFrom;   // UTC
                var kid = jwt.Header.TryGetValue("kid", out var kidObj) ? kidObj?.ToString() : null;

                // AppleId tokens har ofte sub/email i payload; vi logger IKKE email/sub (persondata).
                _logger.LogInformation("Apple token parsed. traceId={traceId} aud={aud} iss={iss} expUtc={exp} nbfUtc={nbf} kid={kid}",
                    reqId, aud, iss, expUtc, nbfUtc, kid);

                var expectedClientId = _config["AppleSettings:ClientId"];
                _logger.LogInformation("Expected AppleSettings:ClientId = {clientId} traceId={traceId}",
                    expectedClientId, reqId);

                if (!string.IsNullOrWhiteSpace(expectedClientId) && !string.IsNullOrWhiteSpace(aud) && !string.Equals(expectedClientId, aud, StringComparison.Ordinal))
                {
                    _logger.LogWarning("AUDIENCE MISMATCH! tokenAud={aud} expectedClientId={clientId} traceId={traceId}",
                        aud, expectedClientId, reqId);
                }
            }
            catch (Exception ex)
            {
                // Hvis tokenet ikke engang kan parses (format feil)
                _logger.LogWarning(ex, "Failed to parse Apple idToken as JWT. traceId={traceId}", reqId);

                if (!_env.IsDevelopment())
                {
                    if (ReturnDebugDetails)
                        return BadRequest(new { error = "Invalid token format", detail = ex.Message, traceId = reqId });
                    return BadRequest(new { error = "Invalid token format", traceId = reqId });
                }

                _logger.LogInformation(
                    "Continuing Apple login in development despite unparsable token. traceId={traceId}",
                    reqId);
            }

            try
            {
                var result = await _auth.HandleAppleLoginAsync(
                    request.IdToken,
                    BuildRequestContext(),
                    ct);

                _logger.LogInformation("Apple login OK. traceId={traceId}", reqId);
                return Ok(result);
            }
            catch (SecurityTokenException ex)
            {
                // Her ligger fasiten ofte: audience/issuer/keys/expired/IDX20803 osv.
                _logger.LogWarning(ex, "Apple token validation FAILED. traceId={traceId} message={msg}", reqId, ex.Message);

                if (ex.InnerException != null)
                    _logger.LogWarning(ex.InnerException, "Inner exception. traceId={traceId} message={msg}", reqId, ex.InnerException.Message);

                if (ReturnDebugDetails)
                {
                    return Unauthorized(new
                    {
                        error = "Invalid Apple token",
                        detail = ex.Message,
                        inner = ex.InnerException?.Message,
                        traceId = reqId
                    });
                }

                return Unauthorized(new { error = "Invalid Apple token", traceId = reqId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled error during Apple login. traceId={traceId}", reqId);

                if (ReturnDebugDetails)
                {
                    return StatusCode(500, new
                    {
                        error = "Internal server error",
                        detail = ex.Message,
                        inner = ex.InnerException?.Message,
                        traceId = reqId
                    });
                }

                return StatusCode(500, new { error = "Internal server error", traceId = reqId });
            }
        }

        [HttpPost("refresh")]
        public async Task<ActionResult<AuthResponse>> Refresh(
            [FromBody] RefreshTokenRequest request,
            CancellationToken ct = default)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.RefreshToken))
                return BadRequest("refreshToken is required");

            try
            {
                var result = await _auth.RefreshAsync(
                    request.RefreshToken,
                    BuildRequestContext(),
                    ct);
                return Ok(result);
            }
            catch (SecurityTokenException ex)
            {
                _logger.LogWarning(ex, "Refresh token validation failed. traceId={traceId}", HttpContext.TraceIdentifier);
                return Unauthorized(new { error = "Invalid refresh token", traceId = HttpContext.TraceIdentifier });
            }
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout(
            [FromBody] RefreshTokenRequest request,
            CancellationToken ct = default)
        {
            if (request != null && !string.IsNullOrWhiteSpace(request.RefreshToken))
            {
                await _auth.LogoutAsync(request.RefreshToken, BuildRequestContext(), ct);
            }

            return NoContent();
        }

        [Authorize]
        [HttpPost("logout-all")]
        public async Task<IActionResult> LogoutAll(CancellationToken ct = default)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");

            if (string.IsNullOrWhiteSpace(userId))
                return Unauthorized();

            await _auth.LogoutAllAsync(userId, ct);
            return NoContent();
        }

        private RefreshTokenRequestContext BuildRequestContext()
        {
            return new RefreshTokenRequestContext
            {
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString(),
            };
        }
    }
}
