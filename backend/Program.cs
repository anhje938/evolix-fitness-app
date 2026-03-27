using System.Text;
using backend.Auth;
using backend.Common;
using backend.Data;
using backend.Features.Auth;
using backend.Features.AuthAuth;
using backend.Features.Food;
using backend.Features.Training.Exercises;
using backend.Features.Training.WorkoutPrograms;
using backend.Features.Training.Workouts;
using backend.Features.Training.WorkoutSessions;
using backend.Features.Users;
using backend.Features.Weight;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

const string DeployMarker = "delete-logging-v1-2026-03-18";

var builder = WebApplication.CreateBuilder(args);

// DB
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"));
});

// Services
builder.Services.AddScoped<WeightService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<RefreshTokenService>();
builder.Services.AddScoped<FoodService>();
builder.Services.AddScoped<ExerciseService>();
builder.Services.AddScoped<WorkoutService>();
builder.Services.AddScoped<WorkoutProgramService>();
builder.Services.AddScoped<WorkoutSessionService>();

builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<BarcodeLookupService>();

// Forwarded headers
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
});

// Settings
builder.Services.Configure<JwtSettings>(
    builder.Configuration.GetSection("Jwt"));

builder.Services.Configure<RefreshTokenSettings>(
    builder.Configuration.GetSection("RefreshToken"));

builder.Services.Configure<AppleSettings>(
    builder.Configuration.GetSection("AppleSettings"));

builder.Services.AddSingleton<JwtService>();



if (builder.Environment.IsDevelopment())
{
    builder.Services.AddSingleton<IAppleTokenService, MockAppleTokenService>();
}
else
{
    builder.Services.AddSingleton<IAppleTokenService, AppleTokenService>();
}

// CORS
var corsOrigins = builder.Configuration
    .GetSection("Cors:Origins")
    .Get<string[]>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("EvolixCors", policy =>
    {
        policy
            .WithOrigins(corsOrigins ?? new[]
            {
                "http://localhost:19006",
                "http://localhost:3000",
                "http://localhost:5173"
            })
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Controllers / Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// JWT
var jwt = builder.Configuration.GetSection("Jwt").Get<JwtSettings>()
          ?? throw new InvalidOperationException("Jwt settings missing.");

if (string.IsNullOrWhiteSpace(jwt.SecretKey))
    throw new InvalidOperationException("Jwt:SecretKey missing.");

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

app.MapGet("/debug/env", (IHostEnvironment env) =>
{
    return new
    {
        EnvironmentName = env.EnvironmentName,
        IsDevelopment = env.IsDevelopment()
    };
});

app.MapGet("/debug/build", (IHostEnvironment env) =>
{
    var assembly = System.Reflection.Assembly.GetExecutingAssembly();
    return Results.Ok(new
    {
        deployMarker = DeployMarker,
        environment = env.EnvironmentName,
        assemblyVersion = assembly.GetName().Version?.ToString(),
        imageRuntimeVersion = assembly.ImageRuntimeVersion,
        utcNow = DateTime.UtcNow
    });
});

app.MapGet("/", () => "OK");        // root-test
app.MapGet("/health", () => "OK");  // health-test

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    Console.WriteLine("DEPLOY_MARKER=" + DeployMarker);
    Console.WriteLine("ENV=" + builder.Environment.EnvironmentName);
    Console.WriteLine("ConnStr=" + builder.Configuration.GetConnectionString("DefaultConnection"));
    db.Database.Migrate();
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
        await context.Response.WriteAsJsonAsync(new
        {
            error = message
        });
    });
});

app.UseAuthentication();
app.UseAuthorization();


app.MapControllers();

app.Run();
