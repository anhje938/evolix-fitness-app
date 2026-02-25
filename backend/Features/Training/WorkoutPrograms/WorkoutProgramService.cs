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

        //GET WORKOUT PROGRAMS 
        //PERSONAL + GLOBAL
        public async Task<List<WorkoutProgramResponse>> GetUserWorkoutPrograms(string userId, CancellationToken ct)
        {
            return await _db.WorkoutPrograms
                .Where(p => p.UserId == userId || p.UserId == null) 
                .Include(p => p.Workouts)
                .Select(p => new WorkoutProgramResponse
                {
                    Id = p.Id,
                    Name = p.Name,
                    Goal = p.Goal,
                    Level = p.Level,
                    IsCustom = p.IsCustom,
                    Workouts = p.Workouts.Select(w => new WorkoutInProgramResponse
                    {
                        Id = w.Id,
                        Name = w.Name,
                        Description = w.Description
                    }).ToList()
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
                UserId = isAdmin ? null : userId,
            };

            await _db.WorkoutPrograms.AddAsync(workoutProgram, ct);
            await _db.SaveChangesAsync(ct);

            // Ingen workouts koblet ved opprettelse (for nå)
            return new WorkoutProgramResponse
            {
                Id = workoutProgram.Id,
                Name = workoutProgram.Name,
                Goal = workoutProgram.Goal,
                Level = workoutProgram.Level,
                UserId = workoutProgram.UserId,
                IsCustom = workoutProgram.IsCustom,
                Workouts = new List<WorkoutInProgramResponse>()
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

            // ==========================
            // Oppdatere workouts i program
            // ==========================

            // 1) Finn nåværende workout-ids i programmet
            var currentWorkoutIds = existing.Workouts.Select(w => w.Id).ToList();

            // 2) Hvilke skal UT av programmet?
            var toRemoveIds = currentWorkoutIds
                .Where(idInProgram => !req.WorkoutIds.Contains(idInProgram))
                .ToList();

            if (toRemoveIds.Any())
            {
                var toRemove = await _db.Workouts
                    .Where(w => toRemoveIds.Contains(w.Id))
                    .ToListAsync(ct);

                foreach (var w in toRemove)
                {
                    w.WorkoutProgramId = null;
                }
            }

            // 3) Hvilke skal INN i programmet?
            var toAddIds = req.WorkoutIds
                .Where(idRequested => !currentWorkoutIds.Contains(idRequested))
                .ToList();

            if (toAddIds.Any())
            {
                var toAdd = await _db.Workouts
                    .Where(w => toAddIds.Contains(w.Id))
                    .ToListAsync(ct);

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
