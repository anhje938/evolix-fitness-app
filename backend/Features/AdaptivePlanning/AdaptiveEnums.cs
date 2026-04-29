namespace backend.Features.AdaptivePlanning
{
    public enum DataQualityLevel
    {
        Low = 0,
        Medium = 1,
        High = 2
    }

    public enum AdaptiveRecommendationType
    {
        HoldCalories = 0,
        ReduceCalories = 1,
        IncreaseCalories = 2,
        IncreaseProtein = 3,
        AdjustTargetDate = 4,
        NeedMoreData = 5,
        IncreaseLoad = 6,
        HoldLoadIncreaseReps = 7,
        ReduceLoad = 8,
        AddSet = 9,
        RemoveSet = 10,
        ChangeRepRange = 11,
        Deload = 12,
        PrioritizeMuscle = 13,
        RecoveryNextSession = 14
    }

    public enum AdaptiveRecommendationStatus
    {
        Pending = 0,
        Accepted = 1,
        Dismissed = 2,
        Expired = 3
    }

    public enum RecommendationConfidence
    {
        Low = 0,
        Medium = 1,
        High = 2
    }

    public enum AggressivenessLevel
    {
        Conservative = 0,
        Balanced = 1,
        Aggressive = 2
    }

    public enum ExerciseProgressionModel
    {
        DoubleProgression = 0,
        Linear = 1,
        Maintain = 2
    }
}
