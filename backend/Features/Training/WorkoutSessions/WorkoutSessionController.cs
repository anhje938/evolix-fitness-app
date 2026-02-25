using System.Security.Claims;
using backend.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Features.Training.WorkoutSessions
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class WorkoutSessionController : BaseApiController
    {
        private readonly WorkoutSessionService _workoutSessionService;

        public WorkoutSessionController(WorkoutSessionService workoutSessionService)
        {
            _workoutSessionService = workoutSessionService;
        }

        // Starts a new workout session
        [HttpPost]
        public async Task<ActionResult<WorkoutSessionResponse>> StartSession(
            [FromBody] StartWorkoutSessionRequest req,
            CancellationToken ct)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId))
            {
                return Unauthorized("User id missing in token.");
            }

            var session = await _workoutSessionService.StartWorkoutSession(userId, req, ct);

            var response = new WorkoutSessionResponse
            {
                Id = session.Id,
                UserId = session.UserId,
                WorkoutId = session.WorkoutId,
                WorkoutProgramId = session.WorkoutProgramId,
                Title = session.Title,
                Notes = session.Notes,
                StartedAtUtc = session.StartedAtUtc,
                FinishedAtUtc = session.FinishedAtUtc,
                TotalSets = session.TotalSets,
                TotalReps = session.TotalReps,
                TotalVolume = session.TotalVolume
            };

            return Ok(response);
        }

        // Returns a single session by id for the current user
        [HttpGet("{sessionId:guid}")]
        public async Task<ActionResult<WorkoutSessionResponse>> GetById(Guid sessionId, CancellationToken ct)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId))
                return Unauthorized("User id missing in token.");

            var session = await _workoutSessionService.GetSessionByIdAsync(userId, sessionId, ct);

            // NY
            var muscleGroups = await _workoutSessionService.GetSessionMuscleGroupsAsync(userId, sessionId, ct);

            var response = new WorkoutSessionResponse
            {
                Id = session.Id,
                UserId = session.UserId,
                WorkoutId = session.WorkoutId,
                WorkoutProgramId = session.WorkoutProgramId,
                Title = session.Title,
                Notes = session.Notes,
                StartedAtUtc = session.StartedAtUtc,
                FinishedAtUtc = session.FinishedAtUtc,
                TotalSets = session.TotalSets,
                TotalReps = session.TotalReps,
                TotalVolume = session.TotalVolume,

                MuscleGroups = muscleGroups
            };

            return Ok(response);
        }


        // Returns all sessions for the current user
        [HttpGet]
        public async Task<ActionResult<List<WorkoutSessionResponse>>> GetUserSessions(
            CancellationToken ct)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId))
            {
                return Unauthorized("User id missing in token.");
            }

            var sessions = await _workoutSessionService.GetUserSessionsAsync(userId, ct);

            var response = sessions.Select(session => new WorkoutSessionResponse
            {
                Id = session.Id,
                UserId = session.UserId,
                WorkoutId = session.WorkoutId,
                WorkoutProgramId = session.WorkoutProgramId,
                Title = session.Title,
                Notes = session.Notes,
                StartedAtUtc = session.StartedAtUtc,
                FinishedAtUtc = session.FinishedAtUtc,
                TotalSets = session.TotalSets,
                TotalReps = session.TotalReps,
                TotalVolume = session.TotalVolume
            }).ToList();

            return Ok(response);
        }

        [HttpGet("completed")]
        public async Task<ActionResult<List<WorkoutSessionResponse>>> GetCompletedSessions(CancellationToken ct)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId))
                return Unauthorized("User id missing in token.");

            var response = await _workoutSessionService.GetCompletedSessionsAsync(userId, ct);
            return Ok(response);
        }


        [HttpGet("{sessionId:guid}/details")]
        public async Task<ActionResult<object>> GetSessionDetails(Guid sessionId, CancellationToken ct)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId))
                return Unauthorized("User id missing in token.");

            var session = await _workoutSessionService.GetSessionDetailsByIdAsync(userId, sessionId, ct);

            // Returner en enkel shape som er lett å mappe til overlay:
            return Ok(new
            {
                id = session.Id,
                title = session.Title,
                workoutId = session.WorkoutId,
                workoutProgramId = session.WorkoutProgramId,
                startedAtUtc = session.StartedAtUtc,
                finishedAtUtc = session.FinishedAtUtc,
                exerciseLogs = session.ExerciseLogs
                    .OrderBy(l => l.Order)
                    .Select(l => new
                    {
                        id = l.Id,
                        exerciseId = l.ExerciseId,
                        name = l.Exercise.Name,
                        muscle = l.Exercise.Muscle,
                        order = l.Order,
                        sets = l.Sets
                            .OrderBy(s => s.SetNumber)
                            .Select(s => new
                            {
                                id = s.Id,
                                setNumber = s.SetNumber,
                                weightKg = s.WeightKg,
                                reps = s.Reps
                            })
                    })
            });
        }




        // Adds a set to a session
        [HttpPost("{sessionId:guid}/sets")]
        public async Task<ActionResult<SetLogResponse>> AddSet(
            Guid sessionId,
            [FromBody] AddSetRequest req,
            CancellationToken ct)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId))
            {
                return Unauthorized("User id missing in token.");
            }

            var set = await _workoutSessionService.AddSetAsync(userId, sessionId, req, ct);

            var response = new SetLogResponse
            {
                Id = set.Id,
                WorkoutExerciseLogId = set.WorkoutExerciseLogId,
                SetNumber = set.SetNumber,
                WeightKg = set.WeightKg,
                Reps = set.Reps,
                Rir = set.Rir,
                DistanceMeters = set.DistanceMeters,
                Duration = set.Duration,
                SetType = set.SetType,
                Notes = set.Notes
            };

            return Ok(response);
        }

        // Marks a session as finished
        [HttpPost("{sessionId:guid}/finish")]
        public async Task<IActionResult> FinishSession(
            Guid sessionId,
            CancellationToken ct)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId))
            {
                return Unauthorized("User id missing in token.");
            }

            await _workoutSessionService.FinishSessionAsync(userId, sessionId, ct);

            return NoContent();
        }

        // GET: /api/workoutsession/exercise/{exerciseId}/history
        //GETS ALL EXERCISE HISTORY FOR USER FOR CERTAIN EXERCISE, 
        [HttpGet("exercise/{exerciseId:guid}/history")]
        public async Task<ActionResult<List<ExerciseHistoryPointResponse>>> GetExerciseHistory(
            Guid exerciseId,
            CancellationToken ct)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId))
            {
                return Unauthorized("User id missing in token.");
            }

            var history = await _workoutSessionService.GetExerciseHistoryAsync(
                userId,
                exerciseId,
                ct);

            return Ok(history);
        }

        // DELETE: /api/workoutsession/{sessionId}
        [HttpDelete("{sessionId:guid}")]
        public async Task<IActionResult> DeleteSession(Guid sessionId, CancellationToken ct)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId))
                return Unauthorized("User id missing in token.");

            await _workoutSessionService.DeleteSessionAsync(userId, sessionId, ct);
            return NoContent();
        }


        [HttpGet("exercise/{exerciseId:guid}/sets-history")]
        public async Task<ActionResult<List<ExerciseSessionSetsResponse>>> GetExerciseSetsHistory(
            Guid exerciseId,
            CancellationToken ct)
                {
                    var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                    if (string.IsNullOrWhiteSpace(userId))
                        return Unauthorized("User id missing in token.");

                    var history = await _workoutSessionService.GetExerciseSetsHistoryAsync(userId, exerciseId, ct);
                    return Ok(history);
                }
    }
}
