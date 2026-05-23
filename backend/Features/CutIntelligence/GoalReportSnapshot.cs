namespace backend.Features.CutIntelligence
{
    public class GoalReportSnapshot
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string UserId { get; set; } = "";
        public string GoalType { get; set; } = "";
        public DateOnly WeekStart { get; set; }
        public DateOnly WeekEnd { get; set; }
        public DateTime GeneratedAtUtc { get; set; } = DateTime.UtcNow;
        public int Score { get; set; }
        public string Status { get; set; } = "";
        public string Confidence { get; set; } = "";
        public bool IsLimitedReport { get; set; }
        public string ProblemIdsJson { get; set; } = "[]";
        public string RecommendationIdsJson { get; set; } = "[]";
        public string ReportJson { get; set; } = "{}";
        public string AlgorithmVersion { get; set; } = "";
    }
}
