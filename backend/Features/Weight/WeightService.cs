using backend.Data;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Features.Weight
{
    public class WeightService
    {

        private readonly AppDbContext _db;

        public WeightService(AppDbContext db)
        {
            _db = db;
        }

        //GET LIST OF WEIGHTLOGS BY USER
        public async Task<List<WeightLogResponse>> GetUserWeights(string userId, CancellationToken ct = default)
        {
            return await _db.WeightLogs
                .Where(w => w.UserId == userId)
                .OrderByDescending(w => w.TimestampUtc)
                .Select(w => new WeightLogResponse
                {
                Id = w.Id,
                TimestampUtc = w.TimestampUtc,
                WeightKg = w.WeightKg
            })
                .ToListAsync(ct);
        }

        //POST WEIGHT BY USER 
        //POST WEIGHT BY USER 
        public async Task<WeightLogResponse> PostUserWeight(
            string userId,
            WeightLogRequest request,
            CancellationToken ct = default)
        {
            // Bruk datoen fra requesten (UTC) som "target day"
            var targetDay = request.TimestampUtc.Date;      // f.eks. 2025-11-28 00:00:00
            var nextDay = targetDay.AddDays(1);             // 2025-11-29 00:00:00

            var existing = await _db.WeightLogs
                .FirstOrDefaultAsync(w =>
                    w.UserId == userId &&
                    w.TimestampUtc >= targetDay &&
                    w.TimestampUtc < nextDay,
                    ct);

            if (existing != null)
            {
                existing.WeightKg = request.WeightKg;
                existing.TimestampUtc = request.TimestampUtc;

                await _db.SaveChangesAsync(ct);

                return new WeightLogResponse
                {
                    Id = existing.Id,
                    WeightKg = existing.WeightKg,
                    TimestampUtc = existing.TimestampUtc
                };
            }

            var entry = new WeightLog
            {
                WeightKg = request.WeightKg,
                TimestampUtc = request.TimestampUtc,
                UserId = userId
            };

            _db.WeightLogs.Add(entry);
            await _db.SaveChangesAsync(ct);

            return new WeightLogResponse
            {
                Id = entry.Id,
                WeightKg = entry.WeightKg,
                TimestampUtc = entry.TimestampUtc
            };
        }



    }
}
