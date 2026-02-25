using backend.Common;
using backend.Data;
using backend.Features.Training.Workouts;
using backend.Features.Training.WorkoutSessions.Entities;
using Microsoft.EntityFrameworkCore;

namespace backend.Features.Training.WorkoutSessions
{
    public class WorkoutSessionService
    {
        private readonly AppDbContext _db;

        public WorkoutSessionService(AppDbContext db)
        {
            _db = db;
        }

        // Creates a new workout session (quick or based on a workout template)
        public async Task<WorkoutSession> StartWorkoutSession(
            string userId,
            StartWorkoutSessionRequest req,
            CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(userId))
                throw new ArgumentException("UserId is required", nameof(userId));

            Workout? workout = null;
            Guid? workoutProgramId = null;

            // If WorkoutId is provided, load the workout and its program
            if (req.WorkoutId.HasValue)
            {
                workout = await _db.Workouts
                    .FirstOrDefaultAsync(w => w.Id == req.WorkoutId.Value, ct);

                if (workout == null)
                    throw new NotFoundException("Workout not found");

                workoutProgramId = workout.WorkoutProgramId;
            }

            var session = new WorkoutSession
            {
                UserId = userId,
                WorkoutId = workout?.Id,                 // null means quick/custom session
                WorkoutProgramId = workoutProgramId,     // null means no program

                StartedAtUtc = req.StartedAtUtc ?? DateTime.UtcNow,

                // If no title given, fall back to workout name when available
                Title = req.Title ?? workout?.Name,
                Notes = null,

                TotalSets = 0,
                TotalReps = 0,
                TotalVolume = null
            };

            await _db.WorkoutSessions.AddAsync(session, ct);
            await _db.SaveChangesAsync(ct);

            return session;
        }

        // Returns a single session for the user
        public async Task<WorkoutSession> GetSessionByIdAsync(
            string userId,
            Guid sessionId,
            CancellationToken ct = default)
        {
            var session = await _db.WorkoutSessions
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId, ct);

            if (session == null)
                throw new NotFoundException("Workout session not found");

