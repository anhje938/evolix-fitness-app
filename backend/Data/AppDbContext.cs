using backend.Features.Food;
using backend.Features.Training.Exercises;
using backend.Features.Training.WorkoutPrograms;
using backend.Features.Training.Workouts;
using backend.Features.Training.WorkoutSessions.Entities;
using backend.Features.Users;
using backend.Features.Weight;
using Microsoft.EntityFrameworkCore;

namespace backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        // ======================
        // DbSets
        // ======================

        public DbSet<WeightLog> WeightLogs => Set<WeightLog>();
        public DbSet<User> Users => Set<User>();
        public DbSet<FoodLog> FoodLogs => Set<FoodLog>();
        public DbSet<backend.Features.Auth.RefreshToken> RefreshTokens => Set<backend.Features.Auth.RefreshToken>();
        public DbSet<ComposedMeal> ComposedMeals => Set<ComposedMeal>();
        public DbSet<ComposedMealIngredient> ComposedMealIngredients => Set<ComposedMealIngredient>();
        public DbSet<Workout> Workouts => Set<Workout>();
        public DbSet<WorkoutExercise> WorkoutExercises => Set<WorkoutExercise>();
        public DbSet<WorkoutProgram> WorkoutPrograms => Set<WorkoutProgram>();
        public DbSet<Exercise> Exercises => Set<Exercise>();
        public DbSet<UserSettings> UserSettings => Set<UserSettings>();


        // Logging
        public DbSet<WorkoutSession> WorkoutSessions => Set<WorkoutSession>();
        public DbSet<WorkoutExerciseLog> WorkoutExerciseLogs => Set<WorkoutExerciseLog>();
        public DbSet<SetLog> SetLogs => Set<SetLog>();


        // ======================
        // Model configuration
        // ======================

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Program 1 - * Workouts
            modelBuilder.Entity<Workout>()
                .HasOne(w => w.WorkoutProgram)
                .WithMany(p => p.Workouts)
                .HasForeignKey(w => w.WorkoutProgramId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<WorkoutExercise>(b =>
            {
                b.HasKey(x => new { x.WorkoutId, x.ExerciseId });

                b.HasIndex(x => new { x.WorkoutId, x.Order });

                b.HasOne(x => x.Workout)
                    .WithMany(w => w.WorkoutExercises)
                    .HasForeignKey(x => x.WorkoutId)
                    .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(x => x.Exercise)
                    .WithMany(e => e.WorkoutExercises)
                    .HasForeignKey(x => x.ExerciseId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // ==============================
            // Logging-relasjoner
            // ==============================

            // WorkoutSession
            modelBuilder.Entity<WorkoutSession>(b =>
            {
                b.HasKey(x => x.Id);
                b.Property(x => x.UserId).IsRequired().HasMaxLength(450);
                b.Property(x => x.ClientRequestId).HasMaxLength(100);
                b.Property(x => x.SubmissionHash).HasMaxLength(64);
                b.HasIndex(x => new { x.UserId, x.ClientRequestId })
                    .IsUnique()
                    .HasFilter("[ClientRequestId] IS NOT NULL");
                b.HasIndex(x => new { x.UserId, x.SubmissionHash })
                    .IsUnique()
                    .HasFilter("[SubmissionHash] IS NOT NULL");

                // Session 1 - * ExerciseLogs
                b.HasMany(x => x.ExerciseLogs)
                    .WithOne(x => x.WorkoutSession)
                    .HasForeignKey(x => x.WorkoutSessionId)
                    .OnDelete(DeleteBehavior.Cascade);

                // Session (many) -> WorkoutProgram (optional)
                // Viktig: Restrict for å unngå multiple cascade paths
                b.HasOne(ws => ws.WorkoutProgram)
                    .WithMany()
                    .HasForeignKey(ws => ws.WorkoutProgramId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Session (many) -> Workout (optional)
                // Også Restrict
                b.HasOne(ws => ws.Workout)
                    .WithMany()
                    .HasForeignKey(ws => ws.WorkoutId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // WorkoutExerciseLog
            modelBuilder.Entity<WorkoutExerciseLog>(b =>
            {
                b.HasKey(x => x.Id);

                // ExerciseLog 1 - * Sets
                b.HasMany(x => x.Sets)
                    .WithOne(x => x.WorkoutExerciseLog)
                    .HasForeignKey(x => x.WorkoutExerciseLogId)
                    .OnDelete(DeleteBehavior.Cascade);

                // ExerciseLog (many) -> Exercise
                b.HasOne(x => x.Exercise)
                    .WithMany()
                    .HasForeignKey(x => x.ExerciseId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // SetLog
            modelBuilder.Entity<SetLog>(b =>
            {
                b.HasKey(x => x.Id);
            });

            // ==============================
            // Food
            // ==============================
            modelBuilder.Entity<FoodLog>(b =>
            {
                b.HasKey(x => x.Id);

                b.Property(x => x.SourceType).HasMaxLength(50);
                b.Property(x => x.SourceServings).HasPrecision(10, 2);

                b.HasIndex(x => x.UserId);
                b.HasIndex(x => new { x.UserId, x.TimestampUtc });
                b.HasIndex(x => new { x.UserId, x.SourceComposedMealId });
            });

            modelBuilder.Entity<ComposedMeal>(b =>
            {
                b.HasKey(x => x.Id);
                b.Property(x => x.Name).IsRequired().HasMaxLength(120);
                b.HasIndex(x => x.UserId);
                b.HasIndex(x => new { x.UserId, x.IsFavorite });
                b.HasIndex(x => new { x.UserId, x.UpdatedUtc });

                b.HasMany(x => x.Ingredients)
                    .WithOne(i => i.ComposedMeal)
                    .HasForeignKey(i => i.ComposedMealId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<ComposedMealIngredient>(b =>
            {
                b.HasKey(x => x.Id);
                b.Property(x => x.Name).IsRequired().HasMaxLength(120);
                b.Property(x => x.AmountGrams).HasPrecision(10, 2);
                b.HasIndex(x => new { x.ComposedMealId, x.SortOrder });
            });

            modelBuilder.Entity<backend.Features.Auth.RefreshToken>(b =>
            {
                b.HasKey(x => x.Id);
                b.Property(x => x.TokenHash).IsRequired().HasMaxLength(128);
                b.Property(x => x.UserId).IsRequired().HasMaxLength(450);
                b.Property(x => x.CreatedByIp).HasMaxLength(64);
                b.Property(x => x.CreatedByUserAgent).HasMaxLength(512);
                b.Property(x => x.LastUsedByIp).HasMaxLength(64);
                b.Property(x => x.LastUsedByUserAgent).HasMaxLength(512);
                b.Property(x => x.RevokedReason).HasMaxLength(200);

                b.HasIndex(x => x.TokenHash).IsUnique();
                b.HasIndex(x => x.UserId);
                b.HasIndex(x => new { x.UserId, x.RevokedAtUtc });
                b.HasIndex(x => new { x.SessionFamilyId, x.RevokedAtUtc });

                b.HasOne(x => x.User)
                    .WithMany(x => x.RefreshTokens)
                    .HasForeignKey(x => x.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // ==============================
            // User 1 - 1 UserSettings
            // ==============================
            modelBuilder.Entity<UserSettings>(b =>
            {
                b.HasKey(x => x.Id);

                b.HasIndex(x => x.UserId).IsUnique();

                b.Property(x => x.HomeProgressCirclesJson).IsRequired();
                b.Property(x => x.HomeSectionOrderJson).IsRequired();
                b.Property(x => x.RecoveryMapHiddenMusclesJson).IsRequired();
                b.Property(x => x.FoodCoachExcludedDateKeysJson)
                    .IsRequired()
                    .HasDefaultValue("[]");
                b.Property(x => x.WeightGoalKg).HasPrecision(18, 2);
                b.Property(x => x.WeightGoalTimeUtc)
                    .HasColumnType("datetime2")
                    .HasDefaultValueSql("DATEADD(hour, 12, CAST(CAST(DATEADD(day, 84, GETUTCDATE()) AS date) AS datetime2))");
                b.Property(x => x.UseFoodCoach).HasDefaultValue(true);
                b.Property(x => x.UseWorkoutCoach).HasDefaultValue(true);

                b.HasOne(x => x.User)
                    .WithOne(u => u.Settings)
                    .HasForeignKey<UserSettings>(x => x.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

        }
    }
}
