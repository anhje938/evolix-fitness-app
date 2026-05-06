using backend.Common;
using backend.Data;
using backend.Features.Training.Workouts;
using Microsoft.EntityFrameworkCore;

namespace backend.Features.Training.WorkoutPrograms
{
    public class WorkoutProgramService
    {

        private readonly AppDbContext _db;

        public WorkoutProgramService(AppDbContext db)
        {
            _db = db;
        }

        private async Task<List<Guid>> ValidateExerciseIdsAsync(
            IEnumerable<Guid>? exerciseIds,
            CancellationToken ct)
        {
            var orderedExerciseIds = (exerciseIds ?? [])
                .Where(id => id != Guid.Empty)
                .Distinct()
                .ToList();

            if (orderedExerciseIds.Count == 0)
                return orderedExerciseIds;

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

            return orderedExerciseIds;
        }

        //GET WORKOUT PROGRAMS 
        //PERSONAL + GLOBAL
        public async Task<List<WorkoutProgramResponse>> GetUserWorkoutPrograms(
            string userId,
            bool isAdmin,
            CancellationToken ct)
        {
            return await _db.WorkoutPrograms
                .AsNoTracking()
                .Where(p => p.UserId == userId || p.UserId == null)
                .OrderBy(p => p.Name)
                .Select(p => new WorkoutProgramResponse
                {
                    Id = p.Id,
                    Name = p.Name,
                    Goal = p.Goal,
                    Level = p.Level,
                    IsPremium = p.IsPremium,
                    IsCustom = p.IsCustom,
                    UserId = p.UserId,
                    Workouts = p.Workouts
                        .Where(w => isAdmin || w.UserId == null || w.UserId == userId)
                        .OrderBy(w => w.Name)
                        .Select(w => new WorkoutInProgramResponse
                        {
                            Id = w.Id,
                            Name = w.Name,
                            Description = w.Description
                        })
                        .ToList()
                })
                .ToListAsync(ct);
        }


        //CREATE WORKOUT PROGRAM
        //IF CREATED BY ADMIN = GLOBAL | IF CREATED BY USER | PERSONAL
        public async Task<WorkoutProgramResponse> CreateWorkoutProgram(
            string userId,
            CreateWorkoutProgramRequest req,
            bool isAdmin,
            CancellationToken ct = default)
        {
            var workoutProgram = new WorkoutProgram
            {
                Name = req.Name,
                Goal = req.Goal,
                Level = req.Level,
                IsPremium = isAdmin && req.IsPremium,
                UserId = isAdmin ? null : userId,
            };

            foreach (var workoutReq in req.Workouts ?? [])
            {
                if (string.IsNullOrWhiteSpace(workoutReq.Name))
                    continue;

                var orderedExerciseIds = await ValidateExerciseIdsAsync(
                    workoutReq.ExerciseIds,
                    ct);

                workoutProgram.Workouts.Add(new Workout
                {
                    Name = workoutReq.Name,
                    DayLabel = workoutReq.DayLabel,
                    Description = workoutReq.Description,
                    IsPremium = workoutProgram.IsPremium,
                    UserId = isAdmin ? null : userId,
                    WorkoutExercises = orderedExerciseIds
                        .Select((exerciseId, index) => new WorkoutExercise
                        {
                            ExerciseId = exerciseId,
                            Order = index + 1
                        })
                        .ToList()
                });
            }

            await _db.WorkoutPrograms.AddAsync(workoutProgram, ct);
            await _db.SaveChangesAsync(ct);

            return new WorkoutProgramResponse
            {
                Id = workoutProgram.Id,
                Name = workoutProgram.Name,
                Goal = workoutProgram.Goal,
                Level = workoutProgram.Level,
                IsPremium = workoutProgram.IsPremium,
                UserId = workoutProgram.UserId,
                IsCustom = workoutProgram.IsCustom,
                Workouts = workoutProgram.Workouts.Select(w => new WorkoutInProgramResponse
                {
                    Id = w.Id,
                    Name = w.Name,
                    Description = w.Description
                }).ToList()
            };
        }


