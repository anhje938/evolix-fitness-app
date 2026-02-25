using backend.Common;
using backend.Features.Weight;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
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

        public FoodController(FoodService foodService, BarcodeLookupService barcodeLookupService)
        {
            _foodService = foodService;
            _barcodeLookupService = barcodeLookupService;
        }


        //GET ALL FOODS BY USER
        [HttpGet]
        public async Task<ActionResult<List<FoodDto>>> GetUserFoods()
        {

            var userId = GetUserId();

            var result = await _foodService.GetUserFoodAsync(userId);

            return Ok(result);
        }

        //ADD FOOD BY USER 
        [HttpPost]
        public async Task<ActionResult<FoodDto>> PostUserFood([FromBody] FoodDto dto)
        {

            var userId = GetUserId();

            var result = await _foodService.PostFoodAsync(dto, userId);

            return Ok(result);

        }


        // FETCH FOOD BY BARCODE FROM API
        [HttpGet("scan/{barcode}")]
        public async Task<IActionResult> GetProductByBarcode(string barcode, CancellationToken ct)
        {
            var result = await _barcodeLookupService.LookupAsync(barcode, ct);

            if (result == null || result.status == 0 || result.product == null || result.product.nutriments == null)
            {
                return NotFound(new { message = "Product not found" });
            }

            var p = result.product;
            var n = p.nutriments;

            // Map OpenFoodFacts model -> DTO expected by your frontend
            var dto = new FoodFromBarcodeDto
            {
                Title = p.product_name,
                CaloriesPr100 = n.energy_kcal_100g,
                ProteinsPr100 = n.proteins_100g,
                CarbsPr100 = n.carbohydrates_100g,
                FatsPr100 = n.fat_100g
            };

            Console.WriteLine(n.energy_kcal_100g);

            return Ok(dto);
        }

        // UPDATE FOOD BY USER
        [HttpPut("{id:guid}")]
        public async Task<ActionResult<FoodDto>> UpdateUserFood([FromRoute] Guid id, [FromBody] FoodDto dto, CancellationToken ct)
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

        // DELETE FOOD BY USER
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> DeleteUserFood([FromRoute] Guid id, CancellationToken ct)
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

    }


}
