using System.Text.Json;
using backend.Data;
using Microsoft.EntityFrameworkCore;

namespace backend.Features.Users
{
    public class UserService
    {
        private static readonly string[] DefaultHomeProgressCircles =
            ["calories", "protein", "carbs", "fat"];

        private static readonly string[] AllowedHomeProgressCircles =
            ["calories", "protein", "carbs", "fat"];

        private static readonly string[] DefaultHomeSectionOrder =
            ["quickStart", "goals", "weight", "recoveryMap"];

        private static readonly string[] AllowedHomeSectionOrder =
            ["quickStart", "goals", "weight", "recoveryMap"];

        private static readonly JsonSerializerOptions HomeUiJsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        private sealed class HomeUiSettingsPayload
        {
            public string[] HomeProgressCircles { get; set; } = [.. DefaultHomeProgressCircles];
            public string[] HomeSectionOrder { get; set; } = [.. DefaultHomeSectionOrder];
            public string[] RecoveryMapHiddenMuscles { get; set; } = [];
            public bool ShowOnlyCustomTrainingContent { get; set; } = false;
        }

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

        public async Task<User?> GetUserAsync(
            string userId,
            CancellationToken ct = default)
        {
            return await _db.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId, ct);
        }

        public async Task<UserSettings?> GetSettingsAsync(
            string userId,
            CancellationToken ct = default)
        {
            return await _db.UserSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.UserId == userId, ct);
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
            if (dto.HomeProgressCircles != null ||
                dto.HomeSectionOrder != null ||
                dto.RecoveryMapHiddenMuscles != null ||
                dto.ShowOnlyCustomTrainingContent.HasValue)
            {
                var homeUi = new HomeUiSettingsPayload
                {
                    HomeProgressCircles = ParseStoredHomeProgressCircles(
                        settings.HomeProgressCirclesJson
                    ),
                    HomeSectionOrder = ParseStoredHomeSectionOrder(
                        settings.HomeSectionOrderJson
                    ),
                    RecoveryMapHiddenMuscles = ParseStoredRecoveryMapHiddenMuscles(
                        settings.RecoveryMapHiddenMusclesJson
                    ),
                    ShowOnlyCustomTrainingContent =
                        settings.ShowOnlyCustomTrainingContent
                };

                if (dto.HomeProgressCircles != null)
                {
                    homeUi.HomeProgressCircles = NormalizeStringArray(
                        dto.HomeProgressCircles,
                        AllowedHomeProgressCircles,
                        DefaultHomeProgressCircles
                    );
                }

                if (dto.HomeSectionOrder != null)
                {
                    homeUi.HomeSectionOrder = NormalizeStringArray(
                        dto.HomeSectionOrder,
                        AllowedHomeSectionOrder,
                        DefaultHomeSectionOrder
                    );
                }

                if (dto.RecoveryMapHiddenMuscles != null)
                {
                    homeUi.RecoveryMapHiddenMuscles = NormalizeUniqueStringArray(
                        dto.RecoveryMapHiddenMuscles
                    );
                }

                if (dto.ShowOnlyCustomTrainingContent.HasValue)
                {
                    homeUi.ShowOnlyCustomTrainingContent =
                        dto.ShowOnlyCustomTrainingContent.Value;
                }

                settings.HomeProgressCirclesJson = JsonSerializer.Serialize(
                    homeUi.HomeProgressCircles,
                    HomeUiJsonOptions
                );
                settings.HomeSectionOrderJson = JsonSerializer.Serialize(
                    homeUi.HomeSectionOrder,
                    HomeUiJsonOptions
                );
                settings.RecoveryMapHiddenMusclesJson = JsonSerializer.Serialize(
                    homeUi.RecoveryMapHiddenMuscles,
                    HomeUiJsonOptions
                );
                settings.ShowOnlyCustomTrainingContent =
                    homeUi.ShowOnlyCustomTrainingContent;
            }

            settings.UpdatedUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return true;
        }

        private static string[] ParseStoredHomeProgressCircles(string? raw)
        {
            var parsed = ReadArrayOrObjectProperty(raw, "homeProgressCircles", "homeGoalTiles");
            return NormalizeStringArray(
                parsed,
                AllowedHomeProgressCircles,
                DefaultHomeProgressCircles
            );
        }

        private static string[] ParseStoredHomeSectionOrder(string? raw)
        {
            var parsed = ReadArrayOrObjectProperty(raw, "homeSectionOrder");
            return NormalizeStringArray(
                parsed,
                AllowedHomeSectionOrder,
                DefaultHomeSectionOrder
            );
        }

        private static string[] ParseStoredRecoveryMapHiddenMuscles(string? raw)
        {
            var parsed = ReadArrayOrObjectProperty(raw, "recoveryMapHiddenMuscles");
            return NormalizeUniqueStringArray(parsed);
        }

        private static string[]? ReadArrayOrObjectProperty(
            string? raw,
            params string[] objectPropertyNames
        )
        {
            if (string.IsNullOrWhiteSpace(raw)) return null;

            try
            {
                using var doc = JsonDocument.Parse(raw);
                var root = doc.RootElement;

                if (root.ValueKind == JsonValueKind.Array)
                {
                    return ReadStringArray(root);
                }

                if (root.ValueKind != JsonValueKind.Object) return null;

                foreach (var wanted in objectPropertyNames)
                {
                    var value = TryGetStringArrayProperty(root, wanted);
                    if (value != null) return value;
                }

                return null;
            }
            catch
            {
                return null;
            }
        }

        private static string[]? TryGetStringArrayProperty(JsonElement root, string name)
        {
            foreach (var prop in root.EnumerateObject())
            {
                if (!string.Equals(prop.Name, name, StringComparison.OrdinalIgnoreCase))
                    continue;

                if (prop.Value.ValueKind != JsonValueKind.Array) return null;
                return ReadStringArray(prop.Value);
            }

            return null;
        }

        private static string[] ReadStringArray(JsonElement value)
        {
            var list = new List<string>();
            foreach (var item in value.EnumerateArray())
            {
                if (item.ValueKind != JsonValueKind.String) continue;
                var raw = item.GetString();
                if (string.IsNullOrWhiteSpace(raw)) continue;
                list.Add(raw.Trim());
            }
            return [.. list];
        }

        private static string[] NormalizeStringArray(
            IEnumerable<string>? input,
            IReadOnlyList<string> allowed,
            IReadOnlyList<string> fallback)
        {
            if (input == null) return [.. fallback];

            var allowedSet = new HashSet<string>(allowed, StringComparer.Ordinal);
            var seen = new HashSet<string>(StringComparer.Ordinal);
            var next = new List<string>();

            foreach (var raw in input)
            {
                if (string.IsNullOrWhiteSpace(raw)) continue;
                if (!allowedSet.Contains(raw)) continue;
                if (!seen.Add(raw)) continue;
                next.Add(raw);
            }

            foreach (var value in fallback)
            {
                if (!seen.Contains(value)) next.Add(value);
            }

            return [.. next];
        }

        private static string[] NormalizeUniqueStringArray(IEnumerable<string>? input)
        {
            if (input == null) return [];

            var seen = new HashSet<string>(StringComparer.Ordinal);
            var next = new List<string>();

            foreach (var raw in input)
            {
                if (string.IsNullOrWhiteSpace(raw)) continue;

                var value = raw.Trim();
                if (!seen.Add(value)) continue;
                next.Add(value);
            }

            return [.. next];
        }
    }
}
