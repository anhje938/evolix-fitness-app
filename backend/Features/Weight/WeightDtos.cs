namespace backend.Features.Weight
{
    public class WeightLogResponse
    {
        public Guid Id { get; set; }
        public DateTime TimestampUtc { get; set; }
        public double WeightKg { get; set; }
    }

    public class WeightLogRequest
    {
        public double WeightKg { get; set; }
        public DateTime TimestampUtc { get; set; }
    }

    public class WeightLogListItem
    {
        public double WeightKg { get; set; }

        public DateTime TimestampUtc { get; set; }
    }
}


