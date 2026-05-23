using backend.Common;
using backend.Features.Subscriptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace backend.Features.CutIntelligence
{
    [Authorize]
    [Route("api/cut-intelligence")]
    [ApiController]
    public class CutIntelligenceController : BaseApiController
    {
        private readonly CutIntelligenceService _cutIntelligenceService;
        private readonly RevenueCatSubscriptionService _subscriptionService;

        public CutIntelligenceController(
            CutIntelligenceService cutIntelligenceService,
            RevenueCatSubscriptionService subscriptionService)
        {
            _cutIntelligenceService = cutIntelligenceService;
            _subscriptionService = subscriptionService;
        }

        [HttpGet("current")]
        public async Task<ActionResult<CutReportDto>> GetCurrent(CancellationToken ct)
        {
            var userId = GetUserId();
            if (!await _subscriptionService.HasPremiumAccessAsync(userId, ct))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    error = "upgrade_required"
                });
            }

            return Ok(await _cutIntelligenceService.GenerateCurrentAsync(userId, ct));
        }

        [HttpGet("readiness")]
        public async Task<ActionResult<CutReadinessDto>> GetReadiness(CancellationToken ct)
        {
            var userId = GetUserId();
            return Ok(await _cutIntelligenceService.GetReadinessAsync(userId, ct));
        }

        [HttpPost("recommendations/apply")]
        public async Task<ActionResult<ApplyCutRecommendationResultDto>> ApplyRecommendation(
            [FromBody] ApplyCutRecommendationRequest request,
            CancellationToken ct)
        {
            var userId = GetUserId();
            if (!await _subscriptionService.HasPremiumAccessAsync(userId, ct))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    error = "upgrade_required"
                });
            }

            if (string.IsNullOrWhiteSpace(request.RecommendationId))
            {
                return BadRequest(new { error = "recommendation_id_required" });
            }

            return Ok(await _cutIntelligenceService.ApplyRecommendationAsync(
                userId,
                request.RecommendationId,
                ct));
        }

        [HttpPost("recommendations/undo-last")]
        public async Task<ActionResult<ApplyCutRecommendationResultDto>> UndoLastRecommendation(
            CancellationToken ct)
        {
            var userId = GetUserId();
            if (!await _subscriptionService.HasPremiumAccessAsync(userId, ct))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    error = "upgrade_required"
                });
            }

            return Ok(await _cutIntelligenceService.UndoLastRecommendationAsync(userId, ct));
        }
    }
}
