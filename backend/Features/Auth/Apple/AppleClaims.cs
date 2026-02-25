namespace backend.Auth
{
    public class AppleClaims
    {
        public string Sub { get; set; } = null!;

        // Apple kan returnere null (ofte etter første login)
        public string? Email { get; set; }

        public bool EmailVerified { get; set; }

        // Ikke bruk Apple til admin – behold admin i din egen User-tabell.
        public bool IsAdmin { get; set; }
    }
}
