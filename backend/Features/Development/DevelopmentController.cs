using backend.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Features.Development
{
    [Authorize]
    [Route("api/development")]
    [ApiController]
    public class DevelopmentController : BaseApiController
    {
        private readonly IHostEnvironment _environment;
        private readonly DevelopmentSeedService _seedService;

        public DevelopmentController(
            IHostEnvironment environment,
            DevelopmentSeedService seedService)
        {
            _environment = environment;
            _seedService = seedService;
        }

        [HttpPost("seed-mock-data")]
        public async Task<ActionResult<DevelopmentSeedResult>> SeedMockData(
            CancellationToken ct)
        {
            if (!_environment.IsDevelopment())
            {
                return NotFound();
            }

            var result = await _seedService.SeedMockDataAsync(GetUserId(), ct);
            return Ok(result);
        }
    }
}