            return session;
        }

        public async Task<WorkoutSession> GetSessionDetailsByIdAsync(
    string userId,
    Guid sessionId,
    CancellationToken ct = default)
        {
            var session = await _db.WorkoutSessions
                .Include(s => s.ExerciseLogs)
                    .ThenInclude(l => l.Exercise)
                .Include(s => s.ExerciseLogs)
                    .ThenInclude(l => l.Sets)
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId, ct);

            if (session == null)
                throw new NotFoundException("Workout session not found");

            return session;
        }


        // Adds a set to a workout session. Creates an exercise log if needed.
        public async Task<SetLog> AddSetAsync(
            string userId,
            Guid sessionId,
            AddSetRequest req,
            CancellationToken ct = default)
        {
            // Hent session (tracking) + logs + sets
            var session = await _db.WorkoutSessions
                .Include(s => s.ExerciseLogs)
                    .ThenInclude(l => l.Sets)
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId, ct);

            if (session == null)
                throw new NotFoundException("Workout session not found");

            // Finn eksisterende log
            var exerciseLog = session.ExerciseLogs.FirstOrDefault(x => x.ExerciseId == req.ExerciseId);

            if (exerciseLog == null)
            {
                // ✅ FK-first: sett alltid WorkoutSessionId eksplisitt
                exerciseLog = new WorkoutExerciseLog
                {
                    WorkoutSessionId = session.Id,
                    ExerciseId = req.ExerciseId,
                    Order = session.ExerciseLogs.Count + 1,
                    Notes = null
                };

                // Legg til i context + navigation collection
                _db.WorkoutExerciseLogs.Add(exerciseLog);
                session.ExerciseLogs.Add(exerciseLog);
            }

            // Neste settnummer
            var nextSetNumber = req.SetNumber;
            if (!nextSetNumber.HasValue)
            {
                var existingMax = exerciseLog.Sets.Any()
                    ? exerciseLog.Sets.Max(s => s.SetNumber)
                    : 0;
                nextSetNumber = existingMax + 1;
            }

            // ✅ FK-first: sett alltid WorkoutExerciseLogId eksplisitt
            var set = new SetLog
            {
                WorkoutExerciseLogId = exerciseLog.Id, // OBS: hvis ny log, får den Id når EF genererer (se under)
                SetNumber = nextSetNumber.Value,
                WeightKg = req.WeightKg,
                Reps = req.Reps,
                Rir = req.Rir,
                DistanceMeters = req.DistanceMeters,
                Duration = req.Duration,
                SetType = req.SetType,
                Notes = req.Notes
            };

            // Hvis exerciseLog er ny og ikke har Id enda, må vi la EF fikse det.
            // Løsning: knytt via navigation, og la FK bli satt av EF.
            // Vi setter derfor også navigasjonen:
            set.WorkoutExerciseLog = exerciseLog;

            _db.SetLogs.Add(set);
            exerciseLog.Sets.Add(set);

            // Recalculate totals
            RecalculateSessionTotals(session);

            await _db.SaveChangesAsync(ct);

            return set;
        }


        // Marks a session as finished and refreshes totals
        public async Task FinishSessionAsync(
            string userId,
            Guid sessionId,
            CancellationToken ct = default)
        {
            var session = await _db.WorkoutSessions
                .Include(s => s.ExerciseLogs)
                    .ThenInclude(l => l.Sets)
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId, ct);

            if (session == null)
                throw new NotFoundException("Workout session not found");

            if (session.FinishedAtUtc == null)
            {
                session.FinishedAtUtc = DateTime.UtcNow;
            }

            // Make sure totals are up to date
            RecalculateSessionTotals(session);

            await _db.SaveChangesAsync(ct);
        }

        // Returns all sessions for a user, newest first
        public async Task<List<WorkoutSession>> GetUserSessionsAsync(
            string userId,
            CancellationToken ct = default)
        {
            return await _db.WorkoutSessions
                .Where(s => s.UserId == userId)
                .OrderByDescending(s => s.StartedAtUtc)
                .ToListAsync(ct);
        }

        // Recalculates totals for a session based on its sets
        private static void RecalculateSessionTotals(WorkoutSession session)
        {
            var allSets = session.ExerciseLogs
                .SelectMany(l => l.Sets)
                .ToList();

            session.TotalSets = allSets.Count;

            session.TotalReps = allSets
                .Where(s => s.Reps.HasValue)
                .Sum(s => s.Reps!.Value);

            var totalVolume = allSets
                .Where(s => s.WeightKg.HasValue && s.Reps.HasValue)
                .Sum(s => s.WeightKg!.Value * s.Reps!.Value);

            session.TotalVolume = allSets.Count == 0 ? null : totalVolume;
        }

        public async Task<List<ExerciseHistoryPointResponse>> GetExerciseHistoryAsync(
    string userId,
    Guid exerciseId,
    CancellationToken ct = default)
        {
            // Hent alle ferdig-markerte sessions for bruker
            var sessions = await _db.WorkoutSessions
                .Where(s => s.UserId == userId && s.FinishedAtUtc != null)
                .Include(s => s.ExerciseLogs.Where(l => l.ExerciseId == exerciseId))
                    .ThenInclude(l => l.Sets)
                .OrderBy(s => s.StartedAtUtc)
                .ToListAsync(ct);

            var result = new List<ExerciseHistoryPointResponse>();

            foreach (var session in sessions)
            {
                var logs = session.ExerciseLogs
                    .Where(l => l.ExerciseId == exerciseId)
                    .ToList();

                if (!logs.Any())
                    continue;

                var allSets = logs.SelectMany(l => l.Sets).ToList();
                if (!allSets.Any())
                    continue;

                var topWeight = allSets
                    .Where(s => s.WeightKg.HasValue)
                    .Select(s => s.WeightKg.Value)
                    .DefaultIfEmpty()
                    .Max();

                var totalSets = allSets.Count;

                var totalVolume = allSets
                    .Where(s => s.WeightKg.HasValue && s.Reps.HasValue)
                    .Select(s => s.WeightKg!.Value * s.Reps!.Value)
                    .DefaultIfEmpty()
                    .Sum();

                result.Add(new ExerciseHistoryPointResponse
                {
                    ExerciseId = exerciseId,
                    PerformedAtUtc = session.StartedAtUtc,
                    TopSetWeightKg = topWeight > 0 ? topWeight : (double?)null,
                    TotalSets = totalSets,
                    TotalVolumeKg = totalVolume > 0 ? totalVolume : (double?)null
                });
            }

            return result;
        }

        public async Task<List<ExerciseSessionSetsResponse>> GetExerciseSetsHistoryAsync(
            string userId,
            Guid exerciseId,
            CancellationToken ct = default)
        {
            var sessions = await _db.WorkoutSessions
                .Where(s => s.UserId == userId && s.FinishedAtUtc != null)
                .Include(s => s.ExerciseLogs.Where(l => l.ExerciseId == exerciseId))
                    .ThenInclude(l => l.Sets)
                .OrderByDescending(s => s.StartedAtUtc)
                .ToListAsync(ct);

            var result = new List<ExerciseSessionSetsResponse>();

            foreach (var session in sessions)
            {
                var logs = session.ExerciseLogs
                    .Where(l => l.ExerciseId == exerciseId)
                    .ToList();

                if (logs.Count == 0) continue;

                // Flatten all sets for this exercise in this session
                var setItems = logs
                    .SelectMany(l => l.Sets.Select(set => new ExerciseSessionSetItemResponse
                    {
                        SetId = set.Id,
                        WorkoutExerciseLogId = l.Id,
                        SetNumber = set.SetNumber,
                        WeightKg = set.WeightKg,
                        Reps = set.Reps,
                        Rir = set.Rir,
                        SetType = set.SetType,
                        Notes = set.Notes
                    }))
                    // If there are multiple logs, stabilize ordering:
                    .OrderBy(x => x.WorkoutExerciseLogId)
                    .ThenBy(x => x.SetNumber)
                    .ToList();

                if (setItems.Count == 0) continue;

                var totalReps = setItems.Where(s => s.Reps.HasValue).Sum(s => s.Reps!.Value);

                var totalVolume = setItems
                    .Where(s => s.WeightKg.HasValue && s.Reps.HasValue)
                    .Sum(s => s.WeightKg!.Value * s.Reps!.Value);

                result.Add(new ExerciseSessionSetsResponse
                {
                    SessionId = session.Id,
                    ExerciseId = exerciseId,
                    PerformedAtUtc = session.StartedAtUtc,
                    Sets = setItems,
                    TotalSets = setItems.Count,
                    TotalReps = totalReps,
                    TotalVolumeKg = setItems.Count == 0 ? null : (totalVolume > 0 ? totalVolume : (double?)null)
                });
            }

            return result;
        }

        // Returns completed sessions for a user, newest finished first
        public async Task<List<WorkoutSessionResponse>> GetCompletedSessionsAsync(
            string userId,
            CancellationToken ct = default)
        {
            return await _db.WorkoutSessions
                .AsNoTracking()
                .Where(s => s.UserId == userId && s.FinishedAtUtc != null)
                .OrderByDescending(s => s.FinishedAtUtc)
                .Select(s => new WorkoutSessionResponse
                {
                    Id = s.Id,
                    UserId = s.UserId,
                    WorkoutId = s.WorkoutId,
                    WorkoutProgramId = s.WorkoutProgramId,
                    Title = s.Title,
                    Notes = s.Notes,
                    StartedAtUtc = s.StartedAtUtc,
                    FinishedAtUtc = s.FinishedAtUtc,
                    TotalSets = s.TotalSets,
                    TotalReps = s.TotalReps,
                    TotalVolume = s.TotalVolume,

                    ExercisesCount = s.ExerciseLogs.Count(),

                    // ✅ Robust: hent muskelgrupper via logs-tabellen, og krev at loggen faktisk har sets
                    MuscleGroups = _db.WorkoutExerciseLogs
                        .AsNoTracking()
                        .Where(l => l.WorkoutSessionId == s.Id)
                        .Where(l => l.Sets.Any()) // viktig: teller bare øvelser som faktisk ble trent (har sett)
                        .Select(l => l.Exercise.Muscle)
                        .Where(m => m != null && m != "")
                        .Select(m => m!)
                        .Distinct()
                        .ToList()
                })
                .ToListAsync(ct);
        }




        public async Task<List<string>> GetSessionMuscleGroupsAsync(
            string userId,
            Guid sessionId,
            CancellationToken ct = default)
                {
                    // Henter unike muskelgrupper fra øvelser som er logget i økten
                    // Filtrerer bort null/tom
                    var muscles = await _db.WorkoutExerciseLogs
                        .AsNoTracking()
                        .Where(l => l.WorkoutSessionId == sessionId && l.WorkoutSession.UserId == userId)
                        .Select(l => l.Exercise.Muscle)
                        .Where(m => m != null && m != "")
                        .Distinct()
                        .ToListAsync(ct);

                    // Normaliser (trim + fjern whitespace-duplikater)
                    return muscles
                        .Select(m => m!.Trim())
                        .Where(m => m.Length > 0)
                        .Distinct(StringComparer.OrdinalIgnoreCase)
                        .ToList();
                }


        public async Task DeleteSessionAsync(string userId, Guid sessionId, CancellationToken ct = default)
        {
            var session = await _db.WorkoutSessions
                .Include(s => s.ExerciseLogs)
                    .ThenInclude(l => l.Sets)
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId, ct);

            if (session == null)
                throw new NotFoundException("Workout session not found");

            _db.WorkoutSessions.Remove(session);
            await _db.SaveChangesAsync(ct);
        }





    }
}
