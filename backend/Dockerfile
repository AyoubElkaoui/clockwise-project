# ---- runtime base ----
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
RUN apt-get update && apt-get install -y --no-install-recommends libfbclient2 && rm -rf /var/lib/apt/lists/*

# ---- build ----
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY backend.csproj .
RUN dotnet restore backend.csproj
COPY . .
RUN dotnet publish backend.csproj -c Release -o /app/publish /p:UseAppHost=false

# ---- final ----
FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
# ⬇️ neem je DB mee uit repo-root/database
COPY database/CLOCKWISE.FDB /app/CLOCKWISE.FDB
ENTRYPOINT ["dotnet", "backend.dll"]
