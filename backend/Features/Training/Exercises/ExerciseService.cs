using backend.Common;
using backend.Data;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
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
            if (isAdmin)
            {
                var exercise = new Exercise
                {
                    Name = req.Name,
                    Description = req.Description,
                    Muscle = req.Muscle,
                    SpecificMuscleGroups = req.SpecificMuscleGroups,
                    Equipment = req.Equipment,
                };

                await _db.Exercises.AddAsync(exercise, ct);
                await _db.SaveChangesAsync(ct);

                return new ExerciseResponse
                {
                    Id = exercise.Id,
                    Name = exercise.Name,
                    Description = exercise.Description,
                    Muscle = exercise.Muscle,
                    SpecificMuscleGroups = exercise.SpecificMuscleGroups,
                    Equipment = exercise.Equipment,
                    UserId = exercise.UserId 
                };


            }
            else
            {
                var exercise = new Exercise
                {
                    Name = req.Name,
                    Description = req.Description,
                    Muscle = req.Muscle,
                    SpecificMuscleGroups = req.SpecificMuscleGroups,
                    Equipment = req.Equipment,
                    UserId = userId,    
                };

                await _db.Exercises.AddAsync(exercise, ct);
                await _db.SaveChangesAsync(ct);

                return new ExerciseResponse
                {
                    Id = exercise.Id,
                    Name = exercise.Name,
                    Description = exercise.Description,
                    Muscle = exercise.Muscle,
                    SpecificMuscleGroups = exercise.SpecificMuscleGroups,
                    Equipment = exercise.Equipment,
                    UserId = userId,
                };

            }
        }

        //UPDATE EXERCISE
        //USER CAN UPDATE == USERID EXERICSES || ADMIN ANY
        public async Task<ExerciseResponse> UpdateExercise(Guid id, string userId, bool isAdmin, UpdateExerciseRequest req, CancellationToken ct = default )
        {

            var exercise = await _db.Exercises.FirstOrDefaultAsync(e => e.Id == id, ct);

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

            await _db.SaveChangesAsync(ct);

            return new ExerciseResponse
            {
                Id = exercise.Id,
                Name = exercise.Name,
                Description = exercise.Description,
                Muscle = exercise.Muscle,
                SpecificMuscleGroups = exercise.SpecificMuscleGroups,
                Equipment = exercise.Equipment,
                UserId = exercise.UserId,
            };
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

            return await _db.Exercises
                .Where(e => e.UserId == userId || e.UserId == null)
                .Select(e => new ExerciseResponse
                {
                    Id = e.Id,
                    Name = e.Name,
                    Description = e.Description,
                    Muscle = e.Muscle,
                    SpecificMuscleGroups = e.SpecificMuscleGroups,
                    Equipment = e.Equipment,
                    UserId = e.UserId,
                })
                .ToListAsync(ct);      

        }

    }
}
