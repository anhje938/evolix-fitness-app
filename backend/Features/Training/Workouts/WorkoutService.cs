using backend.Common;
using backend.Data;
using backend.Features.Training.WorkoutPrograms;
using backend.Features.Training.WorkoutSessions.Entities;
using Microsoft.EntityFrameworkCore;

namespace backend.Features.Training.Workouts
{
    public class WorkoutService
    {

        private readonly AppDbContext _db;
        public WorkoutService(AppDbContext db)
        {
            _db = db;
        }

        private async Task<WorkoutProgram?> ResolveAssignableProgramAsync(
            Guid? programId,
            string userId,
            bool isAdmin,
            CancellationToken ct)
        {
            if (!programId.HasValue)
                return null;

            var program = await _db.WorkoutPrograms
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == programId.Value, ct);

            if (program == null)
                throw new NotFoundException("Program not found");

            if (!isAdmin && program.UserId != userId)
                throw new ForbiddenException("You cannot link workouts to this program");

            return program;
        }

        //CREATE WORKOUT 
        //IF ADMIN CREATES = GLOBAL | IF USER CREATES = PERSONAL
        public async Task<WorkoutResponse> CreateWorkout(CreateWorkoutRequest req, string userId, bool isAdmin, CancellationToken ct = default)
        {
            var orderedExerciseIds = (req.ExerciseIds ?? [])
                .Where(id => id != Guid.Empty)
                .Distinct()
                .ToList();

            if (orderedExerciseIds.Count > 0)
            {
                var existingExerciseIds = await _db.Exercises
                    .Where(e => orderedExerciseIds.Contains(e.Id))
                    .Select(e => e.Id)
                    .ToListAsync(ct);

                var missingExerciseIds = orderedExerciseIds.Except(existingExerciseIds).ToList();
                if (missingExerciseIds.Count > 0)
                {
                    throw new NotFoundException(
                        $"Exercises not found: {string.Join(", ", missingExerciseIds)}");
                }
            }

            var linkedProgram = await ResolveAssignableProgramAsync(
                req.WorkoutProgramId,
                userId,
                isAdmin,
                ct);

            var workout = new Workout
            {
                Name = req.Name,
                Description = req.Description,
                DayLabel = req.DayLabel,
                WorkoutProgramId = req.WorkoutProgramId,
                IsPremium = isAdmin && req.IsPremium,
                UserId = isAdmin ? null : userId,
                WorkoutExercises = orderedExerciseIds
                    .Select((exerciseId, index) => new WorkoutExercise
                    {
                        ExerciseId = exerciseId,
                        Order = index + 1
                    })
                    .ToList()
            };

            await _db.Workouts.AddAsync(workout, ct);
            await _db.SaveChangesAsync(ct);

            return new WorkoutResponse
            {
                Id = workout.Id,
                Name = workout.Name,
                Description = workout.Description ?? string.Empty,
                DayLabel = workout.DayLabel ?? string.Empty,
                WorkoutProgramId = workout.WorkoutProgramId,
                IsPremium = workout.IsPremium,
                WorkoutProgramIsPremium = linkedProgram?.IsPremium ?? false,
                ExerciseIds = orderedExerciseIds,
                UserId = workout.UserId,
                IsCustom = workout.IsCustom
            };

        }

        //GET WORKOUTS
        //FETCH ALL WORKOUTS FOR CERTAIN USER (PERSONAL + GLOBAL)
        public async Task<List<WorkoutResponse>> GetWorkoutsForUser(
            string userId,
            bool isAdmin,
            CancellationToken ct = default)
        {
            var query = _db.Workouts
                .AsNoTracking()
                .AsQueryable();

            if (!isAdmin)
            {
                // Vanlig bruker: egne + globale (UserId == null)
                query = query.Where(w => w.UserId == userId || w.UserId == null);
            }
            // Admin: ser ALT (ingen ekstra filter)

            return await query
                .OrderBy(w => w.Name)
                .Select(w => new WorkoutResponse
                {
                    Id = w.Id,
                    Name = w.Name,
                    Description = w.Description ?? string.Empty,
                    DayLabel = w.DayLabel ?? string.Empty,
                    WorkoutProgramId = w.WorkoutProgramId,
                    IsPremium = w.IsPremium,
                    WorkoutProgramIsPremium = w.WorkoutProgram != null && w.WorkoutProgram.IsPremium,
                    ExerciseIds = w.WorkoutExercises
                        .OrderBy(we => we.Order)
                        .Select(we => we.ExerciseId)
                        .ToList(),
                    UserId = w.UserId,
                    IsCustom = w.IsCustom
                })
                .ToListAsync(ct);
        }

