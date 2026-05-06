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
            var timestampUtc = NormalizeTimestamp(request.TimestampUtc);
            var targetDay = timestampUtc.Date;
            var nextDay = targetDay.AddDays(1);

            var existing = await _db.WeightLogs
                .FirstOrDefaultAsync(w =>
                    w.UserId == userId &&
                    w.TimestampUtc >= targetDay &&
                    w.TimestampUtc < nextDay,
                    ct);

            if (existing != null)
            {
                existing.WeightKg = request.WeightKg;
                existing.TimestampUtc = timestampUtc;

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
                TimestampUtc = timestampUtc,
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

        public async Task<WeightLogResponse> UpdateUserWeight(
            string userId,
            Guid id,
            WeightLogRequest request,
            CancellationToken ct = default)
        {
            var timestampUtc = NormalizeTimestamp(request.TimestampUtc);
            var entry = await _db.WeightLogs
                .FirstOrDefaultAsync(w => w.Id == id && w.UserId == userId, ct);

            if (entry == null)
                throw new KeyNotFoundException("Weight not found");

            entry.WeightKg = request.WeightKg;
            entry.TimestampUtc = timestampUtc;

            await _db.SaveChangesAsync(ct);

            return new WeightLogResponse
            {
                Id = entry.Id,
                WeightKg = entry.WeightKg,
                TimestampUtc = entry.TimestampUtc
            };
        }

        public async Task DeleteUserWeight(
            string userId,
            Guid id,
            CancellationToken ct = default)
        {
            var entry = await _db.WeightLogs
                .FirstOrDefaultAsync(w => w.Id == id && w.UserId == userId, ct);

            if (entry == null)
                throw new KeyNotFoundException("Weight not found");

            _db.WeightLogs.Remove(entry);
            await _db.SaveChangesAsync(ct);
        }

        private static DateTime NormalizeTimestamp(DateTime timestampUtc)
        {
            if (timestampUtc == default) return DateTime.UtcNow;

            return timestampUtc.Kind switch
            {
                DateTimeKind.Utc => timestampUtc,
                DateTimeKind.Local => timestampUtc.ToUniversalTime(),
                DateTimeKind.Unspecified => DateTime.SpecifyKind(timestampUtc, DateTimeKind.Utc),
                _ => timestampUtc.ToUniversalTime()
            };
        }

    }
}
