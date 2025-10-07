# backend/Dockerfile

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app

# Firebird client libs + symlinks voor embedded mode
RUN apt-get update && \
    apt-get install -y --no-install-recommends libfbclient2 && \
    ln -sf /usr/lib/x86_64-linux-gnu/libfbclient.so.2 /usr/lib/x86_64-linux-gnu/fbembed.so && \
    ln -sf /usr/lib/x86_64-linux-gnu/libfbclient.so.2 /usr/lib/libfbembed.so && \
    echo "/usr/lib/x86_64-linux-gnu" > /etc/ld.so.conf.d/fbclient.conf && ldconfig && \
    rm -rf /var/lib/apt/lists/*

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# ⬇️ LET OP: paden zijn relatief aan de build-context (repo-root)
COPY backend/backend.csproj ./backend.csproj
RUN dotnet restore ./backend.csproj

# Kopieer ALLEEN de backend code
COPY backend/. .

RUN dotnet publish backend.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .

# ⬇️ je .FDB zit in repo map 'database', kopiëren naar container
COPY database/CLOCKWISE.FDB /app/CLOCKWISE.FDB

ENTRYPOINT ["dotnet", "backend.dll"]
