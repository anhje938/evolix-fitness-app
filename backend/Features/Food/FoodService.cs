using backend.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Features.Food
{
    public class FoodService
    {

        private readonly AppDbContext _db;
        
        public FoodService(AppDbContext db)
        {
            _db = db;
        }

        //GET ALL FOODS BY USER
        public async Task<List<FoodDto>> GetUserFoodAsync(string userId, CancellationToken ct = default)
        {

            return await _db.FoodLogs
                .Where(f => f.UserId == userId)
                .OrderByDescending(f => f.TimestampUtc)
                .Select(f => new FoodDto
            {
                Id = f.Id,
                Title = f.Title,
                Calories = f.Calories,
                Proteins = f.Proteins,
                Carbs = f.Carbs,
                Fats = f.Fats,
                TimestampUtc = f.TimestampUtc
            }).ToListAsync(ct);

            
        }


        //POST FOOD BY USER
        public async Task<FoodDto> PostFoodAsync(FoodDto dto, string userId)
        {

            var entry = new FoodLog
            {
                Id = dto.Id,
                Calories = dto.Calories,
                Proteins = dto.Proteins,
                Fats = dto.Fats,
                Carbs = dto.Carbs,
                TimestampUtc = dto.TimestampUtc,
                Title = dto.Title,
                UserId = userId
            };

            _db.Add(entry);
            await _db.SaveChangesAsync();

            return new FoodDto
            {
                Id = dto.Id,
                Calories = dto.Calories,
                Proteins = dto.Proteins,
                Fats = dto.Fats,
                Carbs = dto.Carbs,
                TimestampUtc = dto.TimestampUtc,
                Title = dto.Title,
            };
        }

        // UPDATE FOOD BY USER
    public async Task<FoodDto> UpdateFoodAsync(Guid id, FoodDto dto, string userId, CancellationToken ct = default)
    {
        var entry = await _db.FoodLogs
            .FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId, ct);

        if (entry == null)
            throw new KeyNotFoundException("Food not found");

        entry.Title = dto.Title;
        entry.Calories = dto.Calories;
        entry.Proteins = dto.Proteins;
        entry.Carbs = dto.Carbs;
        entry.Fats = dto.Fats;
        entry.TimestampUtc = dto.TimestampUtc;

        await _db.SaveChangesAsync(ct);

        return new FoodDto
        {
            Id = entry.Id,
            Title = entry.Title,
            Calories = entry.Calories,
            Proteins = entry.Proteins,
            Carbs = entry.Carbs,
            Fats = entry.Fats,
            TimestampUtc = entry.TimestampUtc
        };
    }

    // DELETE FOOD BY USER
    public async Task DeleteFoodAsync(Guid id, string userId, CancellationToken ct = default)
    {
        var entry = await _db.FoodLogs
            .FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId, ct);

        if (entry == null)
            throw new KeyNotFoundException("Food not found");

        _db.FoodLogs.Remove(entry);
        await _db.SaveChangesAsync(ct);
    }

        }
    }
