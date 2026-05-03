using backend.Common;
using backend.Data;
using Microsoft.EntityFrameworkCore;

namespace backend.Features.Training.Exercises
{
    public class ExerciseService
    {
        private readonly AppDbContext _db;
        public ExerciseService(AppDbContext db)
        {
            _db = db;
        }


        //POST EXERCISE (IF ADMIN POST GLOBAL)
        public async Task<ExerciseResponse> CreateExercise(CreateExerciseRequest req, string userId, bool isAdmin, CancellationToken ct = default)
        {
            var exercise = new Exercise
            {
                Name = req.Name,
                Description = req.Description,
                Muscle = req.Muscle,
                SpecificMuscleGroups = req.SpecificMuscleGroups,
                Equipment = req.Equipment,
                Category = req.Category,
                EquipmentType = req.EquipmentType,
                IsBodyweight = req.IsBodyweight,
                IsIsolation = req.IsIsolation,
                IsCompound = req.IsCompound,
                DefaultProgressionStepKg = NormalizeStep(req.DefaultProgressionStepKg),
                UserId = isAdmin ? null : userId
            };

            ApplyExerciseMuscles(exercise, req.Muscles);

            await _db.Exercises.AddAsync(exercise, ct);
            await _db.SaveChangesAsync(ct);

            return MapExercise(exercise);
        }

        //UPDATE EXERCISE
        //USER CAN UPDATE == USERID EXERICSES || ADMIN ANY
        public async Task<ExerciseResponse> UpdateExercise(Guid id, string userId, bool isAdmin, UpdateExerciseRequest req, CancellationToken ct = default )
        {

            var exercise = await _db.Exercises
                .Include(e => e.ExerciseMuscles)
                .FirstOrDefaultAsync(e => e.Id == id, ct);

            if (exercise == null)
                throw new NotFoundException("Exercise not found");

            if (!isAdmin && userId != exercise.UserId)
                throw new ForbiddenException("Forbidden operation");

            //SET DB VALUES IF REQUEST VALUE IS NOT EMPTY
            if (!string.IsNullOrEmpty(req.Name))
                exercise.Name = req.Name;

            if (!string.IsNullOrEmpty(req.Description))
                exercise.Description = req.Description;

            if (!string.IsNullOrEmpty(req.Muscle))
                exercise.Muscle = req.Muscle;

            if (!string.IsNullOrEmpty(req.SpecificMuscleGroups))
                exercise.SpecificMuscleGroups = req.SpecificMuscleGroups;

            if (!string.IsNullOrEmpty(req.Equipment))
                exercise.Equipment = req.Equipment;

            if (!string.IsNullOrWhiteSpace(req.Category))
                exercise.Category = req.Category.Trim();

            if (!string.IsNullOrWhiteSpace(req.EquipmentType))
                exercise.EquipmentType = req.EquipmentType.Trim();

            if (req.IsBodyweight.HasValue)
                exercise.IsBodyweight = req.IsBodyweight.Value;

            if (req.IsIsolation.HasValue)
                exercise.IsIsolation = req.IsIsolation.Value;

            if (req.IsCompound.HasValue)
                exercise.IsCompound = req.IsCompound.Value;

            if (req.DefaultProgressionStepKg.HasValue)
                exercise.DefaultProgressionStepKg = NormalizeStep(req.DefaultProgressionStepKg);

            if (req.Muscles != null)
                ApplyExerciseMuscles(exercise, req.Muscles);

            await _db.SaveChangesAsync(ct);

            return MapExercise(exercise);
        }

           
        //DELETE EXERCISE BY ID+GUID
        //USER CAN ONLY DELETE OWN EXERCISE, ADMIN ANY
        public async Task DeleteExercise(Guid id, string userId, bool isAdmin, CancellationToken ct = default )
        {

            var exercise = await _db.Exercises.FirstOrDefaultAsync(e => e.Id == id, ct);

            if (exercise == null)
                throw new NotFoundException("Exercise not found");
            
            if(!isAdmin && userId != exercise.UserId)
            {
                throw new ForbiddenException("Forbidden operation");
            }

            _db.Exercises.Remove(exercise);
            await _db.SaveChangesAsync(ct);

      
        }


        //FETCH EXERCISES FOR A USER (GLOBAL AND PERSONAL)
        public async Task<List<ExerciseResponse>> GetExercisesForUser(string userId, CancellationToken ct = default)
        {

            var exercises = await _db.Exercises
                .Include(e => e.ExerciseMuscles)
                .Where(e => e.UserId == userId || e.UserId == null)
                .ToListAsync(ct);

            var usageByExerciseId = await _db.WorkoutExerciseLogs
                .AsNoTracking()
                .Where(log => log.WorkoutSession.UserId == userId)
                .GroupBy(log => log.ExerciseId)
                .Select(group => new { ExerciseId = group.Key, Count = group.Count() })
                .ToDictionaryAsync(x => x.ExerciseId, x => x.Count, ct);

            return exercises
                .Select(e => MapExercise(e, usageByExerciseId.GetValueOrDefault(e.Id)))
                .OrderByDescending(e => e.UsageCount)
                .ThenBy(e => e.Name)
                .ToList();

        }

        private static decimal? NormalizeStep(decimal? value)
        {
            if (!value.HasValue || value.Value <= 0) return null;
            return decimal.Round(Math.Min(value.Value, 100m), 2, MidpointRounding.AwayFromZero);
        }

        private static void ApplyExerciseMuscles(Exercise exercise, IEnumerable<ExerciseMuscleDto>? muscles)
        {
            exercise.ExerciseMuscles.Clear();

            if (muscles == null) return;

            var seen = new HashSet<(string Muscle, MuscleRole Role)>();

            foreach (var item in muscles)
            {
                var muscle = item.Muscle.Trim();
                if (string.IsNullOrWhiteSpace(muscle)) continue;
                if (!seen.Add((muscle, item.Role))) continue;

                var contribution = item.Role == MuscleRole.Primary
                    ? 1m
                    : decimal.Round(Math.Clamp(item.Contribution, 0.1m, 1m), 2, MidpointRounding.AwayFromZero);

                exercise.ExerciseMuscles.Add(new ExerciseMuscle
                {
                    ExerciseId = exercise.Id,
                    Muscle = muscle,
                    Role = item.Role,
                    Contribution = contribution
                });
            }
        }

        private static ExerciseResponse MapExercise(Exercise e, int usageCount = 0)
        {
            return new ExerciseResponse
            {
                Id = e.Id,
                Name = e.Name,
                Description = e.Description,
                Muscle = e.Muscle,
                SpecificMuscleGroups = e.SpecificMuscleGroups,
                Equipment = e.Equipment,
                Category = e.Category,
                EquipmentType = e.EquipmentType,
                IsBodyweight = e.IsBodyweight,
                IsIsolation = e.IsIsolation,
                IsCompound = e.IsCompound,
                DefaultProgressionStepKg = e.DefaultProgressionStepKg,
                UserId = e.UserId,
                UsageCount = usageCount,
                Muscles = e.ExerciseMuscles
                    .OrderBy(m => m.Role)
                    .ThenByDescending(m => m.Contribution)
                    .ThenBy(m => m.Muscle)
                    .Select(m => new ExerciseMuscleDto
                    {
                        Muscle = m.Muscle,
                        Role = m.Role,
                        Contribution = m.Contribution
                    })
                    .ToList()
            };
        }

    }
}
