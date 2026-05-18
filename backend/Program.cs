using System.Text;
using backend.Auth;
using backend.Common;
using backend.Data;
using backend.Features.AdaptivePlanning;
using backend.Features.Auth;
using backend.Features.AuthAuth;
using backend.Features.CutIntelligence;
using backend.Features.Food;
using backend.Features.Monitoring;
using backend.Features.Subscriptions;
using backend.Features.Training.Exercises;
using backend.Features.Training.WorkoutPrograms;
using backend.Features.Training.WorkoutSessions;
using backend.Features.Training.Workouts;
using backend.Features.Users;
using backend.Features.Weight;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 1_048_576;
});

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection"));
});

builder.Services.AddScoped<WeightService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<RefreshTokenService>();
builder.Services.AddScoped<FoodService>();
builder.Services.AddScoped<ExerciseService>();
builder.Services.AddScoped<WorkoutService>();
builder.Services.AddScoped<WorkoutProgramService>();
builder.Services.AddScoped<WorkoutSessionService>();
builder.Services.AddScoped<WeightTrendService>();
builder.Services.AddScoped<NutritionAnalysisService>();
builder.Services.AddScoped<TrainingAnalysisService>();
builder.Services.AddScoped<RecoveryAnalysisService>();
builder.Services.AddScoped<WeeklyReportService>();
builder.Services.AddScoped<RecommendationService>();
builder.Services.AddScoped<AdaptivePlanService>();
builder.Services.AddScoped<CutIntelligenceService>();
builder.Services.AddHttpClient<RevenueCatSubscriptionService>();

builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<BarcodeLookupService>();

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.Configure<JwtSettings>(
    builder.Configuration.GetSection("Jwt"));

builder.Services.Configure<RefreshTokenSettings>(
    builder.Configuration.GetSection("RefreshToken"));

builder.Services.Configure<AppleSettings>(
    builder.Configuration.GetSection("AppleSettings"));

builder.Services.Configure<RevenueCatOptions>(
    builder.Configuration.GetSection("RevenueCat"));

builder.Services.Configure<MonitoringOptions>(
    builder.Configuration.GetSection("Monitoring"));

builder.Services.AddSingleton<JwtService>();
builder.Services.AddHttpClient<MonitoringAlertService>();

if (builder.Environment.IsDevelopment())
{
    builder.Services.AddSingleton<IAppleTokenService, MockAppleTokenService>();
}
else
{
    builder.Services.AddSingleton<IAppleTokenService, AppleTokenService>();
}

var corsOrigins = builder.Configuration
    .GetSection("Cors:Origins")
    .Get<string[]>();

if (corsOrigins is not null)
{
    corsOrigins = corsOrigins
        .Where(origin => !string.IsNullOrWhiteSpace(origin))
        .Select(origin => origin.Trim())
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();
}

if (builder.Environment.IsDevelopment())
{
    if (corsOrigins is null || corsOrigins.Length == 0)
    {
        corsOrigins =
        [
            "http://localhost:19006",
            "http://localhost:3000",
            "http://localhost:5173"
        ];
    }
}

