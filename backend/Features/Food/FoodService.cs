using backend.Data;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace backend.Features.Food
{
    public class FoodService
    {
        private const decimal DefaultServings = 1m;
        private const decimal MaxServings = 50m;

        private readonly AppDbContext _db;

        public FoodService(AppDbContext db)
        {
            _db = db;
        }

        // GET all foods by user
        public async Task<List<FoodDto>> GetUserFoodAsync(
            string userId,
            CancellationToken ct = default)
        {
            return await _db.FoodLogs
                .AsNoTracking()
                .Where(f => f.UserId == userId)
                .OrderByDescending(f => f.TimestampUtc)
                .Select(MapFoodProjection())
                .ToListAsync(ct);
        }

        // POST quick-add food by user
        public async Task<FoodDto> PostFoodAsync(
            FoodDto dto,
            string userId,
            CancellationToken ct = default)
        {
            var timestampUtc = NormalizeTimestamp(dto.TimestampUtc);
            var sourceType = string.IsNullOrWhiteSpace(dto.SourceType)
                ? "quickAdd"
                : dto.SourceType.Trim();

            var entry = new FoodLog
            {
                Id = dto.Id == Guid.Empty ? Guid.NewGuid() : dto.Id,
                Calories = ClampMacro(dto.Calories),
                Proteins = ClampMacro(dto.Proteins),
                Fats = ClampMacro(dto.Fats),
                Carbs = ClampMacro(dto.Carbs),
                TimestampUtc = timestampUtc,
                Title = NormalizeRequiredName(dto.Title, "Måltid"),
                UserId = userId,
                SourceComposedMealId = dto.SourceComposedMealId,
                SourceType = sourceType,
                SourceServings = dto.SourceServings.HasValue
                    ? NormalizeServings(dto.SourceServings.Value)
                    : null
            };

            _db.FoodLogs.Add(entry);
            await _db.SaveChangesAsync(ct);

            return MapFood(entry);
        }

        // UPDATE food by user
        public async Task<FoodDto> UpdateFoodAsync(
            Guid id,
            FoodDto dto,
            string userId,
            CancellationToken ct = default)
        {
            var entry = await _db.FoodLogs
                .FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId, ct);

            if (entry == null)
                throw new KeyNotFoundException("Food not found");

            entry.Title = NormalizeRequiredName(dto.Title, "Måltid");
            entry.Calories = ClampMacro(dto.Calories);
            entry.Proteins = ClampMacro(dto.Proteins);
            entry.Carbs = ClampMacro(dto.Carbs);
            entry.Fats = ClampMacro(dto.Fats);
            entry.TimestampUtc = NormalizeTimestamp(dto.TimestampUtc);

            // Keep existing source metadata unless caller sends explicit values.
            if (dto.SourceType != null)
                entry.SourceType = string.IsNullOrWhiteSpace(dto.SourceType)
                    ? null
                    : dto.SourceType.Trim();
            if (dto.SourceComposedMealId.HasValue)
                entry.SourceComposedMealId = dto.SourceComposedMealId;
            if (dto.SourceServings.HasValue)
                entry.SourceServings = NormalizeServings(dto.SourceServings.Value);

            await _db.SaveChangesAsync(ct);

            return MapFood(entry);
        }

        // DELETE food by user
        public async Task DeleteFoodAsync(
            Guid id,
            string userId,
            CancellationToken ct = default)
        {
            var entry = await _db.FoodLogs
                .FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId, ct);

            if (entry == null)
                throw new KeyNotFoundException("Food not found");

            _db.FoodLogs.Remove(entry);
            await _db.SaveChangesAsync(ct);
        }

        // GET all composed meals by user
        public async Task<List<ComposedMealDto>> GetComposedMealsAsync(
            string userId,
            CancellationToken ct = default)
        {
            var meals = await _db.ComposedMeals
                .AsNoTracking()
                .Include(x => x.Ingredients)
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.IsFavorite)
                .ThenByDescending(x => x.UpdatedUtc)
                .ToListAsync(ct);

            return meals.Select(MapComposedMeal).ToList();
        }

        // GET composed meal by id
        public async Task<ComposedMealDto?> GetComposedMealAsync(
            Guid id,
            string userId,
            CancellationToken ct = default)
        {
            var meal = await _db.ComposedMeals
                .AsNoTracking()
                .Include(x => x.Ingredients)
                .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);

            return meal == null ? null : MapComposedMeal(meal);
        }

        // CREATE composed meal
        public async Task<ComposedMealDto> CreateComposedMealAsync(
            UpsertComposedMealDto dto,
            string userId,
            CancellationToken ct = default)
        {
            var normalized = NormalizeUpsertComposedMeal(dto);
            var now = DateTime.UtcNow;

            var meal = new ComposedMeal
            {
                UserId = userId,
                Name = normalized.Name,
                IsFavorite = normalized.IsFavorite,
                CreatedUtc = now,
                UpdatedUtc = now,
                Ingredients = normalized.Ingredients.Select(i => new ComposedMealIngredient
                {
                    Name = i.Name,
                    AmountGrams = i.AmountGrams,
                    Calories = i.Calories,
                    Proteins = i.Proteins,
                    Carbs = i.Carbs,
                    Fats = i.Fats,
                    SortOrder = i.SortOrder
                }).ToList()
            };

            _db.ComposedMeals.Add(meal);
            await _db.SaveChangesAsync(ct);

            return MapComposedMeal(meal);
        }

        // UPDATE composed meal
        public async Task<ComposedMealDto?> UpdateComposedMealAsync(
            Guid id,
            UpsertComposedMealDto dto,
            string userId,
            CancellationToken ct = default)
        {
            var meal = await _db.ComposedMeals
                .Include(x => x.Ingredients)
                .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);

            if (meal == null) return null;

            var normalized = NormalizeUpsertComposedMeal(dto);

            meal.Name = normalized.Name;
            meal.IsFavorite = normalized.IsFavorite;
            meal.UpdatedUtc = DateTime.UtcNow;

            _db.ComposedMealIngredients.RemoveRange(meal.Ingredients);
            meal.Ingredients = normalized.Ingredients.Select(i => new ComposedMealIngredient
            {
                Name = i.Name,
                AmountGrams = i.AmountGrams,
                Calories = i.Calories,
                Proteins = i.Proteins,
                Carbs = i.Carbs,
                Fats = i.Fats,
                SortOrder = i.SortOrder
            }).ToList();

            await _db.SaveChangesAsync(ct);

            return MapComposedMeal(meal);
        }

        // DELETE composed meal
        public async Task<bool> DeleteComposedMealAsync(
            Guid id,
            string userId,
            CancellationToken ct = default)
        {
            var meal = await _db.ComposedMeals
                .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);

            if (meal == null) return false;

            _db.ComposedMeals.Remove(meal);
            await _db.SaveChangesAsync(ct);
            return true;
        }

        // FAVORITE toggle
        public async Task<ComposedMealDto?> SetComposedMealFavoriteAsync(
            Guid id,
            bool isFavorite,
            string userId,
            CancellationToken ct = default)
        {
            var meal = await _db.ComposedMeals
                .Include(x => x.Ingredients)
                .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);

            if (meal == null) return null;

            meal.IsFavorite = isFavorite;
            meal.UpdatedUtc = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);

            return MapComposedMeal(meal);
        }

        // LOG composed meal as FoodLog
        public async Task<FoodDto?> LogComposedMealAsync(
            Guid composedMealId,
            LogComposedMealDto dto,
            string userId,
            CancellationToken ct = default)
        {
            var meal = await _db.ComposedMeals
                .Include(x => x.Ingredients)
                .FirstOrDefaultAsync(
                    x => x.Id == composedMealId && x.UserId == userId,
                    ct);

            if (meal == null) return null;

            var servings = NormalizeServings(dto.Servings ?? DefaultServings);
            var timestampUtc = NormalizeTimestamp(dto.TimestampUtc ?? DateTime.UtcNow);
            var totals = ComputeMealTotals(meal.Ingredients, servings);

            var entry = new FoodLog
            {
                UserId = userId,
                Title = BuildLoggedTitle(meal.Name, servings),
                Calories = totals.Calories,
                Proteins = totals.Proteins,
                Carbs = totals.Carbs,
                Fats = totals.Fats,
                TimestampUtc = timestampUtc,
                SourceComposedMealId = meal.Id,
                SourceType = "composedMeal",
                SourceServings = servings
            };

            meal.LastUsedUtc = DateTime.UtcNow;

            _db.FoodLogs.Add(entry);
            await _db.SaveChangesAsync(ct);

            return MapFood(entry);
        }

        // GET composed-meal history entries from food logs
        public async Task<List<ComposedMealHistoryItemDto>> GetComposedMealHistoryAsync(
            string userId,
            int limit,
            CancellationToken ct = default)
        {
            var safeLimit = Math.Clamp(limit, 1, 100);

            var logs = await _db.FoodLogs
                .AsNoTracking()
                .Where(x => x.UserId == userId && x.SourceComposedMealId != null)
                .OrderByDescending(x => x.TimestampUtc)
                .Take(safeLimit)
                .ToListAsync(ct);

            if (logs.Count == 0) return [];

            var mealIds = logs
                .Where(x => x.SourceComposedMealId.HasValue)
                .Select(x => x.SourceComposedMealId!.Value)
                .Distinct()
                .ToList();

            var nameById = await _db.ComposedMeals
                .AsNoTracking()
                .Where(x => x.UserId == userId && mealIds.Contains(x.Id))
                .Select(x => new { x.Id, x.Name })
                .ToDictionaryAsync(x => x.Id, x => x.Name, ct);

            return logs.Select(log =>
            {
                var mealId = log.SourceComposedMealId!.Value;
                var mealName = nameById.TryGetValue(mealId, out var n)
                    ? n
                    : log.Title;

                return new ComposedMealHistoryItemDto
                {
                    FoodLogId = log.Id,
                    ComposedMealId = mealId,
                    ComposedMealName = mealName,
                    LoggedTitle = log.Title,
                    Servings = NormalizeServings(log.SourceServings ?? DefaultServings),
                    Calories = log.Calories,
                    Proteins = log.Proteins,
                    Carbs = log.Carbs,
                    Fats = log.Fats,
                    TimestampUtc = log.TimestampUtc
                };
            }).ToList();
        }

        // QUICK relog from a previous composed-meal history row
        public async Task<FoodDto?> RelogComposedMealFromHistoryAsync(
            Guid foodLogId,
            RelogComposedMealHistoryDto dto,
            string userId,
            CancellationToken ct = default)
        {
            var previous = await _db.FoodLogs
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x => x.Id == foodLogId &&
                         x.UserId == userId &&
                         x.SourceComposedMealId != null,
                    ct);

            if (previous == null || previous.SourceComposedMealId == null)
                return null;

            var servings = dto.Servings ?? previous.SourceServings ?? DefaultServings;

            return await LogComposedMealAsync(
                previous.SourceComposedMealId.Value,
                new LogComposedMealDto
                {
                    Servings = servings,
                    TimestampUtc = dto.TimestampUtc
                },
                userId,
                ct);
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

        private static string NormalizeRequiredName(string? raw, string fallback)
        {
            var name = raw?.Trim();
            return string.IsNullOrWhiteSpace(name) ? fallback : name;
        }

        private static int ClampMacro(int value)
        {
            return Math.Clamp(value, 0, 20000);
        }

        private static int ClampMacro(decimal value)
        {
            if (value <= 0m) return 0;
            if (value >= 20000m) return 20000;
            return (int)Math.Round(value, MidpointRounding.AwayFromZero);
        }

        private static decimal NormalizeServings(decimal servings)
        {
            if (servings <= 0m) return DefaultServings;
            return decimal.Round(Math.Min(servings, MaxServings), 2, MidpointRounding.AwayFromZero);
        }

        private static string BuildLoggedTitle(string mealName, decimal servings)
        {
            var normalizedName = NormalizeRequiredName(mealName, "Rett");
            return servings == 1m
                ? normalizedName
                : $"{normalizedName} x{servings:0.##}";
        }

        private static (int Calories, int Proteins, int Carbs, int Fats) ComputeMealTotals(
            IEnumerable<ComposedMealIngredient> ingredients,
            decimal servings)
        {
            decimal calories = 0m;
            decimal proteins = 0m;
            decimal carbs = 0m;
            decimal fats = 0m;

            foreach (var ingredient in ingredients)
            {
                calories += ingredient.Calories * servings;
                proteins += ingredient.Proteins * servings;
                carbs += ingredient.Carbs * servings;
                fats += ingredient.Fats * servings;
            }

            return (
                (int)Math.Round(calories, MidpointRounding.AwayFromZero),
                (int)Math.Round(proteins, MidpointRounding.AwayFromZero),
                (int)Math.Round(carbs, MidpointRounding.AwayFromZero),
                (int)Math.Round(fats, MidpointRounding.AwayFromZero)
            );
        }

        private static ComposedMealDto MapComposedMeal(ComposedMeal meal)
        {
            var orderedIngredients = (meal.Ingredients ?? [])
                .OrderBy(i => i.SortOrder)
                .ThenBy(i => i.Name, StringComparer.OrdinalIgnoreCase)
                .ToList();

            var totalCalories = orderedIngredients.Sum(i => i.Calories);
            var totalProteins = orderedIngredients.Sum(i => i.Proteins);
            var totalCarbs = orderedIngredients.Sum(i => i.Carbs);
            var totalFats = orderedIngredients.Sum(i => i.Fats);

            return new ComposedMealDto
            {
                Id = meal.Id,
                Name = meal.Name,
                IsFavorite = meal.IsFavorite,
                CreatedUtc = meal.CreatedUtc,
                UpdatedUtc = meal.UpdatedUtc,
                LastUsedUtc = meal.LastUsedUtc,
                TotalCalories = totalCalories,
                TotalProteins = totalProteins,
                TotalCarbs = totalCarbs,
                TotalFats = totalFats,
                IngredientCount = orderedIngredients.Count,
                Ingredients = orderedIngredients.Select(i => new ComposedMealIngredientDto
                {
                    Id = i.Id,
                    Name = i.Name,
                    AmountGrams = i.AmountGrams,
                    Calories = i.Calories,
                    Proteins = i.Proteins,
                    Carbs = i.Carbs,
                    Fats = i.Fats,
                    SortOrder = i.SortOrder
                }).ToList()
            };
        }

        private static FoodDto MapFood(FoodLog log)
        {
            return new FoodDto
            {
                Id = log.Id,
                Title = log.Title,
                Calories = log.Calories,
                Proteins = log.Proteins,
                Carbs = log.Carbs,
                Fats = log.Fats,
                TimestampUtc = log.TimestampUtc,
                SourceComposedMealId = log.SourceComposedMealId,
                SourceType = log.SourceType,
                SourceServings = log.SourceServings
            };
        }

        private static Expression<Func<FoodLog, FoodDto>> MapFoodProjection()
        {
            return f => new FoodDto
            {
                Id = f.Id,
                Title = f.Title,
                Calories = f.Calories,
                Proteins = f.Proteins,
                Carbs = f.Carbs,
                Fats = f.Fats,
                TimestampUtc = f.TimestampUtc,
                SourceComposedMealId = f.SourceComposedMealId,
                SourceType = f.SourceType,
                SourceServings = f.SourceServings
            };
        }

        private sealed class NormalizedComposedMealUpsert
        {
            public string Name { get; init; } = "";
            public bool IsFavorite { get; init; }
            public List<NormalizedIngredient> Ingredients { get; init; } = [];
        }

        private sealed class NormalizedIngredient
        {
            public string Name { get; init; } = "";
            public decimal AmountGrams { get; init; }
            public int Calories { get; init; }
            public int Proteins { get; init; }
            public int Carbs { get; init; }
            public int Fats { get; init; }
            public int SortOrder { get; init; }
        }

        private static NormalizedComposedMealUpsert NormalizeUpsertComposedMeal(
            UpsertComposedMealDto dto)
        {
            var name = NormalizeRequiredName(dto.Name, "");
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Rett må ha et navn.");

            if (dto.Ingredients == null || dto.Ingredients.Count == 0)
                throw new ArgumentException("Rett må ha minst én ingrediens.");

            var normalizedIngredients = new List<NormalizedIngredient>();

            for (var i = 0; i < dto.Ingredients.Count; i++)
            {
                var ingredient = dto.Ingredients[i];
                var ingredientName = NormalizeRequiredName(ingredient.Name, "");

                if (string.IsNullOrWhiteSpace(ingredientName))
                    throw new ArgumentException($"Ingrediens #{i + 1} mangler navn.");

                var amount = ingredient.AmountGrams <= 0m
                    ? 0m
                    : decimal.Round(
                        Math.Min(ingredient.AmountGrams, 99999m),
                        2,
                        MidpointRounding.AwayFromZero);

                normalizedIngredients.Add(new NormalizedIngredient
                {
                    Name = ingredientName,
                    AmountGrams = amount,
                    Calories = ClampMacro(ingredient.Calories),
                    Proteins = ClampMacro(ingredient.Proteins),
                    Carbs = ClampMacro(ingredient.Carbs),
                    Fats = ClampMacro(ingredient.Fats),
                    SortOrder = ingredient.SortOrder >= 0 ? ingredient.SortOrder : i
                });
            }

            // Ensure deterministic order when persisting.
            normalizedIngredients = normalizedIngredients
                .OrderBy(x => x.SortOrder)
                .ThenBy(x => x.Name, StringComparer.OrdinalIgnoreCase)
                .Select((x, idx) => new NormalizedIngredient
                {
                    Name = x.Name,
                    AmountGrams = x.AmountGrams,
                    Calories = x.Calories,
                    Proteins = x.Proteins,
                    Carbs = x.Carbs,
                    Fats = x.Fats,
                    SortOrder = idx
                })
                .ToList();

            return new NormalizedComposedMealUpsert
            {
                Name = name,
                IsFavorite = dto.IsFavorite,
                Ingredients = normalizedIngredients
            };
        }
    }
}