        //DELETE WORKOUT PROGRAM
        public async Task DeleteWorkoutProgram(string userId, bool isAdmin, Guid id, CancellationToken ct = default)
        {

            var existing = await _db.WorkoutPrograms.FindAsync(id, ct);

            if (existing == null)
                throw new NotFoundException("Program not found");

            if (!isAdmin && existing.UserId != userId)
                throw new ForbiddenException("No permission to delete this program");

            _db.WorkoutPrograms.Remove(existing);
            await _db.SaveChangesAsync(ct);
        }

        //UPDATE WORKOUT PROGRAM
        // UPDATE WORKOUT PROGRAM
        public async Task<WorkoutProgramResponse> UpdateWorkoutProgram(
            string userId,
            Guid id,
            bool isAdmin,
            UpdateWorkoutProgramRequest req,
            CancellationToken ct = default)
        {
            // Hent program + nåværende workouts
            var existing = await _db.WorkoutPrograms
                .Include(p => p.Workouts)
                .FirstOrDefaultAsync(p => p.Id == id, ct);

            if (existing == null)
                throw new NotFoundException("Program not found");

            if (!isAdmin && existing.UserId != userId)
                throw new ForbiddenException("No permission to edit this program");

            // Oppdater basic felter
            if (!string.IsNullOrWhiteSpace(req.Name))
                existing.Name = req.Name;

            if (!string.IsNullOrWhiteSpace(req.Level))
                existing.Level = req.Level;

            if (!string.IsNullOrWhiteSpace(req.Goal))
                existing.Goal = req.Goal;

            if (isAdmin && req.IsPremium.HasValue)
                existing.IsPremium = req.IsPremium.Value;

            // ==========================
            // Oppdatere workouts i program
            // ==========================

            var requestedWorkoutIds = (req.WorkoutIds ?? [])
                .Where(workoutId => workoutId != Guid.Empty)
                .Distinct()
                .ToList();

            // 1) Finn nåværende workout-ids i programmet
            var currentWorkoutIds = existing.Workouts.Select(w => w.Id).ToList();

            // 2) Hvilke skal UT av programmet?
            var toRemoveIds = currentWorkoutIds
                .Where(idInProgram => !requestedWorkoutIds.Contains(idInProgram))
                .ToList();

            if (toRemoveIds.Any())
            {
                var toRemove = await _db.Workouts
                    .Where(w => toRemoveIds.Contains(w.Id) && (isAdmin || w.UserId == userId))
                    .ToListAsync(ct);

                foreach (var w in toRemove)
                {
                    w.WorkoutProgramId = null;
                }
            }

            // 3) Hvilke skal INN i programmet?
            var toAddIds = requestedWorkoutIds
                .Where(idRequested => !currentWorkoutIds.Contains(idRequested))
                .ToList();

            if (toAddIds.Any())
            {
                var toAdd = await _db.Workouts
                    .Where(w => toAddIds.Contains(w.Id))
                    .ToListAsync(ct);

                var missingWorkoutIds = toAddIds.Except(toAdd.Select(w => w.Id)).ToList();
                if (missingWorkoutIds.Count > 0)
                    throw new NotFoundException($"Workouts not found: {string.Join(", ", missingWorkoutIds)}");

                if (!isAdmin && toAdd.Any(w => w.UserId != userId))
                    throw new ForbiddenException("No permission to add one or more workouts to this program");

                if (existing.UserId == null && toAdd.Any(w => w.UserId != null))
                    throw new ForbiddenException("Global programs can only contain global workouts");

                if (existing.UserId != null && toAdd.Any(w => w.UserId != existing.UserId))
                    throw new ForbiddenException("User programs can only contain workouts owned by the same user");

                foreach (var w in toAdd)
                {
                    w.WorkoutProgramId = existing.Id;
                }
            }

            await _db.SaveChangesAsync(ct);

            // For å være sikker på at vi har oppdatert navigasjonsproperty:
            var updated = await _db.WorkoutPrograms
                .Include(p => p.Workouts)
                .FirstAsync(p => p.Id == id, ct);

            return new WorkoutProgramResponse
            {
                Id = updated.Id,
                Name = updated.Name,
                Goal = updated.Goal,
                Level = updated.Level,
                IsPremium = updated.IsPremium,
                UserId = updated.UserId,
                IsCustom = updated.IsCustom,
                Workouts = updated.Workouts.Select(w => new WorkoutInProgramResponse
                {
                    Id = w.Id,
                    Name = w.Name,
                    Description = w.Description
                }).ToList()
            };
        }


    }
}
