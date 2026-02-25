using backend.Auth;
using backend.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Features.Training.WorkoutPrograms
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class WorkoutProgramController : BaseApiController
    {

        private readonly WorkoutProgramService _workoutProgramService;

        public WorkoutProgramController(WorkoutProgramService workoutProgramService)
        {
            _workoutProgramService = workoutProgramService;
        }

        //CREATE WORKOUTPROGRAM
        [HttpPost]
        public async Task<ActionResult<WorkoutProgramResponse>> CreateWorkoutProgram([FromBody] CreateWorkoutProgramRequest req, CancellationToken ct = default)
        {
            var userId = GetUserId();
            var isAdmin = User.IsAdmin();

            var response = await _workoutProgramService.CreateWorkoutProgram(userId, req, isAdmin, ct);

            return Ok(response);
        }

        //GET WORKOUTPROGRAMS
        [HttpGet]
        public async Task<ActionResult<List<WorkoutProgramResponse>>> GetWorkoutProgramsForUser(CancellationToken ct = default)
        {
            var userId = GetUserId();
            var isAdmin = User.IsAdmin();

            var response = await _workoutProgramService.GetUserWorkoutPrograms(userId, ct);

            return Ok(response);
        }

        //DELETE WORKOUT PROGRAM
        [HttpDelete("{id:guid}")]
        public async Task<ActionResult> DeleteWorkoutProgram(Guid id, CancellationToken ct = default)
        {
            var userId = GetUserId();
            var isAdmin = User.IsAdmin();

            await _workoutProgramService.DeleteWorkoutProgram(userId, isAdmin, id, ct);

            return NoContent();
        }

        //UPDATE WORKOUT PROGRAM
        [HttpPut("{id:guid}")]
        public async Task<ActionResult<WorkoutProgramResponse>> UpdateWorkoutProgram(Guid id,[FromBody] UpdateWorkoutProgramRequest req, CancellationToken ct = default)
        {
            var userId = GetUserId();
            var isAdmin = User.IsAdmin();

            var response = await _workoutProgramService.UpdateWorkoutProgram(userId, id, isAdmin, req, ct);

            return Ok(response);
        }
    }
}
