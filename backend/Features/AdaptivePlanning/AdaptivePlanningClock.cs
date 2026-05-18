namespace backend.Features.AdaptivePlanning
{
    internal static class AdaptivePlanningClock
    {
        private static readonly TimeZoneInfo PlanTimeZone = ResolveTimeZone();

        public static DateOnly Today()
        {
            return ToLocalDate(DateTime.UtcNow);
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
    }
}
