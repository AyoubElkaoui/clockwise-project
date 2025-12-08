
# Development Dockerfile voor .NET met hot reload
FROM mcr.microsoft.com/dotnet/sdk:8.0

WORKDIR /app

# Installeer Firebird client libraries
RUN apt-get update && \
    apt-get install -y --no-install-recommends libfbclient2 firebird3.0-server-core && \
    ln -sf /usr/lib/x86_64-linux-gnu/libfbclient.so.2 /usr/lib/x86_64-linux-gnu/fbembed.so && \
    echo "/usr/lib/x86_64-linux-gnu" > /etc/ld.so.conf.d/fbclient.conf && ldconfig && \
    rm -rf /var/lib/apt/lists/*

# Kopieer alleen project file voor dependency restore
COPY backend.csproj ./
RUN dotnet restore

# Rest van source code wordt via volume gemount
# zodat hot reload werkt

EXPOSE 5000

# Start met dotnet watch voor hot reload
CMD ["dotnet", "watch", "run", "--no-launch-profile", "--urls", "http://0.0.0.0:5000"]