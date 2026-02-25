using backend.Auth;
using backend.Common;
using backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace backend.Features.Training.Workouts
{

    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class WorkoutController : BaseApiController
    {

        private readonly WorkoutService _workoutService;

        public WorkoutController(WorkoutService workoutService)
        {
            _workoutService = workoutService;
        }



        //CREATE WORKOUT 
        //IF CREATED BY ADMIN, GLOBAL, IF CREATED BY USER PERSONAL
        [HttpPost]
        public async Task<ActionResult<WorkoutResponse>> CreateWorkout([FromBody] CreateWorkoutRequest req, CancellationToken ct = default)
        {
            var userId = GetUserId();
            var isAdmin = User.IsAdmin();

            var response = await _workoutService.CreateWorkout(req, userId, isAdmin, ct);

            return Ok(response);
        }


        //DELETE PROGRAM
        //USER CAN DELETE OWN PROGRAMS, ADMIN CAN DELETE ANY
        [HttpDelete("{id:guid}")]
        public async Task<ActionResult> DeleteWorkout(Guid id, CancellationToken ct = default)
        {
            var userId = GetUserId();
            var isAdmin = User.IsAdmin();

            await _workoutService.DeleteWorkout(userId, isAdmin, id, ct);

            return NoContent();
        }

        //CHANGE PROGRAM
        //USER CHAN CHANGE OWN PROGRAM, ADMIN ANY
        [HttpPut("{id:guid}")]
        public async Task<ActionResult<WorkoutResponse>> UpdateWorkout([FromBody]UpdateWorkoutRequest req, Guid id, CancellationToken ct = default)
        {
            var userId = GetUserId();
            var isAdmin = User.IsAdmin();

            await _workoutService.UpdateWorkout(userId, isAdmin, id, req, ct);

            return NoContent();
        }


        //GET PROGRAMS WITH BELONGING EXERCISES
        //GETS ALL PROGRAMS AVAILABLE FOR USER (PERSONAL + GLOBAL)
        [HttpGet]
        public async Task<ActionResult<List<WorkoutResponse>>> GetWorkoutsWithExercises(CancellationToken ct = default)
        {
            var userId = GetUserId();
            var isAdmin = User.IsAdmin();

            var response = await _workoutService.GetWorkoutsForUser(userId, isAdmin, ct);

            return response;
        }
    }
}
