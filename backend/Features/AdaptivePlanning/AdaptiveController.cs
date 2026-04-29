using backend.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Features.AdaptivePlanning
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class AdaptiveController : BaseApiController
    {
        private readonly AdaptivePlanService _adaptivePlanService;
        private readonly WeeklyReportService _weeklyReportService;
        private readonly RecommendationService _recommendationService;

        public AdaptiveController(
            AdaptivePlanService adaptivePlanService,
            WeeklyReportService weeklyReportService,
            RecommendationService recommendationService)
        {
            _adaptivePlanService = adaptivePlanService;
            _weeklyReportService = weeklyReportService;
            _recommendationService = recommendationService;
        }

        [HttpGet("today")]
        public async Task<ActionResult<TodayFocusDto>> GetToday(CancellationToken ct)
        {
            var userId = GetUserId();
            return Ok(await _adaptivePlanService.GetTodayFocusAsync(userId, ct));
        }

        [HttpGet("weekly-report/current")]
        public async Task<ActionResult<WeeklyReportDto>> GetCurrentWeeklyReport(CancellationToken ct)
        {
            var userId = GetUserId();
            var report = await _weeklyReportService.GetOrGenerateCurrentAsync(userId, ct);
            return Ok(AdaptiveMapper.ToDto(report));
        }

        [HttpGet("weekly-reports")]
        public async Task<ActionResult<List<WeeklyReportDto>>> GetWeeklyReports(
            [FromQuery] int limit = 12,
            CancellationToken ct = default)
        {
            var userId = GetUserId();
            var reports = await _weeklyReportService.GetHistoryAsync(userId, limit, ct);
            return Ok(reports.Select(AdaptiveMapper.ToDto).ToList());
        }

        [HttpPost("weekly-report/generate")]
        public async Task<ActionResult<WeeklyReportDto>> GenerateWeeklyReport(CancellationToken ct)
        {
            var userId = GetUserId();
            var report = await _weeklyReportService.GenerateCurrentAsync(userId, ct);
            return Ok(AdaptiveMapper.ToDto(report));
        }

        [HttpGet("recommendations")]
        public async Task<ActionResult<List<AdaptiveRecommendationDto>>> GetRecommendations(CancellationToken ct)
        {
            var userId = GetUserId();
            var recommendations = await _recommendationService.GetPendingAsync(userId, ct);
            return Ok(recommendations.Select(AdaptiveMapper.ToDto).ToList());
        }

        [HttpPost("recommendations/{id:guid}/accept")]
        public async Task<ActionResult<AdaptiveRecommendationDto>> AcceptRecommendation(
            [FromRoute] Guid id,
            CancellationToken ct)
        {
            var userId = GetUserId();
            var recommendation = await _recommendationService.AcceptAsync(userId, id, ct);
            return Ok(AdaptiveMapper.ToDto(recommendation));
        }

        [HttpPost("recommendations/{id:guid}/dismiss")]
        public async Task<ActionResult<AdaptiveRecommendationDto>> DismissRecommendation(
            [FromRoute] Guid id,
            CancellationToken ct)
        {
            var userId = GetUserId();
            var recommendation = await _recommendationService.DismissAsync(userId, id, ct);
            return Ok(AdaptiveMapper.ToDto(recommendation));
        }
    }
}
