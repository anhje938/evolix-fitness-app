FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

ENV ASPNETCORE_URLS=http://+:8080
ENV DOTNET_RUNNING_IN_CONTAINER=true

RUN useradd --create-home --home-dir /home/appuser --shell /usr/sbin/nologin --uid 10001 appuser

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

COPY ["backend.csproj", "./"]
RUN dotnet restore "./backend.csproj"

COPY . .
RUN dotnet publish "./backend.csproj" \
    -c $BUILD_CONFIGURATION \
    -o /app/publish \
    /p:UseAppHost=false \
    --no-restore

FROM base AS final
WORKDIR /app

COPY --from=build /app/publish .

USER appuser

ENTRYPOINT ["dotnet", "backend.dll"]
