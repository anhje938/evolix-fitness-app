using System.Text.Json;
using backend.Data;
using Microsoft.EntityFrameworkCore;

namespace backend.Features.Users
{
    public class UserService
    {
        private readonly AppDbContext _db;

        public UserService(AppDbContext db)
        {
            _db = db;
        }

        // Called from Auth
        // Ensures User and UserSettings always exist
        public async Task<User> GetOrCreateUserFromAppleAsync(
            string appleSub,
            string? email,
            CancellationToken ct = default)
        {
            var user = await _db.Users
                .Include(u => u.Settings)
                .FirstOrDefaultAsync(u => u.Id == appleSub, ct);

            // ======================
            // Existing user
            // ======================
            if (user != null)
            {
                bool dirty = false;

                // Backfill settings (legacy users)
                if (user.Settings == null)
                {
                    user.Settings = new UserSettings
                    {
                        UserId = user.Id
                    };
                    dirty = true;
                }

                // Backfill email (Apple may only send once)
                if (user.Email == null && email != null)
                {
                    user.Email = email;
                    user.UpdatedAtUtc = DateTime.UtcNow;
                    dirty = true;
                }

                if (dirty)
                {
                    await _db.SaveChangesAsync(ct);
                }

                return user;
            }

            // ======================
            // New user
            // ======================
            user = new User
            {
                Id = appleSub,
                Email = email,
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow,
                Settings = new UserSettings
                {
                    UserId = appleSub
                }
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync(ct);

            return user;
        }

        //Delete user
        public async Task<bool> DeleteUserAsync(
            string userId,
            CancellationToken ct = default)
                {
                    var user = await _db.Users
                        .FirstOrDefaultAsync(u => u.Id == userId, ct);

                    if (user == null)
                    {
                        return false; // allerede slettet / finnes ikke
                    }

                    _db.Users.Remove(user);
                    await _db.SaveChangesAsync(ct);

                    return true;
                }


        //Update usersettings
        public async Task<bool> UpdateSettingsAsync(
            string userId,
            UpdateUserSettingsDto dto,
            CancellationToken ct = default)
        {
            var settings = await _db.UserSettings
                .FirstOrDefaultAsync(s => s.UserId == userId, ct);

            if (settings == null)
                return false;

            // Goals
            if (dto.CalorieGoal.HasValue)
                settings.CalorieGoal = dto.CalorieGoal.Value;

            if (dto.ProteinGoal.HasValue)
                settings.ProteinGoal = dto.ProteinGoal.Value;

            if (dto.FatGoal.HasValue)
                settings.FatGoal = dto.FatGoal.Value;

            if (dto.CarbGoal.HasValue)
                settings.CarbGoal = dto.CarbGoal.Value;

            // Weight
            if (dto.WeightGoalKg.HasValue)
                settings.WeightGoalKg = dto.WeightGoalKg.Value;

            if (dto.WeightDirection.HasValue)
                settings.WeightDirection = dto.WeightDirection.Value;

            // Filters
            if (dto.MuscleFilter.HasValue)
                settings.MuscleFilter = dto.MuscleFilter.Value;

            // Home UI
            if (dto.HomeProgressCircles != null)
            {
                settings.HomeProgressCirclesJson =
                    JsonSerializer.Serialize(dto.HomeProgressCircles);
            }

            settings.UpdatedUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return true;
        }
    }
}
