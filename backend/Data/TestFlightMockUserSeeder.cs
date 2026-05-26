using backend.Features.Auth;
using backend.Features.Users;
using Microsoft.EntityFrameworkCore;

namespace backend.Data;

public static class TestFlightMockUserSeeder
{
    private const string DefaultUserId = "testflight-mock-user";
    private const string DefaultEmail = "testflight@evolix.no";
    private const string DefaultUsername = "testflight";

    public static async Task SeedAsync(
        AppDbContext db,
        IConfiguration configuration,
        CancellationToken ct = default)
    {
        var section = configuration.GetSection("TestFlightMockUser");
        if (!section.GetValue<bool>("Enabled"))
        {
            return;
        }

        var userId = ValueOrDefault(section["UserId"], DefaultUserId);
        var email = ValueOrDefault(section["Email"], DefaultEmail);
        var username = ValueOrDefault(section["Username"], DefaultUsername);
        var password = section["Password"];

        var normalizedEmail = UserService.NormalizeEmail(email)
            ?? throw new InvalidOperationException("TestFlightMockUser email is invalid.");
        var normalizedUsername = UserService.NormalizeUsername(username)
            ?? throw new InvalidOperationException("TestFlightMockUser username is invalid.");

        ValidatePassword(password);

        var userById = await db.Users
            .Include(x => x.Settings)
            .FirstOrDefaultAsync(x => x.Id == userId, ct);
        var userByEmail = await db.Users
            .Include(x => x.Settings)
            .FirstOrDefaultAsync(x => x.NormalizedEmail == normalizedEmail, ct);

        if (userById != null && userByEmail != null && userById.Id != userByEmail.Id)
        {
            throw new InvalidOperationException(
                "TestFlightMockUser email belongs to another user.");
        }

        var userByUsername = await db.Users
            .FirstOrDefaultAsync(x => x.NormalizedUsername == normalizedUsername, ct);
        var user = userById ?? userByEmail;

        if (userByUsername != null && (user == null || userByUsername.Id != user.Id))
        {
            throw new InvalidOperationException(
                "TestFlightMockUser username belongs to another user.");
        }

        var now = DateTime.UtcNow;
        if (user == null)
        {
            user = new User
            {
                Id = userId,
                CreatedAtUtc = now,
                Settings = new UserSettings
                {
                    UserId = userId
                }
            };
            db.Users.Add(user);
        }
        else if (user.Settings == null)
        {
            user.Settings = new UserSettings
            {
                UserId = user.Id
            };
        }

        user.Email = email.Trim();
        user.NormalizedEmail = normalizedEmail;
        user.Username = username.Trim();
        user.NormalizedUsername = normalizedUsername;
        user.AuthProvider = "password";
        user.IsAdmin = false;
        user.UpdatedAtUtc = now;

        if (string.IsNullOrWhiteSpace(user.PasswordHash) ||
            !PasswordHasher.Verify(password!, user.PasswordHash))
        {
            user.PasswordHash = PasswordHasher.Hash(password!);
            user.PasswordUpdatedAtUtc = now;
        }

        ApplySettings(user.Settings, now);

        await db.SaveChangesAsync(ct);
    }

    private static void ApplySettings(UserSettings settings, DateTime now)
    {
        settings.Age = 30;
        settings.Gender = "male";
        settings.Language = "nb";
        settings.HasCompletedRegistration = true;
        settings.HasDismissedRegistrationOnboarding = true;
        settings.CalorieGoal = 2500;
        settings.ProteinGoal = 180;
        settings.FatGoal = 70;
        settings.CarbGoal = 220;
        settings.WeightGoalKg = 84m;
        settings.WeightGoalTimeUtc = now.Date.AddDays(84).AddHours(12);
        settings.WeightDirection = WeightDirection.Maintain;
        settings.MuscleFilter = MuscleFilter.Advanced;
        settings.UpdatedUtc = now;
    }

    private static string ValueOrDefault(string? value, string fallback)
    {
        return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
    }

    private static void ValidatePassword(string? password)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length < 8)
        {
            throw new InvalidOperationException(
                "TestFlightMockUser password must be at least 8 characters.");
        }

        if (!password.Any(char.IsLetter) || !password.Any(char.IsDigit))
        {
            throw new InvalidOperationException(
                "TestFlightMockUser password must contain a letter and a digit.");
        }
    }
}
