using backend.Features.Users;
using Microsoft.EntityFrameworkCore;

namespace backend.Features.Weight
{
    public class WeightLog
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public string UserId { get; set; }

        public DateTime TimestampUtc { get; set; }

        public double WeightKg { get; set; }

        public User? User { get; set; }
    }
}
