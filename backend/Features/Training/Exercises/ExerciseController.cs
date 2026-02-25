using Microsoft.AspNetCore.Authorization;
using backend.Common;
using Microsoft.AspNetCore.Mvc;
using backend.Auth;

namespace backend.Features.Training.Exercises
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class ExerciseController : BaseApiController
    {

        private readonly ExerciseService _exerciseService;
        public ExerciseController(ExerciseService exerciseService)
        {
            _exerciseService = exerciseService;
        }


        //POSTS EXERCISE, GLOBAL IF ADMIN, PERSONAL IF USERID
        //CHECKS ADMIN STATUS ON JWT || WILL NOT BE RESPONSIVE IF REMOVE/ADD ADMIN 
        //USE DB CHECK FOR ADMIN STATUS IN FUTURE
        [HttpPost]
        public async Task<ActionResult<ExerciseResponse>> PostExercise([FromBody] CreateExerciseRequest req, CancellationToken ct = default)
        {
            var userId = GetUserId();
            var isAdmin = User.IsAdmin();

            Console.WriteLine($"userId: {userId}, isAdmin: {isAdmin}");

            if (userId == null)
            {
                return BadRequest("Missing userId");
            }
            var response = await _exerciseService.CreateExercise(req, userId, isAdmin);

            return Ok(response);
        }

        //UPDATE EXERCISE 
        //USER CAN UPDATE OWN EXERCISES, ADMIN ANY
        [HttpPut("{id:guid}")]
        public async Task<ActionResult<ExerciseResponse>> UpdateExercise([FromBody] UpdateExerciseRequest req, Guid id, CancellationToken ct = default)
        {
            var userId = GetUserId();
            var isAdmin = User.IsAdmin();

            var response = await _exerciseService.UpdateExercise(id, userId, isAdmin, req, ct);

            return Ok(response);
        }

        //GET LIST OF ALL EXERCISES RELEVANT FOR USER
        //GLOBAL AND PERSONALLY CREATED
        [HttpGet]
        public async Task<ActionResult<List<ExerciseResponse>>> GetExercises()
        {
            var userId = GetUserId();

            var exercises = await _exerciseService.GetExercisesForUser(userId);

            return Ok(exercises);
        }

        //DELETE EXERCISE // USER CAN ONLY DELETE OWN, ADMIN ANY
        [HttpDelete("{id:guid}")]
        public async Task<ActionResult> DeleteExercise(Guid id, CancellationToken ct = default)
        {
            var userId = GetUserId();
            var isAdmin = User.IsAdmin();

            await _exerciseService.DeleteExercise(id, userId, isAdmin, ct);

            return NoContent();
        }

    }
}
