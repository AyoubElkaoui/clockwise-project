# ---- runtime base ----
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
RUN apt-get update && apt-get install -y --no-install-recommends libfbclient2 && rm -rf /var/lib/apt/lists/*

# ---- build ----
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# ⬇️ let op: repo-root context → gebruik backend/ prefix
COPY backend/backend.csproj ./backend.csproj
RUN dotnet restore ./backend.csproj

# ⬇️ kopieer ALLE code uit /backend
COPY backend/. .

# publish
RUN dotnet publish ./backend.csproj -c Release -o /app/publish /p:UseAppHost=false

# ---- final ----
FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .

# ⬇️ DB komt uit repo-root/database → dit werkt met root context
COPY database/CLOCKWISE.FDB /app/CLOCKWISE.FDB

ENTRYPOINT ["dotnet", "backend.dll"]
