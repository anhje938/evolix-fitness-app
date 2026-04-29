using backend.Data;
using backend.Features.Training.Exercises;
using backend.Features.Training.WorkoutSessions.Entities;
using Microsoft.EntityFrameworkCore;

namespace backend.Features.AdaptivePlanning
{
    public class TrainingAnalysisService
    {
        private readonly AppDbContext _db;

        public TrainingAnalysisService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<TrainingAnalysis> AnalyzeAsync(
            string userId,
            WeekWindow week,
            CancellationToken ct = default)
        {
            var sessions = await _db.WorkoutSessions
                .AsNoTracking()
                .Where(x => x.UserId == userId &&
                            x.FinishedAtUtc != null &&
                            x.StartedAtUtc < week.EndExclusiveUtc)
                .Include(x => x.ExerciseLogs)
                    .ThenInclude(x => x.Sets)
                .Include(x => x.ExerciseLogs)
                    .ThenInclude(x => x.Exercise)
                    .ThenInclude(x => x.ExerciseMuscles)
                .OrderBy(x => x.StartedAtUtc)
                .ToListAsync(ct);

            var weekSessions = sessions
                .Where(x => x.StartedAtUtc >= week.StartUtc && x.StartedAtUtc < week.EndExclusiveUtc)
                .ToList();

            var totalSets = weekSessions.SelectMany(x => x.ExerciseLogs).SelectMany(x => x.Sets).Count();
            var totalReps = weekSessions
                .SelectMany(x => x.ExerciseLogs)
                .SelectMany(x => x.Sets)
                .Where(x => x.Reps.HasValue)
                .Sum(x => x.Reps!.Value);
            var totalVolume = weekSessions
                .SelectMany(x => x.ExerciseLogs)
                .SelectMany(x => x.Sets)
                .Where(x => x.WeightKg.HasValue && x.Reps.HasValue)
                .Sum(x => x.WeightKg!.Value * x.Reps!.Value);

            var progress = BuildExerciseProgress(sessions, week);
            var muscleLoads = BuildMuscleLoads(weekSessions);
            var best = progress
                .Where(x => x.ProgressPercent > 1.5)
                .OrderByDescending(x => x.ProgressPercent)
                .FirstOrDefault();
            var confidence = weekSessions.Count >= 2
                ? DataQualityLevel.High
                : weekSessions.Count == 1
                    ? DataQualityLevel.Medium
                    : DataQualityLevel.Low;

            return new TrainingAnalysis
            {
                CompletedWorkouts = weekSessions.Count,
                TotalSets = totalSets,
                TotalReps = totalReps,
                TotalVolumeKg = Math.Round(totalVolume, 1),
                ExercisesImproved = progress.Count(x => x.ProgressPercent > 1.5),
                ExercisesMaintained = progress.Count(x => x.ProgressPercent >= -1.5 && x.ProgressPercent <= 1.5),
                ExercisesDecreased = progress.Count(x => x.ProgressPercent < -1.5),
                BestProgressExerciseId = best?.ExerciseId,
                BestProgressExerciseName = best?.ExerciseName ?? "",
                BestProgressText = best == null
                    ? "Ingen tydelig øvelsesprogresjon denne uken."
                    : $"{best.ExerciseName}: estimert 1RM {best.PreviousBestOneRmKg:0.#} → {best.CurrentBestOneRmKg:0.#} kg",
                SuggestedBestProgressWeightKg = best?.SuggestedNextWeightKg,
                MuscleLoads = muscleLoads,
                Confidence = confidence,
                Insight = BuildInsight(weekSessions.Count, progress)
            };
        }

        private static List<ExerciseProgress> BuildExerciseProgress(
            IReadOnlyList<WorkoutSession> sessions,
            WeekWindow week)
        {
            var byExercise = sessions
                .SelectMany(s => s.ExerciseLogs.Select(log => new
                {
                    Session = s,
                    Log = log,
                    Exercise = log.Exercise
                }))
                .GroupBy(x => x.Log.ExerciseId);

            var result = new List<ExerciseProgress>();

            foreach (var group in byExercise)
            {
                var currentSets = group
                    .Where(x => x.Session.StartedAtUtc >= week.StartUtc &&
                                x.Session.StartedAtUtc < week.EndExclusiveUtc)
                    .SelectMany(x => x.Log.Sets.Select(set => new { Set = set, x.Exercise }))
                    .ToList();
                if (currentSets.Count == 0) continue;

                var previousSets = group
                    .Where(x => x.Session.StartedAtUtc < week.StartUtc)
                    .SelectMany(x => x.Log.Sets.Select(set => new { Set = set, x.Exercise }))
                    .ToList();

                var currentBest = currentSets.Max(x => EstimateOneRm(x.Set.WeightKg, x.Set.Reps, x.Set.SetType));
                var previousBest = previousSets.Count == 0
                    ? 0
                    : previousSets.Max(x => EstimateOneRm(x.Set.WeightKg, x.Set.Reps, x.Set.SetType));
                if (currentBest <= 0) continue;

                var exercise = currentSets.First().Exercise;
                var progressPercent = previousBest > 0
                    ? (currentBest - previousBest) / previousBest * 100
                    : 0;
                var topWeight = currentSets
                    .Where(x => x.Set.WeightKg.HasValue)
                    .Max(x => x.Set.WeightKg ?? 0);
                var step = GetStepKg(exercise, topWeight);

                result.Add(new ExerciseProgress
                {
                    ExerciseId = group.Key,
                    ExerciseName = exercise.Name,
                    PreviousBestOneRmKg = previousBest,
                    CurrentBestOneRmKg = currentBest,
                    ProgressPercent = progressPercent,
                    SuggestedNextWeightKg = topWeight > 0
                        ? (decimal)Math.Round((topWeight + step) / step) * (decimal)step
                        : null
                });
            }

            return result;
        }

