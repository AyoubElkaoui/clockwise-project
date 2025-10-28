FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app

# 🔧 Firebird client + symlink (embedded gebruikt dezelfde lib)
RUN apt-get update && \
    apt-get install -y --no-install-recommends libfbclient2 firebird3.0-server-core && \
    ln -sf /usr/lib/x86_64-linux-gnu/libfbclient.so.2 /usr/lib/x86_64-linux-gnu/fbembed.so && \
    echo "/usr/lib/x86_64-linux-gnu" > /etc/ld.so.conf.d/fbclient.conf && ldconfig && \
    rm -rf /var/lib/apt/lists/*

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY backend/backend.csproj ./backend.csproj
RUN dotnet restore ./backend.csproj
COPY backend/. .
RUN dotnet publish backend.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
# 📦 Bewaar de database als template (niet direct gebruiken)
COPY database/CLOCKWISE.FDB /app/CLOCKWISE.FDB.initial
# 🚀 Startup script dat DB naar /data kopieert
COPY backend/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
ENTRYPOINT ["/app/entrypoint.sh"]
