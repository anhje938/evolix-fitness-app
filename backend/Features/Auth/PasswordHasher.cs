using System.Security.Cryptography;
using Microsoft.IdentityModel.Tokens;

namespace backend.Features.Auth;

public static class PasswordHasher
{
    private const int SaltSize = 16;
    private const int HashSize = 32;
    private const int Iterations = 210_000;
    private const string Algorithm = "pbkdf2_sha256";

    public static string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var hash = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            Iterations,
            HashAlgorithmName.SHA256,
            HashSize);

        return string.Join(
            "$",
            Algorithm,
            Iterations.ToString(System.Globalization.CultureInfo.InvariantCulture),
            Base64UrlEncoder.Encode(salt),
            Base64UrlEncoder.Encode(hash));
    }

    public static bool Verify(string password, string storedHash)
    {
        var parts = storedHash.Split('$');
        if (parts.Length != 4 || parts[0] != Algorithm)
            return false;

        if (!int.TryParse(parts[1], out var iterations) || iterations < 100_000)
            return false;

        byte[] salt;
        byte[] expectedHash;
        try
        {
            salt = Base64UrlEncoder.DecodeBytes(parts[2]);
            expectedHash = Base64UrlEncoder.DecodeBytes(parts[3]);
        }
        catch
        {
            return false;
        }

        var actualHash = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            iterations,
            HashAlgorithmName.SHA256,
            expectedHash.Length);

        return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
    }
}
