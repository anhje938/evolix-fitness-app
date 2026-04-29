namespace backend.Features.AdaptivePlanning
{
    public class RecoveryAnalysisService
    {
        public RecoveryAnalysis Analyze(TrainingAnalysis training)
        {
            if (training.MuscleLoads.Count == 0)
            {
                return new RecoveryAnalysis
                {
                    ReadyMusclesText = "Ingen data",
                    RestMusclesText = "Ingen data",
                    RecommendedNextSession = "Logg en økt",
                    IntensityRecommendation = "Rolig",
                    Confidence = DataQualityLevel.Low,
                    Insight = "EvoliX trenger treningsdata før recovery kan vurderes."
                };
            }

            var now = DateTime.UtcNow;
            var scored = training.MuscleLoads.Values
                .Select(load =>
                {
                    var hours = load.LastStimulusAtUtc.HasValue
                        ? Math.Max(0, (now - load.LastStimulusAtUtc.Value).TotalHours)
                        : 999;
                    var recoveryHours = GetRecoveryHours(load.Muscle);
                    var recovery = Math.Clamp(hours / recoveryHours, 0, 1);
                    return new { load.Muscle, Recovery = recovery, load.Sets };
                })
                .OrderByDescending(x => x.Recovery)
                .ToList();

            var ready = scored.Where(x => x.Recovery >= 0.8).Take(4).Select(x => x.Muscle).ToList();
            var rest = scored.Where(x => x.Recovery < 0.55).OrderBy(x => x.Recovery).Take(4).Select(x => x.Muscle).ToList();
            var next = RecommendSession(ready);
            var intensity = rest.Count >= 3 ? "Moderat" : "Moderat/tung";

            return new RecoveryAnalysis
            {
                ReadyMusclesText = ready.Count > 0 ? string.Join(", ", ready) : "Ingen tydelig klare muskler",
                RestMusclesText = rest.Count > 0 ? string.Join(", ", rest) : "Ingen tydelige begrensninger",
                RecommendedNextSession = next,
                IntensityRecommendation = intensity,
                Confidence = training.Confidence,
                Insight = rest.Count > 0
                    ? $"{next} passer best nå, men hold igjen på {string.Join(", ", rest.Take(2))}."
                    : $"{next} passer best ut fra musklene som ser mest klare ut."
            };
        }

        private static double GetRecoveryHours(string muscle)
        {
            return muscle switch
            {
                "Quadriceps" or "Hamstrings" or "Rumpe" or "Nedre rygg" => 96,
                "Øvre rygg" or "Lats" or "Traps" => 72,
                "Fremre skulder" or "Sideskulder" or "Bakre skulder" or "Biceps" or "Triceps" => 60,
                _ => 48
            };
        }

        private static string RecommendSession(IReadOnlyCollection<string> ready)
        {
            if (ready.Any(x => x is "Øvre rygg" or "Lats" or "Biceps")) return "Pull";
            if (ready.Any(x => x is "Quadriceps" or "Hamstrings" or "Rumpe")) return "Bein";
            if (ready.Any(x => x is "Bryst" or "Fremre skulder" or "Triceps")) return "Push";
            return "Rolig helkropp";
        }
    }
}
