namespace backend.Features.Auth;

public sealed class AuthInputException : Exception
{
    public AuthInputException(string code, string message) : base(message)
    {
        Code = code;
    }

    public string Code { get; }
}
