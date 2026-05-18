# JWT key rotation

Production must set all `Jwt` values from secrets, not from `appsettings.json`.

Required values:

- `Jwt:Issuer`: stable API issuer, for example `https://api.evolix.no`.
- `Jwt:Audience`: mobile app audience, for example `evolix-mobile`.
- `Jwt:SecretKey`: random secret with at least 32 UTF-8 bytes.

Rotation procedure:

1. Generate a new random secret with at least 32 bytes of entropy.
2. Deploy the API with the new `Jwt:SecretKey`.
3. Keep `RefreshToken` settings unchanged so active users can receive a fresh access token.
4. Ask active users to sign in again only if immediate revocation of old access tokens is required.
5. Confirm `/health/db` and normal authenticated API calls after deployment.

Current implementation signs and validates one symmetric key at a time. Because access tokens are short lived, the normal rotation window is the configured `Jwt:ExpirationMinutes`.
