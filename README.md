# evolix-fitness-app

Backenden er migrert til PostgreSQL med en ny EF Core-baseline i
`backend/Migrations/20260423145039_InitialPostgres.cs`.

## Lokal utvikling

1. Kopier `.env.docker.dev.example` til `.env.docker.dev` og fyll inn verdier ved behov.
2. Start Postgres og API:

```bash
docker compose --env-file .env.docker.dev up --build
```

API-en blir tilgjengelig pa `http://localhost:8080`.

Hvis du bare vil kjore databasen i Docker og API-en lokalt:

```bash
docker compose --env-file .env.docker.dev up postgres -d
cd backend
dotnet run
```

## VPS med PostgreSQL

1. Kopier `.env.vps.example` til `.env` eller `.env.vps` pa VPS-en og fyll inn ekte verdier.
2. Start stacken:

```bash
docker compose -f compose.vps.yaml --env-file .env up -d --build
```

3. Legg Nginx, Caddy eller tilsvarende foran API-en og proxie til `127.0.0.1:8080`.

`Program.cs` bruker na `UseForwardedHeaders()`, sa reverse proxy + HTTPS fungerer riktig pa VPS.

## Viktige produksjonsvariabler

Sett disse pa VPS-en for oppstart:

- `ConnectionStrings__DefaultConnection`
- `Jwt__Issuer`
- `Jwt__Audience`
- `Jwt__SecretKey`
- `RefreshToken__LifetimeDays`
- `AppleSettings__ClientId`
- `Cors__Origins__0`

## Verifisering

- `dotnet build backend/backend.sln`
- `docker compose -f compose.vps.yaml --env-file .env.vps.example config`
- `cd backend && dotnet ef dbcontext info`
- `cd backend && dotnet ef migrations script --idempotent`
- `cd fitness-app && npx tsc --noEmit`
