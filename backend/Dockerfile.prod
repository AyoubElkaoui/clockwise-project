# Multi-stage build для production
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

WORKDIR /src

# Installeer Firebird client libraries
RUN apt-get update && \
    apt-get install -y --no-install-recommends libfbclient2 firebird3.0-server-core && \
    ln -sf /usr/lib/x86_64-linux-gnu/libfbclient.so.2 /usr/lib/x86_64-linux-gnu/fbembed.so && \
    echo "/usr/lib/x86_64-linux-gnu" > /etc/ld.so.conf.d/fbclient.conf && ldconfig && \
    rm -rf /var/lib/apt/lists/*

# Kopieer project file - context is repository root
COPY ["backend/backend.csproj", "./"]
RUN dotnet restore "backend.csproj"

# Kopieer rest van source
COPY ["backend", "."]

# Build
RUN dotnet build "backend.csproj" -c Release -o /app/build

# Publish
FROM build AS publish
RUN dotnet publish "backend.csproj" -c Release -o /app/publish

# Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final

WORKDIR /app

# Installeer Firebird runtime libraries
RUN apt-get update && \
    apt-get install -y --no-install-recommends libfbclient2 && \
    ln -sf /usr/lib/x86_64-linux-gnu/libfbclient.so.2 /usr/lib/x86_64-linux-gnu/fbembed.so && \
    echo "/usr/lib/x86_64-linux-gnu" > /etc/ld.so.conf.d/fbclient.conf && ldconfig && \
    rm -rf /var/lib/apt/lists/*

COPY --from=publish /app/publish .

EXPOSE 5000

ENTRYPOINT ["dotnet", "backend.dll"]
