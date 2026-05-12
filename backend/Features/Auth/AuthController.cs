using System.Security.Claims;
using backend.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace backend.Features.Auth
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : BaseApiController
    {
        private readonly AuthService _auth;
        private readonly ILogger<AuthController> _logger;
        private readonly IHostEnvironment _env;

        private bool ReturnDebugDetails => _env.IsDevelopment();

        public AuthController(
            AuthService auth,
            ILogger<AuthController> logger,
            IHostEnvironment env)
        {
            _auth = auth;
            _logger = logger;
            _env = env;
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

            var looksLikeJwt = request.IdToken.Split('.').Length == 3;
            if (_env.IsDevelopment() && !looksLikeJwt)
            {
                _logger.LogInformation(
                    "Development mock Apple login detected. Skipping JWT parse. traceId={traceId}",
                    reqId);
            }
            else if (!looksLikeJwt)
            {
                return BadRequest(new { error = "Invalid token format", traceId = reqId });
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
                _logger.LogWarning(
                    "Apple token validation failed. traceId={traceId}",
                    reqId);

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
                _logger.LogWarning(
                    ex,
                    "Refresh token validation failed. traceId={traceId}",
                    HttpContext.TraceIdentifier);
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