        private static Dictionary<string, MuscleLoad> BuildMuscleLoads(
            IReadOnlyList<WorkoutSession> sessions)
        {
            var loads = new Dictionary<string, MuscleLoad>(StringComparer.OrdinalIgnoreCase);

            foreach (var session in sessions)
            {
                foreach (var log in session.ExerciseLogs)
                {
                    var sets = log.Sets.Count;
                    if (sets == 0) continue;
                    var volume = log.Sets
                        .Where(x => x.WeightKg.HasValue && x.Reps.HasValue)
                        .Sum(x => x.WeightKg!.Value * x.Reps!.Value);

                    foreach (var muscle in GetMuscleContributions(log.Exercise))
                    {
                        if (!loads.TryGetValue(muscle.Muscle, out var load))
                        {
                            load = new MuscleLoad { Muscle = muscle.Muscle };
                            loads[muscle.Muscle] = load;
                        }

                        load.Sets += sets * muscle.Contribution;
                        load.VolumeKg += volume * (double)muscle.Contribution;
                        if (load.LastStimulusAtUtc == null || session.StartedAtUtc > load.LastStimulusAtUtc)
                            load.LastStimulusAtUtc = session.StartedAtUtc;
                    }
                }
            }

            return loads;
        }

        public static IReadOnlyList<(string Muscle, decimal Contribution)> GetMuscleContributions(Exercise exercise)
        {
            if (exercise.ExerciseMuscles.Count > 0)
            {
                return exercise.ExerciseMuscles
                    .OrderBy(x => x.Role)
                    .ThenByDescending(x => x.Contribution)
                    .Select(x => (x.Muscle, x.Contribution))
                    .ToList();
            }

            var groups = ParseMuscleGroups(exercise.SpecificMuscleGroups);
            if (groups.Count > 0)
            {
                return groups
                    .Select((muscle, index) => (muscle, index == 0 ? 1m : 0.5m))
                    .ToList();
            }

            return FallbackMuscles(exercise.Muscle)
                .Select((muscle, index) => (muscle, index == 0 ? 1m : 0.5m))
                .ToList();
        }

        private static List<string> ParseMuscleGroups(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return [];
            return value
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Where(x => x.Length > 0)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
        }

        private static List<string> FallbackMuscles(string? muscle)
        {
            return (muscle ?? "").Trim() switch
            {
                "Bryst" => ["Bryst", "Triceps", "Fremre skulder"],
                "Rygg" => ["Øvre rygg", "Lats", "Biceps"],
                "Bein" => ["Quadriceps", "Hamstrings", "Rumpe"],
                "Skuldre" => ["Fremre skulder", "Sideskulder", "Bakre skulder"],
                "Armer" => ["Biceps", "Triceps"],
                "Core" => ["Abs", "Obliques"],
                _ => []
            };
        }

        private static double EstimateOneRm(double? weightKg, int? reps, string? setType)
        {
            if (setType?.Contains("warm", StringComparison.OrdinalIgnoreCase) == true) return 0;
            if (!weightKg.HasValue || !reps.HasValue || weightKg.Value <= 0 || reps.Value <= 0) return 0;
            if (reps.Value > 15) return 0;
            return weightKg.Value * (1 + reps.Value / 30.0);
        }

        private static double GetStepKg(Exercise exercise, double topWeightKg)
        {
            if (exercise.DefaultProgressionStepKg.HasValue && exercise.DefaultProgressionStepKg.Value > 0)
                return (double)exercise.DefaultProgressionStepKg.Value;

            if (exercise.IsIsolation) return topWeightKg <= 20 ? 1 : 2;
            if ((exercise.Muscle ?? "").Equals("Bein", StringComparison.OrdinalIgnoreCase)) return 5;
            return topWeightKg <= 30 ? 1 : 2.5;
        }

        private static string BuildInsight(int completedWorkouts, IReadOnlyList<ExerciseProgress> progress)
        {
            if (completedWorkouts == 0) return "Ingen fullførte økter denne uken.";
            var improved = progress.Count(x => x.ProgressPercent > 1.5);
            if (improved > 0) return $"{completedWorkouts} økter fullført, og {improved} øvelser viste fremgang.";
            return $"{completedWorkouts} økter fullført. Prestasjonen var mest stabil denne uken.";
        }

        private sealed class ExerciseProgress
        {
            public Guid ExerciseId { get; set; }
            public string ExerciseName { get; set; } = "";
            public double PreviousBestOneRmKg { get; set; }
            public double CurrentBestOneRmKg { get; set; }
            public double ProgressPercent { get; set; }
            public decimal? SuggestedNextWeightKg { get; set; }
        }
    }
}
