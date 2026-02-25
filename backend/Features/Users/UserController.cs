using System.Security.Claims;
using System.Text.Json;
using backend.Common;
using backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace backend.Features.Users
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : BaseApiController
    {

        private readonly UserService _userService;

        public UserController(UserService userService)
        {
            _userService = userService;
           
        }


        //Delete user
        [Authorize]
        [HttpDelete("me")]
        public async Task<IActionResult> DeleteMe(CancellationToken ct)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var deleted = await _userService.DeleteUserAsync(userId!, ct);

            return deleted ? NoContent() : NotFound();
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

    }
}