        public async Task<WorkoutSession> GetSessionDetailsByIdAsync(
    string userId,
    Guid sessionId,
    CancellationToken ct = default)
        {
            var session = await _db.WorkoutSessions
                .Include(s => s.ExerciseLogs)
                    .ThenInclude(l => l.Exercise)
                .Include(s => s.ExerciseLogs)
                    .ThenInclude(l => l.Sets)
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId, ct);

            if (session == null)
                throw new NotFoundException("Workout session not found");

            return session;
        }



        //DELETE WORKOUT
        //USER CAN DELETE PERSONAL | ADMIN ALL
        public async Task DeleteWorkout(string userId, bool isAdmin, Guid id, CancellationToken ct = default)
        {
            var workout = await _db.Workouts.FirstOrDefaultAsync(w => w.Id == id, ct);

            if (workout == null)
                throw new NotFoundException("Workout not found");

            if (!isAdmin && workout.UserId != userId)
                throw new ForbiddenException("You cannot delete this workout");

            _db.Workouts.Remove(workout);
            await _db.SaveChangesAsync(ct);
        }

        //UPDATE WORKOUT
        //USER CAN UPDATE OWN | ADMIN ALL
        public async Task UpdateWorkout(string userId, bool isAdmin, Guid id, UpdateWorkoutRequest req, CancellationToken ct = default)
        {
            var existing = await _db.Workouts
                .Include(w => w.WorkoutExercises)
                .FirstOrDefaultAsync(e => e.Id == id, ct);

            if (existing == null)
                throw new NotFoundException("Workout not found");

            if (!isAdmin && existing.UserId != userId)
                throw new ForbiddenException("You cannot edit this workout");

            var linkedProgram = await ResolveAssignableProgramAsync(
                req.WorkoutProgramId,
                userId,
                isAdmin,
                ct);

            existing.Name = req.Name;
            existing.Description = req.Description;
            existing.DayLabel = req.DayLabel;
            existing.WorkoutProgramId = linkedProgram?.Id;
            if (isAdmin && req.IsPremium.HasValue)
                existing.IsPremium = req.IsPremium.Value;

            var orderedExerciseIds = (req.ExerciseIds ?? new List<Guid>())
                .Where(exerciseId => exerciseId != Guid.Empty)
                .Distinct()
                .ToList();

            if (orderedExerciseIds.Count > 0)
            {
                var existingExerciseIds = await _db.Exercises
                    .Where(e => orderedExerciseIds.Contains(e.Id))
                    .Select(e => e.Id)
                    .ToListAsync(ct);

                var missingExerciseIds = orderedExerciseIds.Except(existingExerciseIds).ToList();
                if (missingExerciseIds.Count > 0)
                {
                    throw new NotFoundException(
                        $"Exercises not found: {string.Join(", ", missingExerciseIds)}");
                }
            }

            if (existing.WorkoutExercises.Count > 0)
            {
                _db.WorkoutExercises.RemoveRange(existing.WorkoutExercises);
                existing.WorkoutExercises.Clear();
            }

            foreach (var workoutExercise in orderedExerciseIds.Select((exerciseId, index) => new WorkoutExercise
            {
                WorkoutId = existing.Id,
                ExerciseId = exerciseId,
                Order = index + 1
            }))
            {
                existing.WorkoutExercises.Add(workoutExercise);
            }

            await _db.SaveChangesAsync(ct);
        }
    }
}
