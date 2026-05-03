using backend.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Features.Weight
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class WeightController : BaseApiController
    {
        private readonly WeightService _weights;

        public WeightController(WeightService weights)
        {
            _weights = weights;
        }

        [HttpGet]
        public async Task<ActionResult<List<WeightLogResponse>>> GetAll(
            CancellationToken ct)
        {
            var userId = GetUserId();

           
            var weights = await _weights.GetUserWeights(userId, ct);

            return Ok(weights);
        }

        [HttpPost]
        public async Task<ActionResult<WeightLogResponse>> PostWeight([FromBody] WeightLogRequest req, CancellationToken ct = default)
        {


            if (req.WeightKg <= 0)
            {
                return BadRequest("Weight must be greater than 0");
            }

            var userId = GetUserId();

            var result = await _weights.PostUserWeight(userId, req, ct);

            return Ok(result);
        }

        [HttpPut("{id:guid}")]
        public async Task<ActionResult<WeightLogResponse>> UpdateWeight(
            [FromRoute] Guid id,
            [FromBody] WeightLogRequest req,
            CancellationToken ct = default)
        {
            if (req.WeightKg <= 0)
            {
                return BadRequest("Weight must be greater than 0");
            }

            var userId = GetUserId();

            try
            {
                var result = await _weights.UpdateUserWeight(userId, id, req, ct);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Weight not found" });
            }
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> DeleteWeight(
            [FromRoute] Guid id,
            CancellationToken ct = default)
        {
            var userId = GetUserId();

            try
            {
                await _weights.DeleteUserWeight(userId, id, ct);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Weight not found" });
            }
        }
    }
}
