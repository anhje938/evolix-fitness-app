namespace backend.Features.AdaptivePlanning
{
    internal static class AdaptivePlanningClock
    {
        private static readonly TimeZoneInfo PlanTimeZone = ResolveTimeZone();
        private static readonly AsyncLocal<DateOnly?> TodayOverride = new();

        public static DateOnly Today()
        {
            if (TodayOverride.Value.HasValue)
            {
                return TodayOverride.Value.Value;
            }

            return ToLocalDate(DateTime.UtcNow);
        }

        public static DateTime NowUtc()
        {
            if (!TodayOverride.Value.HasValue)
            {
                return DateTime.UtcNow;
            }

            var localNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, PlanTimeZone);
            return ToUtc(TodayOverride.Value.Value, TimeOnly.FromDateTime(localNow));
        }

        public static IDisposable BeginTodayOverride(DateOnly? today)
        {
            var previous = TodayOverride.Value;
            TodayOverride.Value = today;
            return new TodayOverrideScope(previous);
        }

        public static DateOnly ToLocalDate(DateTime utc)
        {
            var normalizedUtc = utc.Kind == DateTimeKind.Utc
                ? utc
                : DateTime.SpecifyKind(utc, DateTimeKind.Utc);
            return DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(normalizedUtc, PlanTimeZone));
        }

        public static DateTime StartOfDayUtc(DateOnly localDate)
        {
            return TimeZoneInfo.ConvertTimeToUtc(localDate.ToDateTime(TimeOnly.MinValue), PlanTimeZone);
        }

        public static DateTime EndExclusiveUtc(DateOnly localDate)
        {
            return StartOfDayUtc(localDate.AddDays(1));
        }

        public static DateTime ToUtc(DateOnly localDate, TimeOnly localTime)
        {
            return TimeZoneInfo.ConvertTimeToUtc(localDate.ToDateTime(localTime), PlanTimeZone);
        }

        private static TimeZoneInfo ResolveTimeZone()
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById("Europe/Oslo");
            }
            catch (TimeZoneNotFoundException)
            {
                return TimeZoneInfo.FindSystemTimeZoneById("W. Europe Standard Time");
            }
        }

        private sealed class TodayOverrideScope : IDisposable
        {
            private readonly DateOnly? _previous;

            public TodayOverrideScope(DateOnly? previous)
            {
                _previous = previous;
            }

            public void Dispose()
            {
                TodayOverride.Value = _previous;
            }
        }
    }
}
