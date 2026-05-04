using System.Diagnostics;
using System.Globalization;
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

        private static readonly HashSet<string> AllowedGenders = new(
            ["male", "female"],
            StringComparer.Ordinal);

        private static readonly HashSet<string> AllowedLanguages = new(
            ["nb", "en"],
            StringComparer.Ordinal);

        private sealed class HomeUiSettingsPayload
        {
            public string[] HomeProgressCircles { get; set; } = [.. DefaultHomeProgressCircles];
            public string[] HomeSectionOrder { get; set; } = [.. DefaultHomeSectionOrder];
            public string[] RecoveryMapHiddenMuscles { get; set; } = [];
            public bool ShowOnlyCustomTrainingContent { get; set; } = false;
        }

        private readonly AppDbContext _db;
        private readonly ILogger<UserService> _logger;

        public UserService(
            AppDbContext db,
            ILogger<UserService> logger)
        {
            _db = db;
            _logger = logger;
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

        // Delete user
        public async Task<bool> DeleteUserAsync(
            string userId,
            string? traceId = null,
            CancellationToken ct = default)
        {
            var stopwatch = Stopwatch.StartNew();
            _logger.LogInformation(
                "DeleteUserAsync started. traceId={TraceId} userId={UserId}",
                traceId,
                userId);

            var user = await _db.Users
                .FirstOrDefaultAsync(u => u.Id == userId, ct);

            if (user == null)
            {
                _logger.LogWarning(
                    "DeleteUserAsync skipped because user was not found. traceId={TraceId} userId={UserId} elapsedMs={ElapsedMs}",
                    traceId,
                    userId,
                    stopwatch.ElapsedMilliseconds);
                return false;
            }

            await using var tx = await _db.Database.BeginTransactionAsync(ct);
            try
            {
                var workoutSessionIds = await _db.WorkoutSessions
                    .Where(x => x.UserId == userId)
                    .Select(x => x.Id)
                    .ToListAsync(ct);

                var workoutExerciseLogIds = workoutSessionIds.Count > 0
                    ? await _db.WorkoutExerciseLogs
                        .Where(x => workoutSessionIds.Contains(x.WorkoutSessionId))
                        .Select(x => x.Id)
                        .ToListAsync(ct)
                    : [];

                var setLogsCount = 0;
                var workoutExerciseLogsCount = 0;
                if (workoutExerciseLogIds.Count > 0)
                {
                    var setLogs = await _db.SetLogs
                        .Where(x => workoutExerciseLogIds.Contains(x.WorkoutExerciseLogId))
                        .ToListAsync(ct);
                    setLogsCount = setLogs.Count;
                    if (setLogsCount > 0)
                    {
                        _db.SetLogs.RemoveRange(setLogs);
                    }

                    var workoutExerciseLogs = await _db.WorkoutExerciseLogs
                        .Where(x => workoutExerciseLogIds.Contains(x.Id))
                        .ToListAsync(ct);
                    workoutExerciseLogsCount = workoutExerciseLogs.Count;
                    if (workoutExerciseLogsCount > 0)
                    {
                        _db.WorkoutExerciseLogs.RemoveRange(workoutExerciseLogs);
                    }
                }

                var workoutSessionsCount = 0;
                if (workoutSessionIds.Count > 0)
                {
                    var workoutSessions = await _db.WorkoutSessions
                        .Where(x => workoutSessionIds.Contains(x.Id))
                        .ToListAsync(ct);
                    workoutSessionsCount = workoutSessions.Count;
                    if (workoutSessionsCount > 0)
                    {
                        _db.WorkoutSessions.RemoveRange(workoutSessions);
                    }
                }

                var weightLogs = await _db.WeightLogs
                    .Where(x => x.UserId == userId)
                    .ToListAsync(ct);
                var weightLogsCount = weightLogs.Count;
                if (weightLogsCount > 0)
                {
                    _db.WeightLogs.RemoveRange(weightLogs);
                }

                var foodLogs = await _db.FoodLogs
                    .Where(x => x.UserId == userId)
                    .ToListAsync(ct);
                var foodLogsCount = foodLogs.Count;
                if (foodLogsCount > 0)
                {
                    _db.FoodLogs.RemoveRange(foodLogs);
                }

                var refreshTokens = await _db.RefreshTokens
                    .Where(x => x.UserId == userId)
                    .ToListAsync(ct);
                var refreshTokensCount = refreshTokens.Count;
                if (refreshTokensCount > 0)
                {
                    _db.RefreshTokens.RemoveRange(refreshTokens);
                }

                var composedMealIds = await _db.ComposedMeals
                    .Where(x => x.UserId == userId)
                    .Select(x => x.Id)
                    .ToListAsync(ct);
                var composedMealsCount = 0;
                var composedMealIngredientsCount = 0;
                if (composedMealIds.Count > 0)
                {
                    var composedMealIngredients = await _db.ComposedMealIngredients
                        .Where(x => composedMealIds.Contains(x.ComposedMealId))
                        .ToListAsync(ct);
                    composedMealIngredientsCount = composedMealIngredients.Count;
                    if (composedMealIngredientsCount > 0)
                    {
                        _db.ComposedMealIngredients.RemoveRange(composedMealIngredients);
                    }

                    var composedMeals = await _db.ComposedMeals
                        .Where(x => composedMealIds.Contains(x.Id))
                        .ToListAsync(ct);
                    composedMealsCount = composedMeals.Count;
                    if (composedMealsCount > 0)
                    {
                        _db.ComposedMeals.RemoveRange(composedMeals);
                    }
                }

                var workoutIds = await _db.Workouts
                    .Where(x => x.UserId == userId)
                    .Select(x => x.Id)
                    .ToListAsync(ct);
                var exerciseIds = await _db.Exercises
                    .Where(x => x.UserId == userId)
                    .Select(x => x.Id)
                    .ToListAsync(ct);

                var workoutExercisesCount = 0;
                if (workoutIds.Count > 0 || exerciseIds.Count > 0)
                {
                    var workoutExercises = await _db.WorkoutExercises
                        .Where(x =>
                            workoutIds.Contains(x.WorkoutId) ||
                            exerciseIds.Contains(x.ExerciseId))
                        .ToListAsync(ct);
                    workoutExercisesCount = workoutExercises.Count;
                    if (workoutExercisesCount > 0)
                    {
                        _db.WorkoutExercises.RemoveRange(workoutExercises);
                    }
                }

                var workoutsCount = 0;
                if (workoutIds.Count > 0)
                {
                    var workouts = await _db.Workouts
                        .Where(x => workoutIds.Contains(x.Id))
                        .ToListAsync(ct);
                    workoutsCount = workouts.Count;
                    if (workoutsCount > 0)
                    {
                        _db.Workouts.RemoveRange(workouts);
                    }
                }

                var workoutPrograms = await _db.WorkoutPrograms
                    .Where(x => x.UserId == userId)
                    .ToListAsync(ct);
                var workoutProgramsCount = workoutPrograms.Count;
                if (workoutProgramsCount > 0)
                {
                    _db.WorkoutPrograms.RemoveRange(workoutPrograms);
                }

                var exercisesCount = 0;
                if (exerciseIds.Count > 0)
                {
                    var exercises = await _db.Exercises
                        .Where(x => exerciseIds.Contains(x.Id))
                        .ToListAsync(ct);
                    exercisesCount = exercises.Count;
                    if (exercisesCount > 0)
                    {
                        _db.Exercises.RemoveRange(exercises);
                    }
                }

                var settings = await _db.UserSettings
                    .Where(x => x.UserId == userId)
                    .ToListAsync(ct);
                var settingsCount = settings.Count;
                if (settingsCount > 0)
                {
                    _db.UserSettings.RemoveRange(settings);
                }

                _logger.LogInformation(
                    "DeleteUserAsync loaded related data. traceId={TraceId} userId={UserId} workoutSessions={WorkoutSessions} workoutExerciseLogs={WorkoutExerciseLogs} setLogs={SetLogs} weightLogs={WeightLogs} foodLogs={FoodLogs} refreshTokens={RefreshTokens} composedMeals={ComposedMeals} composedMealIngredients={ComposedMealIngredients} workouts={Workouts} workoutExercises={WorkoutExercises} workoutPrograms={WorkoutPrograms} exercises={Exercises} settings={Settings} elapsedMs={ElapsedMs}",
                    traceId,
                    userId,
                    workoutSessionsCount,
                    workoutExerciseLogsCount,
                    setLogsCount,
                    weightLogsCount,
                    foodLogsCount,
                    refreshTokensCount,
                    composedMealsCount,
                    composedMealIngredientsCount,
                    workoutsCount,
                    workoutExercisesCount,
                    workoutProgramsCount,
                    exercisesCount,
                    settingsCount,
                    stopwatch.ElapsedMilliseconds);

                await _db.SaveChangesAsync(ct);
                _logger.LogInformation(
                    "DeleteUserAsync saved domain deletions. traceId={TraceId} userId={UserId} elapsedMs={ElapsedMs}",
                    traceId,
                    userId,
                    stopwatch.ElapsedMilliseconds);

                await AssertUserDataDeletedAsync(
                    userId,
                    workoutSessionIds,
                    workoutExerciseLogIds,
                    composedMealIds,
                    workoutIds,
                    exerciseIds,
                    traceId,
                    ct);

                _db.Users.Remove(user);
                await _db.SaveChangesAsync(ct);

                var hasUserRow = await _db.Users.AnyAsync(x => x.Id == userId, ct);
                var hasSettingsRow = await _db.UserSettings.AnyAsync(x => x.UserId == userId, ct);
                if (hasUserRow || hasSettingsRow)
                {
                    _logger.LogError(
                        "DeleteUserAsync residual user rows detected after final save. traceId={TraceId} userId={UserId} hasUserRow={HasUserRow} hasSettingsRow={HasSettingsRow} elapsedMs={ElapsedMs}",
                        traceId,
                        userId,
                        hasUserRow,
                        hasSettingsRow,
                        stopwatch.ElapsedMilliseconds);
                    throw new InvalidOperationException(
                        "User deletion verification failed. Residual user records remain."
                    );
                }

                await tx.CommitAsync(ct);
                _logger.LogInformation(
                    "DeleteUserAsync committed successfully. traceId={TraceId} userId={UserId} elapsedMs={ElapsedMs}",
                    traceId,
                    userId,
                    stopwatch.ElapsedMilliseconds);

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "DeleteUserAsync failed. traceId={TraceId} userId={UserId} elapsedMs={ElapsedMs}",
                    traceId,
                    userId,
                    stopwatch.ElapsedMilliseconds);

                try
                {
                    await tx.RollbackAsync(ct);
                    _logger.LogInformation(
                        "DeleteUserAsync transaction rolled back. traceId={TraceId} userId={UserId}",
                        traceId,
                        userId);
                }
                catch (Exception rollbackEx)
                {
                    _logger.LogError(
                        rollbackEx,
                        "DeleteUserAsync rollback failed. traceId={TraceId} userId={UserId}",
                        traceId,
                        userId);
                }

                throw;
            }
        }

        private async Task AssertUserDataDeletedAsync(
            string userId,
            IReadOnlyCollection<Guid> workoutSessionIds,
            IReadOnlyCollection<Guid> workoutExerciseLogIds,
            IReadOnlyCollection<Guid> composedMealIds,
            IReadOnlyCollection<Guid> workoutIds,
            IReadOnlyCollection<Guid> exerciseIds,
            string? traceId,
            CancellationToken ct)
        {
            var hasWeightLogs = await _db.WeightLogs.AnyAsync(x => x.UserId == userId, ct);
            var hasFoodLogs = await _db.FoodLogs.AnyAsync(x => x.UserId == userId, ct);
            var hasRefreshTokens = await _db.RefreshTokens.AnyAsync(x => x.UserId == userId, ct);
            var hasComposedMeals = await _db.ComposedMeals.AnyAsync(x => x.UserId == userId, ct);
            var hasWorkoutSessions = await _db.WorkoutSessions.AnyAsync(x => x.UserId == userId, ct);
            var hasWorkouts = await _db.Workouts.AnyAsync(x => x.UserId == userId, ct);
            var hasWorkoutPrograms = await _db.WorkoutPrograms.AnyAsync(x => x.UserId == userId, ct);
            var hasExercises = await _db.Exercises.AnyAsync(x => x.UserId == userId, ct);

            var hasComposedMealIngredients =
                composedMealIds.Count > 0 &&
                await _db.ComposedMealIngredients.AnyAsync(
                    x => composedMealIds.Contains(x.ComposedMealId),
                    ct);

            var hasWorkoutExerciseLogs =
                workoutSessionIds.Count > 0 &&
                await _db.WorkoutExerciseLogs.AnyAsync(
                    x => workoutSessionIds.Contains(x.WorkoutSessionId),
                    ct);

            var hasSetLogs =
                workoutExerciseLogIds.Count > 0 &&
                await _db.SetLogs.AnyAsync(
                    x => workoutExerciseLogIds.Contains(x.WorkoutExerciseLogId),
                    ct);

            var hasWorkoutExercises =
                (workoutIds.Count > 0 || exerciseIds.Count > 0) &&
                await _db.WorkoutExercises.AnyAsync(
                    x => workoutIds.Contains(x.WorkoutId) || exerciseIds.Contains(x.ExerciseId),
                    ct);

            if (hasWeightLogs ||
                hasFoodLogs ||
                hasRefreshTokens ||
                hasComposedMeals ||
                hasComposedMealIngredients ||
                hasWorkoutSessions ||
                hasWorkoutExerciseLogs ||
                hasSetLogs ||
                hasWorkouts ||
                hasWorkoutExercises ||
                hasWorkoutPrograms ||
                hasExercises)
            {
                _logger.LogError(
                    "DeleteUserAsync residual domain records detected. traceId={TraceId} userId={UserId} hasWeightLogs={HasWeightLogs} hasFoodLogs={HasFoodLogs} hasRefreshTokens={HasRefreshTokens} hasComposedMeals={HasComposedMeals} hasComposedMealIngredients={HasComposedMealIngredients} hasWorkoutSessions={HasWorkoutSessions} hasWorkoutExerciseLogs={HasWorkoutExerciseLogs} hasSetLogs={HasSetLogs} hasWorkouts={HasWorkouts} hasWorkoutExercises={HasWorkoutExercises} hasWorkoutPrograms={HasWorkoutPrograms} hasExercises={HasExercises}",
                    traceId,
                    userId,
                    hasWeightLogs,
                    hasFoodLogs,
                    hasRefreshTokens,
                    hasComposedMeals,
                    hasComposedMealIngredients,
                    hasWorkoutSessions,
                    hasWorkoutExerciseLogs,
                    hasSetLogs,
                    hasWorkouts,
                    hasWorkoutExercises,
                    hasWorkoutPrograms,
                    hasExercises);
                throw new InvalidOperationException(
                    "User deletion verification failed. Residual domain records remain."
                );
            }

            _logger.LogInformation(
                "DeleteUserAsync domain verification passed. traceId={TraceId} userId={UserId}",
                traceId,
                userId);
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

        // Update usersettings
        public async Task<bool> UpdateSettingsAsync(
            string userId,
            UpdateUserSettingsDto dto,
            CancellationToken ct = default)
        {
            var settings = await _db.UserSettings
                .FirstOrDefaultAsync(s => s.UserId == userId, ct);

            if (settings == null)
                return false;

            if (dto.Age.HasValue)
                settings.Age = NormalizeAge(dto.Age.Value);

            if (dto.Gender != null)
                settings.Gender = NormalizeGender(dto.Gender);

            if (dto.Language != null)
                settings.Language = NormalizeLanguage(dto.Language);

            if (dto.HasCompletedRegistration.HasValue)
                settings.HasCompletedRegistration = dto.HasCompletedRegistration.Value;

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

            if (dto.WeightGoalTimeUtc.HasValue)
                settings.WeightGoalTimeUtc = dto.WeightGoalTimeUtc.Value;

            if (dto.WeightDirection.HasValue)
                settings.WeightDirection = dto.WeightDirection.Value;

            // Filters
            if (dto.MuscleFilter.HasValue)
                settings.MuscleFilter = dto.MuscleFilter.Value;

            if (dto.UseFoodCoach.HasValue)
                settings.UseFoodCoach = dto.UseFoodCoach.Value;

            if (dto.UseWorkoutCoach.HasValue)
                settings.UseWorkoutCoach = dto.UseWorkoutCoach.Value;

            if (dto.FoodCoachExcludedDateKeys != null)
            {
                settings.FoodCoachExcludedDateKeysJson = JsonSerializer.Serialize(
                    NormalizeDateKeyArray(dto.FoodCoachExcludedDateKeys),
                    HomeUiJsonOptions
                );
            }

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

        public static string[] ParseStoredFoodCoachExcludedDateKeys(string? raw)
        {
            var parsed = ReadArrayOrObjectProperty(raw, "foodCoachExcludedDateKeys");
            return NormalizeDateKeyArray(parsed);
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

        private static string[] NormalizeDateKeyArray(IEnumerable<string>? input)
        {
            if (input == null) return [];

            var seen = new HashSet<string>(StringComparer.Ordinal);
            var next = new List<string>();

            foreach (var raw in input)
            {
                if (string.IsNullOrWhiteSpace(raw)) continue;

                var value = raw.Trim();
                if (!DateOnly.TryParseExact(
                        value,
                        "yyyy-MM-dd",
                        CultureInfo.InvariantCulture,
                        DateTimeStyles.None,
                        out _))
                {
                    continue;
                }

                if (!seen.Add(value)) continue;
                next.Add(value);
            }

            next.Sort(StringComparer.Ordinal);
            return [.. next];
        }

        private static int? NormalizeAge(int age)
        {
            return age is >= 10 and <= 120 ? age : null;
        }

        private static string? NormalizeGender(string? gender)
        {
            if (string.IsNullOrWhiteSpace(gender)) return null;

            var value = gender.Trim();
            return AllowedGenders.Contains(value) ? value : null;
        }

        private static string NormalizeLanguage(string? language)
        {
            if (string.IsNullOrWhiteSpace(language)) return "nb";

            var value = language.Trim().ToLowerInvariant();
            return AllowedLanguages.Contains(value) ? value : "nb";
        }
    }
}
