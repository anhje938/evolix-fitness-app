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
        public DbSet<Workout> Workouts => Set<Workout>();
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

            // Workout * - * Exercises 
            modelBuilder.Entity<Workout>()
                .HasMany(w => w.Exercises)
                .WithMany(e => e.Workouts);

            // ==============================
            // Logging-relasjoner
            // ==============================

            // WorkoutSession
            modelBuilder.Entity<WorkoutSession>(b =>
            {
                b.HasKey(x => x.Id);

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
            // User 1 - 1 UserSettings
            // ==============================
            modelBuilder.Entity<UserSettings>(b =>
            {
                b.HasKey(x => x.Id);

                b.HasIndex(x => x.UserId).IsUnique();

                b.Property(x => x.HomeProgressCirclesJson).IsRequired();

                b.HasOne(x => x.User)
                    .WithOne(u => u.Settings)
                    .HasForeignKey<UserSettings>(x => x.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

        }
    }
}
