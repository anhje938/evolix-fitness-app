using backend.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Features.Food
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class FoodController : BaseApiController
    {
        private readonly FoodService _foodService;
        private readonly BarcodeLookupService _barcodeLookupService;

        public FoodController(
            FoodService foodService,
            BarcodeLookupService barcodeLookupService)
        {
            _foodService = foodService;
            _barcodeLookupService = barcodeLookupService;
        }

        // GET all quick-logged meals by user
        [HttpGet]
        public async Task<ActionResult<List<FoodDto>>> GetUserFoods(
            CancellationToken ct)
        {
            var userId = GetUserId();
            var result = await _foodService.GetUserFoodAsync(userId, ct);
            return Ok(result);
        }

        // ADD quick meal by user
        [HttpPost]
        public async Task<ActionResult<FoodDto>> PostUserFood(
            [FromBody] FoodDto dto,
            CancellationToken ct)
        {
            var userId = GetUserId();
            var result = await _foodService.PostFoodAsync(dto, userId, ct);
            return Ok(result);
        }

        // FETCH food by barcode from OpenFoodFacts proxy
        [HttpGet("scan/{barcode}")]
        public async Task<IActionResult> GetProductByBarcode(
            string barcode,
            CancellationToken ct)
        {
            var result = await _barcodeLookupService.LookupAsync(barcode, ct);

            if (result == null ||
                result.status == 0 ||
                result.product == null ||
                result.product.nutriments == null)
            {
                return NotFound(new { message = "Product not found" });
            }

            var p = result.product;
            var n = p.nutriments;

            var dto = new FoodFromBarcodeDto
            {
                Title = p.product_name,
                CaloriesPr100 = n.energy_kcal_100g,
                ProteinsPr100 = n.proteins_100g,
                CarbsPr100 = n.carbohydrates_100g,
                FatsPr100 = n.fat_100g
            };

            return Ok(dto);
        }

        // UPDATE meal by user
        [HttpPut("{id:guid}")]
        public async Task<ActionResult<FoodDto>> UpdateUserFood(
            [FromRoute] Guid id,
            [FromBody] FoodDto dto,
            CancellationToken ct)
        {
            var userId = GetUserId();

            try
            {
                var result = await _foodService.UpdateFoodAsync(id, dto, userId, ct);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Food not found" });
            }
        }

        // DELETE meal by user
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> DeleteUserFood(
            [FromRoute] Guid id,
            CancellationToken ct)
        {
            var userId = GetUserId();

            try
            {
                await _foodService.DeleteFoodAsync(id, userId, ct);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Food not found" });
            }
        }

        // GET all composed meals
        [HttpGet("composed-meals")]
        public async Task<ActionResult<List<ComposedMealDto>>> GetComposedMeals(
            CancellationToken ct)
        {
            var userId = GetUserId();
            var meals = await _foodService.GetComposedMealsAsync(userId, ct);
            return Ok(meals);
        }

        // GET composed meal details
        [HttpGet("composed-meals/{id:guid}")]
        public async Task<ActionResult<ComposedMealDto>> GetComposedMeal(
            [FromRoute] Guid id,
            CancellationToken ct)
        {
            var userId = GetUserId();
            var meal = await _foodService.GetComposedMealAsync(id, userId, ct);
            return meal == null
                ? NotFound(new { message = "Composed meal not found" })
                : Ok(meal);
        }

        // CREATE composed meal
        [HttpPost("composed-meals")]
        public async Task<ActionResult<ComposedMealDto>> CreateComposedMeal(
            [FromBody] UpsertComposedMealDto dto,
            CancellationToken ct)
        {
            var userId = GetUserId();
            try
            {
                var meal = await _foodService.CreateComposedMealAsync(dto, userId, ct);
                return Ok(meal);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // UPDATE composed meal
        [HttpPut("composed-meals/{id:guid}")]
        public async Task<ActionResult<ComposedMealDto>> UpdateComposedMeal(
            [FromRoute] Guid id,
            [FromBody] UpsertComposedMealDto dto,
            CancellationToken ct)
        {
            var userId = GetUserId();
            try
            {
                var meal = await _foodService.UpdateComposedMealAsync(id, dto, userId, ct);
                return meal == null
                    ? NotFound(new { message = "Composed meal not found" })
                    : Ok(meal);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // DELETE composed meal
        [HttpDelete("composed-meals/{id:guid}")]
        public async Task<IActionResult> DeleteComposedMeal(
            [FromRoute] Guid id,
            CancellationToken ct)
        {
            var userId = GetUserId();
            var deleted = await _foodService.DeleteComposedMealAsync(id, userId, ct);
            return deleted
                ? NoContent()
                : NotFound(new { message = "Composed meal not found" });
        }

        // PATCH favorite flag
        [HttpPatch("composed-meals/{id:guid}/favorite")]
        public async Task<ActionResult<ComposedMealDto>> SetComposedMealFavorite(
            [FromRoute] Guid id,
            [FromBody] SetComposedMealFavoriteDto dto,
            CancellationToken ct)
        {
            var userId = GetUserId();
            var meal = await _foodService.SetComposedMealFavoriteAsync(
                id,
                dto.IsFavorite,
                userId,
                ct);

            return meal == null
                ? NotFound(new { message = "Composed meal not found" })
                : Ok(meal);
        }

        // LOG a composed meal as a normal food log entry
        [HttpPost("composed-meals/{id:guid}/log")]
        public async Task<ActionResult<FoodDto>> LogComposedMeal(
            [FromRoute] Guid id,
            [FromBody] LogComposedMealDto dto,
            CancellationToken ct)
        {
            var userId = GetUserId();
            var logged = await _foodService.LogComposedMealAsync(id, dto, userId, ct);

            return logged == null
                ? NotFound(new { message = "Composed meal not found" })
                : Ok(logged);
        }

        // GET recent composed meal history rows
        [HttpGet("composed-meals/history")]
        public async Task<ActionResult<List<ComposedMealHistoryItemDto>>> GetComposedMealHistory(
            [FromQuery] int limit = 25,
            CancellationToken ct = default)
        {
            var userId = GetUserId();
            var items = await _foodService.GetComposedMealHistoryAsync(userId, limit, ct);
            return Ok(items);
        }

        // RELOG from composed meal history (same or overridden servings)
        [HttpPost("composed-meals/history/{foodLogId:guid}/relog")]
        public async Task<ActionResult<FoodDto>> RelogComposedMealFromHistory(
            [FromRoute] Guid foodLogId,
            [FromBody] RelogComposedMealHistoryDto dto,
            CancellationToken ct)
        {
            var userId = GetUserId();
            var result = await _foodService.RelogComposedMealFromHistoryAsync(
                foodLogId,
                dto,
                userId,
                ct);

            return result == null
                ? NotFound(new { message = "History row not found" })
                : Ok(result);
        }
    }
}
