using backend.Features.Food;
using backend.Features.Training.Exercises;
using backend.Features.Training.WorkoutSessions.Entities;
using backend.Features.Users;
using backend.Features.Weight;
using Microsoft.EntityFrameworkCore;

namespace backend.Data;

public static class DevMockDataSeeder
{
    public const string MockUserId = "mock-user-123";
    private const string MockUserEmail = "user@demo.com";
    private const string SeedSource = "devMock";

    public static async Task SeedAsync(AppDbContext db, CancellationToken ct = default)
    {
        var hasUserData =
            await db.WeightLogs.AnyAsync(x => x.UserId == MockUserId, ct) ||
            await db.FoodLogs.AnyAsync(x => x.UserId == MockUserId, ct) ||
            await db.WorkoutSessions.AnyAsync(x => x.UserId == MockUserId, ct);

        if (hasUserData)
        {
            return;
        }

        var now = DateTime.UtcNow;
        var startDate = now.Date.AddDays(-64).AddHours(8);

        var user = await db.Users
            .Include(x => x.Settings)
            .FirstOrDefaultAsync(x => x.Id == MockUserId, ct);

        if (user == null)
        {
            user = new User
            {
                Id = MockUserId,
                Email = MockUserEmail,
                CreatedAtUtc = now,
                UpdatedAtUtc = now,
                Settings = BuildSettings(startDate, now)
            };
            db.Users.Add(user);
        }
        else if (user.Settings == null)
        {
            user.Settings = BuildSettings(startDate, now);
            user.UpdatedAtUtc = now;
        }
        else
        {
            ApplySettings(user.Settings, startDate, now);
            user.UpdatedAtUtc = now;
        }

        var benchPress = BuildExercise(
            "Benkpress",
            "Bryst",
            "Bryst, triceps, skuldre");
        var deadlift = BuildExercise(
            "Markløft",
            "Rygg",
            "Rygg, hamstrings, sete");

        db.Exercises.AddRange(benchPress, deadlift);
        db.WeightLogs.AddRange(BuildWeightLogs(startDate));
        db.FoodLogs.AddRange(BuildFoodLogs(startDate));
        db.WorkoutSessions.AddRange(BuildWorkoutSessions(
            startDate,
            benchPress.Id,
            deadlift.Id));

        await db.SaveChangesAsync(ct);
    }

    private static UserSettings BuildSettings(DateTime startDate, DateTime now)
    {
        var settings = new UserSettings
        {
            UserId = MockUserId
        };

        ApplySettings(settings, startDate, now);
        return settings;
    }

    private static void ApplySettings(UserSettings settings, DateTime startDate, DateTime now)
    {
        settings.Age = 30;
        settings.Gender = "male";
        settings.Language = "nb";
        settings.HasCompletedRegistration = true;
        settings.HasDismissedRegistrationOnboarding = true;
        settings.CalorieGoal = 2000;
        settings.ProteinGoal = 150;
        settings.FatGoal = 44;
        settings.CarbGoal = 250;
        settings.WeightGoalKg = 84m;
        settings.WeightGoalTimeUtc = now.Date.AddDays(30).AddHours(12);
        settings.CutStartDateUtc = startDate.Date.AddHours(12);
        settings.CutStartWeightKg = 90m;
        settings.WeightDirection = WeightDirection.Lose;
        settings.MuscleFilter = MuscleFilter.Advanced;
        settings.UpdatedUtc = now;
    }

    private static Exercise BuildExercise(
        string name,
        string muscle,
        string specificMuscleGroups)
    {
        var exercise = new Exercise
        {
            Id = Guid.NewGuid(),
            Name = name,
            Description = "Mock øvelse for lokal Expo Go testing.",
            Muscle = muscle,
            SpecificMuscleGroups = specificMuscleGroups,
            Equipment = "Stang",
            Category = "strength",
            EquipmentType = "barbell",
            IsCompound = true,
            DefaultProgressionStepKg = 2.5m,
            UserId = MockUserId
        };

        exercise.ExerciseMuscles.Add(new ExerciseMuscle
        {
            ExerciseId = exercise.Id,
            Muscle = muscle,
            Role = MuscleRole.Primary,
            Contribution = 1m
        });

        return exercise;
    }

    private static List<WeightLog> BuildWeightLogs(DateTime startDate)
    {
        var logs = new List<WeightLog>();

        for (var day = 0; day < 65; day++)
        {
            var weight = 90d - (6d / 64d * day);
            logs.Add(new WeightLog
            {
                Id = Guid.NewGuid(),
                UserId = MockUserId,
                TimestampUtc = startDate.AddDays(day),
                WeightKg = Math.Round(weight, 1)
            });
        }

        return logs;
    }

    private static List<FoodLog> BuildFoodLogs(DateTime startDate)
    {
        var logs = new List<FoodLog>();

        for (var day = 0; day < 65; day++)
        {
            logs.Add(new FoodLog
            {
                Id = Guid.NewGuid(),
                UserId = MockUserId,
                Title = $"Mock måltid {day + 1}",
                Calories = 2000,
                Proteins = 150,
                Carbs = 250,
                Fats = 44,
                TimestampUtc = startDate.Date.AddDays(day).AddHours(12),
                SourceType = SeedSource,
                SourceServings = 1m
            });
        }

        return logs;
    }

    private static List<WorkoutSession> BuildWorkoutSessions(
        DateTime startDate,
        Guid benchPressId,
        Guid deadliftId)
    {
        var sessions = new List<WorkoutSession>();

        for (var index = 0; index < 15; index++)
        {
            var started = startDate.Date
                .AddDays(index * 4)
                .AddHours(17);
            var benchWeight = Math.Round(120d - (20d / 14d * index), 1);
            var deadliftWeight = Math.Round(200d - (50d / 14d * index), 1);
            var session = new WorkoutSession
            {
                Id = Guid.NewGuid(),
                UserId = MockUserId,
                ClientRequestId = $"dev-mock-workout-{index + 1}",
                StartedAtUtc = started,
                FinishedAtUtc = started.AddHours(1),
                Title = $"Mock styrkeøkt {index + 1}",
                Notes = "Seeded for local Expo Go testing.",
                TotalSets = 6,
                TotalReps = 30,
                TotalVolume = (benchWeight * 5 * 3) + (deadliftWeight * 5 * 3)
            };

            session.ExerciseLogs.Add(BuildExerciseLog(session.Id, benchPressId, 1, benchWeight));
            session.ExerciseLogs.Add(BuildExerciseLog(session.Id, deadliftId, 2, deadliftWeight));

            sessions.Add(session);
        }

        return sessions;
    }

    private static WorkoutExerciseLog BuildExerciseLog(
        Guid sessionId,
        Guid exerciseId,
        int order,
        double weightKg)
    {
        var log = new WorkoutExerciseLog
        {
            Id = Guid.NewGuid(),
            WorkoutSessionId = sessionId,
            ExerciseId = exerciseId,
            Order = order
        };

        for (var setNumber = 1; setNumber <= 3; setNumber++)
        {
            log.Sets.Add(new SetLog
            {
                Id = Guid.NewGuid(),
                WorkoutExerciseLogId = log.Id,
                SetNumber = setNumber,
                WeightKg = weightKg,
                Reps = 5,
                Rir = 2,
                SetType = "working"
            });
        }

        return log;
    }
}