if (corsOrigins is null || corsOrigins.Length == 0)
{
    throw new InvalidOperationException(
        "Cors:Origins must be configured for this environment.");
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("EvolixCors", policy =>
    {
        policy
            .WithOrigins(corsOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var jwt = builder.Configuration.GetSection("Jwt").Get<JwtSettings>()
          ?? throw new InvalidOperationException("Jwt settings missing.");

ValidateJwtSettings(jwt, builder.Environment);
var keyBytes = Encoding.UTF8.GetBytes(jwt.SecretKey);

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
            ValidateLifetime = true
        };
    });

var app = builder.Build();

app.UseForwardedHeaders();

app.MapGet("/", () => "OK");
app.MapGet("/health", () => "OK");
app.MapGet("/health/db", async (
    AppDbContext db,
    MonitoringAlertService monitoring,
    HttpContext context,
    CancellationToken ct) =>
{
    try
    {
        if (await db.Database.CanConnectAsync(ct))
        {
            return Results.Ok(new { status = "OK" });
        }

        await monitoring.AlertAsync(
            MonitoringAreas.Database,
            "health_check_unhealthy",
            "Database health check could not connect.",
            LogLevel.Error,
            context.TraceIdentifier,
            ct: ct);
        return Results.Problem("Database connection failed.", statusCode: 503);
    }
    catch (Exception ex)
    {
        await monitoring.AlertAsync(
            MonitoringAreas.Database,
            "health_check_failed",
            "Database health check failed.",
            LogLevel.Error,
            context.TraceIdentifier,
            exception: ex,
            ct: ct);
        return Results.Problem("Database connection failed.", statusCode: 503);
    }
});

try
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}
catch (Exception ex)
{
    var monitoring = app.Services.GetRequiredService<MonitoringAlertService>();
    await monitoring.AlertAsync(
        MonitoringAreas.Database,
        "migration_failed",
        "Database migration failed during startup.",
        LogLevel.Critical,
        exception: ex);
    throw;
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("EvolixCors");
app.UseStaticFiles();

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var exceptionHandlerPathFeature =
            context.Features.Get<IExceptionHandlerPathFeature>();

        var logger = context.RequestServices
            .GetRequiredService<ILogger<Program>>();

        if (exceptionHandlerPathFeature?.Error != null)
        {
            logger.LogError(
                exceptionHandlerPathFeature.Error,
                "Unhandled exception occurred."
            );
        }

        var error = exceptionHandlerPathFeature?.Error;
        var (statusCode, message) = error switch
        {
            NotFoundException notFound => (StatusCodes.Status404NotFound, notFound.Message),
            ForbiddenException forbidden => (StatusCodes.Status403Forbidden, forbidden.Message),
            ArgumentException argument => (StatusCodes.Status400BadRequest, argument.Message),
            _ => (StatusCodes.Status500InternalServerError, "Internal server error")
        };

        context.Response.StatusCode = statusCode;
        if (statusCode >= StatusCodes.Status500InternalServerError && error != null)
        {
            var monitoring = context.RequestServices
                .GetRequiredService<MonitoringAlertService>();
            await monitoring.AlertAsync(
                MonitoringAreas.Api,
                "unhandled_exception",
                "Unhandled API exception.",
                LogLevel.Error,
                context.TraceIdentifier,
                new Dictionary<string, string?>
                {
                    ["path"] = context.Request.Path,
                    ["method"] = context.Request.Method,
                    ["statusCode"] = statusCode.ToString()
                },
                error,
                context.RequestAborted);
            context.Items["MonitoringAlertSent"] = true;
        }

        await context.Response.WriteAsJsonAsync(new
        {
            error = message
        });
    });
});

app.Use(async (context, next) =>
{
    var started = System.Diagnostics.Stopwatch.StartNew();
    await next();
    started.Stop();

    var monitoringOptions = context.RequestServices
        .GetRequiredService<Microsoft.Extensions.Options.IOptions<MonitoringOptions>>()
        .Value;

    var alertAlreadySent = context.Items.ContainsKey("MonitoringAlertSent");

    if (context.Response.StatusCode >= StatusCodes.Status500InternalServerError &&
        !alertAlreadySent)
    {
        var monitoring = context.RequestServices
            .GetRequiredService<MonitoringAlertService>();
        await monitoring.AlertAsync(
            MonitoringAreas.Api,
            "http_5xx",
            "API returned a server error.",
            LogLevel.Error,
            context.TraceIdentifier,
            new Dictionary<string, string?>
            {
                ["path"] = context.Request.Path,
                ["method"] = context.Request.Method,
                ["statusCode"] = context.Response.StatusCode.ToString(),
                ["elapsedMs"] = started.ElapsedMilliseconds.ToString()
            },
            ct: context.RequestAborted);
    }
    else if (started.ElapsedMilliseconds >= monitoringOptions.SlowRequestThresholdMs)
    {
        var monitoring = context.RequestServices
            .GetRequiredService<MonitoringAlertService>();
        await monitoring.AlertAsync(
            MonitoringAreas.Api,
            "slow_request",
            "API request exceeded the configured slow request threshold.",
            LogLevel.Warning,
            context.TraceIdentifier,
            new Dictionary<string, string?>
            {
                ["path"] = context.Request.Path,
                ["method"] = context.Request.Method,
                ["elapsedMs"] = started.ElapsedMilliseconds.ToString()
            },
            ct: context.RequestAborted);
    }
});

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

static void ValidateJwtSettings(
    JwtSettings jwt,
    IWebHostEnvironment environment)
{
    if (string.IsNullOrWhiteSpace(jwt.SecretKey))
    {
        throw new InvalidOperationException("Jwt:SecretKey missing.");
    }

    if (!environment.IsProduction())
    {
        return;
    }

    if (string.IsNullOrWhiteSpace(jwt.Issuer))
    {
        throw new InvalidOperationException(
            "Jwt:Issuer must be configured in production.");
    }

    if (string.IsNullOrWhiteSpace(jwt.Audience))
    {
        throw new InvalidOperationException(
            "Jwt:Audience must be configured in production.");
    }

    if (Encoding.UTF8.GetByteCount(jwt.SecretKey) < 32)
    {
        throw new InvalidOperationException(
            "Jwt:SecretKey must be at least 32 bytes in production.");
    }
}
