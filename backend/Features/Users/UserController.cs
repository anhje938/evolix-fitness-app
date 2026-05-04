using System.Security.Claims;
using System.Text.Json;
using backend.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Features.Users
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : BaseApiController
    {

        private readonly UserService _userService;
        private readonly ILogger<UserController> _logger;

        public UserController(
            UserService userService,
            ILogger<UserController> logger)
        {
            _userService = userService;
            _logger = logger;
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> GetMe(CancellationToken ct)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                         ?? User.FindFirstValue("sub");

            if (string.IsNullOrWhiteSpace(userId))
                return Unauthorized();

            var user = await _userService.GetUserAsync(userId, ct);
            if (user == null) return NotFound();

            return Ok(new
            {
                userId = user.Id,
                email = user.Email,
                displayName = BuildDisplayName(user.Email),
                isAdmin = user.IsAdmin
            });
        }


        //Delete user
        [Authorize]
        [HttpDelete("me")]
        public async Task<IActionResult> DeleteMe(CancellationToken ct)
        {
            var traceId = HttpContext.TraceIdentifier;
            var nameIdentifier = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var sub = User.FindFirstValue("sub");
            var userId = nameIdentifier ?? sub;

            _logger.LogInformation(
                "DeleteMe requested. traceId={TraceId} userId={UserId} nameIdentifier={NameIdentifier} sub={Sub}",
                traceId,
                userId,
                nameIdentifier,
                sub);

            if (string.IsNullOrWhiteSpace(userId))
            {
                _logger.LogWarning(
                    "DeleteMe unauthorized because no user id claim was found. traceId={TraceId}",
                    traceId);
                return Unauthorized();
            }

            var deleted = await _userService.DeleteUserAsync(userId, traceId, ct);

            _logger.LogInformation(
                "DeleteMe completed. traceId={TraceId} userId={UserId} deleted={Deleted}",
                traceId,
                userId,
                deleted);

            return deleted ? NoContent() : NotFound();
        }


        [Authorize]
        [HttpGet("me/settings")]
        public async Task<IActionResult> GetMySettings(CancellationToken ct)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                         ?? User.FindFirstValue("sub");

            if (string.IsNullOrWhiteSpace(userId))
                return Unauthorized();

            var settings = await _userService.GetSettingsAsync(userId, ct);
            if (settings == null) return NotFound();

            var homeProgressCircles = ParseStringArray(settings.HomeProgressCirclesJson);
            var homeSectionOrder = ParseStringArray(settings.HomeSectionOrderJson);
            var recoveryMapHiddenMuscles = ParseStringArray(settings.RecoveryMapHiddenMusclesJson);
            var foodCoachExcludedDateKeys = UserService.ParseStoredFoodCoachExcludedDateKeys(
                settings.FoodCoachExcludedDateKeysJson
            );

            return Ok(new
            {
                age = settings.Age,
                gender = settings.Gender,
                language = settings.Language,
                hasCompletedRegistration = settings.HasCompletedRegistration,
                calorieGoal = settings.CalorieGoal,
                proteinGoal = settings.ProteinGoal,
                fatGoal = settings.FatGoal,
                carbGoal = settings.CarbGoal,
                weightGoalKg = settings.WeightGoalKg,
                weightGoalTimeUtc = settings.WeightGoalTimeUtc,
                weightDirection = settings.WeightDirection,
                muscleFilter = settings.MuscleFilter,
                homeProgressCircles = homeProgressCircles,
                homeSectionOrder = homeSectionOrder,
                recoveryMapHiddenMuscles = recoveryMapHiddenMuscles,
                foodCoachExcludedDateKeys = foodCoachExcludedDateKeys,
                showOnlyCustomTrainingContent = settings.ShowOnlyCustomTrainingContent,
                useFoodCoach = settings.UseFoodCoach,
                useWorkoutCoach = settings.UseWorkoutCoach,
                homeProgressCirclesJson = settings.HomeProgressCirclesJson
            });
        }

        // PATCH: api/user/me/settings
        [Authorize]
        [HttpPatch("me/settings")]
        public async Task<IActionResult> UpdateMySettings(
            [FromBody] UpdateUserSettingsDto dto,
            CancellationToken ct)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                         ?? User.FindFirstValue("sub");

            if (string.IsNullOrWhiteSpace(userId))
                return Unauthorized();

            var updated = await _userService.UpdateSettingsAsync(userId, dto, ct);

            return updated ? NoContent() : NotFound();
        }

        private static string BuildDisplayName(string? email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return "Atlet";

            var local = email.Split('@', 2, StringSplitOptions.TrimEntries)[0];
            if (string.IsNullOrWhiteSpace(local))
                return "Atlet";

            var normalized = local
                .Replace('.', ' ')
                .Replace('_', ' ')
                .Replace('-', ' ');

            var parts = normalized.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0)
                return "Atlet";

            var pretty = string.Join(" ", parts.Select(p =>
                p.Length == 1
                    ? p.ToUpperInvariant()
                    : char.ToUpperInvariant(p[0]) + p[1..].ToLowerInvariant()
            ));

            return string.IsNullOrWhiteSpace(pretty) ? "Atlet" : pretty;
        }

        private static string[] ParseStringArray(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return [];

            try
            {
                using var doc = JsonDocument.Parse(raw);
                if (doc.RootElement.ValueKind != JsonValueKind.Array) return [];

                var list = new List<string>();
                foreach (var item in doc.RootElement.EnumerateArray())
                {
                    if (item.ValueKind != JsonValueKind.String) continue;
                    var value = item.GetString();
                    if (string.IsNullOrWhiteSpace(value)) continue;
                    list.Add(value.Trim());
                }

                return [.. list];
            }
            catch
            {
                return [];
            }
        }
    }
}
